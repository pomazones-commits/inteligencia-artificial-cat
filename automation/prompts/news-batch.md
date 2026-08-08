# Encàrrec diari: lot de cinc notícies

Conserva la selecció i el procés de verificació actuals. Genera exactament cinc notícies diferents **destinades al feed principal «El senyal d'avui»** (és a dir, cinc notícies SENSE `"seccio": "radar"`), en català, sobre canvis rellevants en intel·ligència artificial. Composició de les cinc: les **peces de ciència que toquin a aquest lot** (2-1-1-2 segons l'hora, vegeu «La quota de ciència» més avall), actualitat **global** de primer nivell i, **com a màxim dues per lot**, notícies relacionades amb **Catalunya i la IA**. Si a més vols aportar peces només per al radar (vegeu el camp `seccio` més avall), són **addicionals**: el lot tindrà llavors sis o set ítems, mai menys de cinc per al feed. Dona prioritat a fonts primàries, data cada afirmació i diferencia fets d'interpretacions. No copiïs el text de les fonts.

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

## La quota de ciència (obligatòria, des del 08.08.2026)

El feed s'havia inclinat massa cap a l'economia: l'auditoria del 08.08.2026 sobre 428 notícies va donar **43,9% de peces d'àmbit econòmic-empresarial** i **4,7% de ciència i salut**, amb 12 dels 26 dies sense cap peça científica i ratxes de 5 dies seguits. Aquesta secció ho corregeix.

