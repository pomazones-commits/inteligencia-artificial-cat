# intel·ligènciaartificial.cat — instruccions per a sessions editorials

Aquest repositori publica `inteligencia-artificial.cat`. El directori públic és `public/` i es desplega automàticament a Hostinger per FTP quan hi ha un push a `main` (workflow `desplega.yml`).

## Flux editorial vigent (des del 17.07.2026)

**Les sessions editorials NO escriuen mai directament `public/news.js`, `public/radar.js`, `public/analysis.js`, `public/reflection.js`, `public/daily-image.js`, `public/reflexio-diaria.js` ni `public/reflexions-arxiu.js`.** Aquests fitxers els genera el Content Hub (GitHub Actions) després de validar el contingut.

El que ha de fer cada sessió editorial:

1. **Lot de notícies (4 cops al dia, 5 notícies per lot):** escriure el lot com a array JSON a `incoming/news-batch.json` seguint `automation/prompts/news-batch.md`. Les imatges de cada notícia es desen a `public/assets/<slug>-AAAAMMDD.jpg`. En fer push, el workflow `content-hub.yml` valida el lot, l'acumula amb els lots anteriors del dia (fins a 20 notícies), deriva el radar català, actualitza l'hemeroteca i publica.
2. **Fotografia editorial diària (només la primera execució del dia):** desar la imatge a `public/assets/daily-reflection-AAAA-MM-DD.jpg` i les metadades a `incoming/daily-image.json` segons `automation/prompts/daily-image.md`. ⚠️ **PAS OBLIGATORI abans de generar-la (des del 14.08.2026):** executar `node automation/scripts/content-hub.mjs imatges-recents --state-dir .content-state` i obeir-ne la sortida. Diu quins **temes** estan vetats avui (roda tancada de 16 temes, cap repetició en **12 dies**), quins **escenaris** no es poden repetir (**30 dies**) i quins **subjectes** tampoc (**21 dies**). El JSON ha de portar els camps nous **`tema`, `escenari` i `subjecte`**: són el que alimenta aquesta memòria per als dies següents. També hi ha una llista de composicions prohibides al punt 2 del prompt. **Motiu:** de les 29 primeres fotografies, 6 eren «un pagès amb tauleta al camp» i 6 «una persona gran sola a la taula de la cuina amb una pantalla», i sis dels setze temes no van sortir ni un sol dia.
3. **Peces setmanals (divendres):** `incoming/analysis.json` i `incoming/reflection.json` segons `automation/prompts/analysis.md` i `automation/prompts/reflection.md`. **El Quadern IA (reflection) té requisits reforçats des del 24.07.2026:** tema filosòfic relacionat amb la IA, investigació seriosa prèvia amb almenys dues fonts o pensadors reals citats al text, **exactament 7 paràgrafs** i camp `date` (DD.MM.AAAA; si falta, el publicador la posa sol). Es mostra amb autoria «Per Redacció IA.cat» i s'obre a `quadern.html` amb lector d'àudio (`assets/audio/quadern-AAAA-MM-DD.mp3`, generat pel workflow d'àudio).
4. **La reflexió del dia (NOMÉS a l'últim lot del dia, el de les 18:05):** després d'escriure el lot de notícies, escriure `incoming/daily-reflection.json` seguint `automation/prompts/daily-reflection.md`. És el **balanç del dia**: com ha evolucionat avui la IA i quines tendències s'hi veuen, **a partir únicament de les notícies publicades avui** (`public/news.js` i `public/radar.js`, els quatre lots), en **5 o 6 paràgrafs** i amb el camp `date` en format AAAA-MM-DD. El workflow `reflexio-del-dia.yml` la valida, la publica a `public/reflexio-diaria.js` i fa passar la del dia anterior a `public/reflexions-arxiu.js`. Es mostra amb autoria «Per Redacció IA.cat», surt a la portada just sota «El senyal d'avui» i s'obre a `reflexio.html` amb lector d'àudio (`assets/audio/reflexio-AAAA-MM-DD.mp3`). ⚠️ **No és el Quadern IA** (punt 3): el Quadern és filosòfic i setmanal (`reflection.js`, MP3 `quadern-*`); això és diari i parteix de l'actualitat (`reflexio-diaria.js`, MP3 `reflexio-*`). En els lots de les 06:05, 10:05 i 14:05 **no s'escriu** aquest fitxer.
5. **Publicar:** `git add -A && git commit -m "Lot HH.MM del DD.MM.AAAA" && git push origin main`. Res més: la validació, l'acumulació fins a 20, la deduplicació, el radar, l'arxiu i el desplegament són automàtics.

## Criteris editorials de selecció de notícies (vigents des del 23.07.2026; quota de ciència des del 08.08.2026)

> Aquests criteris manen sobre qualsevol instrucció de cerca més antiga de la tasca programada. Objectiu: menys repetició de la mateixa notícia catalana dia rere dia, més notícies d'adopció d'IA per empreses (criteri **b**) i **un mínim garantit de ciència cada dia** (criteri **d**).

**a) Antirepetició multi-dia — PAS OBLIGATORI abans de tancar el lot.** Fes-lo sempre, per a les 5 candidates, sense excepció:

1. **Reuneix el que ja s'ha publicat.** Llegeix els camps `title` i `sourceDate` de TOTES les notícies de `public/news.js` (avui) i de `public/data/archive.json` amb `editionDate` dels **últims 10 dies**. Fes-te una llista d'ESDEVENIMENTS ja coberts (qui, què, projecte, xifra).
2. **Comprova candidata a candidata.** Per a cadascuna de les 5, pregunta't: *aquest mateix FET ja s'ha publicat en els últims 7-10 dies?* Compara pel **fet**, MAI per l'slug ni la URL. Un duplicat sol venir d'un **altre mitjà**, amb un **altre titular**, una **altra URL** i fins i tot una **xifra lleugerament diferent** — segueix sent el mateix fet i s'ha de descartar.
3. **Casos reals que es van colar el 23.07.2026 (no es poden tornar a repetir així):**
   - *Google «Frozen v2»*, el xip amb l'arquitectura de Gemini gravada al silici — publicat el 21.07 (SiliconAngle) i repetit el 23.07 (Tom's Hardware).
   - *La Casa Blanca acusa Moonshot de destil·lar el model d'Anthropic* — publicat el 22.07 (Investing) i repetit el 23.07 (CyberScoop).
   - *El centre de dades d'OpenAI a Geòrgia* — publicat el 22.07 (AJC, «20.000 M$») i repetit el 23.07 (TechRadar, «30.000 M$»). Mateix projecte, un altre mitjà i una altra xifra: és duplicat.
   - *La inversió de 1.000 M€ de Submer a Flix/Ercros* — publicada diversos dies amb slugs distints.
