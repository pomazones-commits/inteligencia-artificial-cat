# Safata d'entrada editorial

Claude deixa aquí el contingut generat; GitHub Actions el valida abans de publicar-lo:

- `news-batch.json` — lot de 5 notícies (workflow `content-hub.yml`).
- `daily-image.json` — metadades de la fotografia editorial diària (workflow `daily-visual.yml`).
- `analysis.json` i `reflection.json` — peces setmanals (workflow `editorial-weekly.yml`).

Si un fitxer no supera la validació, la portada publicada no es toca.
