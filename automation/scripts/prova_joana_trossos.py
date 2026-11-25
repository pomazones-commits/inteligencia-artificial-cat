#!/usr/bin/env python3
"""Prova (25.11.2026): llegeix amb la Joana, a trossos, les notícies de l'edició
actual (public/data/articles.json) i diu quantes surten. NO puja res al servidor
ni toca cap MP3 del web: només serveix per comprovar el mètode abans d'activar-lo."""
import json
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import genera_audio as g  # noqa: E402

sys.stdout.reconfigure(line_buffering=True)
items = json.loads(Path("public/data/articles.json").read_text(encoding="utf-8")).get("items", [])
bones = ajornades = 0
inici = time.monotonic()
for item in items:
    text = "\n\n".join(p for p in (item.get("title", ""), item.get("excerpt", ""), item.get("body", "")) if p)
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / "text.txt"
        f.write_text(text, encoding="utf-8")
        mp3 = Path(td) / "audio.mp3"
        t = time.monotonic()
        try:
            ok = g._sintetitza_edge(f, mp3, item["slug"])
        except g.Ajornada as motiu:
            ok = None
            print(f"AJORNADA {item['slug']}: {motiu}")
        if ok:
            bones += 1
            print(f"JOANA {item['slug']}: {len(g.trossos_edge(text))} trossos, "
                  f"{mp3.stat().st_size // 1024} KB, {time.monotonic() - t:.0f} s")
        elif ok is None:
            ajornades += 1
        else:
            print(f"KO {item['slug']} (403 o edge-tts absent)")
print(f"---\nJoana: {bones} de {len(items)} · ajornades: {ajornades} · {time.monotonic() - inici:.0f} s en total")