4. **Si ja s'havia cobert, descarta-la** i busca'n una de realment nova. Només pots reprendre un tema si hi ha una **novetat material NOVA** (un fet que abans no existia); llavors escriu-la explícitament com a **ACTUALITZACIÓ**, no com si fos nova. No tanquis el lot sense haver fet aquesta comprovació per a les 5.

**b) Fonts i angle.** Mantén com a **base** la cerca global d'actualitat (OpenAI, Anthropic, Google…): és la font principal i mana per importància. A MÉS, i **en paral·lel a la cerca de ciència del criteri d** (totes dues són obligatòries i tenen el mateix rang), afegeix una cerca de l'**adopció de la IA per part d'empreses** amb èmfasi en la **premsa econòmica** (Expansión, Cinco Días, El Economista, Expansión Catalunya, Via Empresa, Món Empresarial): casos d'ús, projectes, inversions i resultats reals, no notes de premsa buides. Aquesta cerca substitueix la cerca catalana genèrica (massa repetitiva). Prioritat geogràfica: **primer empreses catalanes**; si un dia no n'hi ha prou de rellevants, admet empreses espanyoles perquè el fil no quedi buit. Si un dia no hi ha res prou nou, no forcis.

**c) Arquitectura de seccions (camp `seccio`) — REGLES ESTRICTES.** Vegeu també `automation/prompts/news-batch.md`.

