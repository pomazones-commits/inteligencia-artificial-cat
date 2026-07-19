#!/usr/bin/env python3
"""Genera un MP3 per notícia amb la veu neuronal catalana i el puja per FTP.

S'executa dins de GitHub Actions (gratuït) amb edge-tts i la veu ca-ES-JoanaNeural.
Els MP3 NO es guarden al repositori: es pugen directament al servidor per FTP,
a assets/audio/<slug>.mp3. Si una síntesi falla, la notícia conserva el lector
de veu del navegador com a xarxa de seguretat (article.php ho gestiona sol).
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

VOICE = "ca-ES-JoanaNeural"
FTP_HOST = "srv1589.hstgr.io"
FTP_USER = "u901078817.claude"
ARTICLES = Path("public/data/articles.json")
MIDA_MINIMA = 20000  # bytes: per sota d'això considerem l'àudio corrupte


def curl(args, **kw):
    base = ["curl", "-sS", "--ftp-ssl-control", "--connect-timeout", "20"]
    return subprocess.run(base + args, **kw)


def main() -> int:
    password = os.environ.get("FTP_PASSWORD", "")
    if not password:
        print("FTP_PASSWORD no està definida; no es pot pujar res.")
        return 1
    if not ARTICLES.is_file():
        print(f"No s'ha trobat {ARTICLES}; res a fer.")
        return 0
    auth = f"{FTP_USER}:{password}"
    items = json.loads(ARTICLES.read_text(encoding="utf-8")).get("items", [])
    fets = saltats = errors = 0
    for item in items:
        slug = (item.get("slug") or "").strip()
        if not slug:
            continue
        remote = f"ftp://{FTP_HOST}/assets/audio/{slug}.mp3"
        ja_hi_es = curl(
            ["-u", auth, "-r", "0-0", "-o", os.devnull, "--max-time", "40", remote],
            stderr=subprocess.DEVNULL,
        ).returncode == 0
        if ja_hi_es:
            saltats += 1
            continue
        text = "\n\n".join(
            part for part in (item.get("title", ""), item.get("excerpt", ""), item.get("body", ""))
            if part
        )
        if not text.strip():
            continue
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
                print(f"ERROR sintetitzant {slug} (la notícia conserva el lector del navegador)")
                errors += 1
                continue
            pujada = curl(
                ["--ftp-create-dirs", "--retry", "4", "--retry-delay", "6", "--retry-all-errors",
                 "--max-time", "180", "-T", str(mp3), "-u", auth, remote]
            )
            if pujada.returncode == 0:
                print(f"OK {slug}.mp3 ({mp3.stat().st_size // 1024} KB)")
                fets += 1
            else:
                print(f"ERROR pujant {slug}.mp3")
                errors += 1
    print(f"---\nGenerats: {fets} · Ja existien: {saltats} · Errors: {errors}")
    # Si alguna pujada ha fallat, marquem el workflow com a fallit perquè es vegi
    # i es pugui reexecutar (abans retornàvem èxit i les errades passaven inadvertides).
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
