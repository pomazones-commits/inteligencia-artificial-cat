# Encàrrec diari: La reflexió del dia

**Quan:** només a l'**últim lot del dia** (el de les 18:05), un cop escrit i pujat
`incoming/news-batch.json`. Un dia sense reflexió no és cap catàstrofe; una
reflexió buida o inventada sí.

**Què és:** el balanç del dia. Un text curt que explica **com ha evolucionat avui
la intel·ligència artificial** i **quines tendències s'hi veuen**, escrit
**exclusivament a partir de les notícies publicades avui** al web.

## Com preparar-la (obligatori abans d'escriure)

1. **Llegeix el dia sencer.** Obre `public/news.js` (totes les notícies de l'edició
   d'avui, els quatre lots) i `public/radar.js`. Aquestes són les teves fonts: la
   reflexió no pot parlar de res que no hi hagi sortit.
2. **Busca el fil.** Pregunta't què tenen en comú les notícies d'avui: un mateix
   moviment de mercat, una mateixa pressió reguladora, una mateixa limitació
   tècnica que apareix per dues bandes, una contradicció entre dues notícies…
   El fil pot ser també una **absència** significativa.
3. **Situa-ho en el temps.** Mira la reflexió d'ahir (`public/reflexio-diaria.js`) i
   les anteriors (`public/reflexions-arxiu.js`): si el moviment d'avui confirma,
   matisa o desmenteix el que dèiem fa dies, digues-ho. **No repeteixis el mateix
   fil dos dies seguits** si no hi ha novetat real que ho justifiqui.
4. **No inventis res.** Cap xifra, cap empresa i cap declaració que no siguin a les
   notícies del dia. Si una tendència és només una hipòtesi, escriu-la com a
   hipòtesi.

## Com ha de ser el text

- **5 o 6 paràgrafs**, d'entre 90 i 130 paraules cadascun (unes 600 paraules).
- Fil clar: **què ha passat avui** → **què hi ha de nou de debò** (i què és soroll
  o repetició) → **quina tendència apunta** → **què caldrà mirar demà**.
- Català periodístic, veu pròpia, sense entusiasme acrític ni alarmisme, sense
  tecnicismes innecessaris i sense frases de farciment.
- No és el Quadern IA: allò és filosofia i és setmanal; això és **el dia d'avui**.
- El títol no ha de ser el titular d'una notícia: ha de nomenar el **fil**.

## Format

Retorna exclusivament JSON vàlid a `incoming/daily-reflection.json`:

```json
{
  "date": "AAAA-MM-DD",
  "title": "Títol breu que nomeni el fil del dia",
  "dek": "Una frase que digui què s'hi veu avui",
  "body": ["Paràgraf 1", "Paràgraf 2", "Paràgraf 3", "Paràgraf 4", "Paràgraf 5"],
  "signals": [
    { "title": "Titular de la notícia d'avui en què et bases", "slug": "slug-de-la-noticia" }
  ]
}
```

- `date`: la data de l'edició, en format **AAAA-MM-DD**.
- `body`: **5 o 6 paràgrafs**, sense HTML ni Markdown.
- `signals`: **de 2 a 4** notícies d'avui en què es basa la reflexió, amb l'`slug`
  exacte tal com surt a `public/news.js` (el web les enllaça soles amb
  `article.php?slug=…`). Si una peça del radar no té slug, es pot posar `url`.
  És opcional, però amb els senyals la peça queda molt més ben travada.
- No incloguis cap text fora del JSON.

La peça es publica amb autoria «Per Redacció IA.cat», surt a la portada just sota
«El senyal d'avui» i s'obre sencera a `reflexio.html`, amb lector d'àudio
(`assets/audio/reflexio-AAAA-MM-DD.mp3`, que genera sol el workflow d'àudio). La
reflexió del dia anterior passa automàticament a `arxiu-reflexions.html`.

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

**No n'hi ha prou amb la llista: escriu com un periodista català, no com un traductor.** Les fonts solen ser en anglès; tradueix el sentit, no la construcció. Rellegeix el titular i l'entradeta com si s'haguessin de dir per la ràdio: si sonen a traducció, reescriu-los. Verb concret, veu activa, termes tècnics explicats amb paraules planeres. Exemple real (28.09.2026): «podia **buidar en silenci** les dades» → «podia **sostreure d'amagat** les dades»; «exposava el **testimoni d'autenticació**» → «deixava a la vista la **credencial d'accés**».
