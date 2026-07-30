# Publicació i xarxes de seguretat

> Com arriba una edició a la web, què falla més sovint i què fer quan no hi arriba.
> Escrit el 30.07.2026 arran del lot de les 14.05, que es va quedar sense publicar.
> Complementa `docs/AUTOMATITZACIO_EDITORIAL.md` i `CLAUDE.md`.

## La cadena de publicació

1. La tasca programada «Edicions» escriu el lot a `incoming/news-batch.json`, genera les imatges i fa push a `main`.
2. `content-hub.yml` valida el lot i genera `public/news.js`, `public/radar.js`, `public/content-status.json` i companyia, i fa un commit.
3. `desplega.yml` puja `public/` a Hostinger per FTP.
4. `audio-edicio.yml` sintetitza els MP3 i els puja al mateix FTP.
5. `xarxa-seguretat.yml` reconcilia l'estat final (repo contra web en viu) i rellança el que faci falta.

Els passos 3 i 4 pengen del pas 2 per `workflow_run`, i per tant **es disparen tots dos al mateix instant**.

## Regla 1 — les execucions programades (cron) no són fiables

**GitHub deixa caure la immensa majoria dels `schedule` d'aquest repositori.** El 30.07.2026, comptat run a run: el cron horari de `desplega.yml` va disparar **1 cop de 24**, el de `audio-edicio.yml` 2, i el de `xarxa-seguretat.yml` 1. Aquell dia el desplegament d'un lot va fallar i **cap de les tres xarxes de seguretat no va arribar mai**: la web va quedar hora i mitja endarrerida fins que algú va llançar el workflow a mà.

Conseqüències pràctiques:

- **Fuig dels minuts rodons.** `:00`, `:15`, `:30`, `:45` i `:55` són els més congestionats de tot GitHub i els primers que es descarten. Per això els crons d'aquest repositori són a `:08`/`:38` (desplegament), `:26` (àudio) i `:23`/`:53` (xarxa de seguretat). Si n'afegeixes o en canvies un, **tria un minut no rodó**.
- **Res de crític no pot dependre només d'un cron.** El que ha de funcionar sí o sí va per encadenament (`workflow_run`) o per reintents dins del mateix job. El cron és una xarxa addicional, no la principal.
- **En diagnosticar, no diguis «ja ho recollirà la passada horària».** Comprova primer si aquella passada existeix: Actions, el workflow, i mira si hi ha cap run amb origen `schedule` a l'hora esperada. Sovint no n'hi ha cap.
- Efecte relacionat: després d'una run fallida els crons es poden quedar aturats i **només es resincronitzen quan hi ha un push nou a `main`**.

## Regla 2 — el desplegament i l'àudio no poden pujar per FTP alhora

El compte FTP de Hostinger té un límit de connexions simultànies. Com que `desplega.yml` i `audio-edicio.yml` es disparen alhora quan acaba el Content Hub, competeixen per aquestes connexions i el mirall del desplegament pot esgotar tots els intents. És exactament el que va passar el 30.07.2026 amb el lot de les 14.05.

**Solució aplicada:** `audio-edicio.yml` té un primer pas que **espera fins a 15 minuts** que no hi hagi cap execució de `desplega.yml` en curs o en cua abans de tocar l'FTP (consulta l'API de GitHub; per això el workflow té `permissions: actions: read`). Les notícies tenen prioritat sobre els àudios. Si l'espera s'exhaureix, continua igualment i la passada de repesca ho recull.

**Per què NO un grup de concurrència compartit,** que semblaria la solució òbvia: dins d'un grup, GitHub només manté una execució en curs i una en espera, i quan n'arriba una tercera **cancel·la la que esperava**. Amb l'ordre real dels events (push del lot, després Content Hub, després desplegament i àudio alhora) la cancel·lada hauria estat justament el desplegament que porta `news.js`. Si algun dia afegeixes un tercer workflow que pugi per FTP, posa-hi la mateixa espera, no un grup compartit.

## Regla 3 — el mirall compara data i mida, no només data

El mirall de `desplega.yml` **no fa servir `--only-newer`**, i és deliberat. Amb `--only-newer` lftp només compara dates: si un fitxer queda a mitges en un intent avortat, la seva data remota ja és la nova i **el fitxer trencat no es torna a pujar mai més**. La comparació per defecte mira data **i mida**, així es recupera sol. Segueix sent incremental (el que no ha canviat no es puja) i segueix **sense `--delete`**, perquè els MP3 de `assets/audio/` només viuen al servidor i no són al repositori.

## Diagnòstic quan la web no s'actualitza

1. Mira `public/content-status.json` al repositori i compara'l amb el que serveix la web, afegint-hi un paràmetre per saltar la memòria cau. Fixa't en `batchCount` i `newsCount`.
2. Si el del repositori va per davant, el problema és el pas 3 o el 4, no el contingut: ves a Actions i mira l'última execució de «Desplega la web a Hostinger».
3. Compte amb la memòria cau: una lectura des de fora del navegador pot donar contingut vell fins i tot amb paràmetre anticau. **El navegador amb recàrrega forta és la font de veritat.**
4. Error típic quan l'FTP no respon: `mirror: Fatal error: max-retries exceeded`.

## Recuperació manual

Actions, tria el workflow, **«Run workflow»** sobre la branca `main`. `workflow_dispatch` se salta la condició `if: success` que fa que un workflow encadenat s'ometi.

Ordre útil: primer «Content Hub — completar l'edició» si el lot no ha arribat ni al repositori, després «Desplega la web a Hostinger» per a les notícies i «Àudio de l'edició» per als MP3.

**No esperis** que s'arregli sol si ja ha fallat: rellançar-ho a mà triga tres minuts i les passades programades poden no arribar mai (regla 1).
