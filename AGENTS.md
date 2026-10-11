# AGENTS.md — instruccions per a agents de programació

Aquest fitxer segueix la convenció AGENTS.md (https://agents.md/) i va adreçat a qualsevol agent que treballi en aquest repositori (Codex, Gemini CLI, Cursor, Copilot, Claude Code…). **No és per als lectors del web**: per als models i agents que visiten `inteligencia-artificial.cat` hi ha `public/llms.txt`, `/llms-full.txt` i les eines WebMCP de `public/webmcp.js`.

## Llegeix primer

1. **`CLAUDE.md`** — és la font de veritat del flux editorial i de les regles del repositori, i val per a tots els agents, no només per a Claude. Si alguna cosa d'aquest fitxer el contradiu, mana `CLAUDE.md`.
2. **`docs/AUTOMATITZACIO_EDITORIAL.md`** — documentació completa de l'automatització.

Aquest fitxer només en resumeix el mínim per no trencar res.

## Què és

Web estàtic + PHP (`public/`) desplegat sol a Hostinger per GitHub Actions en cada push a `main` que toqui `public/**`. El contingut el generen tasques programades (text amb Claude, imatges amb Gemini) que deixen fitxers a `incoming/`; el Content Hub (`automation/scripts/content-hub.mjs`) els valida i genera les dades del web. **El web no fa servir OpenAI.**

## Regles que no es poden saltar

- ❌ **No editis mai a mà** `public/news.js`, `radar.js`, `analysis.js`, `reflection.js`, `daily-image.js`, `reflexio-diaria.js` ni `reflexions-arxiu.js`, ni res de `.content-state/`: els regenera el Content Hub.
- ❌ **Cap clau d'API, contrasenya ni token secret** en cap fitxer ni en cap commit.
- ✅ **Mantén els contractes públics**: `window.IA_NEWS`, `IA_RADAR`, `IA_ANALYSIS`, `IA_REFLECTION`, `IA_DAILY_IMAGE`, `IA_REFLEXIO_DIARIA`, `IA_REFLEXIONS_ARXIU`, `IA_TRIBUNA`, `IA_TRIBUNA_ARXIU`, `IA_ESTUDI`, `IA_ESTUDIS_ARXIU`, `article.php?slug=…` i `api.php?action=subscribe`.
- 🛑 **Cap recurs de tercers a les pàgines** (ni Google Fonts, ni analítica, ni CDN): l'avís legal diu que el web no envia dades dels lectors a ningú i no posa galetes.
- ✅ A `public/shared.js` i `public/webmcp.js`, **rutes absolutes** (també s'executen a `/tema/<slug>`).
- ✅ Si canvies un `.js` o un `.css` de `public/`, **puja el `?v=`** a totes les pàgines que l'enllacen.
- ✅ No toquis `public/styles.css` ni `public/portada.css` sense una ordre explícita del responsable del web.
- ✅ Llengua dels textos visibles: **català**, sense calcs (vegeu la secció «Regles» de `CLAUDE.md`).

## Proves abans de cada commit

```bash
node --test automation/tests/content-hub.test.mjs   # sempre
node scripts/prova-peces.mjs                        # si toques inc/peces.php o public/peces.js
node scripts/prova-webmcp.mjs                       # si toques public/webmcp.js
php -l public/<fitxer>.php                          # si toques PHP
```

Ordre dels commits quan depenen entre ells: el codi abans que els tests, els workflows al final i `CLAUDE.md` l'últim.
