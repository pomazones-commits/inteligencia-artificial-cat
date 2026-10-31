# Encàrrec diari: lot de cinc notícies

Conserva la selecció i el procés de verificació actuals. Genera exactament cinc notícies diferents **destinades al feed principal «El senyal d'avui»** (és a dir, cinc notícies SENSE `"seccio": "radar"`), en català, sobre canvis rellevants en intel·ligència artificial. Composició de les cinc: les **peces de ciència que toquin a aquest lot** (1-1-2-2 segons l'hora, vegeu «La quota de ciència» més avall), actualitat **global** de primer nivell i, **com a màxim dues per lot**, notícies relacionades amb **Catalunya (o la resta de territoris de parla catalana) i la IA**. Si a més vols aportar peces només per al radar (vegeu el camp `seccio` més avall: només notícies dels territoris de parla catalana), són **addicionals**: el lot tindrà llavors sis o set ítems, mai menys de cinc per al feed. Dona prioritat a fonts primàries, data cada afirmació i diferencia fets d'interpretacions. No copiïs el text de les fonts.

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

- 🛑 **cap persona real reconeixible**: res de cares de polítics, directius o científics amb nom, ni ningú que s'hi assembli. Si la notícia gira al voltant d'una persona real amb nom i no n'has trobat cap foto amb llicència, la il·lustració no mostra la cara de NINGÚ (el lector la prendria per aquella persona): faristol, escenari, mans, silueta a contrallum.
- 🛑 **cap producte concret inventat**: si la notícia és justament la presentació d'unes ulleres, un mòbil o un xip nous, no els dibuixis. Sí: l'escenari de la presentació, una pantalla gran sense text, una mà que sosté un objecte desenfocat.
- 🛑 **cap logotip, marca ni text** llegible.
- Els objectes **genèrics** sí que es poden mostrar tal com diu la notícia: un robot humanoide, un braç robòtic, un centre de dades (vegeu més amunt). El que no es pot fer és fer-los passar pel model concret d'una empresa.

La pàgina de l'article mostra sola el peu «Foto: …» per a les fotos reals i «Il·lustració generada amb IA» per a la resta.

### Persones de cara, no d'esquena (des del 31.10.2026)

