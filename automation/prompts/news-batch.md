# Encàrrec diari: lot de cinc notícies

Conserva la selecció i el procés de verificació actuals. Genera exactament cinc notícies diferents **destinades al feed principal «El senyal d'avui»** (és a dir, cinc notícies SENSE `"seccio": "radar"`), en català, sobre canvis rellevants en intel·ligència artificial. Composició de les cinc: **2 peces de ciència** (obligatòries a cada lot, vegeu «La quota de ciència» més avall), actualitat **global** de primer nivell i, **com a màxim dues per lot**, notícies relacionades amb **Catalunya i la IA**. Si a més vols aportar peces només per al radar (vegeu el camp `seccio` més avall), són **addicionals**: el lot tindrà llavors sis o set ítems, mai menys de cinc per al feed. Dona prioritat a fonts primàries, data cada afirmació i diferencia fets d'interpretacions. No copiïs el text de les fonts.

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

El feed s'havia inclinat massa cap a l'economia: l'auditoria del 08.08.2026 sobre 428 notícies va donar **43,9% de peces d'àmbit econòmic-empresarial** i **4,7% de ciència i salut**, amb 12 dels 26 dies sense cap peça científica. Aquesta secció ho corregeix.

- **2 de les 5 notícies d'AQUEST lot han de ser de ciència.** Són 8 al dia sobre 20 (40%). No es compensa entre lots: **cada lot en porta dues**. Si en un lot només n'has trobat una de bona, el següent n'ha de portar **tres**. Comprova què s'ha publicat avui llegint `public/news.js` abans de tancar el lot.
- ⚠️ **Ordre de prioritat de les 5 places** (perquè la quota no ofegui l'actualitat): **(1)** la notícia global més important del dia en IA — no pot faltar mai; **(2)** les 2 peces de ciència; **(3)** la resta d'actualitat global; **(4)** les catalanes, màxim 2 per lot i sovint només 1 quan el lot ja porta les dues de ciència. Si no hi caben totes, **el que cedeix és la segona catalana**, mai la notícia gran del dia ni la segona de ciència.
- **Compta com a ciència:** recerca publicada o en preprint (*Nature*, *Science*, *Nature Medicine*, *PNAS*, *The Lancet*, arXiv, NeurIPS/ICML/ACL); IA aplicada a una disciplina científica (biologia, medicina, química, materials, física, matemàtiques, clima, energia, astronomia, neurociència); resultats tècnics amb mètode i avaluació (interpretabilitat, arquitectures noves, eficiència, robòtica de laboratori); i la recerca feta aquí (BSC-MareNostrum, IIIA-CSIC, ICFO, IRB Barcelona, CRG, ICREA, Eurecat, i2CAT, VHIR, IDIBAPS, universitats catalanes i espanyoles).
- **NO compta** la notícia corporativa amb decorat científic. Casos reals que no valen: «OpenAI dona accés gratuït a 100.000 científics», «un medallista Fields fitxa per una empresa d'IA», «DeepMind desmantella l'equip d'AlphaFold», «tal centre rep 40 milions europeus». Prova ràpida: **treu-ne els diners i el nom de l'empresa; si no queda cap resultat científic, no compta.**
- **Prioritza la font primària** (l'article, el preprint, el blog del laboratori, la nota del centre) per damunt de la reescriptura d'un mitjà generalista. Explica el resultat i el mètode en llenguatge planer, sense exagerar-ne l'abast, i distingeix sempre un **resultat** d'un **anunci**.
- **Categoria:** `"category": "CIÈNCIA"` per a la recerca i `"SALUT"` per a la clínica. Escriu-la sempre amb la mateixa grafia (amb accent).
- **On buscar-la, cada lot.** El material hi és sempre: el llistat diari d'**arXiv** (`cs.AI`, `cs.LG`, `cs.CL`, `q-bio`), **Nature**, **Nature Machine Intelligence**, **Science**, **Nature Medicine**, **The Lancet Digital Health**, **PNAS**, la secció d'IA de **ScienceDaily**, **Quanta Magazine**, els blogs de recerca dels laboratoris (DeepMind, Anthropic, OpenAI, Meta AI, Allen Institute, MIT News, EPFL) i les notes dels centres d'aquí (BSC, IIIA-CSIC, ICFO, IRB, CRG, ICREA, UPC, UPF, UB, UAB). Amb dues places per lot has de baixar més enllà del titular del dia: **una peça de recerca sòlida i ben explicada val més que la cinquena notícia d'un acord milionari.**
- Si en un lot no hi ha ciència de debò, **no la inventis ni inflis un anunci d'empresa**: val més una peça de menys i recuperar-la al lot següent que forçar-ne una de dolenta. Però ha de ser l'excepció rara.

## La imatge de cada notícia

La fotografia ha d'il·lustrar **el que diu la notícia**, no la idea genèrica d'«intel·ligència artificial». Si el subjecte és un robot humanoide, s'ha de veure un robot humanoide; si és un braç robòtic, un braç robòtic; si és un centre de dades, un centre de dades; si és una decisió empresarial o reguladora, un context humà o institucional creïble.

⚠️ La instrucció d'evitar robots i androides que hi ha a `daily-image.md` és **només** per a la fotografia editorial del dia, on el robot és un clixé. **Aquí no s'aplica**: una notícia sobre robots humanoides il·lustrada amb un robot no humanoide és un error (va passar el 30.07.2026 amb dues notícies del mateix lot).

## Camp opcional `seccio` (encaminament de seccions)

A part dels camps de dalt, cada notícia pot portar un camp OPCIONAL `seccio` per decidir a quina secció del web va:

- **Sense `seccio` (o `"seccio": "senyal"`)** — comportament per defecte: la notícia va al feed principal **«El senyal d'avui»** (`window.IA_NEWS`) i, si té context català, també es deriva sola a **«La IA que passa aquí»** (el radar). Fes servir això per a l'actualitat **global** d'IA i per a les notícies relacionades amb **Catalunya i la IA** (màxim dues de catalanes per lot; volem que aquestes surtin als dos llocs).
- **`"seccio": "radar"`** — la notícia va NOMÉS a **«La IA que passa aquí»** i **no apareix al feed principal** ni a l'hemeroteca. Reservat EXCLUSIVAMENT a les notícies de la **IA i l'economia a Espanya** (adopció d'IA per empreses, premsa econòmica: Expansión, Cinco Días, El Economista…) quan **no** siguin d'una empresa purament catalana. **Mai marquis `radar` una notícia global o internacional** (error real del 24.07.2026: una notícia d'OpenAI/ChatGPT Health marcada `radar` — era actualitat global i havia d'anar al feed): al radar només hi va Catalunya o IA-economia a Espanya, res més.

⚠️ **REGLA DE RECOMPTE (imprescindible):** les notícies amb `"seccio": "radar"` **NO compten dins de les cinc del lot**. Les cinc obligatòries són sempre notícies de feed (sense `seccio` o amb `"seccio": "senyal"`). Si marques alguna peça com a `radar`, afegeix-la **a més** de les cinc: un lot vàlid té 5 notícies de feed + 0, 1 o 2 de radar (5–7 ítems en total). Un lot amb menys de 5 notícies de feed deixa l'edició coixa (va passar el 24.07.2026: 2 de les 5 anaven marcades `radar` i el web només va publicar 3 notícies).

El camp és intern: mai s'escriu al contracte públic `window.IA_NEWS`.
