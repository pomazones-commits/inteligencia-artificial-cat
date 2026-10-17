# Safata d'entrada editorial

Claude deixa aquí el contingut generat; GitHub Actions el valida abans de publicar-lo:

- `news-batch.json` — lot de 5 notícies (workflow `content-hub.yml`).
- `daily-image.json` — metadades de la fotografia editorial diària (workflow `daily-visual.yml`).
- `analysis.json` i `reflection.json` — peces setmanals (workflow `editorial-weekly.yml`).
- `videos-assignats.json` — vídeos que han arribat tard i que la sessió lliga a notícies ja publicades (workflow `videos.yml`, 09.10.2026). Una llista: `[{"slug": "…", "video": "<id d'11 caràcters>", "idioma": "en", "resum": "…"}]`; `[]` si no n'hi ha cap. Només s'accepten vídeos que siguin a `public/data/videos.json`.
- `radio-fitxes.json` — fitxes noves de «La IA a la ràdio» escrites a partir dels candidats d'`automation/radio-candidats.json` (workflow `radio.yml`, 17.10.2026): `{"fitxes": [...], "descartats": [{"id": "…", "motiu": "…"}]}`. Cada fitxa es valida amb `scripts/valida-radio.mjs` abans d'entrar a `public/data/radio.json`.

Si un fitxer no supera la validació, la portada publicada no es toca.
