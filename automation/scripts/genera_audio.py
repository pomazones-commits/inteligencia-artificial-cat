#!/usr/bin/env python3
"""Genera un MP3 per notícia amb la veu neuronal catalana i el puja al servidor.

S'executa dins de GitHub Actions. Veu principal (des del 12.10.2026): Gemini,
veu «Kore», model gemini-3.8-flash-lite-tts. Si Gemini falla, fa servir la veu
catalana local de Piper (ca_ES-upc_ona-medium), que corre al mateix runner.
Fins al 12.10.2026 era la Joana d'edge-tts, fins que Microsoft la va tallar.
Els MP3 NO es guarden al repositori: es pugen directament al servidor,
a assets/audio/<slug>.mp3. Si una síntesi falla, la notícia conserva el lector
de veu del navegador com a xarxa de seguretat (article.php ho gestiona sol).

Transport (fase A2, 04.08.2026): si els secrets SSH_* estan definits, els MP3
es pugen per SSH (scp) amb la mateixa clau que fa servir desplega.yml — una
sola llista remota inicial substitueix les desenes de comprovacions per fitxer
de l'FTP. Si l'SSH no està configurat o no respon, es degrada sol al mecanisme
FTP de sempre (curl), que queda com a recurs fins que es retiri del tot.

A més de les notícies, també sintetitza les peces editorials fixes
(anàlisi de la setmana, tribuna, estudi i imatge del dia) llegint els seus
fitxers window.IA_* de public/. Els noms de fitxer inclouen la data perquè cada
edició nova tingui el seu àudio: analisi-AAAA-MM-DD.mp3, tribuna-AAAA-MM-DD.mp3,
estudi-AAAA-MM-DD.mp3, imatge-AAAA-MM-DD.mp3, quadern-AAAA-MM-DD.mp3 (el Quadern
setmanal, que surt de reflection.js) i reflexio-AAAA-MM-DD.mp3 (la reflexió del
dia, que surt de reflexio-diaria.js). Les pàgines calculen la mateixa URL a partir del camp
`date` de cada peça. Qualsevol errada en aquestes peces extres NO fa fallar
la síntesi de les notícies.
"""
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# Veu principal (12.10.2026, triada per Rafael d'oïda entre Matxa, Gemini i
# Piper): Gemini «Kore» amb el model econòmic, a ritme normal. La clau arriba
# NOMÉS pel secret GEMINI_API_KEY de GitHub. Abans era la Joana d'edge-tts,
# que Microsoft va tallar el 12.10.2026 (rany2/edge-tts#490).
GEMINI_URL = os.environ.get("GEMINI_URL", "https://generativelanguage.googleapis.com/v1beta/interactions")
GEMINI_MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-lite-tts")
GEMINI_VEU = os.environ.get("GEMINI_TTS_VEU", "Kore")
GEMINI_ESTIL = ("Locució de notícies en català central, to informatiu i serè, "
                "ritme normal i natural, pronúncia catalana genuïna.")
GEMINI_MAX_CARACTERS = 3500  # per petició; els textos llargs es parteixen per paràgrafs
# Veu de recanvi (12.10.2026): Piper, local i sense claus. El workflow la baixa
# a PIPER_DIR abans de començar. Es fa servir quan Gemini falla.
PIPER_VOICE = "ca_ES-upc_ona-medium"
PIPER_DIR = Path(os.environ.get("PIPER_DIR", str(Path.home() / "piper-veus")))
# Si Gemini falla de manera persistent (sense clau, quota, servei caigut), no
# ho tornem a provar a cada peça de la passada. NOMES_PIPER=1 ho força a mà.
_GEMINI_KO = os.environ.get("NOMES_PIPER", "") == "1"
FTP_HOST = "srv1589.hstgr.io"
FTP_USER = "u901078817.claude"
SSH_PATH_DEFECTE = "domains/inteligencia-artificial.cat/public_html"
ARTICLES = Path("public/data/articles.json")
ARXIU_PLA = Path("public/data/archive.json")  # totes les notícies publicades (fins a 1.000)
MIDA_MINIMA = 20000  # bytes: per sota d'això considerem l'àudio corrupte