- **«El senyal d'avui» (el feed principal): SEMPRE 5 notícies per lot, sense `seccio`.** Composició de les 5: actualitat **global** de primer nivell i, **com a màxim 2 per lot**, notícies relacionades amb **Catalunya i la IA**. Les catalanes del feed es deriven soles també al radar (no cal marcar-les).
- **«La IA que passa aquí» (el radar): NOMÉS dos tipus de contingut.** (1) Notícies **sobre Catalunya** (les catalanes del feed, derivades automàticament). (2) Notícies de la **IA i l'economia a Espanya** (adopció d'IA per empreses, premsa econòmica) que no siguin purament catalanes: aquestes porten `"seccio":"radar"` i van NOMÉS al radar. **Res més no pot anar al radar**: mai actualitat global ni notícies internacionals (error real del 24.07.2026: ChatGPT Health d'OpenAI marcada `radar` — és actualitat global i havia d'anar al feed).
- ⚠️ **Les peces `radar` NO compten dins de les 5 del lot**: el lot ha de tenir sempre **5 notícies de feed** (sense `seccio`); si hi afegeixes peces `radar`, són a més (5–7 ítems en total, normalment 0–2 de radar). Un lot amb menys de 5 notícies de feed deixa l'edició incompleta (24.07.2026: només es van publicar 3 notícies per aquest motiu).

**d) Quota mínima de ciència — OBLIGATÒRIA (des del 08.08.2026).**

> Motiu: l'auditoria del 08.08.2026 sobre les 428 notícies publicades entre el 12.07 i el 06.08 va trobar que el **43,9%** del feed era d'àmbit econòmic-empresarial (negoci, mercats i inversió, infraestructura com a negoci) i només el **4,7%** era de ciència o de salut. **12 dels 26 dies no van publicar ni una sola peça científica**, amb ratxes de fins a 5 dies seguits. Només 3 peces de 428 venien de premsa científica, davant de 114 de premsa econòmica. La causa no era el model sinó les instruccions: el criteri **b** era l'única cerca temàtica obligatòria del sistema i era econòmica. Aquest criteri **d** hi posa el contrapès. **Revisat dues vegades el mateix 08.08.2026**: la quota inicial (2 al dia) era massa curta, la segona (2 a cada lot, 8 al dia) massa exigent — 8 places diàries obliguen a raspar el fons i omplir de recerca menor. La versió vigent és la tercera: **6 al dia repartides 2-1-1-2**, amb els dobles als dos lots amb més matèria fresca.

