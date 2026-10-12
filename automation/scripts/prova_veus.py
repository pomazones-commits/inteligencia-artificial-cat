#!/usr/bin/env python3
"""Prova de veus (12.10.2026): llegeix UNA notícia amb diverses veus de Matxa.

Matxa és la veu catalana de Projecte Aina (Barcelona Supercomputing Center).
Corre dins del runner amb el contenidor oficial `projecteaina/tts-api`, que el
workflow `prova-veus.yml` engega a http://localhost:8000. Aquest script:

  1. tria una notícia (entrada «slug» o, si és buida, la primera de l'edició),
  2. la sintetitza amb cada veu demanada, paràgraf a paràgraf,
  3. la passa a MP3 i la puja a assets/audio/prova-veu-matxa-<veu>.mp3,
  4. diu quant ha trigat cada veu (per saber si cap al workflow diari).

No toca cap MP3 de les notícies ni cap fitxer del web: és només per escoltar i
triar. La neteja setmanal d'àudio (neteja_audio.py) els retira sols als 90 dies.
"""
import json
import re
import os
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from genera_audio import ARTICLES, cerca_noticia, tria_transport, wav_a_mp3  # noqa: E402

API = os.environ.get("MATXA_API", "http://localhost:8000")
# veu:variant. Variants del servei: ca-es (central), ca-ba (balear),
# ca-nw (nord-occidental), ca-va (valencià).
VEUS_DEFECTE = "elia:ca-es,grau:ca-es,olga:ca-ba,emma:ca-nw,gina:ca-va"


def tria_noticia():
    slug = os.environ.get("SLUG", "").strip()
    if slug:
        item = cerca_noticia(slug)
        if not item:
            sys.exit(f"No trobo la notícia «{slug}».")
        return item
    items = json.loads(ARTICLES.read_text(encoding="utf-8")).get("items", [])
    if not items:
        sys.exit("L'edició d'avui no té notícies.")
    return items[0]


SUBSTITUCIONS = {
    "(": ", ", ")": ", ", "[": ", ", "]": ", ", "—": ", ", "–": ", ", "/": " ",
    "%": " per cent", "&": " i ", "’": "'", "‘": "'", "«": "", "»": "", "“": "", "”": "",
    '"': "", "…": "...", " ": " ",
}
# Lletres (amb els accents i la ela geminada), xifres i la puntuació bàsica.
PERMESOS = re.compile(r"[^0-9A-Za-zÀ-ÖØ-öø-ÿ·' .,;:?!¡¿\-]")


def neteja(text: str, estricta: bool = False) -> str:
    """Matxa peta (KeyError al símbol) amb caràcters que no coneix, com «(»."""
    for a, b in SUBSTITUCIONS.items():
        text = text.replace(a, b)
    text = PERMESOS.sub(" ", text)
    if estricta:  # segon intent: només lletres, xifres, punts i comes
        text = re.sub(r"[^0-9A-Za-zÀ-ÖØ-öø-ÿ·' .,]", " ", text)
    text = re.sub(r"\s+([,.;:?!])", r"\1", text)      # sense espai abans de la puntuació
    text = re.sub(r",(\s*[,.;:?!])+", lambda m: m.group(0).strip(", ")[-1:] or ",", text)
    return re.sub(r"\s{2,}", " ", text).strip(" ,")