# Peces editorials fixes: (fitxer window.IA_*, prefix del nom del MP3, camps de text)
PECES_EXTRES = [
    (Path("public/analysis.js"), "analisi", ("title", "excerpt", "body")),
    (Path("public/tribuna.js"), "tribuna", ("title", "excerpt", "body")),
    (Path("public/estudis.js"), "estudi", ("title", "abstract", "body")),
    (Path("public/daily-image.js"), "imatge", ("title", "caption", "body")),
    (Path("public/reflection.js"), "quadern", ("title", "dek", "body")),
    (Path("public/reflexio-diaria.js"), "reflexio", ("title", "dek", "body")),
]

# Marques de format del cos dels estudis que la veu no ha de llegir:
# «## » encapçala un títol de secció i «• » un pic d'una llista.
MARQUES = re.compile(r"(?m)^[ \t]*(?:#{1,6}|•)[ \t]*")


def camp_com_a_text(valor) -> str:
    """Un camp pot ser text o una llista de paràgrafs (p. ex. el body del quadern)."""
    if isinstance(valor, list):
        text = "\n\n".join(str(part).strip() for part in valor if str(part).strip())
    else:
        text = str(valor or "").strip()
    return MARQUES.sub("", text).strip()


def llegeix_ia_js(path: Path) -> dict:
    """Extreu l'objecte JSON d'un fitxer window.IA_* = {...};"""
    if not path.is_file():
        return {}
    raw = path.read_text(encoding="utf-8")
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end <= start:
        return {}
    try:
        data = json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def darrera_veu_civicai(path: Path = Path("public/tribuna-arxiu.js"), variable: str = "IA_TRIBUNA_ARXIU") -> dict:
    """La peça més recent de «Veus de CIVICAi» d'un arxiu (per defecte, el de la tribuna).

    Des del 14.10.2026 les veus de CIVICAi es publiquen directament a
    tribuna-arxiu.js (mai a tribuna.js), de manera que no passen mai per la
    tribuna vigent: aquesta funció les fa entrar a l'àudio igualment.
    Des del 16.10.2026 els estudis de membres de CIVICAi van, de la mateixa
    manera, a estudis-arxiu.js (variable IA_ESTUDIS_ARXIU): vegeu
    darrer_estudi_civicai()."""
    if not path.is_file():
        return {}
    raw = path.read_text(encoding="utf-8")
    m = re.search(r"^window\." + re.escape(variable) + r"\s*=\s*", raw, re.M)
    if not m:
        return {}
    cos = raw[m.end():].strip().rstrip(";").strip()
    try:
        llista = json.loads(cos)
    except json.JSONDecodeError:
        return {}
    millor = {}
    for peca in llista if isinstance(llista, list) else []:
        if not isinstance(peca, dict) or peca.get("serie") != "veus-de-civicai":
            continue
        iso = data_iso(str(peca.get("date", "")))
        if iso and iso > data_iso(str(millor.get("date", ""))):
            millor = peca
    return millor


def darrer_estudi_civicai(path: Path = Path("public/estudis-arxiu.js")) -> dict:
    """L'estudi més recent de «Veus de CIVICAi» (16.10.2026, decisió d'en Rafael:
    la secció recull totes les col·laboracions dels membres de CIVICAi, també els
    estudis). Es publiquen directament a estudis-arxiu.js, mai a estudis.js."""
    return darrera_veu_civicai(path, "IA_ESTUDIS_ARXIU")


# Noms propis de «Veus de CIVICAi» (17.10.2026, decisió d'en Rafael). Des del
# 18.10.2026 cada veu té un MP3 amb el seu nom i el de l'autor:
#   civicai-AAAA-MM-DD-<autor>.mp3          (opinió i entrevistes, tribuna-arxiu.js)
#   civicai-estudi-AAAA-MM-DD-<autor>.mp3   (estudis, estudis-arxiu.js)
# Així no xoquen ni amb la tribuna, ni amb l'estudi vigent, ni entre elles
# (p. ex. la columna d'en Sanromà i la peça d'un altre membre el mateix dijous).
# <autor> és el slug de l'autor amb el mateix algorisme que iacat_slug() (PHP) i
# IAPeces.slug() (JS). Les peces anteriors al 18.10.2026 conserven el nom antic
# (tribuna-/estudi-AAAA-MM-DD). tribuna.html, estudi.html i podcast.php fan
# servir la mateixa regla (CIVICAI_DES_DE).
CIVICAI_DES_DE = "2026-10-18"
CIVICAI_DIES = 14  # es fa (o es comprova) l'àudio de les veus d'aquests darrers dies

