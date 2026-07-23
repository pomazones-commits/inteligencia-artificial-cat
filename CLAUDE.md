# intel·ligènciaartificial.cat — instruccions per a sessions editorials

Aquest repositori publica `inteligencia-artificial.cat`. El directori públic és `public/` i es desplega automàticament a Hostinger per FTP quan hi ha un push a `main` (workflow `desplega.yml`).

## Flux editorial vigent (des del 17.07.2026)

**Les sessions editorials NO escriuen mai directament `public/news.js`, `public/radar.js`, `public/analysis.js`, `public/reflection.js` ni `public/daily-image.js`.** Aquests fitxers els genera el Content Hub (GitHub Actions) després de validar el contingut.

El que ha de fer cada sessió editorial:

1. **Lot de notícies (4 cops al dia, 5 notícies per lot):** escriure el lot com a array JSON a `incoming/news-batch.json` seguint `automation/prompts/news-batch.md`. Les imatges de cada notícia es desen a `public/assets/<slug>-AAAAMMDD.jpg`. En fer push, el workflow `content-hub.yml` valida el lot, l'acumula amb els lots anteriors del dia (fins a 20 notícies), deriva el radar català, actualitza l'hemeroteca i publica.
2. **Fotografia editorial diària (només la primera execució del dia):** desar la imatge a `public/assets/daily-reflection-AAAA-MM-DD.jpg` i les metadades a `incoming/daily-image.json` segons `automation/prompts/daily-image.md`.
3. **Peces setmanals (divendres):** `incoming/analysis.json` i `incoming/reflection.json` segons `automation/prompts/analysis.md` i `automation/prompts/reflection.md`.
4. **Publicar:** `git add -A && git commit -m "Lot HH.MM del DD.MM.AAAA" && git push origin main`. Res més: la validació, l'acumulació fins a 20, la deduplicació, el radar, l'arxiu i el desplegament són automàtics.

## Criteris editorials de selecció de notícies (vigents des del 23.07.2026)

> Aquests criteris manen sobre qualsevol instrucció de cerca més antiga de la tasca programada. Objectiu: menys repetició de la mateixa notícia catalana dia rere dia i més notícies d'adopció d'IA per empreses, sobretot de la premsa econòmica.

**a) Antirepetició multi-dia.** Abans de triar res, llegeix `public/news.js`, `public/radar.js`, `public/content-status.json` i `public/data/archive.json` (hemeroteca). Fes-te una llista del que ja s'ha cobert els darrers 7-10 dies —no només pels *slugs*, sinó pel **tema** i els **protagonistes** (empresa, projecte, xifra, font)— i no ho tornis a triar. Vigila els **duplicats dissimulats** amb un slug diferent: si el fet central ja s'ha publicat, descarta'l encara que canviïn slug, titular o font (cas real a evitar: la inversió de 1.000 milions al centre de dades de Flix/Ercros publicada dos cops amb slugs distints). Només pots reprendre un tema si hi ha una **novetat material i realment nova**, i llavors tracta-la com a *actualització*, no com si fos nova.

**b) Fonts i angle.** Mantén com a **base** la cerca global d'actualitat (OpenAI, Anthropic, Google…): és la font principal i mana per importància. A MÉS, afegeix una cerca de l'**adopció de la IA per part d'empreses** amb èmfasi en la **premsa econòmica** (Expansión, Cinco Días, El Economista, Expansión Catalunya, Via Empresa, Món Empresarial): casos d'ús, projectes, inversions i resultats reals, no notes de premsa buides. Aquesta cerca substitueix la cerca catalana genèrica (massa repetitiva). Prioritat geogràfica: **primer empreses catalanes**; si un dia no n'hi ha prou de rellevants, admet empreses espanyoles perquè el fil no quedi buit. Inclou aquest angle quan hi hagi material genuí (normalment 1 notícia, com a molt 2), **sense saturar** i **sense desplaçar** l'actualitat general de primer nivell. Si un dia no hi ha res prou nou, no forcis.

**c) Encaminament de seccions (camp `seccio`).** Vegeu `automation/prompts/news-batch.md`. Les notícies d'adopció d'IA per empreses **no purament catalanes** porten `"seccio":"radar"` → van NOMÉS a «La IA que passa aquí» i no saturen el feed «El senyal d'avui». Les d'una empresa **purament catalana** no porten `seccio` (surten al feed i, com que tenen context català, es deriven soles al radar). L'actualitat general tampoc no porta `seccio`.

## Regles

- Si una imatge de notícia no s'ha pogut generar, ometre el camp `image` d'aquella notícia (no posar-hi rutes que no existeixen).
- No editar mai `public/index.html` per canviar dates o versions: la portada llegeix les dades dinàmicament.
- No tocar `public/styles.css` (l'usen les pàgines interiors) ni `public/portada.css` (portada) sense una ordre explícita de Rafael.
- No trencar els contractes públics: `window.IA_NEWS`, `window.IA_RADAR`, `window.IA_ANALYSIS`, `window.IA_REFLECTION`, `window.IA_DAILY_IMAGE`, `article.php?slug=...`, `api.php?action=subscribe`.
- Cap clau d'API no pot aparèixer mai en cap fitxer del repositori ni en cap commit.
- Si les instruccions d'una tasca programada antiga contradiuen aquest document (per exemple, demanant reescriure `news.js` directament), té preferència aquest document.

Documentació completa: `docs/AUTOMATITZACIO_EDITORIAL.md`.
