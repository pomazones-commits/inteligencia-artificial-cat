# Content Hub — capa d'automatització editorial

Aquest sistema no substitueix la generació editorial de Claude: la valida, l'acumula i la publica de manera segura. Vegeu la documentació operativa completa a [`docs/AUTOMATITZACIO_EDITORIAL.md`](../docs/AUTOMATITZACIO_EDITORIAL.md).

## Ordres

```sh
# Acumular un lot de notícies (el fan servir els workflows)
node automation/scripts/content-hub.mjs ingest-news --input incoming/news-batch.json --public-dir public --state-dir .content-state --target 20

# Validar i publicar peces setmanals
node automation/scripts/content-hub.mjs ingest-editorial --type analysis --input incoming/analysis.json --public-dir public --state-dir .content-state
node automation/scripts/content-hub.mjs ingest-editorial --type reflection --input incoming/reflection.json --public-dir public --state-dir .content-state

# Validar i publicar la fotografia editorial diària
node automation/scripts/content-hub.mjs ingest-daily-image --input incoming/daily-image.json --public-dir public --state-dir .content-state

# Només validar, sense publicar
node automation/scripts/content-hub.mjs validate --type news --input incoming/news-batch.json

# Proves
node --test automation/tests/content-hub.test.mjs
```

## Adaptacions respecte del prototip del paquet de traspàs

- Rutes adaptades a l'estructura real del repositori: web a `public/`, safata a `incoming/`, estat a `.content-state/` (arrel, fora del directori desplegat).
- El radar català només incorpora notícies realment catalanes i conserva els senyals anteriors (decisió editorial de Rafael, 17.07.2026).
- El camp `image` de cada notícia és opcional: si una imatge no s'ha pogut generar, la targeta es publica sense imatge en lloc de rebutjar el lot.
- `ingest-news` manté també els contractes existents del web: `public/data/articles.json` (usat per `article.php`), `public/content/latest.json` (usat per `api.php?action=latest`) i l'hemeroteca `public/data/arxiu.json`, on l'edició anterior s'arxiva automàticament en canviar de dia.