- **Quantes en porta AQUEST lot** (repartiment 2-1-1-2, **6 al dia sobre 20**, el 30%):

  | Lot | Peces de ciència |
  |---|---|
  | **06:05** | **2** |
  | **10:05** | **1** |
  | **14:05** | **1** |
  | **18:05** | **2** |

  ⚠️ El repartiment segueix el subministrament, no el repartiment a parts iguals. [arXiv anuncia les novetats a les 20:00 ET](https://info.arxiv.org/help/availability.html) — les 02:00 d'aquí —, així que **el lot de les 06:05 té sempre el paquet acabat de sortir**; el de les 18:05 té tot el matí americà i els embargaments de revista, que solen aixecar-se a la tarda-vespre europea. El de les 10:05 és el més prim de tots i per això només n'hi toca una.

  ⚠️ **Cap de setmana prim: arXiv no anuncia res divendres ni dissabte.** Dissabte i diumenge al matí, la ciència ha de sortir de revistes, blogs de laboratori i notes de centres, no de preprints.

- **Si el lot anterior no va arribar al seu nombre, aquest el recupera** (una de més). Comprova què s'ha publicat avui llegint `public/news.js` abans de tancar el lot.
- ⚠️ **Ordre de prioritat de les 5 places** (perquè la quota no ofegui l'actualitat): **(1)** la notícia global més important del dia en IA — no pot faltar mai; **(2)** les peces de ciència que toquin; **(3)** la resta d'actualitat global; **(4)** les catalanes, màxim 2 per lot. Si no hi caben totes, **el que cedeix és la segona catalana**, mai la notícia gran del dia ni la quota de ciència.
- **Compta com a ciència — TOTES les ciències, no només les dures:**
  - **recerca publicada o en preprint**: *Nature*, *Science*, *Nature Medicine*, *The Lancet* i *Lancet Digital Health*, *PNAS*, *NEJM*, *JAMA*, *BMJ*, arXiv, medRxiv, bioRxiv, NeurIPS/ICML/ACL;
  - **IA aplicada a qualsevol disciplina**, dura o no: biologia, **medicina i pràctica clínica**, **salut pública i epidemiologia**, química, materials, física, matemàtiques, clima, energia, astronomia, **neurociència**, **psicologia i ciències cognitives**, **educació**, **lingüística**, **arqueologia i història**, **sociologia i demografia**, **dret i criminologia** com a disciplines acadèmiques;
  - **resultats tècnics amb mètode i avaluació**: interpretabilitat, arquitectures noves, eficiència, robòtica de laboratori, avaluacions rigoroses de capacitats;
  - **recerca feta aquí**: BSC-MareNostrum, IIIA-CSIC, ICFO, IRB Barcelona, CRG, ICREA, Eurecat, i2CAT, VHIR, IDIBAPS, ISGlobal, CREAF, ICO, universitats catalanes i espanyoles.
- **NO compta:**
  - la notícia **corporativa amb decorat científic**. Casos reals que no valen: «OpenAI dona accés gratuït a 100.000 científics», «un medallista Fields fitxa per una empresa d'IA», «DeepMind desmantella l'equip d'AlphaFold», «tal centre rep 40 milions europeus». Prova ràpida: **treu-ne els diners i el nom de l'empresa; si no queda cap resultat científic, no compta.**
  - 🛑 **el pany de les ciències socials**: que s'hi admetin la sociologia, l'educació o el dret **no obre la porta a l'economia per darrere**. Un article acadèmic d'economia o de gestió, revisat i amb mètode, **sí** que compta. Un **informe d'un banc, d'una consultora, d'una patronal o d'una casa d'anàlisi** (Gartner, McKinsey, un servei d'estudis) **NO compta mai**, encara que porti gràfics, mostra i percentatges: això és material de la cerca econòmica, i comptar-lo com a ciència desfaria justament el que aquesta quota ve a corregir. La pregunta que ho resol: **qui l'ha revisat, i què hi guanya qui el publica?**
- **Prioritza la font primària** (l'article, el preprint, el blog del laboratori, la nota del centre) per damunt de la reescriptura d'un mitjà generalista. Explica el resultat i el mètode en llenguatge planer, sense exagerar-ne l'abast, i distingeix sempre un **resultat** d'un **anunci**.
- **Categoria:** `"category": "CIÈNCIA"` per a la recerca en general i `"SALUT"` per a la clínica i la salut pública. Escriu-la sempre amb la mateixa grafia (amb accent).
- **On buscar-la.** El llistat diari d'**arXiv** (`cs.AI`, `cs.LG`, `cs.CL`, `q-bio`), **medRxiv** i **bioRxiv**, **Nature** i **Nature Machine Intelligence**, **Science**, **Nature Medicine**, **The Lancet Digital Health**, **PNAS**, **JAMA**, la secció d'IA de **ScienceDaily**, **Quanta Magazine**, **EurekAlert**, els blogs de recerca dels laboratoris (DeepMind, Anthropic, OpenAI, Meta AI, Allen Institute, MIT News, EPFL) i les notes dels centres d'aquí (BSC, IIIA-CSIC, ICFO, IRB, CRG, ICREA, ISGlobal, UPC, UPF, UB, UAB).
- 🛑 **La quota és un terra, no una excusa per baixar el llistó.** El risc d'aquest criteri és omplir-lo de recerca menor: un preprint sense contrastar, un estudi amb quatre participants, un titular inflat a partir d'un resultat modest. **Val més publicar-ne una de menys i recuperar-la al lot següent que forçar-ne una de dolenta.** Una peça de recerca sòlida i ben explicada val més que la cinquena notícia d'un acord milionari.

## La imatge de cada notícia

La fotografia ha d'il·lustrar **el que diu la notícia**, no la idea genèrica d'«intel·ligència artificial». Si el subjecte és un robot humanoide, s'ha de veure un robot humanoide; si és un braç robòtic, un braç robòtic; si és un centre de dades, un centre de dades; si és una decisió empresarial o reguladora, un context humà o institucional creïble.

⚠️ La instrucció d'evitar robots i androides que hi ha a `daily-image.md` és **només** per a la fotografia editorial del dia, on el robot és un clixé. **Aquí no s'aplica**: una notícia sobre robots humanoides il·lustrada amb un robot no humanoide és un error (va passar el 30.07.2026 amb dues notícies del mateix lot).

## Camp opcional `seccio` (encaminament de seccions)

A part dels camps de dalt, cada notícia pot portar un camp OPCIONAL `seccio` per decidir a quina secció del web va:

- **Sense `seccio` (o `"seccio": "senyal"`)** — comportament per defecte: la notícia va al feed principal **«El senyal d'avui»** (`window.IA_NEWS`) i, si té context català, també es deriva sola a **«La IA que passa aquí»** (el radar). Fes servir això per a l'actualitat **global** d'IA i per a les notícies relacionades amb **Catalunya i la IA** (màxim dues de catalanes per lot; volem que aquestes surtin als dos llocs).
- **`"seccio": "radar"`** — la notícia va NOMÉS a **«La IA que passa aquí»** i **no apareix al feed principal** ni a l'hemeroteca. Reservat EXCLUSIVAMENT a les notícies de la **IA i l'economia a Espanya** (adopció d'IA per empreses, premsa econòmica: Expansión, Cinco Días, El Economista…) quan **no** siguin d'una empresa purament catalana. **Mai marquis `radar` una notícia global o internacional** (error real del 24.07.2026: una notícia d'OpenAI/ChatGPT Health marcada `radar` — era actualitat global i havia d'anar al feed): al radar només hi va Catalunya o IA-economia a Espanya, res més.

⚠️ **REGLA DE RECOMPTE (imprescindible):** les notícies amb `"seccio": "radar"` **NO compten dins de les cinc del lot**. Les cinc obligatòries són sempre notícies de feed (sense `seccio` o amb `"seccio": "senyal"`). Si marques alguna peça com a `radar`, afegeix-la **a més** de les cinc: un lot vàlid té 5 notícies de feed + 0, 1 o 2 de radar (5–7 ítems en total). Un lot amb menys de 5 notícies de feed deixa l'edició coixa (va passar el 24.07.2026: 2 de les 5 anaven marcades `radar` i el web només va publicar 3 notícies).

El camp és intern: mai s'escriu al contracte públic `window.IA_NEWS`.