- **Repartiment 2-1-1-2: 6 notícies de ciència al dia sobre 20 (30%).** Cada lot en porta un nombre fix de les seves 5:

  | Lot | Peces de ciència |
  |---|---|
  | **06:05** | **2** |
  | **10:05** | **1** |
  | **14:05** | **1** |
  | **18:05** | **2** |

  ⚠️ **El repartiment no és arbitrari, segueix el subministrament.** [arXiv anuncia les novetats a les 20:00 ET](https://info.arxiv.org/help/availability.html) — les 02:00 d'aquí —, així que **el lot de les 06:05 sempre té el paquet acabat de sortir**. El de les 18:05 té tot el matí americà i els embargaments de revista, que solen aixecar-se a la tarda-vespre europea (*Nature* no té una hora universal: la fixa a cada nota de premsa). El de les 10:05 és el més prim de tots — matí europeu, i el poc que hi havia ja l'ha fet servir el lot de les 06:05 — i per això només n'hi toca una. **Si algun dia canvies el repartiment, mou-lo seguint aquesta lògica, no per repartir a parts iguals.**

  ⚠️ **Els caps de setmana són prims: arXiv no anuncia res divendres ni dissabte.** Dissabte i diumenge al matí, la ciència ha de sortir de revistes, blogs de laboratori i notes de centres, no de preprints. Si un lot de cap de setmana no arriba, val més publicar-ne una de menys i recuperar-la dilluns que forçar-ne una de dolenta.

- **Si un lot no ha arribat al seu nombre, el següent el recupera** (una de més). Comprova què s'ha publicat avui llegint `public/news.js` abans de tancar el lot.
- ⚠️ **Ordre de prioritat de les 5 places del lot** (des del 08.08.2026, perquè la quota no ofegui l'actualitat): **(1)** la notícia global més important del dia en IA — aquesta no pot faltar mai, encara que obligui a deixar la segona catalana per al lot següent; **(2)** les peces de ciència que toquin al lot; **(3)** la resta d'actualitat global; **(4)** les catalanes, **màxim 2 per lot** (criteri **c**). Si les places no donen, el que cedeix és la segona catalana, **mai** la notícia gran del dia ni la quota de ciència.
- **Què compta com a ciència — TOTES les ciències, no només les dures.** N'hi ha prou de complir-ne un:
  - **recerca publicada o en preprint**: articles revisats, *Nature*, *Science*, *Nature Medicine*, *The Lancet* i *Lancet Digital Health*, *PNAS*, *NEJM*, *JAMA*, *BMJ*, arXiv, medRxiv, bioRxiv, actes de congressos (NeurIPS, ICML, ACL…);
  - **IA aplicada a qualsevol disciplina científica**, dura o no: biologia, **medicina i pràctica clínica**, **salut pública i epidemiologia**, química, materials, física, matemàtiques, clima, energia, astronomia, **neurociència**, **psicologia i ciències cognitives**, **educació**, **lingüística**, **arqueologia i història**, **sociologia i demografia**, **dret i criminologia** com a disciplines acadèmiques;
  - **resultats tècnics amb mètode i avaluació**: interpretabilitat, arquitectures noves, eficiència, robòtica de laboratori, avaluacions rigoroses de capacitats;
  - **ciència feta aquí**: BSC-MareNostrum, IIIA-CSIC, ICFO, IRB Barcelona, CRG, ICREA, Eurecat, i2CAT, VHIR, IDIBAPS, ISGlobal, CREAF, ICO, universitats catalanes i espanyoles.
- **Què NO compta** (errors reals detectats a l'auditoria del 08.08.2026):
  - la notícia **corporativa amb decorat científic**: «OpenAI regala accés a 100.000 científics», «un medallista Fields fitxa per una empresa d'IA», «DeepMind desmantella l'equip d'AlphaFold», «tal centre rep X milions europeus». Prova ràpida: **treu-ne els diners i el nom de l'empresa; si no queda cap resultat científic, no compta.**
  - 🛑 **El pany de les ciències socials.** Que s'hi admetin la sociologia, l'educació o el dret **no obre la porta a l'economia per darrere**. Un article acadèmic d'economia o de gestió, revisat i amb mètode, **sí** que compta. Un **informe d'un banc, d'una consultora, d'una patronal o d'una casa d'anàlisi** (Gartner, McKinsey, un servei d'estudis) **NO compta mai**, encara que porti gràfics, mostra i percentatges: és material del criteri **b**, i comptar-lo com a ciència desfaria exactament el que aquest criteri **d** ve a corregir. La pregunta que ho resol: **qui l'ha revisat, i què hi guanya qui el publica?**
- **Fonts primàries primer.** Prioritza l'article original, el blog del laboratori o la nota del centre de recerca per damunt de la reescriptura d'un mitjà generalista. Data la publicació i distingeix el que és un resultat del que és un anunci.
- **Categoria.** `"category": "CIÈNCIA"` (amb accent) per a la recerca en general, `"SALUT"` per a la clínica i la salut pública. ⚠️ Escriu-la **sempre igual**: a l'hemeroteca hi conviuen `CIÈNCIA` i `CIENCIA` i el desplegable del cercador les ha d'unir a mà.
- **On buscar-la, cada dia.** El material hi és sempre; el que fallava eren les instruccions, no el subministrament. Fonts de partida: el llistat diari d'**arXiv** (`cs.AI`, `cs.LG`, `cs.CL`, `q-bio`), **medRxiv** i **bioRxiv**, **Nature** i **Nature Machine Intelligence**, **Science**, **Nature Medicine**, **The Lancet Digital Health**, **PNAS**, **JAMA**, la secció d'IA de **ScienceDaily**, **Quanta Magazine**, **EurekAlert**, els blogs de recerca dels laboratoris (DeepMind, Anthropic, OpenAI, Meta AI, Allen Institute, EPFL, MIT News) i les notes dels centres d'aquí (BSC, IIIA-CSIC, ICFO, IRB, CRG, ICREA, ISGlobal, UPC, UPF, UB, UAB). **Una peça de recerca sòlida i ben explicada val més que la cinquena notícia d'un acord milionari.**
- 🛑 **La quota és un terra, no una excusa per baixar el llistó.** El risc real d'aquest criteri és omplir-lo de recerca menor: un preprint sense contrastar, un estudi amb quatre participants, un titular inflat a partir d'un resultat modest. **Val més publicar-ne una de menys i recuperar-la al lot següent que forçar-ne una de dolenta.** Si dues setmanes seguides costa d'arribar a 6, el problema és el número i s'ha de baixar a 4 (1 per lot), **no** afluixar el criteri de qualitat. Fora d'aquestes excepcions, **cada setmana ha de tenir com a mínim 38 peces científiques** sobre les 140 del període.

## La tribuna (articles de persones convidades) — flux MANUAL

La secció «La tribuna» publica escrits signats per persones (no generats per IA). **No passa pel Content Hub**: el fitxer `public/tribuna.js` (`window.IA_TRIBUNA`) és manual i cap automatització no el toca ni el regenera. Per publicar una tribuna nova, una sessió de Cowork (a petició de Rafael) ha de:

1. Desar la foto de l'autor (si n'hi ha) a `public/assets/tribuna-<nom>-AAAAMMDD.jpg`.
2. Substituir l'objecte de `public/tribuna.js` amb els camps: `date`, `category` ("TRIBUNA"), `read` ("X MIN"), `author`, `role` (afiliació), `title`, `excerpt`, `quote` (opcional), `photo` (ruta `./assets/...` o `""`), `photoAlt`, `body` (paràgrafs separats per `\n\n`). Generar el fitxer amb `JSON.stringify` per garantir l'escapament correcte.
3. Commit i push a `main` (es desplega sol).
4. **Pujar el `?v=` de `tribuna.js` i `tribuna-arxiu.js` a `tribuna.html` i `arxiu-tribuna.html` amb una LLETRA al final** (`AAAAMMDDNNb`, `…c`), mai només xifres. `app.js` carrega aquests fitxers amb un segell horari `AAAAMMDDHH` (UTC): una versió només de xifres pot coincidir amb una hora ja passada que la CDN té desada amb la peça antiga, i la pàgina mostraria la tribuna anterior (va passar el 28.09.2026). El mateix val per a `estudis.js` i `estudis-arxiu.js`. Per verificar-ho, entra per la portada i clica «Llegir la tribuna».

La portada mostra la banda `#tribuna` (sobre l'anàlisi de la setmana) només si `window.IA_TRIBUNA` té contingut; si val `null`, la secció queda amagada. La pàgina completa és `public/tribuna.html` i els estils viuen a `public/tribuna.css` (mai a portada.css/styles.css). Contracte públic nou a mantenir: `window.IA_TRIBUNA`.

## Adreces fixes, seccions de servei i agenda (des del 24.09.2026)

- **Cada peça de «La tribuna», «Estudis», l'anàlisi, el Quadern IA i la reflexió del dia té una adreça fixa**: `/tribuna/<id>`, `/estudis/<id>`, `/analisi/<id>`, `/quadern/<id>` i `/reflexio/<AAAA-MM-DD>` (les serveix `public/peca.php`; l'algorisme és a `public/inc/peces.php` i, idèntic, a `public/peces.js`). L'`<id>` surt del **títol**: ⚠️ **no canviïs el títol d'una peça ja publicada**; si és imprescindible, afegeix-hi el camp `"id"` amb l'identificador antic i l'enllaç no es trencarà. Si toques l'algorisme, passa `node scripts/prova-peces.mjs`.
- **Qui hi escriu** (`/autors`, `/autor/<slug>`) surt sol de `tribuna*.js` i `estudis*.js`: no cal fer res en publicar una peça nova.
- **Correccions** (`/correccions`) es construeix sol: quan es rectifiqui una notícia, la nota final ha de començar **exactament** per `Rectificació (<dia> de <mes> de <any>):` (p. ex. `Rectificació (21 de setembre de 2026): …`). Les correccions fora d'una notícia van a `public/data/correccions.json`.
- **Glossari** (`public/data/glossari.json`) i **Ecosistema** (`public/data/ecosistema.json`) són manuals. Al glossari, la forma catalana és la del TERMCAT («Terminologia de la intel·ligència artificial»).
- **Pòdcast** (`/podcast.xml`, `public/podcast.php`): no genera àudio; fa servir els MP3 que ja puja «Àudio de l'edició». No cal fer res.

### Agenda d'actes — manteniment mensual (tasca «Edicions», lot de les 10:05 del dia 1 de cada mes)

Només el **dia 1 de cada mes**, al lot de les **10:05** (el més prim de notícies), un cop escrit el lot:

1. Llegeix `public/data/agenda.json`.
2. Busca actes sobre intel·ligència artificial a Catalunya i als Països Catalans (o en línia organitzats per entitats d'aquí) per als **sis mesos següents**: congressos, jornades, fires, hackatons, cursos i convocatòries (premis, beques, ajuts). Fonts de partida: ACIA, Eurecat i CIDAI, BSC, i2CAT, CVC, IIIA-CSIC, universitats, OEIAC, APDCAT, Softcatalà, Projecte Aina, Fira de Barcelona, Barcelona Activa, Biocat, Mobile World Capital i ACCIÓ.
3. 🛑 **Només actes amb la data confirmada a la web oficial de l'organitzador per a l'edició que ve.** Si només trobes l'edició de l'any passat, no hi va. No inventis cap camp: si no el saps, deixa'l buit.
4. Cada acte: `titol`, `organitza`, `inici` (AAAA-MM-DD), `fi` (AAAA-MM-DD o buit), `lloc` («Ciutat (espai)»), `format` (`presencial` | `en línia` | `híbrid`), `tipus` (`congrés` | `jornada` | `fira` | `webinar` | `curs` | `hackató` | `convocatòria`; en una convocatòria, `fi` és el darrer dia del termini), `preu` (`gratuït` | `de pagament` | buit), `descripcio` (20-35 paraules, neutra, en català) i `url` (la web oficial).
   Camps **opcionals** (per a les dades estructurades `Event` que llegeix Google; si no els saps, no els posis): `organitza_url` (web de l'organitzador; si falta, s'agafa el domini de `url`), `imatge` (URL d'una imatge oficial de l'acte; si falta, la imatge de marca), `ponents` (llista de noms confirmats a la web oficial; si falta, l'organitzador fa de `performer`) i `preu_eur` (número, preu d'entrada general quan és de pagament).
5. Revisa els que ja hi són: corregeix els que hagin canviat de data i treu els cancel·lats i els que fa més de dos mesos que han passat (la pàgina ja amaga sola els passats).
6. Posa `"actualitzat"` a la data d'avui i comprova que el JSON és vàlid: `node -e "JSON.parse(require('fs').readFileSync('public/data/agenda.json','utf8'))"`.
7. Inclou el fitxer al mateix commit del lot. Si un mes no trobes res de nou, deixa'l com està i només actualitza `"actualitzat"`.

### Formació en IA — revisió trimestral (tasca «Edicions», lot de les 10:05 dels dies 1 de gener, abril, juliol i octubre)

Només aquests quatre dies, al lot de les **10:05**, un cop escrit el lot. La pàgina és `/formacio` (`public/formacio.php`) i només mostra les fitxes amb `"estat": "actiu"`.

1. Llegeix `public/data/formacio.json`.
2. Per a cada fitxa **activa**, obre l'URL oficial i comprova que el programa continua i que té edició oberta o prevista. Si canvia el nom, la llengua o la modalitat, corregeix-ho. Si ha desaparegut, posa `"estat": "retirat"` (no surt a la pàgina) i esborra la fitxa a la revisió següent. Posa `"verificat"` a la data d'avui.
3. Torna a provar les fitxes **«per verificar»**: només passen a `"actiu"` si la web oficial ho confirma. ⚠️ Les webs de la Generalitat, la GVA i el Govern balear sovint bloquegen la lectura automàtica: si no pots confirmar-ho, deixa-les com estan i anota-ho al resum del lot.
4. Cerca oferta **nova** als cinc territoris (Catalunya, País Valencià, Illes Balears, Andorra, Catalunya Nord): graus i màsters (sobretot a l'abril, quan surten les preinscripcions), FP (al juliol), cursos públics i formació per a docents. Només formació oficial, pública o sense ànim de lucre amb la IA com a eix. 🛑 No inventis cap camp: si no el saps, deixa'l buit.
5. **Formació privada** (`"privada": true`): comprova que el camp `titol` encara diu la veritat sobre el títol que dona. 🛑 **No hi afegeixis cap centre privat nou sense l'OK d'en Rafael.** Els preus són referència interna: la pàgina no els mostra.
6. Posa `"actualitzat"` a la data d'avui i `"propera_revisio"` al dia 1 del trimestre següent. Valida: `node -e "JSON.parse(require('fs').readFileSync('public/data/formacio.json','utf8'))"`.
7. Inclou el fitxer al commit del lot. Si no hi ha canvis, actualitza només les dates.

## Regles

- **Llengua: cap mot inventat.** «Pacar» (calc de l'anglès *to pace*) **no existeix en català**: fes servir «moderar el ritme», «acompassar», «alentir» o «frenar». En una cita traduïda, tradueix el sentit, no la forma de la paraula anglesa. No inventis mai verbs calcats de l'anglès o del castellà.
- **Llengua: escriu com un periodista català, no com un traductor (des del 28.09.2026).** Les fonts són sovint en anglès i el perill no és només el mot inventat, sinó la **frase calcada**: adverbis i locucions traduïts literalment, termes tècnics opacs, passives i gerundis a l'anglesa. Abans de lliurar, rellegeix cada titular i cada entradeta com si fossin per a la ràdio: si sona a traducció, reescriu-ho amb la paraula que faria servir un bon redactor de Vilaweb o de Catalunya Ràdio. Prefereix el verb concret i la veu activa; tradueix el sentit, no la construcció. Els termes tècnics s'expliquen amb paraules planeres (Termcat com a referència, però si el terme normatiu és opac per al lector, fes servir una perífrasi entenedora). Exemple real del 28.09.2026: «un formulari podia **buidar en silenci** les dades» → «un formulari podia **sostreure d'amagat** les dades»; «exposava el **testimoni d'autenticació** de l'agent» → «deixava a la vista la **credencial d'accés** de l'agent».
- **Llengua: castellanismes i calcs prohibits.** Abans de lliurar cap text (notícies, fotografia editorial, reflexions, anàlisis), repassa'l contra aquesta llista. Quan en Rafael en detecti un de nou, s'hi afegeix aquí i al bloc «Llengua» dels prompts d'`automation/prompts/`.

  | No escriguis | Escriu | Motiu |
  |---|---|---|
  | pacar, paci, pacat | moderar el ritme, acompassar, alentir, frenar | calc de l'anglès *to pace* (21.09.2026) |
  | zancada | gambada, passa | castellanisme (fotografia editorial del 26.09.2026) |
  | buidar/copiar/publicar **en silenci** (*silently*) | d'amagat, sense fer soroll, sense que ningú se n'adoni, imperceptiblement, sense avisar | calc de l'anglès (notícies del 28.09.2026) |
  | **testimoni** d'autenticació / de sessió (*token*) | credencial d'accés, clau de sessió, credencials d'inici de sessió; si cal, *token* en cursiva entre parèntesis la primera vegada | terme tècnic opac per al lector general (notícies del 28.09.2026) |
  | adreçar un problema (*to address*) | resoldre, afrontar, encarar, ocupar-se de | calc de l'anglès |
  | escalar un servei (*to scale*) | ampliar, fer créixer, estendre | calc de l'anglès |
  | suportar una funció (*to support*) | admetre, ser compatible amb | calc de l'anglès |
  | habilitar (*to enable*) | activar, permetre, fer possible | calc de l'anglès |
  | eventualment (*eventually*) | finalment, al capdavall, amb el temps | fals amic |
  | assumir que (*to assume*) | suposar, donar per fet | fals amic |
  | fer sentit (*to make sense*) | tenir sentit | calc de l'anglès |
  | jugar un paper | fer un paper, tenir un paper | calc |
  | prendre lloc (*to take place*) | tenir lloc, fer-se, celebrar-se | calc de l'anglès |
  | al final del dia (*at the end of the day*) | al capdavall, en definitiva | calc de l'anglès |
  | fuga de dades | filtració de dades | castellanisme |
  | en base a, a nivell de, degut a | a partir de / segons, pel que fa a, a causa de | castellanismes |
  | de forma + adjectiu, realitzar (per a tot) | de manera…, fer | castellanisme / crossa |
  | gerundi de posterioritat («…, provocant una caiguda») | «…, i va provocar una caiguda» | castellanisme sintàctic |
- **La imatge ha de mostrar el que diu la notícia.** Si la notícia parla de robots humanoides, la fotografia ha de mostrar un robot humanoide; si parla d'un braç robòtic industrial, un braç robòtic; si parla d'un centre de dades, un centre de dades. La consigna d'**evitar robots, androides i clixés tecnològics** que hi ha a `automation/prompts/daily-image.md` val NOMÉS per a la fotografia editorial del dia («IA × Societat»), on el robot és una cursileria: **no s'aplica a les imatges de les notícies**, on mana el subjecte real de la peça. Error real del 30.07.2026: dues notícies sobre robots humanoides (Google Gemini Robotics i SoftBank–Gravis) il·lustrades amb robots no humanoides.
- **Persones, actes i productes concrets: foto real amb llicència (des del 27.09.2026).** Una il·lustració generada amb IA **no pot mostrar mai una persona real reconeixible ni un producte concret**: s'inventa la cara o l'aparell. Errors reals del 26.09.2026: «Illa clou l'AI Summit» amb una altra persona i «Meta presenta unes ulleres» amb unes ulleres inventades. A tema concret, fotografia concreta:
  1. **Banc de retrats automàtic** (`automation/retrats.json`, 65 persones: Altman, Amodei, Huang, Hassabis, Zuckerberg, Musk, Von der Leyen, Sánchez, Illa…). Si el títol n'esmenta una, l'script li posa el retrat de Wikimedia Commons sense fer res més. Si algú surt sovint i no hi és, afegeix-lo (nom, àlies, identificador de Wikidata).
  2. **Foto de l'acte o del producte**, al camp intern `imageFetch`, NOMÉS de les fonts d'`automation/image-sources.json`: notes de `govern.cat` que no siguin d'agència, Parlament de Catalunya, Pool Moncloa, Comissió Europea (URL + `imageCredit` + `imageLicense`), Meta (sala de premsa i galeria, NOMÉS en notícies sobre Meta; NVIDIA, OpenAI i Anthropic no ho permeten), Openverse (`openverse:<id>`, Flickr/Commons lliures), Commons (`File:…`).
  3. **Genera igualment la il·lustració** a `image`: fa de recanvi.
  4. Executa `python3 automation/scripts/fotos-llicencia.py --input incoming/news-batch.json --public-dir public` abans del commit. Si la teva xarxa no hi arriba, ho fa sol el workflow `content-hub.yml`.

  Si no hi ha cap foto amb llicència, la il·lustració mostra el **context** (faristol, públic d'esquena, escenari, mans, objecte desenfocat), sense cares reals, sense el producte inventat i sense logotips. 🛑 **Mai la foto del mitjà que dona la notícia**: té drets. Detall: `automation/prompts/news-batch.md`, «La imatge de cada notícia».
- Si una imatge de notícia no s'ha pogut generar, ometre el camp `image` d'aquella notícia (no posar-hi rutes que no existeixen).
- **Pes de les imatges.** Tota imatge que es desi a `public/assets/` ha de ser un JPEG de debò (no un PNG amb l'extensió `.jpg`: es nota perquè passa dels 500 KB), d'uns 1200 px de costat com a màxim i per sota de 350 KB. Si l'eina de generació retorna un PNG, cal reconvertir-lo abans de fer el commit, per exemple amb `python3 -c "from PIL import Image; im=Image.open('X.jpg').convert('RGB'); im.save('X.jpg','JPEG',quality=88,optimize=True,progressive=True)"`. Motiu: el juliol del 2026 s'hi van colar 26 PNG de 1,6 MB de mitjana i Googlebot es descarregava 34 MB per visita, amb un temps de resposta mitjà de 567 ms.
- No editar mai `public/index.html` per canviar dates o versions: la portada llegeix les dades dinàmicament.
- No tocar `public/styles.css` (l'usen les pàgines interiors) ni `public/portada.css` (portada) sense una ordre explícita de Rafael.
- No trencar els contractes públics: `window.IA_NEWS`, `window.IA_RADAR`, `window.IA_ANALYSIS`, `window.IA_REFLECTION`, `window.IA_DAILY_IMAGE`, `window.IA_REFLEXIO_DIARIA`, `window.IA_REFLEXIONS_ARXIU`, `article.php?slug=...`, `api.php?action=subscribe`.
- Cap clau d'API no pot aparèixer mai en cap fitxer del repositori ni en cap commit.
- Si les instruccions d'una tasca programada antiga contradiuen aquest document (per exemple, demanant reescriure `news.js` directament), té preferència aquest document.

Documentació completa: `docs/AUTOMATITZACIO_EDITORIAL.md`.
