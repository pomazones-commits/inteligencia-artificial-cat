#!/usr/bin/env python3
"""Genera un MP3 per notícia amb la veu neuronal catalana i el puja per FTP.

S'executa dins de GitHub Actions (gratuït) amb edge-tts i la veu ca-ES-JoanaNeural.
Els MP3 NO es guarden al repositori: es pugen directament al servidor per FTP,
a assets/audio/<slug>.mp3. Si una síntesi falla, la notícia conserva el lector
de veu del navegador com a xarxa de seguretat (article.php ho gestiona sol).

A més de les notícies, també sintetitza les peces editorials fixes
(anàlisi de la setmana, tribuna i imatge del dia) llegint els seus fitxers
window.IA_* de public/. Els noms de fitxer inclouen la data perquè cada
edició nova tingui el seu àudio: analisi-AAAA-MM-DD.mp3, tribuna-AAAA-MM-DD.mp3,
imatge-AAAA-MM-DD.mp3. Les pàgines calculen la mateixa URL a partir del camp
`date` de cada peça. Qualsevol errada en aquestes peces extres NO fa fallar
la síntesi de les notícies.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

VOICE = "ca-ES-JoanaNeural"
FTP_HOST = "srv1589.hstgr.io"
FTP_USER = "u901078817.claude"
ARTICLES = Path("public/data/articles.json")
MIDA_MINIMA = 20000  # bytes: per sota d'això considerem l'àudio corrupte

# Peces editorials fixes: (fitxer window.IA_*, prefix del nom del MP3, camps de text)
PECES_EXTRES = [
    (Path("public/analysis.js"), "analisi", ("title", "excerpt", "body")),
    (Path("public/tribuna.js"), "tribuna", ("title", "excerpt", "body")),
    (Path("public/daily-image.js"), "imatge", ("title", "caption", "body")),
]


def curl(args, **kw):
    base = ["curl", "-sS", "--ftp-ssl-control", "--connect-timeout", "20"]
    return subprocess.run(base + args, **kw)


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


def ja_existeix(slug: str, auth: str) -> bool:
    remote = f"ftp://{FTP_HOST}/assets/audio/{slug}.mp3"
    return curl(
        ["-u", auth, "-r", "0-0", "-o", os.devnull, "--max-time", "40", remote],
        stderr=subprocess.DEVNULL,
    ).returncode == 0


def sintetitza_i_puja(slug: str, text: str, auth: str) -> bool:
    """Sintetitza `text` i el puja a assets/audio/<slug>.mp3. True si tot ha anat bé."""
    remote = f"ftp://{FTP_HOST}/assets/audio/{slug}.mp3"
    with tempfile.TemporaryDirectory() as td:
        fitxer_text = Path(td) / "text.txt"
        mp3 = Path(td) / "audio.mp3"
        fitxer_text.write_text(text, encoding="utf-8")
        correcte = False
        for _ in range(3):
            resultat = subprocess.run(
                ["edge-tts", "--voice", VOICE, "-f", str(fitxer_text), "--write-media", str(mp3)]
            )
            if resultat.returncode == 0 and mp3.is_file() and mp3.stat().st_size > MIDA_MINIMA:
                correcte = True
                break
        if not correcte:
            print(f"ERROR sintetitzant {slug} (la peça conserva el lector del navegador)")
            return False
        pujada = curl(
            ["--ftp-create-dirs", "--retry", "4", "--retry-delay", "6", "--retry-all-errors",
             "--max-time", "180", "-T", str(mp3), "-u", auth, remote]
        )
        if pujada.returncode == 0:
            print(f"OK {slug}.mp3 ({mp3.stat().st_size // 1024} KB)")
            return True
        print(f"ERROR pujant {slug}.mp3")
        return False


def main() -> int:
    password = os.environ.get("FTP_PASSWORD", "")
    if not password:
        print("FTP_PASSWORD no està definida; no es pot pujar res.")
        return 1
    auth = f"{FTP_USER}:{password}"
    fets = saltats = errors = 0

    # 1) Les notícies de l'edició (comportament de sempre).
    if ARTICLES.is_file():
        items = json.loads(ARTICLES.read_text(encoding="utf-8")).get("items", [])
        for item in items:
            slug = (item.get("slug") or "").strip()
            if not slug:
                continue
            if ja_existeix(slug, auth):
                saltats += 1
                continue
            text = "\n\n".join(
                part for part in (item.get("title", ""), item.get("excerpt", ""), item.get("body", ""))
                if part
            )
            if not text.strip():
                continue
            if sintetitza_i_puja(slug, text, auth):
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
            if ja_existeix(slug, auth):
                saltats += 1
                continue
            text = "\n\n".join(
                str(data.get(camp, "")).strip() for camp in camps if str(data.get(camp, "")).strip()
            )
            if not text:
                continue
            if sintetitza_i_puja(slug, text, auth):
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
