# Automatització editorial — intel·ligènciaartificial.cat

**Vigent des del 17 de juliol de 2026** (redisseny de portada + Content Hub).

## Visió general

Claude continua sent el motor editorial: selecciona, verifica i redacta. El Content Hub (GitHub Actions + `automation/scripts/content-hub.mjs`) valida, acumula i publica de manera segura el que Claude genera. Si un lot és defectuós, la portada publicada no es modifica.

```
Tasca de Claude al núvol (4×/dia)
   └─ escriu incoming/news-batch.json (+ imatges a public/assets/)
      └─ push a main
         ├─ content-hub.yml: valida → acumula fins a 20 → news.js, radar.js,
         │  articles.json, latest.json, arxiu.json, newsletter.json, content-status.json
         │  └─ commit "[content-hub] ..." a main
         └─ desplega.yml: puja public/ a Hostinger per FTP (a cada push amb canvis a public/)
```

## Calendari (tasques programades al núvol)

| Tasca | Cron (UTC) | Hora Barcelona (estiu) | Contingut |
|---|---|---|---|
| Edicions IA.cat — 4 lots diaris | `5 4,8,12,16 * * *` | 06.05, 10.05, 14.05, 18.05 | 5 notícies per lot; el lot de les 06.05 inclou també la fotografia editorial diària |
| Peces setmanals IA.cat | `35 4 * * 5` | divendres 06.35 | anàlisi setmanal + reflexió Quadern IA |

Atenció al canvi d'hora: els crons són en UTC. A l'hivern (CET) les execucions cauen una hora més tard en hora local.

## Fitxers que produeix el Content Hub

- `public/news.js` — fins a 20 notícies del dia (dedupe per `slug` i per URL de font).
- `public/radar.js` — fins a 8 senyals; **només** s'hi incorporen notícies realment catalanes i es conserven els senyals anteriors.
- `public/data/articles.json` i `public/content/latest.json` — contractes existents (`article.php`, `api.php?action=latest`).
- `public/data/arxiu.json` — hemeroteca per edicions; l'edició anterior s'arxiva automàticament en canviar de dia.
- `public/data/archive.json` — històric pla de fins a 1.000 notícies.
- `public/data/newsletter.json` — les 5 històries principals per al butlletí (no envia correus).
- `public/content-status.json` — estat: data d'edició, lots, recomptes i hora de l'última publicació.
- `public/analysis.js`, `public/reflection.js`, `public/daily-image.js` — quan Claude entrega les peces corresponents a `incoming/`.
- `.content-state/` — memòria dels lots del dia i còpies de seguretat (es versiona al repositori).

## Proves

```sh
node --test automation/tests/content-hub.test.mjs
```

Cobreixen: acumulació 4×5, dedupe, lot invàlid sense efectes, canvi de dia, arxivat d'edicions, radar només català, notícia sense imatge, peces setmanals i fotografia diària.

## Ruta de rollback

Abans del redisseny es va crear la branca `pre-redisseny-2026-07-17` amb l'última versió antiga en producció.

Per tornar enrere de manera immediata:

```sh
git checkout main
git revert --no-edit <commit-del-redisseny>   # o bé:
git reset --hard pre-redisseny-2026-07-17 && git push --force-with-lease origin main
```

El push a `main` redesplegarà automàticament la versió anterior per FTP. Després, tornar a activar la tasca antiga «Edició diària IA.cat» i desactivar les noves.

## Contractes que no s'han de trencar

`window.IA_NEWS`, `window.IA_RADAR`, `window.IA_ANALYSIS`, `window.IA_REFLECTION`, `window.IA_DAILY_IMAGE`, `article.php?slug=...`, `api.php?action=subscribe`, i els fitxers públics `news.js`, `radar.js`, `analysis.js`, `reflection.js`, `daily-image.js`.

Les pàgines interiors (`arxiu.html`, `analisi.html`, `dossiers.html`, `article.php`) continuen usant `public/styles.css`; la portada usa `public/portada.css`.
