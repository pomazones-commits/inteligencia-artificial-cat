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