_SLUG_MAPA = str.maketrans({
    "à": "a", "á": "a", "â": "a", "ä": "a", "ã": "a", "å": "a",
    "è": "e", "é": "e", "ê": "e", "ë": "e",
    "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ò": "o", "ó": "o", "ô": "o", "ö": "o", "õ": "o",
    "ù": "u", "ú": "u", "û": "u", "ü": "u",
    "ç": "c", "ñ": "n", "·": "", "ŀ": "l",
})


def slug_text(text: str) -> str:
    """Còpia exacta d'iacat_slug() (inc/peces.php) i IAPeces.slug() (peces.js)."""
    t = str(text or "").lower().translate(_SLUG_MAPA)
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    if len(t) > 80:
        tall = t[:81]
        guio = tall.rfind("-")
        t = (tall[:guio] if guio > 40 else t[:80]).rstrip("-")
    return t or "peca"


def nom_audio_civicai(peca: dict, estudi: bool) -> str:
    """Nom del MP3 (sense .mp3) d'una peça de «Veus de CIVICAi»."""
    iso = data_iso(str(peca.get("date", "")))
    if not iso:
        return ""
    if iso >= CIVICAI_DES_DE:
        autor = slug_text(peca.get("author", ""))
        return f"{'civicai-estudi' if estudi else 'civicai'}-{iso}-{autor}"
    return f"{'estudi' if estudi else 'tribuna'}-{iso}"


def veus_civicai(path: Path, variable: str) -> list:
    """Totes les peces de «Veus de CIVICAi» d'un arxiu."""
    if not path.is_file():
        return []
    raw = path.read_text(encoding="utf-8")
    m = re.search(r"^window\." + re.escape(variable) + r"\s*=\s*", raw, re.M)
    if not m:
        return []
    try:
        llista = json.loads(raw[m.end():].strip().rstrip(";").strip())
    except json.JSONDecodeError:
        return []
    return [p for p in (llista if isinstance(llista, list) else [])
            if isinstance(p, dict) and p.get("serie") == "veus-de-civicai"]


def darrera_veu_empresa(path: Path = Path("public/empresa.js")) -> dict:
    """La peça més recent de «Veus d'empresa» (15.10.2026).

    empresa.js és una llista (window.IA_EMPRESA), sense peça vigent: se'n fa
    l'àudio de la més recent, amb el prefix «empresa» (empresa-AAAA-MM-DD.mp3),
    que és el que busca empresa.html. Prefix propi: no xoca mai amb la tribuna."""
    if not path.is_file():
        return {}
    raw = path.read_text(encoding="utf-8")
    m = re.search(r"^window\.IA_EMPRESA\s*=\s*", raw, re.M)
    if not m:
        return {}
    try:
        llista = json.loads(raw[m.end():].strip().rstrip(";").strip())
    except json.JSONDecodeError:
        return {}
    millor = {}
    for peca in llista if isinstance(llista, list) else []:
        if not isinstance(peca, dict):
            continue
        iso = data_iso(str(peca.get("date", "")))
        if iso and iso > data_iso(str(millor.get("date", ""))):
            millor = peca
    return millor


def data_iso(valor: str) -> str:
    """Normalitza DD.MM.AAAA o AAAA-MM-DD a AAAA-MM-DD. Retorna '' si no quadra."""
    valor = (valor or "").strip()
    m = re.match(r"^(\d{2})\.(\d{2})\.(\d{4})$", valor)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    if re.match(r"^\d{4}-\d{2}-\d{2}$", valor):
        return valor
    return ""