def demana(part: str, veu: str, variant: str) -> bytes:
    cos = json.dumps({"voice": veu, "language": variant, "type": "text", "text": part}).encode()
    req = urllib.request.Request(f"{API}/api/tts", data=cos,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()


def sintetitza(text: str, veu: str, variant: str, desti: Path) -> None:
    """POST /api/tts per paràgraf i ho uneix tot en un sol WAV."""
    parts = [neteja(p) for p in text.split("\n") if p.strip()]
    params = None
    frames = []
    for i, part in enumerate(p for p in parts if p):
        try:
            dades = demana(part, veu, variant)
        except urllib.error.HTTPError:
            dades = demana(neteja(part, estricta=True), veu, variant)
        tros = desti.with_name(f"tros-{i}.wav")
        tros.write_bytes(dades)
        with wave.open(str(tros), "rb") as w:
            params = params or w.getparams()
            frames.append(w.readframes(w.getnframes()))
            # mitja segon de silenci entre paràgrafs
            frames.append(b"\x00" * (w.getsampwidth() * w.getnchannels() * (w.getframerate() // 2)))
    with wave.open(str(desti), "wb") as w:
        w.setparams(params)
        for f in frames:
            w.writeframes(f)


# --- Gemini (Google) -------------------------------------------------------
# La clau arriba NOMÉS per l'entorn (secret GEMINI_API_KEY de GitHub), mai en
# cap fitxer. Interactions API: el text es llegeix tal qual i l'estil va a part.
GEMINI_URL = os.environ.get("GEMINI_URL", "https://generativelanguage.googleapis.com/v1beta/interactions")
GEMINI_VEUS_DEFECTE = "Kore:gemini-3.8-flash-lite-tts,Charon:gemini-3.8-flash-lite-tts,Kore:gemini-3.8-flash-tts"
GEMINI_ESTIL = ("Locució de notícies en català central, to informatiu i serè, "
                "ritme pausat, pronúncia catalana genuïna.")


def _darrer_audio(node):
    """Busca a la resposta el darrer bloc {"type": "audio", "data": ...}."""
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


def sintetitza_gemini(text: str, veu: str, model: str, desti: Path) -> None:
    import base64
    clau = os.environ.get("GEMINI_API_KEY", "").strip()
    if not clau:
        raise RuntimeError("falta el secret GEMINI_API_KEY")
    cos = json.dumps({
        "model": model,
        "input": [{"type": "user_input", "content": [{
            "type": "text", "text": text,
            "annotations": [{"type": "speech_metadata", "style": GEMINI_ESTIL}],
        }]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": veu}]},
    }).encode()
    # Des del maig del 2026 AI Studio dona claus «AQ.» (Authentication Keys) en
    # lloc de les antigues «AIza». Les dues van a x-goog-api-key; si Google la
    # rebutja per tipus de testimoni, es prova una vegada com a Bearer.
    capçaleres = [{"x-goog-api-key": clau}, {"Authorization": f"Bearer {clau}"}]
    for i, auth in enumerate(capçaleres):
        req = urllib.request.Request(GEMINI_URL, data=cos,
                                     headers={"Content-Type": "application/json", **auth})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                resposta = json.loads(r.read())
            break
        except urllib.error.HTTPError as exc:
            # El cos de l'error de Google no porta la clau; en mostrem el principi.
            detall = exc.read().decode("utf-8", "replace")[:300]
            if exc.code in (401, 403) and i == 0:
                print(f"   (x-goog-api-key rebutjada amb {exc.code}; es prova com a Bearer)")
                continue
            raise RuntimeError(f"HTTP {exc.code}: {detall}") from None
    dades = _darrer_audio(resposta)
    if not dades:
        raise RuntimeError(f"resposta sense àudio: {str(resposta)[:300]}")
    bruts = base64.b64decode(dades)
    if bruts[:4] == b"RIFF":
        desti.write_bytes(bruts)
    else:  # PCM sense capçalera: 24 kHz, mono, 16 bits
        with wave.open(str(desti), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(24000)
            w.writeframes(bruts)


def main() -> int:
    sys.stdout.reconfigure(line_buffering=True)
    motor = os.environ.get("MOTOR", "matxa").strip().lower() or "matxa"
    if motor == "matxa":
        with urllib.request.urlopen(f"{API}/api/available-voices", timeout=30) as r:
            print("Veus disponibles al servei:", r.read().decode()[:400])

    item = tria_noticia()
    text = "\n".join(p for p in (item.get("title", ""), item.get("excerpt", ""), item.get("body", "")) if p)
    print(f"Notícia: {item.get('slug')} ({len(text)} caràcters)")

    transport = tria_transport()
    if transport is None:
        return 1

    errors = 0
    defecte = GEMINI_VEUS_DEFECTE if motor == "gemini" else VEUS_DEFECTE
    for parell in (os.environ.get("VEUS", "").strip() or defecte).split(","):
        veu, _, variant = parell.strip().partition(":")
        variant = variant or ("gemini-3.8-flash-lite-tts" if motor == "gemini" else "ca-es")
        with tempfile.TemporaryDirectory() as td:
            wav = Path(td) / "veu.wav"
            mp3 = Path(td) / "veu.mp3"
            inici = time.time()
            try:
                if motor == "gemini":
                    sintetitza_gemini(text, veu, variant, wav)
                else:
                    sintetitza(text, veu, variant, wav)
                wav_a_mp3(wav, mp3)
            except Exception as exc:
                print(f"ERROR amb {veu} ({variant}): {exc}")
                errors += 1
                continue
            segons = time.time() - inici
            if motor == "gemini":
                gamma = "lite" if "lite" in variant else "flash"
                nom = f"prova-veu-gemini-{veu.lower()}-{gamma}"
            else:
                nom = f"prova-veu-matxa-{veu}"
            if transport.puja(mp3, nom):
                print(f"OK {nom}.mp3 · {variant} · {mp3.stat().st_size // 1024} KB · {segons:.0f} s de síntesi")
                print(f"   https://inteligencia-artificial.cat/assets/audio/{nom}.mp3")
            else:
                print(f"ERROR pujant {nom}.mp3")
                errors += 1
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
