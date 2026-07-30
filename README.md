# intel·ligència artificial.cat

Diari digital en català sobre intel·ligència artificial: [inteligencia-artificial.cat](https://inteligencia-artificial.cat)

Portada editorial pensada per ser ràpida, accessible i visualment immersiva, amb quatre edicions diàries, arxiu temàtic, butlletí i lectura en veu alta de cada peça.

## Com funciona la publicació

Unes **tasques programades de Claude (Cowork)** escriuen el contingut i generen les imatges → ho pugen a aquest repositori → **GitHub Actions** valida i genera els fitxers del web → es desplega sol a **Hostinger** per FTP. El navegador només carrega dades ja generades.

1. La tasca «Edicions» deixa un lot de notícies a `incoming/` i les imatges a `public/assets/`, i fa push a `main`.
2. `content-hub.yml` executa `automation/scripts/content-hub.mjs`: valida el lot, l'acumula amb els del dia, deriva el radar català, actualitza l'hemeroteca i genera `public/news.js`, `public/radar.js`, `public/data/*` i `public/content/latest.json`.
3. `desplega.yml` puja `public/` a Hostinger.
4. `audio-edicio.yml` sintetitza els MP3 de cada peça amb veu neuronal en català i els puja al mateix servidor.
5. `xarxa-seguretat.yml` compara l'estat del repositori amb el que serveix la web i rellança el que hagi fallat.

Els models fets servir són **Claude (Anthropic)** per al text i **Gemini** per a les imatges. Cap clau d'API no viu al repositori.

## Documentació

- **`CLAUDE.md`** — font de veritat del flux editorial i les regles de redacció. Llegir-lo abans de tocar res.
- **`docs/AUTOMATITZACIO_EDITORIAL.md`** — documentació completa de l'automatització.
- **`docs/PUBLICACIO_I_XARXES_DE_SEGURETAT.md`** — com arriba una edició a la web, què falla més sovint i com recuperar-ho a mà.

## Veure la portada en local

```bash
npm install
npm run dev
```

Obre `http://localhost:4173`. La portada llegeix els fitxers de dades ja generats; no cal cap clau ni cap servei extern.

## Provar l'automatització

```bash
node --test automation/tests/content-hub.test.mjs
```

Cal passar aquestes proves abans de fer commit de qualsevol canvi a `automation/scripts/content-hub.mjs`.

## Avisos

- **No editar mai a mà** `public/news.js`, `radar.js`, `analysis.js`, `reflection.js` ni `daily-image.js`: els regenera el Content Hub i el canvi es perdria. `public/tribuna.js` sí que és manual.
- Si canvies `public/app.js` o els CSS, puja el paràmetre `?v=` de les pàgines que els enllacen, o la memòria cau servirà la còpia antiga.
- Els contractes públics que no s'han de trencar són `window.IA_NEWS`, `IA_RADAR`, `IA_ANALYSIS`, `IA_REFLECTION`, `IA_DAILY_IMAGE`, `IA_TRIBUNA`, més `article.php?slug=…` i `api.php?action=subscribe`.