class TransportSSH:
    """Pujada per scp amb la clau de desplegament. Una sola llista inicial."""

    def __init__(self, host: str, user: str, port: str, clau: str, arrel: str):
        self._destdir = f"{arrel.rstrip('/')}/assets/audio"
        self._target = f"{user}@{host}"
        self._tmp = tempfile.TemporaryDirectory()
        clau_path = Path(self._tmp.name) / "clau"
        clau_path.write_text(clau.rstrip() + "\n", encoding="utf-8")
        clau_path.chmod(stat.S_IRUSR | stat.S_IWUSR)
        # known_hosts propi dins el directori temporal: aixi no depenem que
        # ~/.ssh existeixi al runner (desplega.yml el crea a ma; aqui no cal).
        opcions = ["-i", str(clau_path),
                   "-o", f"UserKnownHostsFile={self._tmp.name}/known_hosts",
                   "-o", "StrictHostKeyChecking=accept-new",
                   "-o", "ConnectTimeout=20", "-o", "BatchMode=yes"]
        self._ssh = ["ssh", *opcions, "-p", port, self._target]
        self._scp = ["scp", *opcions, "-P", port]
        self._existents = set()

    def prepara(self) -> bool:
        """Crea el directori remot si cal i llegeix la llista de MP3 existents."""
        ordre = f"mkdir -p '{self._destdir}' && ls -1 '{self._destdir}'"
        try:
            r = subprocess.run(self._ssh + [ordre], capture_output=True, text=True, timeout=90)
        except subprocess.TimeoutExpired:
            print("SSH no disponible: temps esgotat obrint la connexio.")
            return False
        if r.returncode != 0:
            print(f"SSH no disponible (codi {r.returncode}):")
            for linia in (r.stderr or "").strip().splitlines()[-4:]:
                print(f"  ssh: {linia}")
            return False
        self._existents = {linia.strip() for linia in r.stdout.splitlines() if linia.strip()}
        print(f"SSH a punt: {len(self._existents)} MP3 ja al servidor.")
        return True

    def ja_existeix(self, slug: str) -> bool:
        return f"{slug}.mp3" in self._existents

    def puja(self, mp3: Path, slug: str) -> bool:
        try:
            r = subprocess.run(self._scp + [str(mp3), f"{self._target}:{self._destdir}/{slug}.mp3"],
                               timeout=240)
        except subprocess.TimeoutExpired:
            return False
        if r.returncode == 0:
            self._existents.add(f"{slug}.mp3")
            return True
        return False


class TransportFTP:
    """El mecanisme de sempre (curl per FTP). Queda com a recurs."""

    def __init__(self, password: str):
        self._auth = f"{FTP_USER}:{password}"

    @staticmethod
    def _curl(args, **kw):
        base = ["curl", "-sS", "--ftp-ssl-control", "--connect-timeout", "20"]
        return subprocess.run(base + args, **kw)

    def prepara(self) -> bool:
        return True  # el workflow ja comprova que l'FTP respon en un pas previ

    def ja_existeix(self, slug: str) -> bool:
        remote = f"ftp://{FTP_HOST}/assets/audio/{slug}.mp3"
        return self._curl(
            ["-u", self._auth, "-r", "0-0", "-o", os.devnull, "--max-time", "40", remote],
            stderr=subprocess.DEVNULL,
        ).returncode == 0

    def puja(self, mp3: Path, slug: str) -> bool:
        remote = f"ftp://{FTP_HOST}/assets/audio/{slug}.mp3"
        return self._curl(
            ["--ftp-create-dirs", "--retry", "4", "--retry-delay", "6", "--retry-all-errors",
             "--max-time", "180", "-T", str(mp3), "-u", self._auth, remote]
        ).returncode == 0


def tria_transport():
    """SSH si està configurat i respon; si no, FTP; si no hi ha res, None."""
    clau = os.environ.get("SSH_PRIVATE_KEY", "").strip()
    host = os.environ.get("SSH_HOST", "").strip()
    user = os.environ.get("SSH_USER", "").strip()
    password = os.environ.get("FTP_PASSWORD", "")
    if clau and host and user:
        ssh = TransportSSH(host, user, os.environ.get("SSH_PORT", "").strip() or "65002",
                           clau, os.environ.get("SSH_PATH", "").strip() or SSH_PATH_DEFECTE)
        if ssh.prepara():
            return ssh
        if password:
            print("AVÍS: SSH configurat però sense resposta; es prova l'FTP com a recurs.")
        else:
            print("ERROR: SSH sense resposta i FTP_PASSWORD no definida.")
            return None
    if password:
        return TransportFTP(password)
    print("Ni SSH_* ni FTP_PASSWORD estan definits; no es pot pujar res.")
    return None


def cerca_noticia(slug: str):
    """Busca una notícia per slug a l'edició d'avui i, si no hi és, a l'arxiu pla."""
    fonts = []
    if ARTICLES.is_file():
        fonts.append(json.loads(ARTICLES.read_text(encoding="utf-8")).get("items", []))
    if ARXIU_PLA.is_file():
        dades = json.loads(ARXIU_PLA.read_text(encoding="utf-8"))
        fonts.append(dades if isinstance(dades, list) else dades.get("items", []))
    for items in fonts:
        for item in items:
            if isinstance(item, dict) and (item.get("slug") or "").strip() == slug:
                return item
    return None


