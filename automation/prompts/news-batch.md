# Encàrrec diari: lot de cinc notícies

Conserva la selecció i el procés de verificació actuals. Genera exactament cinc notícies diferents **destinades al feed principal «El senyal d'avui»** (és a dir, cinc notícies SENSE `"seccio": "radar"`), en català, sobre canvis rellevants en intel·ligència artificial. Composició de les cinc: les **peces de ciència que toquin a aquest lot** (1-1-2-2 segons l'hora, vegeu «La quota de ciència» més avall), actualitat **global** de primer nivell i, **com a màxim dues per lot**, notícies relacionades amb **Catalunya i la IA**. Si a més vols aportar peces només per al radar (vegeu el camp `seccio` més avall), són **addicionals**: el lot tindrà llavors sis o set ítems, mai menys de cinc per al feed. Dona prioritat a fonts primàries, data cada afirmació i diferencia fets d'interpretacions. No copiïs el text de les fonts.

La sortida ha de mantenir exactament el contracte que ja utilitza el web:

```json
[
  {
    "category": "TECNOLOGIA",
    "read": "4 MIN",
    "slug": "slug-unic-en-minuscules",
    "title": "Títol",
    "excerpt": "Resum",
    "image": "./assets/imatge.jpg",
    "sourceName": "Font",
    "sourceUrl": "https://...",
    "sourceDate": "D de mes de AAAA",
    "body": "Cos complet de la notícia"
  }
]
```

No canviïs els noms dels camps. No incloguis text fora del JSON.

## La quota de ciència (obligatòria, des del 08.08.2026; revisada el 01.10.2026)

El feed s'havia inclinat massa cap a l'economia: l'auditoria del 08.08.2026 sobre 428 notícies va donar **43,9% de peces d'àmbit econòmic-empresarial** i **4,7% de ciència i salut**, amb 12 dels 26 dies sense cap peça científica i ratxes de 5 dies seguits. Aquesta secció ho corregeix.

