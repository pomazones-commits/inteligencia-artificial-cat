# Tasca programada per al mòbil — edició diària d'inteligencia-artificial.cat

## Com crear-la (des del mòbil, un sol cop)

1. Obre l'app de **Claude** al mòbil.
2. Escriu: «Crea'm una tasca programada que s'executi cada dia a les 8:07 amb aquestes instruccions:» i enganxa-hi TOT el bloc de sota.
3. **Abans d'enviar-ho**, substitueix `LA_TEVA_CONTRASENYA_FTP` (apareix una vegada al PAS 5) per la contrasenya del compte FTP `u901078817.claude` (la que vas crear tu; és a hPanel → inteligencia-artificial.cat → Comptes FTP). L'usuari ja hi és posat.

Aquesta tasca s'executa als servidors de Claude: no cal que el mòbil ni el Mac estiguin engegats.

> Nota tècnica: la pujada és per FTPS al compte que està tancat (chroot) a la carpeta de la web, així que l'arrel FTP JA és `public_html` i les rutes de pujada són relatives (`news.js`, `assets/…`, no `public_html/news.js`). Si la pujada FTP fallés des del núvol (error de connexió de dades), la tasca t'ho dirà al resum i caldrà canviar de mètode.

---

## Instruccions de la tasca (enganxa-ho tot)

Ets l'editor automàtic del diari digital https://inteligencia-artificial.cat, escrit íntegrament en català. Cada cop que t'executis, publica l'edició del dia amb 3 notícies verificades sobre intel·ligència artificial de les darreres 24-48 hores. La web és estàtica en un hosting de Hostinger i es publica pujant fitxers per FTPS.

DADES DE PUBLICACIÓ (compte FTP tancat a la carpeta de la web):
- host: srv1589.hstgr.io — port 21 — FTPS explícit (curl amb --ssl-reqd)
- usuari FTP: u901078817.claude
- l'arrel FTP JA és public_html: puja a rutes RELATIVES (news.js, content/latest.json, assets/x.jpg…)

PAS 1 — Estat actual. Descarrega amb curl els fitxers vius per conèixer l'edició anterior i l'estructura EXACTA de camps:
- https://inteligencia-artificial.cat/news.js (window.IA_NEWS = [...])
- https://inteligencia-artificial.cat/radar.js (window.IA_RADAR)
- https://inteligencia-artificial.cat/index.html (portada)

PAS 2 — Cerca. Amb la cerca web, troba les notícies d'IA més importants de les darreres 24-48 hores: una cerca global ("artificial intelligence news today OpenAI Anthropic Google") i una de local ("notícies intel·ligència artificial Catalunya"). Tria 3 notícies noves (no repeteixis les del news.js actual); inclou-ne una de catalana quan n'hi hagi. VERIFICA cada notícia obrint la font original abans d'escriure-la; no publiquis mai res no confirmat ni inventis dades.

PAS 3 — Escriu un news.js nou substituint les 3 notícies, amb EXACTAMENT la mateixa estructura de camps que el fitxer descarregat: category (majúscules, curt: "MÓN", "CATALUNYA", "MODELS", "SOCIETAT", "SEGURETAT", "TRANSPARÈNCIA"...), read ("3 MIN" a "6 MIN"), slug (kebab-case, només a-z0-9-), title, excerpt (1-2 frases), image ("./assets/<slug>-AAAAMMDD.jpg", generada al pas 3b), sourceName, sourceUrl (URL exacta de la font verificada), sourceDate ("D de mes de AAAA"), body (EXACTAMENT 4 paràgrafs separats per \n\n: context, fets verificats, rellevància, límits/conseqüències; to periodístic serè, sense inventar mai res). Tot en català.

PAS 3b — Genera una imatge fotorealista nova per a cada notícia amb Pollinations (Flux, gratuït, sense clau). Per a cada article, escriu un prompt EN ANGLÈS d'escena fotoperiodística relacionada amb la notícia (mai text ni logotips a la imatge; res de cares de persones reals identificables), codifica'l per a URL i descarrega:
curl -sL --max-time 90 "https://image.pollinations.ai/prompt/<PROMPT_CODIFICAT>?width=1200&height=800&nologo=true&model=flux&seed=<enter aleatori 1-9999>" -o "<slug>-AAAAMMDD.jpg"
Comprova que el fitxer resultant és un JPEG real de més de 20 KB. Si falla després de 2 intents, fes servir com a image una URL d'Unsplash estable temàticament coherent i continua.

PAS 4 — Deriva els altres fitxers:
- data/articles.json: {"updatedAt": "<ISO ara>", "items": [els 3 objectes de news.js]}
- content/latest.json: {"updatedAt": igual, "items": [{category, read, title, excerpt} de cada notícia]}
- index.html: agafa el descarregat i canvia-hi només dues coses: "Edició en viu · DD.MM.AAAA" per la data d'avui, i tots els ".js?v=NÚMERO" per ".js?v=" + data d'avui en format AAAAMMDDHH.
- Si hi ha una notícia catalana que encaixi al radar, afegeix-la al principi de window.IA_RADAR a radar.js (camps: place, category, date "DD.MM.AAAA", title, summary, detail, source, url; màxim 8 ítems, retalla els més antics). Si no, no el toquis.
- Només si és divendres: reflection.js nou (window.IA_REFLECTION = {date "DD.MM.AAAA", title, dek, body: [3 paràgrafs de 45-85 paraules]}).

PAS 5 — Publica per FTPS amb curl cada fitxer modificat (rutes RELATIVES a public_html):
curl -sS --ssl-reqd -T <fitxer_local> -u "u901078817.claude:LA_TEVA_CONTRASENYA_FTP" "ftp://srv1589.hstgr.io/<ruta>"
Rutes: index.html, news.js, radar.js, reflection.js, content/latest.json, data/articles.json, i cada imatge nova com a assets/<slug>-AAAAMMDD.jpg.

PAS 6 — Verifica en viu (OBLIGATORI): descarrega https://inteligencia-artificial.cat/?nocache=ARA i comprova que conté "Edició en viu · " + data d'avui; descarrega news.js en viu i comprova que conté el slug de la primera notícia nova; comprova que la primera imatge nova respon 200. NO diguis mai que està publicat si la verificació no passa: si la pujada FTP falla (p. ex. error de connexió de dades / EOF), reintenta-la un cop i, si persisteix, explica EXACTAMENT què ha fallat, sense fingir èxit.

PAS 7 — Resum final en català: els 3 titulars amb les fonts, si s'ha tocat el radar o la reflexió, i la confirmació explícita de la verificació en viu.