def regenera_forcats(transport, fets: int, errors: int):
    """Torna a sintetitzar les notícies de REGENERA encara que el MP3 ja existeixi."""
    demanats = [s.strip() for s in os.environ.get("REGENERA", "").split(",") if s.strip()]
    for slug in demanats:
        if not re.fullmatch(r"[a-z0-9-]+", slug):
            print(f"AVÍS: slug no vàlid a REGENERA: {slug!r}; s'ignora.")
            continue
        item = cerca_noticia(slug)
        if not item:
            print(f"ERROR: no s'ha trobat cap notícia amb l'slug {slug} per regenerar-ne l'àudio.")
            errors += 1
            continue
        text = "\n\n".join(
            part for part in (item.get("title", ""), item.get("excerpt", ""), item.get("body", ""))
            if part
        )
        print(f"Regeneració forçada de {slug}.mp3")
        if sintetitza_i_puja(slug, text, transport):
            fets += 1
        else:
            errors += 1
    return fets, errors


def _trossos(text: str, maxim: int = GEMINI_MAX_CARACTERS) -> list:
    """Parteix el text en trossos de com a molt `maxim` caràcters, per paràgrafs."""
    trossos, actual = [], ""
    for par in (p.strip() for p in text.split("\n") if p.strip()):
        while len(par) > maxim:  # paràgraf enorme: es talla per l'últim punt possible
            tall = par.rfind(". ", 0, maxim)
            tall = tall + 1 if tall > 0 else maxim
            if actual:
                trossos.append(actual)
                actual = ""
            trossos.append(par[:tall].strip())
            par = par[tall:].strip()
        if actual and len(actual) + len(par) + 1 > maxim:
            trossos.append(actual)
            actual = par
        else:
            actual = f"{actual}\n{par}" if actual else par
    if actual:
        trossos.append(actual)
    return trossos


def _darrer_audio(node):
    """Busca a la resposta de Gemini el darrer bloc {"type": "audio", "data": ...}."""
    trobat = None
    if isinstance(node, dict):
        if node.get("type") == "audio" and node.get("data"):
            trobat = node["data"]
        for v in node.values():
            trobat = _darrer_audio(v) or trobat
    elif isinstance(node, list):
        for v in node:
            trobat = _darrer_audio(v) or trobat
    return trobat


class GeminiError(RuntimeError):
    def __init__(self, missatge: str, persistent: bool):
        super().__init__(missatge)
        self.persistent = persistent  # True: no val la pena tornar-ho a provar en aquesta passada