- **Quantes en porta AQUEST lot** (repartiment 1-1-2-2, **6 al dia sobre 20**, el 30%):

  | Lot | Peces de ciència |
  |---|---|
  | **06:05** | **1** |
  | **10:05** | **1** |
  | **14:05** | **2** |
  | **18:05** | **2** |

  ⚠️ El repartiment segueix el subministrament de recerca revisada, no el repartiment a parts iguals. Les revistes publiquen i aixequen embargaments sobretot a la tarda-vespre europea, i el matí americà arriba als lots de les 14:05 i de les 18:05: per això els dobles són a la tarda. El lot de les 06:05 ja no pot viure de l'anunci d'arXiv (sostre d'1 preprint al dia, vegeu més avall): hi toca una sola peça, millor d'una revista del dia abans o d'actes de congrés.

  ⚠️ **Cap de setmana prim: arXiv no anuncia res divendres ni dissabte.** Dissabte i diumenge al matí, la ciència ha de sortir, com cada dia, de revistes, actes de congrés, blogs de laboratori i notes de centres.

- **Si el lot anterior no va arribar al seu nombre, aquest el recupera** (una de més). Comprova què s'ha publicat avui llegint `public/news.js` abans de tancar el lot.
- ⚠️ **Ordre de prioritat de les 5 places** (perquè la quota no ofegui l'actualitat): **(1)** la notícia global més important del dia en IA — no pot faltar mai; **(2)** les peces de ciència que toquin; **(3)** la resta d'actualitat global; **(4)** les catalanes, màxim 2 per lot. Si no hi caben totes, **el que cedeix és la segona catalana**, mai la notícia gran del dia ni la quota de ciència.
- **Compta com a ciència — TOTES les ciències, no només les dures:**
  - **recerca publicada** (revistes revisades i actes de congrés) o, dins del sostre, **en preprint** — vegeu la jerarquia de fonts més avall;
  - **IA aplicada a qualsevol disciplina**, dura o no: biologia, **medicina i pràctica clínica**, **salut pública i epidemiologia**, química, materials, física, matemàtiques, clima, energia, astronomia, **neurociència**, **psicologia i ciències cognitives**, **educació**, **lingüística**, **arqueologia i història**, **sociologia i demografia**, **dret i criminologia** com a disciplines acadèmiques;
  - **resultats tècnics amb mètode i avaluació**: interpretabilitat, arquitectures noves, eficiència, robòtica de laboratori, avaluacions rigoroses de capacitats;
  - **recerca feta aquí**: BSC-MareNostrum, IIIA-CSIC, ICFO, IRB Barcelona, CRG, ICREA, Eurecat, i2CAT, VHIR, IDIBAPS, ISGlobal, CREAF, ICO, universitats catalanes i espanyoles.
- 🛑 **Jerarquia de fonts i sostre de preprints (des del 01.10.2026).** El recompte de l'1 al 29.09.2026 va donar **63 notícies amb un preprint d'arXiv com a font directa, davant de només 16 amb una revista o unes actes revisades**: arXiv pesava quatre vegades més que les revistes. Per a un web de divulgació, la base ha de ser la recerca revisada per parells. Per ordre de preferència:
  1. **Article en revista revisada per parells** (*Nature* i la família *Nature*, *Science*, *Cell*, *The Lancet*, *NEJM*, *JAMA*, *BMJ*, *PNAS*, revistes d'IEEE, ACM, Springer, Elsevier, PLOS…).
  2. **Actes de congrés amb revisió** (NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, AAAI, IJCAI…). En IA aquests congressos són la via principal de publicació revisada: compten com a recerca revisada, no com a preprint.
  3. **Preprint pur** (arXiv, medRxiv, bioRxiv, SSRN): **com a màxim 1 al dia** sumant els quatre lots — comprova a `public/news.js` si avui ja n'ha sortit un abans d'afegir-ne cap. Només si té una rellevància clara (resultat important d'un grup reconegut, amb cobertura independent o molta repercussió). Ha de portar **sempre**, dins del cos, l'avís que és una prepublicació encara **no revisada per parells**.
- **Abans de publicar un treball d'arXiv, mira si ja està acceptat o publicat**: el camp de comentaris d'arXiv sovint diu «Accepted at…» o «Published in…», i la fitxa pot portar el DOI de la versió de revista. Si n'hi ha versió revisada, **cita i enllaça aquella** (a `sourceUrl` i al cos) i no compta per al sostre de preprints. Una nota de premsa (EurekAlert, la universitat) que parla d'un article revisat s'ha d'enllaçar també a l'article original.
- **NO compta:**
  - la notícia **corporativa amb decorat científic**. Casos reals que no valen: «OpenAI dona accés gratuït a 100.000 científics», «un medallista Fields fitxa per una empresa d'IA», «DeepMind desmantella l'equip d'AlphaFold», «tal centre rep 40 milions europeus». Prova ràpida: **treu-ne els diners i el nom de l'empresa; si no queda cap resultat científic, no compta.**
  - 🛑 **el pany de les ciències socials**: que s'hi admetin la sociologia, l'educació o el dret **no obre la porta a l'economia per darrere**. Un article acadèmic d'economia o de gestió, revisat i amb mètode, **sí** que compta. Un **informe d'un banc, d'una consultora, d'una patronal o d'una casa d'anàlisi** (Gartner, McKinsey, un servei d'estudis) **NO compta mai**, encara que porti gràfics, mostra i percentatges: això és material de la cerca econòmica, i comptar-lo com a ciència desfaria justament el que aquesta quota ve a corregir. La pregunta que ho resol: **qui l'ha revisat, i què hi guanya qui el publica?**
- **Prioritza la font primària** (l'article revisat, el blog del laboratori, la nota del centre) per damunt de la reescriptura d'un mitjà generalista. Explica el resultat i el mètode en llenguatge planer, sense exagerar-ne l'abast, i distingeix sempre un **resultat** d'un **anunci**.
- **Categoria:** `"category": "CIÈNCIA"` per a la recerca en general i `"SALUT"` per a la clínica i la salut pública. Escriu-la sempre amb la mateixa grafia (amb accent).
- **On buscar-la, per aquest ordre.** **Nature** i **Nature Machine Intelligence**, **Science**, **Nature Medicine**, **The Lancet Digital Health**, **PNAS**, **JAMA**, **Cell**, les actes dels congressos d'IA (NeurIPS, ICML, ICLR, ACL, CVPR) i les versions acceptades que n'anuncien els autors, la secció d'IA de **ScienceDaily**, **Quanta Magazine**, **EurekAlert**, els blogs de recerca dels laboratoris (DeepMind, Anthropic, OpenAI, Meta AI, Allen Institute, MIT News, EPFL) i les notes dels centres d'aquí (BSC, IIIA-CSIC, ICFO, IRB, CRG, ICREA, ISGlobal, UPC, UPF, UB, UAB). El llistat diari d'**arXiv** (`cs.AI`, `cs.LG`, `cs.CL`, `q-bio`), **medRxiv** i **bioRxiv** queda per a l'únic preprint del dia i per comprovar si un treball ja té versió acceptada.
- 🛑 **La quota és un terra, no una excusa per baixar el llistó.** El risc d'aquest criteri és omplir-lo de recerca menor: un preprint sense contrastar, un estudi amb quatre participants, un titular inflat a partir d'un resultat modest. **Val més publicar-ne una de menys i recuperar-la al lot següent que forçar-ne una de dolenta.** Una peça de recerca sòlida i ben explicada val més que la cinquena notícia d'un acord milionari.

## La imatge de cada notícia

La fotografia ha d'il·lustrar **el que diu la notícia**, no la idea genèrica d'«intel·ligència artificial». Si el subjecte és un robot humanoide, s'ha de veure un robot humanoide; si és un braç robòtic, un braç robòtic; si és un centre de dades, un centre de dades; si és una decisió empresarial o reguladora, un context humà o institucional creïble.

⚠️ La instrucció d'evitar robots i androides que hi ha a `daily-image.md` és **només** per a la fotografia editorial del dia, on el robot és un clixé. **Aquí no s'aplica**: una notícia sobre robots humanoides il·lustrada amb un robot no humanoide és un error (va passar el 30.07.2026 amb dues notícies del mateix lot).

### Persones, actes i productes concrets: foto real amb llicència (des del 27.09.2026)

Error real del 26.09.2026: «El president Illa clou l'AI Summit» es va il·lustrar amb una altra persona, i «Meta presenta unes ulleres de realitat virtual» amb unes ulleres inventades. Una il·lustració generada amb IA **no pot** mostrar una persona real ni un producte concret: s'inventa la cara o l'aparell i enganya el lector.

Per a cada notícia, pregunta't primer: **el subjecte és una persona real identificable, un acte concret (una cimera, una roda de premsa, una signatura) o un producte concret que es presenta?** Si és que sí, la notícia ha de portar una **foto real**. N'hi ha tres camins, per aquest ordre:

1. **Banc de retrats (automàtic).** Si el **títol** esmenta una persona d'`automation/retrats.json` (Sam Altman, Dario Amodei, Jensen Huang, Demis Hassabis, Zuckerberg, Musk, Nadella, Pichai, Hinton, LeCun, Von der Leyen, Trump, Pedro Sánchez, Salvador Illa, Collboni, el papa Lleó XIV i una seixantena més), no cal fer res: l'script hi posa el seu retrat de Wikimedia Commons. Si parles d'una persona que hi surt sovint i no hi és, afegeix-la al banc (nom, àlies i identificador de Wikidata `Q…`).
2. **Una foto de l'acte o del producte**, millor que un retrat quan n'hi ha. Busca-la NOMÉS a les fonts d'`automation/image-sources.json` i posa-la al camp intern `imageFetch` (el web no el veu mai):
   - **Notes del Govern** (`govern.cat`): URL del fitxer (`cdn-govern.watchity.net`) + `imageCredit` («Nom del fotògraf / Generalitat de Catalunya») + `imageLicense` («CC0»). 🛑 Si el peu diu **ACN, EFE, Europa Press, Getty** o una altra agència, **no** és de la Generalitat.
   - **Parlament de Catalunya**, **La Moncloa** (només fotos firmades «Pool Moncloa») i **Comissió Europea**: igual, URL del fitxer + crèdit + llicència (vegeu el format a `image-sources.json`).
   - **Meta**, NOMÉS en notícies sobre Meta o els seus productes (Facebook, Instagram, WhatsApp, Llama, Quest, ulleres Ray-Ban/Oakley…): les imatges de la seva sala de premsa (`about.fb.com/news`, les de cada nota) o de la galeria multimèdia (`meta.com/media-gallery`: directius, oficines, centres de dades). Posa l'URL del fitxer a `imageFetch`; el crèdit («Meta») el posa l'script. 🛑 **NVIDIA, OpenAI i Anthropic NO**: no donen permís per reutilitzar les seves fotos (vegeu «perVerificar» a `image-sources.json`).
   - **Openverse** (fotos de Flickr i Commons amb llicència lliure; hi ha molts actes tecnològics dels comptes de TechCrunch, Web Summit, el Parlament Europeu i la Comissió): cerca a `https://api.openverse.org/v1/images/?q=<nom o acte>&license=by,by-sa,cc0,pdm`, tria'n una on es vegi de debò el subjecte i posa `"imageFetch": "openverse:<id>"`.
   - **Wikimedia Commons**: `"imageFetch": "File:Nom exacte del fitxer.jpg"`.

   Amb Openverse, Commons i Wikidata **no posis crèdit**: l'autor i la llicència els llegeix l'script de l'API, i rebutja les fotos que no són lliures.
3. **Genera igualment la il·lustració** i posa-la a `image` com sempre. És el recanvi si la foto no es pot baixar.

Abans del commit, executa `python3 automation/scripts/fotos-llicencia.py --input incoming/news-batch.json --public-dir public`. Si la teva xarxa no hi arriba, no passa res: ho deixa tot com estava i ho farà el workflow `content-hub.yml`, que sí que hi arriba (i que també aplica el banc de retrats).

🛑 **MAI la foto del mitjà que dona la notícia** (diaris, agències, blogs, Engadget, The Verge…): té drets i no es pot reproduir. Tampoc cap servidor que no sigui a `automation/image-sources.json`. Per afegir-hi una font nova, primer cal llegir-ne les condicions d'ús i anotar-les al fitxer.

**Si no hi ha cap foto amb llicència** (el cas més habitual per a un producte que s'acaba de presentar), la il·lustració ha de mostrar el **context**, no el subjecte:

- 🛑 **cap persona real reconeixible**: res de cares de polítics, directius o científics amb nom. Sí: un faristol amb micròfons en un auditori, el públic d'esquena, una silueta a contrallum, unes mans.
- 🛑 **cap producte concret inventat**: si la notícia és justament la presentació d'unes ulleres, un mòbil o un xip nous, no els dibuixis. Sí: l'escenari de la presentació, una pantalla gran sense text, una mà que sosté un objecte desenfocat.
- 🛑 **cap logotip, marca ni text** llegible.
- Els objectes **genèrics** sí que es poden mostrar tal com diu la notícia: un robot humanoide, un braç robòtic, un centre de dades (vegeu més amunt). El que no es pot fer és fer-los passar pel model concret d'una empresa.

La pàgina de l'article mostra sola el peu «Foto: …» per a les fotos reals i «Il·lustració generada amb IA» per a la resta.

## Camp opcional `video` (prova pilot del 06.10 al 13.10.2026)

Una notícia pot portar un vídeo de YouTube que expliqui **el mateix fet**. La pàgina de l'article el mostra sota el text, amb una miniatura que només carrega el reproductor quan el lector hi fa clic.

**Fins a 6 vídeos per edició sencera (els quatre lots), i com a màxim 2 per lot** (ampliat de 3 a 6 el 06.10.2026, a petició d'en Rafael). Abans de posar-ne cap, compta a `public/news.js` quants n'han sortit avui (notícies amb camp `video`).

🛑 **És un sostre, no una quota.** Si un dia només n'hi ha un de bo, se'n posa un; si no n'hi ha cap, cap. Més val cap vídeo que un vídeo dubtós: no omplis el buit amb canals de comentaristes ni amb vídeos que no tracten ben bé el fet.

On n'hi sol haver: **llançaments i presentacions** (OpenAI, Google, Anthropic, Meta, NVIDIA: gairebé sempre tenen vídeo oficial), **notícies catalanes** (peça de 3Cat o betevé, vídeo del Govern o del Parlament) i **ciència** (vídeo explicatiu de la universitat, del laboratori o de la revista). Les notícies d'economia i d'inversions rarament en tenen cap que valgui la pena.

Només hi va un vídeo si compleix **TOTES** aquestes condicions:

1. **Font fiable**, per aquest ordre de preferència:
   - el **canal oficial** de qui protagonitza el fet: l'empresa (OpenAI, Anthropic, Google, Google DeepMind, Meta, NVIDIA, Microsoft, Apple…), la institució (Comissió Europea, Parlament Europeu, Govern, Parlament de Catalunya, La Moncloa), la universitat o el centre de recerca (BSC, UPC, CSIC…), o la revista (*Nature*, *Science*);
   - una **televisió o un mitjà reconegut**: 3Cat (TV3, 324), betevé, À Punt, IB3, RTVE, BBC, DW, Reuters, AP, Bloomberg, CNBC…;
   - la **gravació oficial** d'una conferència o d'un congrés (la ponència, la roda de premsa).
   🛑 **Mai** canals de comentaristes, recopilacions, «reaccions», vídeos amb veu sintètica o fets amb IA, ni retransmissions d'aficionats d'un acte, encara que tinguin moltes visualitzacions.
2. **Tracta exactament aquest fet**, no el tema en general. Una notícia sobre el model nou d'OpenAI → el vídeo de presentació d'aquest model, no una entrevista antiga a Altman.
3. **És d'aquests dies** (publicat, com a màxim, uns quants dies abans de la notícia), llevat que la notícia sigui precisament sobre un vídeo o una ponència anteriors.
4. **Prioritat al català**: si el mateix fet té un vídeo de 3Cat, betevé, À Punt o IB3, tria aquest.

Com trobar-lo: cerca a la web `site:youtube.com` + el nom del producte, de l'acte o de la institució, i comprova el canal llegint `https://www.youtube.com/oembed?format=json&url=<URL del vídeo>` (amb l'eina de lectura web, que sí que hi arriba): el camp `author_name` és el canal. Si no pots confirmar el canal, no hi posis el vídeo.

Format (dins de la notícia, al costat dels altres camps):

```json
"video": {
  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "idioma": "en",
  "resum": "Dues o tres frases en català que expliquin què s'hi veu i què s'hi diu."
}
```

- `url`: l'adreça del vídeo a YouTube (no d'una llista ni d'un canal).
- `idioma`: codi de dues lletres de la llengua en què es parla (`ca`, `es`, `en`, `fr`…). Si és en una altra llengua que no és el català, la pàgina ja avisa el lector i intenta posar-li els subtítols en català.
- `resum`: **obligatori si el vídeo no és en català**. Dues o tres frases (màxim 60 paraules) que diguin què s'hi veu i què s'hi diu, perquè el lector que no entén la llengua sàpiga què hi trobarà. Amb les mateixes regles de llengua que la resta de la notícia. No hi transcriguis frases senceres del vídeo.
- **No hi posis títol, canal ni `verificat`**: els omple sols el workflow `content-hub.yml`, que comprova a YouTube que el vídeo existeix i es pot inserir, i que llegeix el títol i el canal reals. Si el vídeo no passa la comprovació, la notícia es publica igualment, sense vídeo.

## Camp opcional `seccio` (encaminament de seccions)

A part dels camps de dalt, cada notícia pot portar un camp OPCIONAL `seccio` per decidir a quina secció del web va:

- **Sense `seccio` (o `"seccio": "senyal"`)** — comportament per defecte: la notícia va al feed principal **«El senyal d'avui»** (`window.IA_NEWS`) i, si té context català, també es deriva sola a **«La IA que passa aquí»** (el radar). Fes servir això per a l'actualitat **global** d'IA i per a les notícies relacionades amb **Catalunya i la IA** (màxim dues de catalanes per lot; volem que aquestes surtin als dos llocs).
- **`"seccio": "catalunya"`** (des de l'01.10.2026) — **posa-la a TOTES les notícies relacionades amb Catalunya i la IA.** Va al feed com les altres i, a més, entra **segur** al radar. Sense aquesta marca, el radar només la recull si el títol, l'entradeta o l'slug porten un nom de la llista automàtica (Catalunya, Barcelona, Generalitat, UPC, BSC…); el 29 i el 30.09.2026 se'n van quedar fora dues peces que només deien «el Govern», «Interior» i «els Mossos». Compta dins de les cinc del lot i dins del màxim de dues catalanes.
- **`"seccio": "radar"`** — la notícia va NOMÉS a **«La IA que passa aquí»** i **no apareix al feed principal** ni a l'hemeroteca. Reservat EXCLUSIVAMENT a les notícies de la **IA i l'economia a Espanya** (adopció d'IA per empreses, premsa econòmica: Expansión, Cinco Días, El Economista…) quan **no** siguin d'una empresa purament catalana. **Mai marquis `radar` una notícia global o internacional** (error real del 24.07.2026: una notícia d'OpenAI/ChatGPT Health marcada `radar` — era actualitat global i havia d'anar al feed): al radar només hi va Catalunya o IA-economia a Espanya, res més.

⚠️ **REGLA DE RECOMPTE (imprescindible):** les notícies amb `"seccio": "radar"` **NO compten dins de les cinc del lot**. Les cinc obligatòries són sempre notícies de feed (sense `seccio` o amb `"seccio": "senyal"`). Si marques alguna peça com a `radar`, afegeix-la **a més** de les cinc: un lot vàlid té 5 notícies de feed + 0, 1 o 2 de radar (5–7 ítems en total). Un lot amb menys de 5 notícies de feed deixa l'edició coixa (va passar el 24.07.2026: 2 de les 5 anaven marcades `radar` i el web només va publicar 3 notícies).

El camp és intern: mai s'escriu al contracte públic `window.IA_NEWS`.

## Denominacions territorials

No facis servir mai «Països Catalans». Per parlar de tot el domini lingüístic, escriu «territoris de parla catalana» (o, segons el context, «Catalunya, la Comunitat Valenciana, les Illes Balears i Andorra»). Per al territori valencià, escriu «Comunitat Valenciana», no «País Valencià». Si una font fa servir aquestes denominacions, cita-les entre cometes, però no les facis teves al titular ni a l'entradeta.

## Llengua: castellanismes i calcs prohibits

Escriu en un català normatiu i genuí. No inventis mai mots calcats de l'anglès o del castellà, i revisa el text abans de lliurar-lo contra aquesta llista (la llista completa i actualitzada és a `CLAUDE.md`, «Regles»):

- **pacar / paci / pacat** (calc de l'anglès *to pace*) → «moderar el ritme», «acompassar», «alentir», «frenar».
- **zancada** (castellanisme) → «gambada» o «passa».
- **en silenci** (*silently*) → «d'amagat», «sense fer soroll», «sense que ningú se n'adoni», «imperceptiblement».
- **testimoni d'autenticació / de sessió** (*token*) → «credencial d'accés», «clau de sessió» (si cal, *token* en cursiva entre parèntesis la primera vegada).
- **adreçar** un problema → «resoldre», «afrontar»; **escalar** → «ampliar», «fer créixer»; **suportar** una funció → «admetre», «ser compatible amb»; **habilitar** → «activar», «permetre».
- **eventualment** → «finalment», «al capdavall»; **assumir que** → «suposar»; **fer sentit** → «tenir sentit»; **jugar un paper** → «fer un paper»; **prendre lloc** → «tenir lloc».
- **fuga de dades** → «filtració de dades»; **en base a** → «a partir de», «segons»; **a nivell de** → «pel que fa a»; **degut a** → «a causa de».
- **Gerundi de posterioritat** («…, provocant una caiguda») → «…, i va provocar una caiguda».
- **demanar** algú als tribunals (*to sue*) → «**demandar**». «Demanar» és pregar o sol·licitar; qui porta algú al jutjat el **demanda**.
- **junta** d'una empresa (*board*) → «consell d'administració»; **pacte** empresarial (*deal*) → «acord», «operació».
- **Termes tècnics traduïts literalment al titular** («direcció del dolor», de l'anglès *pain direction*) → digues què és: «un senyal intern associat al dolor». Si el terme cal, va al cos i explicat.
- **Impersonal amb «se» + pronom** («quan se l'amplifica») → «quan l'amplifiquen» o amb subjecte explícit.

**No n'hi ha prou amb la llista: escriu com un periodista català, no com un traductor.** Les fonts solen ser en anglès; tradueix el sentit, no la construcció. Rellegeix el titular i l'entradeta com si s'haguessin de dir per la ràdio: si sonen a traducció, reescriu-los. Verb concret, veu activa, termes tècnics explicats amb paraules planeres. Exemple real (28.09.2026): «podia **buidar en silenci** les dades» → «podia **sostreure d'amagat** les dades»; «exposava el **testimoni d'autenticació**» → «deixava a la vista la **credencial d'accés**».

**Revisió final de cada titular (des del 06.10.2026).** Abans de lliurar, passa cada titular per aquestes cinc preguntes i, si en falla una, reescriu-lo: 1) cada verb vol dir exactament això en català? (falsos amics: demanar/demandar, assumir, eventualment, suportar…); 2) hi ha cap terme tècnic entre cometes que el lector no entendria? (fora del titular, o explicat); 3) hi ha cap construcció forçada (impersonal amb «se» + pronom, passiva, gerundi)?; 4) s'entén d'una sola lectura en veu alta, com a la ràdio?; 5) té més de dues idees encadenades? (deixa'n una per a l'entradeta). Errors reals del 06.10.2026: «Vint-i-cinc models de llenguatge guarden una **«direcció del dolor»** a dins, i quan **se l'amplifica** trien esborrar fotos i **pesos**» → «Un estudi troba en 25 models d'IA un **senyal intern associat al dolor** que, si l'intensifiquen, els porta a esborrar fotos i fins i tot altres models»; «Dos antics enginyers de Groq **demanen la junta** pel **pacte**…» → «…**demanden el consell d'administració** per l'**acord**…».