En Rafael: a «El senyal d'avui» sortien massa il·lustracions amb la gent d'esquena. La regla anterior («públic d'esquena, silueta») era per no inventar la cara d'una persona real, però **una persona anònima i inventada sí que pot sortir de cara**. Ara, **el 70% de les il·lustracions amb persones les mostren de cara**.

Com que a ull no es pot comptar un 70% en lots de 5, el repartiment el fa una comanda. **Un cop escrit `incoming/news-batch.json` i ABANS de generar cap imatge**, executa:

```
node automation/scripts/content-hub.mjs enquadraments --input incoming/news-batch.json
```

Per a cada notícia et dirà una de tres coses, i el prompt de la il·lustració l'ha de seguir:

- **DE CARA** → si hi surten persones, la principal **mira a càmera o de tres quarts, amb la cara ben visible i nítida**, en una escena que expliqui la notícia (una metgessa que revisa una imatge mèdica, un operari al costat d'un braç robòtic, una mestra amb els alumnes). Gent **corrent i inventada**, de totes les edats i orígens, mai amb l'aspecte d'algú conegut. Escriu-ho explícitament al prompt («facing the camera», «three-quarter view, face clearly visible»): si no, el model tendeix a girar-les. Si el subjecte de la notícia no té persones (un satèl·lit, un xip, un centre de dades buit), no les forcis: compta igualment com a feta.
- **LLIURE** → l'enquadrament que millor expliqui la notícia: perfil, esquena, mans, grup, o sense persones.
- **RETRAT** → el títol esmenta una persona del banc de retrats: l'script hi posarà sol la seva **foto real amb llicència lliure**. La il·lustració de recanvi, **sense cap cara**.

⚠️ **La comanda no detecta totes les persones famoses**: només les del banc. Si la notícia tracta d'una persona real amb nom que no hi és (un investigador, una consellera), el resultat DE CARA **no s'aplica**: busca-li una foto amb llicència (`imageFetch`, apartat anterior) i, si no n'hi ha, il·lustració de context sense cap cara.

Una il·lustració amb la persona d'esquena quan la comanda deia DE CARA **compta com a error** i justifica el reintent de l'apartat següent.

### Quantes vegades es genera una il·lustració (des del 23.10.2026)

Cada imatge que es genera i es llença es paga igual que la que es publica. A l'octubre del 2026 se'n generaven unes 37 al dia per publicar-ne 21. Per això:

1. **Primer intent** amb el prompt normal. Revisa la imatge **una vegada**.
2. **Un sol reintent** NOMÉS si incompleix una regla 🛑 d'aquest apartat (persona real reconeixible, producte concret inventat, logotip, marca o text llegible), si no mostra el subjecte de la notícia, o si la comanda `enquadraments` deia DE CARA i la persona principal surt d'esquena. Corregeix el prompt allà on ha fallat.
3. **Tercer i últim intent**, només si el segon també incompleix una regla 🛑: un prompt de **context mínim i segur**, sense cap persona de cara, cap pantalla, cap rètol i cap aparell concret (per exemple: un auditori buit amb un faristol, unes mans sobre un teclat desenfocat, un passadís de centre de dades, un laboratori desenfocat, una sala de reunions amb finestrals), triat segons el tema de la notícia.
4. **No es reintenta per qüestions de gust**: una composició millorable o una imatge poc espectacular es publiquen. Màxim **tres generacions per notícia**.
5. **Errors tècnics de l'API** (temps d'espera, error 5xx, quota momentània) no compten com a intents: torna-ho a provar després de 10, 30 i 60 segons.

🛑 **Cap notícia no es publica sense imatge** (decisió d'en Rafael del 23.10.2026). Totes les notícies del lot han de portar `image` amb el fitxer desat a `public/assets/<slug>-AAAAMMDD.jpg`. Si, tot i així, una notícia es queda sense imatge, el Content Hub **no la publica**: la reté a `.content-state/sense-imatge.json` i la torna a provar a cada lot del mateix dia, de manera que entra sola en quant hi hagi el fitxer `<slug>-AAAAMMDD.jpg` (amb la data de l'edició). Al lot següent, mira aquell fitxer i, si hi ha alguna notícia retinguda, genera-li la imatge amb aquell nom.

**Al missatge del commit del lot**, afegeix una línia amb el recompte: `Imatges: N generades per M notícies` (si és el lot de les 06.05, compta-hi també la fotografia del dia). Serveix per vigilar la despesa de Gemini.

## Camp opcional `video` (prova pilot del 06.10 al 20.10.2026)

Una notícia pot portar un vídeo de YouTube que expliqui **el mateix fet**. La pàgina de l'article el mostra sota el text, amb una miniatura que només carrega el reproductor quan el lector hi fa clic. Els vídeos que no s'hagin lligat a cap notícia surten igualment a la secció **/videos**.

**Fins a 6 vídeos per edició sencera (els quatre lots), i com a màxim 2 per lot** (ampliat de 3 a 6 el 06.10.2026, a petició d'en Rafael). Abans de posar-ne cap, compta a `public/news.js` quants n'han sortit avui (notícies amb camp `video`).

🛑 **És un sostre, no una quota.** Si un dia només n'hi ha un de bo, se'n posa un; si no n'hi ha cap, cap. Més val cap vídeo que un vídeo dubtós.

### D'on surten els vídeos: NOMÉS de `public/data/videos.json` (des del 09.10.2026)

🛑 **No cerquis vídeos a la web.** La cerca amb `site:youtube.com` no funciona (l'eina ignora el filtre i no torna cap enllaç de YouTube: del 06 al 09.10.2026, zero vídeos en 60 notícies) i el teu sandbox no arriba a YouTube. En lloc d'això, el workflow `videos.yml` llegeix diverses vegades al dia el RSS dels canals oficials de la llista tancada `automation/video-channels.json` —3Cat, 3CatInfo, betevé, À Punt, IB3, el Govern, OpenAI, Anthropic, Google, Google DeepMind, AI at Meta, NVIDIA, Microsoft, BSC, UPC, *Nature*, *Science*, la Comissió Europea— i en desa els vídeos sobre IA dels últims 21 dies a `public/data/videos.json`. Com que la llista és tancada, **la fiabilitat del canal ja està garantida**: no cal comprovar-la.

Per veure'ls, executa:

```
node automation/scripts/recull-videos.mjs --candidats --dies 4
```

Surt una línia per vídeo: data, identificador, llengua, canal i títol (i «ja lligat a …» si ja té notícia). Si vols el detall, cada vídeo de `videos.json` porta també l'inici de la descripció (`descripcio`).

Per a cada una de les 5 notícies del lot, mira si algun d'aquests vídeos tracta **exactament el mateix fet** (no el tema en general: una notícia sobre el model nou d'OpenAI → el vídeo de presentació d'aquest model, no un altre vídeo d'OpenAI). On n'hi sol haver: **llançaments i presentacions**, **notícies catalanes** (peça de 3Cat, betevé, À Punt o IB3; si el mateix fet té vídeo en català, tria aquest) i **ciència** (vídeo explicatiu del centre o de la revista). Les notícies d'economia i d'inversions rarament en tenen cap.

### Vídeos que arriben tard → `incoming/videos-assignats.json`

Les peces de les televisions, els vídeos explicatius i les gravacions de congressos solen arribar **hores o dies després** de la notícia escrita. Per això, a cada lot, repassa també les notícies **ja publicades dels últims 3 dies** que no porten vídeo (`public/news.js` i `public/data/archive.json`): si a la llista hi ha un vídeo nou que tracta exactament aquell fet, lliga'ls escrivint `incoming/videos-assignats.json` (sobreescriu-lo cada lot; `[]` si no n'hi ha cap):

```json
[
  { "slug": "slug-de-la-noticia-ja-publicada", "video": "XXXXXXXXXXX", "idioma": "ca", "resum": "Dues o tres frases en català." }
]
```

Com a màxim **3 per lot**, i compten dins del sostre de 6 per edició. El workflow `videos.yml` només n'accepta els vídeos que siguin a la llista i les notícies que existeixin; la pàgina de l'article els mostra sense haver de tocar la notícia.

Format (dins de la notícia, al costat dels altres camps):

```json
"video": {
  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "idioma": "en",
  "resum": "Dues o tres frases en català que expliquin què s'hi veu i què s'hi diu."
}
```

- `url`: `https://www.youtube.com/watch?v=` + l'identificador del vídeo de la llista.
- `idioma`: codi de dues lletres de la llengua en què es parla (`ca`, `es`, `en`, `fr`…). Si és en una altra llengua que no és el català, la pàgina ja avisa el lector i intenta posar-li els subtítols en català.
- `resum`: **obligatori si el vídeo no és en català**. Dues o tres frases (màxim 60 paraules) que diguin què és el vídeo i què hi trobarà el lector, perquè qui no entén la llengua sàpiga si li interessa. 🛑 **Tu no has vist el vídeo**: escriu-lo a partir del títol, de la descripció i del fet de la notícia («Presentació oficial de GPT-6 que OpenAI va emetre en directe el 7 d'octubre…»), i **no t'inventis què s'hi diu ni què s'hi ensenya**. Amb les mateixes regles de llengua que la resta de la notícia.
- **No hi posis títol, canal ni `verificat`**: els omple sols el workflow `content-hub.yml`, que comprova a YouTube que el vídeo existeix i es pot inserir, i que llegeix el títol i el canal reals. Si el vídeo no passa la comprovació, la notícia es publica igualment, sense vídeo.

## Camp opcional `seccio` (encaminament de seccions)

A part dels camps de dalt, cada notícia pot portar un camp OPCIONAL `seccio` per decidir a quina secció del web va:

🛑 **Criteri del radar català (des del 15.10.2026, decisió d'en Rafael): al radar NOMÉS hi van notícies el protagonista de les quals és dels territoris de parla catalana** — Catalunya, la Comunitat Valenciana, les Illes Balears, Andorra, la Catalunya Nord, la Franja i l'Alguer. Protagonista vol dir l'empresa, el centre, la institució o la persona que fa la notícia, o el lloc on passa el fet. **NO hi van mai**: actualitat global o internacional; notícies d'àmbit **estatal** (Govern d'Espanya, Moncloa, plans i ajuts estatals, el BBVA o el Banc d'Espanya com a entitats de Madrid o Bilbao, enquestes i estudis d'abast espanyol); ni estudis o rànquings on Catalunya només surt com **un dels territoris mesurats**. Si una d'aquestes és important, va al feed com a actualitat normal, sense marca; si no, no es publica. Errors reals que aquest criteri talla: el Pla IA360 de la Moncloa (01.10), els 180 milions d'ajuts estatals, l'enquesta a CIOs espanyols (22.09) i el BBVA i el protocol Poppy (14.10), tots marcats `radar`. Una empresa de fora que s'instal·la o inverteix aquí (Tolemy Bio a Barcelona) o una entitat d'aquí que contracta una empresa de fora (l'Institut Català de Finances) **sí** que hi compten, perquè el fet passa aquí. El títol de la secció a la portada no canvia.

🔎 **Cerca territorial a cada lot (des del 15.10.2026).** El radar gairebé només recollia Catalunya: de més de 70 senyals entre l'agost i l'octubre del 2026, un de sol era valencià i cap no era balear. A cada lot, a més de la cerca habitual, busca notícies d'IA de la **Comunitat Valenciana** (amb atenció especial a **Alacant**: Universitat d'Alacant, ELLIS Alicante, Distrito Digital, l'EUIPO; i a València: ValgrAI, UPV i VRAIN, Universitat de València, ITI), de les **Illes Balears** (UIB, Fundació BIT i ParcBit, Govern balear) i d'**Andorra**. Fonts de partida: `node automation/scripts/recull-premsa.mjs --candidats --hores 8`, que ara inclou Información, Alicante Plaza, Levante-EMV, Valencia Plaza, Las Provincias, Diario de Mallorca i Última Hora, a més d'À Punt, Diari La Veu, El Temps, Ara Balears, dBalears i el Diari d'Andorra. Escriu la peça sempre a partir de la font primària i amb l'antirepetició de sempre. Si és prou important, va al feed amb `"seccio": "catalunya"`; si no, al radar amb `"seccio": "radar"`, a més de les cinc del lot. No n'hi ha cap quota: si un dia no hi ha res nou, no forcis.

- **Sense `seccio`** — comportament per defecte: la notícia va al feed principal **«El senyal d'avui»** (`window.IA_NEWS`) i, si el títol, l'entradeta o l'slug porten un nom de la llista automàtica, també es deriva sola al radar. Fes servir això per a l'actualitat **global** d'IA.
- **`"seccio": "senyal"`** (des del 15.10.2026 vol dir «només al feed, mai al radar») — posa-la a les notícies del feed que **esmenten Catalunya o un altre territori però no en són**: estudis, enquestes i rànquings estatals on Catalunya és un dels territoris mesurats (cas real: «Un estudi del BBVA situa Madrid i Catalunya al capdavant…», 27.09.2026), o una notícia global que cita de passada un centre d'aquí. Sense la marca, la paraula «Catalunya» al titular la colaria al radar.
- **`"seccio": "catalunya"`** (des de l'01.10.2026) — **posa-la a TOTES les notícies del feed amb protagonista dels territoris de parla catalana** (el nom de la marca és històric: val igual per a una notícia de València, Palma o Andorra). Va al feed com les altres i, a més, entra al radar. Sense aquesta marca, el radar només la recull si el títol, l'entradeta o l'slug porten un nom de la llista automàtica (Catalunya, Barcelona, València, Mallorca, Andorra, Generalitat, UPC, BSC…); el 29 i el 30.09.2026 se'n van quedar fora dues peces que només deien «el Govern», «Interior» i «els Mossos». Compta dins de les cinc del lot i dins del màxim de dues «catalanes» (és a dir, dels territoris).
- 🗺️ **Categoria territorial (des del 18.10.2026, decisió d'en Rafael).** Quan la categoria d'una notícia dels territoris és el lloc, escriu el territori real: `"CATALUNYA"`, `"COMUNITAT VALENCIANA"`, `"ILLES BALEARS"`, `"ANDORRA"` o `"CATALUNYA NORD"`. Una notícia d'Altea, d'Alacant o de València **no** és `CATALUNYA`; una de Palma, de Menorca o de la UIB és `ILLES BALEARS`. Error real: «Altea fa parlar amb IA el seu guerrer ibèric…» (18.10.2026) va sortir amb l'etiqueta CATALUNYA. Com a xarxa de seguretat, el Content Hub corregeix l'etiqueta segons els topònims del titular i l'entradeta (i, si no n'hi ha, del cos), així que anomena sempre el municipi o l'entitat. La marca `"seccio": "catalunya"` no canvia: continua valent per a tots els territoris.
- **`"seccio": "radar"`** — la notícia va NOMÉS al radar i **no apareix al feed principal** ni a l'hemeroteca. Des del 15.10.2026 es reserva a notícies **dels territoris de parla catalana** que valen la pena per al radar però no per a una de les cinc places del feed (una ronda petita d'una empresa d'aquí, un projecte municipal, una notícia de comarques). **Ja no és per a la IA i l'economia a Espanya**: aquestes, si són importants, van al feed sense marca; si no, no es publiquen. **Mai marquis `radar` una notícia global, internacional o estatal** (errors reals: ChatGPT Health d'OpenAI, 24.07.2026; el Pla IA360, 01.10.2026; el BBVA i Poppy, 14.10.2026). Com a xarxa de seguretat, el Content Hub descarta del radar les peces marcades `radar` o `catalunya` que no esmentin enlloc —ni al cos— cap nom de la llista automàtica; perquè no et passi, anomena sempre el municipi, la comarca o l'entitat d'aquí.

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
- **gemell** digital (*digital twin*) → «**bessó** digital». «Gemell» és el castellà *gemelo*; en català és «bessó» (terme del TERMCAT).
- **La ç no es perd mai** (26.10.2026). L'slug va sense ç (`…-financar-ia`), però el titular, l'entradeta i el cos **sí** que la porten: «finan**ç**ar», «comen**ç**ar», «llan**ç**ament», «capa**ç**». No copiïs mai un mot de l'slug al text. Error real: «…maneres de *financar* la inversió en IA» → «…de **finançar**…». Davant de *e*, *i* va **c**: «financen», «capaces». (`content-hub.mjs` ja corregeix sol les formes més habituals, però no les coneix totes.)

**No n'hi ha prou amb la llista: escriu com un periodista català, no com un traductor.** Les fonts solen ser en anglès; tradueix el sentit, no la construcció. Rellegeix el titular i l'entradeta com si s'haguessin de dir per la ràdio: si sonen a traducció, reescriu-los. Verb concret, veu activa, termes tècnics explicats amb paraules planeres. Exemple real (28.09.2026): «podia **buidar en silenci** les dades» → «podia **sostreure d'amagat** les dades»; «exposava el **testimoni d'autenticació**» → «deixava a la vista la **credencial d'accés**».

**Revisió final de cada titular (des del 06.10.2026).** Abans de lliurar, passa cada titular per aquestes cinc preguntes i, si en falla una, reescriu-lo: 1) cada verb vol dir exactament això en català? (falsos amics: demanar/demandar, assumir, eventualment, suportar…); 2) hi ha cap terme tècnic entre cometes que el lector no entendria? (fora del titular, o explicat); 3) hi ha cap construcció forçada (impersonal amb «se» + pronom, passiva, gerundi)?; 4) s'entén d'una sola lectura en veu alta, com a la ràdio?; 5) té més de dues idees encadenades? (deixa'n una per a l'entradeta). Errors reals del 06.10.2026: «Vint-i-cinc models de llenguatge guarden una **«direcció del dolor»** a dins, i quan **se l'amplifica** trien esborrar fotos i **pesos**» → «Un estudi troba en 25 models d'IA un **senyal intern associat al dolor** que, si l'intensifiquen, els porta a esborrar fotos i fins i tot altres models»; «Dos antics enginyers de Groq **demanen la junta** pel **pacte**…» → «…**demanden el consell d'administració** per l'**acord**…».

## Quan la cerca web no torna res d'avui (des del 20.10.2026)

Error real del 20.10.2026 (lot de les 10:05): el cercador genèric (`WebSearch`) només va tornar pàgines velles, el lot es va donar per impossible i no es va publicar res fins que en Rafael ho va demanar. **Mai no es tanca un lot sense publicar-lo** per aquest motiu: hi ha notícies noves cada dia.

1. Deixa el cercador i **obre directament les portades** amb `WebFetch` (demana títols, dates i URL): `techcrunch.com/category/artificial-intelligence/` (la data és a la URL), `news.mit.edu/topic/artificial-intelligence2`, `techxplore.com/machine-learning-ai-news/`, `sciencedaily.com/news/computers_math/artificial_intelligence/`, `catalannews.com`. *The Verge*, *Ars Technica*, *El Periódico*, *Nature* (redirigeix a un inici de sessió) i el web del BSC no es poden llegir.
2. Obre l'article de cada candidata per verificar-la. A Tech Xplore i MIT News hi surt la revista i el DOI: serveixen per a la quota de ciència.
3. Compara amb `public/data/archive.json` (criteri **a** de CLAUDE.md) i publica les 5 que passin. Si, fet tot això, en tens menys de 5, publica el que tinguis verificat i avisa'n: val més un lot curt que cap lot.
