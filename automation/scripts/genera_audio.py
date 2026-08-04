#!/usr/bin/env python3
"""Genera un MP3 per notícia amb la veu neuronal catalana i el puja al servidor.

S'executa dins de GitHub Actions (gratuït) amb edge-tts i la veu ca-ES-JoanaNeural.
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
estudi-AAAA-MM-DD.mp3, imatge-AAAA-MM-DD.mp3. Les pàgines calculen la mateixa URL a partir del camp
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

VOICE = "ca-ES-JoanaNeural"
FTP_HOST = "srv1589.hstgr.io"
FTP_USER = "u901078817.claude"
SSH_PATH_DEFECTE = "domains/inteligencia-artificial.cat/public_html"
ARTICLES = Path("public/data/articles.json")
MIDA_MINIMA = 20000  # bytes: per sota d'això considerem l'àudio corrupte

# Peces editorials fixes: (fitxer window.IA_*, prefix del nom del MP3, camps de text)
PECES_EXTRES = [
    (Path("public/analysis.js"), "analisi", ("title", "excerpt", "body")),
    (Path("public/tribuna.js"), "tribuna", ("title", "excerpt", "body")),
    (Path("public/estudis.js"), "estudi", ("title", "abstract", "body")),
    (Path("public/daily-image.js"), "imatge", ("title", "caption", "body")),
    (Path("public/reflection.js"), "quadern", ("title", "dek", "body")),
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
        opcions = ["-i", str(clau_path), "-o", "StrictHostKeyChecking=accept-new",
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
            return False
        if r.returncode != 0:
            missatge = (r.stderr or "").strip().splitlines()
            print(f"SSH no disponible: {missatge[-1] if missatge else 'error desconegut'}")
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


def sintetitza_i_puja(slug: str, text: str, transport) -> bool:
    """Sintetitza `text` i el puja a assets/audio/<slug>.mp3. True si tot ha anat bé."""
    with tempfile.TemporaryDirectory() as td:
        fitxer_text = Path(td) / "text.txt"
        mp3 = Path(td) / "audio.mp3"
        fitxer_text.write_text(text, encoding="utf-8")
        correcte = False
        for intent in range(3):
            if intent:
                time.sleep(10)  # pausa entre reintents: el throttling d'edge-tts es recupera sol
            try:
                # timeout per intent: sense això, una síntesi penjada bloqueja la run
                # sencera fins al límit de 30 min del workflow i les peces restants
                # es queden sense àudio (va passar el 24.07.2026, runs #33 i #36).
                resultat = subprocess.run(
                    ["edge-tts", "--voice", VOICE, "-f", str(fitxer_text), "--write-media", str(mp3)],
                    timeout=120,
                )
            except subprocess.TimeoutExpired:
                print(f"AVÍS: edge-tts penjat amb {slug} (intent {intent + 1}/3); es reintenta.")
                continue
            if resultat.returncode == 0 and mp3.is_file() and mp3.stat().st_size > MIDA_MINIMA:
                correcte = True
                break
        if not correcte:
            print(f"ERROR sintetitzant {slug} (la peça conserva el lector del navegador)")
            return False
        if transport.puja(mp3, slug):
            print(f"OK {slug}.mp3 ({mp3.stat().st_size // 1024} KB)")
            return True
        print(f"ERROR pujant {slug}.mp3")
        return False


def main() -> int:
    transport = tria_transport()
    if transport is None:
        return 1
    fets = saltats = errors = 0

    # 1) Les notícies de l'edició (comportament de sempre).
    if ARTICLES.is_file():
        items = json.loads(ARTICLES.read_text(encoding="utf-8")).get("items", [])
        for item in items:
            slug = (item.get("slug") or "").strip()
            if not slug:
                continue
            if transport.ja_existeix(slug):
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
    for fitxer, prefix, camps in PECES_EXTRES:
        try:
            data = llegeix_ia_js(fitxer)
            iso = data_iso(str(data.get("date", "")))
            if not data or not iso:
                continue
            slug = f"{prefix}-{iso}"
            if transport.ja_existeix(slug):
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