def _gemini_pcm(text: str, veu: str = GEMINI_VEU, model: str = GEMINI_MODEL,
                estil: str = GEMINI_ESTIL) -> tuple:
    """Una petició a Gemini. Retorna (frames PCM 16 bits, freqüència, canals)."""
    import base64
    import io
    import urllib.error
    import urllib.request
    import wave

    clau = os.environ.get("GEMINI_API_KEY", "").strip()
    if not clau:
        raise GeminiError("falta el secret GEMINI_API_KEY", persistent=True)
    cos = json.dumps({
        "model": model,
        "input": [{"type": "user_input", "content": [{
            "type": "text", "text": text,
            "annotations": [{"type": "speech_metadata", "style": estil}],
        }]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": veu}]},
    }).encode()
    # Claus noves «AQ.» (des del maig del 2026) i antigues «AIza»: totes dues
    # van a x-goog-api-key; si Google la rebutja pel tipus, es prova com a Bearer.
    capcaleres = [{"x-goog-api-key": clau}, {"Authorization": f"Bearer {clau}"}]
    auth, resposta, reintents_429, reintents_xarxa = 0, None, 0, 0
    while resposta is None:
        req = urllib.request.Request(GEMINI_URL, data=cos,
                                     headers={"Content-Type": "application/json", **capcaleres[auth]})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                resposta = json.loads(r.read())
        except urllib.error.HTTPError as exc:
            detall = exc.read().decode("utf-8", "replace")[:200].replace("\n", " ")
            if exc.code in (401, 403) and auth == 0:
                auth = 1  # prova la mateixa clau com a Bearer
                continue
            if exc.code in (401, 403):
                raise GeminiError(f"clau rebutjada (HTTP {exc.code}): {detall}", persistent=True)
            if exc.code == 429:
                # Quota per minut: es recupera esperant. Si torna a passar, és la diària.
                if reintents_429 >= 1:
                    raise GeminiError(f"quota esgotada (HTTP 429): {detall}", persistent=True)
                reintents_429 += 1
                time.sleep(60)
                continue
            if exc.code >= 500 and reintents_xarxa < 3:
                reintents_xarxa += 1
                time.sleep(10)
                continue
            raise GeminiError(f"HTTP {exc.code}: {detall}", persistent=exc.code >= 500)
        except (urllib.error.URLError, TimeoutError) as exc:
            if reintents_xarxa < 3:
                reintents_xarxa += 1
                time.sleep(10)
                continue
            raise GeminiError(f"sense connexió: {exc}", persistent=True)
    if resposta is None:
        raise GeminiError("sense resposta", persistent=True)
    dades = _darrer_audio(resposta)
    if not dades:
        raise GeminiError(f"resposta sense àudio: {str(resposta)[:200]}", persistent=False)
    bruts = base64.b64decode(dades)
    if bruts[:4] == b"RIFF":
        with wave.open(io.BytesIO(bruts), "rb") as w:
            return w.readframes(w.getnframes()), w.getframerate(), w.getnchannels()
    return bruts, 24000, 1  # PCM sense capçalera: 24 kHz, mono, 16 bits


def sintetitza_gemini_wav(text: str, desti: Path, veu: str = GEMINI_VEU,
                          model: str = GEMINI_MODEL, estil: str = GEMINI_ESTIL) -> None:
    """Text → WAV amb Gemini, partint els textos llargs. Llença GeminiError si falla."""
    import wave

    frames, freq, canals = [], 24000, 1
    for i, tros in enumerate(_trossos(text)):
        pcm, freq, canals = _gemini_pcm(tros, veu, model, estil)
        if i:
            frames.append(b"\x00" * (2 * canals * int(freq * 0.4)))  # pausa entre trossos
        frames.append(pcm)
    with wave.open(str(desti), "wb") as w:
        w.setnchannels(canals)
        w.setsampwidth(2)
        w.setframerate(freq)
        for f in frames:
            w.writeframes(f)


def _sintetitza_gemini(fitxer_text: Path, mp3: Path, slug: str) -> bool:
    """Veu principal (Gemini Kore). True si ha deixat un MP3 vàlid a `mp3`."""
    global _GEMINI_KO
    wav = mp3.with_suffix(".gemini.wav")
    try:
        sintetitza_gemini_wav(fitxer_text.read_text(encoding="utf-8"), wav)
        wav_a_mp3(wav, mp3)
    except GeminiError as exc:
        print(f"AVÍS: Gemini ha fallat amb {slug}: {exc}")
        if exc.persistent:
            print("AVÍS: la resta d'aquesta passada es farà amb la veu de recanvi.")
            _GEMINI_KO = True
        return False
    except Exception as exc:
        print(f"AVÍS: error inesperat amb Gemini a {slug}: {exc}")
        return False
    return mp3.is_file() and mp3.stat().st_size > MIDA_MINIMA


def _sintetitza_piper(fitxer_text: Path, mp3: Path, slug: str) -> bool:
    """Veu local de recanvi (Piper, ca_ES-upc_ona-medium). True si ha deixat un MP3 vàlid."""
    model = PIPER_DIR / f"{PIPER_VOICE}.onnx"
    if not model.is_file():
        print(f"AVÍS: no hi ha la veu de recanvi {model}; {slug} es queda sense MP3.")
        return False
    wav = mp3.with_suffix(".wav")
    # Piper llegeix una frase per línia: un paràgraf per línia, sense línies buides.
    linies = [l.strip() for l in fitxer_text.read_text(encoding="utf-8").splitlines() if l.strip()]
    entrada = mp3.with_name("piper.txt")
    entrada.write_text("\n".join(linies) + "\n", encoding="utf-8")
    try:
        r1 = subprocess.run(
            [sys.executable, "-m", "piper", "-m", str(model), "-i", str(entrada),
             "-f", str(wav), "--sentence-silence", "0.35"],
            timeout=600, capture_output=True, text=True,
        )
        if r1.returncode != 0 or not wav.is_file():
            print(f"AVÍS: Piper ha fallat amb {slug}: {(r1.stderr or '').strip()[-200:]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"AVÍS: la veu de recanvi s'ha penjat amb {slug}.")
        return False
    try:
        wav_a_mp3(wav, mp3)
    except Exception as exc:  # p. ex. lameenc no instal·lat
        print(f"AVÍS: no s'ha pogut passar a MP3 {slug}: {exc}")
        return False
    return mp3.is_file() and mp3.stat().st_size > MIDA_MINIMA


def wav_a_mp3(wav: Path, mp3: Path, kbps: int = 64) -> None:
    """WAV PCM 16 bits → MP3 mono amb lameenc (Python pur: el runner no porta ffmpeg)."""
    import array
    import wave

    import lameenc

    with wave.open(str(wav), "rb") as w:
        canals, amplada, freq = w.getnchannels(), w.getsampwidth(), w.getframerate()
        dades = w.readframes(w.getnframes())
    if amplada != 2:
        raise ValueError(f"WAV de {amplada * 8} bits; s'esperava 16")
    if canals == 2:  # mono, com els MP3 de sempre
        mostres = array.array("h", dades)
        dades = array.array("h", ((mostres[i] + mostres[i + 1]) // 2
                                  for i in range(0, len(mostres) - 1, 2))).tobytes()
        canals = 1
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(freq)
    enc.set_channels(canals)
    enc.set_quality(2)
    mp3.write_bytes(enc.encode(dades) + enc.flush())


def sintetitza_i_puja(slug: str, text: str, transport) -> bool:
    """Sintetitza `text` i el puja a assets/audio/<slug>.mp3. True si tot ha anat bé.

    Primer la veu principal (Gemini Kore). Si falla — sense clau, sense quota o
    amb el servei caigut —, la veu catalana local de Piper, que corre dins del
    mateix runner i no depèn de cap servei extern ni de cap clau.
    """
    with tempfile.TemporaryDirectory() as td:
        fitxer_text = Path(td) / "text.txt"
        mp3 = Path(td) / "audio.mp3"
        fitxer_text.write_text(text, encoding="utf-8")
        correcte = False
        veu = "Gemini Kore"
        if not _GEMINI_KO:
            correcte = _sintetitza_gemini(fitxer_text, mp3, slug)
        if not correcte:
            mp3.unlink(missing_ok=True)
            veu = "Piper"
            correcte = _sintetitza_piper(fitxer_text, mp3, slug)
        if not correcte:
            print(f"ERROR sintetitzant {slug} (la peça conserva el lector del navegador)")
            return False
        if transport.puja(mp3, slug):
            print(f"OK {slug}.mp3 ({mp3.stat().st_size // 1024} KB, veu {veu})")
            return True
        print(f"ERROR pujant {slug}.mp3")
        return False


def main() -> int:
    # Sortida linia a linia: dins de GitHub Actions, sense aixo els print()
    # queden retinguts al buffer i el log no es pot seguir (ni diagnosticar
    # si el proces mor pel timeout del job).
    sys.stdout.reconfigure(line_buffering=True)
    transport = tria_transport()
    if transport is None:
        return 1
    fets = saltats = errors = 0
    # REFES_EDICIO=1 (entrada «refes_edicio» del workflow, 12.10.2026): torna a
    # sintetitzar TOTES les peces de l'edició actual encara que ja tinguin MP3,
    # p. ex. després de canviar de veu. Només a mà: la passada horària no ho fa.
    refes = os.environ.get("REFES_EDICIO", "") == "1"
    if refes:
        print("Mode «refés l'edició»: es tornen a fer tots els MP3 de l'edició actual.")

    # 0) Regeneració forçada (19.09.2026). Quan es rectifica una notícia ja
    #    publicada, el seu MP3 continua llegint el text antic, perquè la passada
    #    normal salta els àudios que ja són al servidor. Llançant el workflow a
    #    mà amb l'entrada «regenera» (slugs separats per comes), aquestes
    #    notícies es tornen a sintetitzar i el MP3 se sobreescriu. Només actua
    #    amb aquesta entrada: la passada horària no hi entra mai, de manera
    #    que no pot entrar en bucle.
    fets, errors = regenera_forcats(transport, fets, errors)

    # 1) Les notícies de l'edició (comportament de sempre).
    if ARTICLES.is_file():
        items = json.loads(ARTICLES.read_text(encoding="utf-8")).get("items", [])
        for item in items:
            slug = (item.get("slug") or "").strip()
            if not slug:
                continue
            if not refes and transport.ja_existeix(slug):
                saltats += 1
                continue
            text = "\n\n".join(
                part for part in (item.get("title", ""), item.get("excerpt", ""), item.get("body", ""))
                if part
            )
            if not text.strip():
                continue
            if sintetitza_i_puja(slug, text, transport):
                fets += 1
            else:
                errors += 1
    else:
        print(f"No s'ha trobat {ARTICLES}; cap notícia a sintetitzar.")

    # 2) Peces editorials fixes (anàlisi, tribuna, imatge del dia).
    #    Mai no fan fallar el workflow: si una peça falla, la pàgina conserva
    #    el lector de veu del navegador.
    peces = [(fitxer, prefix, camps, None, None) for fitxer, prefix, camps in PECES_EXTRES]
    # Veus de CIVICAi (opinió i entrevistes de tribuna-arxiu.js, i estudis
    # d'estudis-arxiu.js). Des del 18.10.2026 cada peça té el seu MP3
    # (nom_audio_civicai: civicai-AAAA-MM-DD-<autor>), i es fan totes les dels
    # darrers CIVICAI_DIES dies: dues veus el mateix dia ja no es trepitgen.
    # Abans d'aquella data només es feia la més recent, amb el nom antic
    # (tribuna-/estudi-AAAA-MM-DD), i se saltava si coincidia amb la vigent.
    limit = time.strftime("%Y-%m-%d", time.localtime(time.time() - CIVICAI_DIES * 86400))
    for fitxer, variable, camps, estudi, vigent in (
        (Path("public/tribuna-arxiu.js"), "IA_TRIBUNA_ARXIU", ("title", "excerpt", "body"), False, Path("public/tribuna.js")),
        (Path("public/estudis-arxiu.js"), "IA_ESTUDIS_ARXIU", ("title", "abstract", "body"), True, Path("public/estudis.js")),
    ):
        for peca in veus_civicai(fitxer, variable):
            iso = data_iso(str(peca.get("date", "")))
            if iso >= CIVICAI_DES_DE and iso >= limit:
                peces.append((fitxer, "", camps, peca, nom_audio_civicai(peca, estudi)))
        darrera = darrera_veu_civicai(fitxer, variable)
        iso = data_iso(str(darrera.get("date", "")))
        if darrera and iso and iso < CIVICAI_DES_DE:
            if iso == data_iso(str(llegeix_ia_js(vigent).get("date", ""))):
                print(f"AVÍS: la darrera veu de CIVICAi de {fitxer.name} (nom antic) té la mateixa data que la peça vigent; no se'n fa l'àudio.")
            else:
                peces.append((fitxer, "", camps, darrera, nom_audio_civicai(darrera, estudi)))
    empresa = darrera_veu_empresa()
    if empresa:
        peces.append((Path("public/empresa.js"), "empresa", ("title", "excerpt", "body"), empresa, None))
    for fitxer, prefix, camps, fixa, nom in peces:
        try:
            data = fixa if fixa is not None else llegeix_ia_js(fitxer)
            iso = data_iso(str(data.get("date", "")))
            if not data or not iso:
                continue
            slug = nom or f"{prefix}-{iso}"
            if not refes and transport.ja_existeix(slug):
                saltats += 1
                continue
            text = "\n\n".join(
                camp_com_a_text(data.get(camp)) for camp in camps if camp_com_a_text(data.get(camp))
            )
            if not text:
                continue
            if sintetitza_i_puja(slug, text, transport):
                fets += 1
            else:
                print(f"AVÍS: no s'ha pogut generar l'àudio de {fitxer.name} (no bloqueja res).")
        except Exception as exc:  # les peces extres mai no trenquen la resta
            print(f"AVÍS: error inesperat amb {fitxer}: {exc}")

    print(f"---\nGenerats: {fets} · Ja existien: {saltats} · Errors: {errors}")
    # Si alguna pujada de NOTÍCIA ha fallat, marquem el workflow com a fallit
    # perquè es vegi i es pugui reexecutar.
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
