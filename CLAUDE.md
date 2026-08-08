# intel·ligènciaartificial.cat — instruccions per a sessions editorials

Aquest repositori publica `inteligencia-artificial.cat`. El directori públic és `public/` i es desplega automàticament a Hostinger per FTP quan hi ha un push a `main` (workflow `desplega.yml`).

## Flux editorial vigent (des del 17.07.2026)

**Les sessions editorials NO escriuen mai directament `public/news.js`, `public/radar.js`, `public/analysis.js`, `public/reflection.js`, `public/daily-image.js`, `public/reflexio-diaria.js` ni `public/reflexions-arxiu.js`.** Aquests fitxers els genera el Content Hub (GitHub Actions) després de validar el contingut.

El que ha de fer cada sessió editorial:

1. **Lot de notícies (4 cops al dia, 5 notícies per lot):** escriure el lot com a array JSON a `incoming/news-batch.json` seguint `automation/prompts/news-batch.md`. Les imatges de cada notícia es desen a `public/assets/<slug>-AAAAMMDD.jpg`. En fer push, el workflow `content-hub.yml` valida el lot, l'acumula amb els lots anteriors del dia (fins a 20 notícies), deriva el radar català, actualitza l'hemeroteca i publica.
2. **Fotografia editorial diària (només la primera execució del dia):** desar la imatge a `public/assets/daily-reflection-AAAA-MM-DD.jpg` i les metadades a `incoming/daily-image.json` segons `automation/prompts/daily-image.md`.
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

La portada mostra la banda `#tribuna` (sobre l'anàlisi de la setmana) només si `window.IA_TRIBUNA` té contingut; si val `null`, la secció queda amagada. La pàgina completa és `public/tribuna.html` i els estils viuen a `public/tribuna.css` (mai a portada.css/styles.css). Contracte públic nou a mantenir: `window.IA_TRIBUNA`.

## Regles

- **La imatge ha de mostrar el que diu la notícia.** Si la notícia parla de robots humanoides, la fotografia ha de mostrar un robot humanoide; si parla d'un braç robòtic industrial, un braç robòtic; si parla d'un centre de dades, un centre de dades. La consigna d'**evitar robots, androides i clixés tecnològics** que hi ha a `automation/prompts/daily-image.md` val NOMÉS per a la fotografia editorial del dia («IA × Societat»), on el robot és una cursileria: **no s'aplica a les imatges de les notícies**, on mana el subjecte real de la peça. Error real del 30.07.2026: dues notícies sobre robots humanoides (Google Gemini Robotics i SoftBank–Gravis) il·lustrades amb robots no humanoides.
- Si una imatge de notícia no s'ha pogut generar, ometre el camp `image` d'aquella notícia (no posar-hi rutes que no existeixen).
- **Pes de les imatges.** Tota imatge que es desi a `public/assets/` ha de ser un JPEG de debò (no un PNG amb l'extensió `.jpg`: es nota perquè passa dels 500 KB), d'uns 1200 px de costat com a màxim i per sota de 350 KB. Si l'eina de generació retorna un PNG, cal reconvertir-lo abans de fer el commit, per exemple amb `python3 -c "from PIL import Image; im=Image.open('X.jpg').convert('RGB'); im.save('X.jpg','JPEG',quality=88,optimize=True,progressive=True)"`. Motiu: el juliol del 2026 s'hi van colar 26 PNG de 1,6 MB de mitjana i Googlebot es descarregava 34 MB per visita, amb un temps de resposta mitjà de 567 ms.
- No editar mai `public/index.html` per canviar dates o versions: la portada llegeix les dades dinàmicament.
- No tocar `public/styles.css` (l'usen les pàgines interiors) ni `public/portada.css` (portada) sense una ordre explícita de Rafael.
- No trencar els contractes públics: `window.IA_NEWS`, `window.IA_RADAR`, `window.IA_ANALYSIS`, `window.IA_REFLECTION`, `window.IA_DAILY_IMAGE`, `window.IA_REFLEXIO_DIARIA`, `window.IA_REFLEXIONS_ARXIU`, `article.php?slug=...`, `api.php?action=subscribe`.
- Cap clau d'API no pot aparèixer mai en cap fitxer del repositori ni en cap commit.
- Si les instruccions d'una tasca programada antiga contradiuen aquest document (per exemple, demanant reescriure `news.js` directament), té preferència aquest document.

Documentació completa: `docs/AUTOMATITZACIO_EDITORIAL.md`.
