# Encàrrec diari: IA × Societat (la fotografia del dia)

Una fotografia periodística sobre la relació entre la intel·ligència artificial i la societat catalana. **La varietat no és un adorn d'aquest encàrrec: n'és el requisit principal.**

## 0. Primer de tot: mira què s'ha publicat (obligatori)

Abans de pensar cap idea, executa al repositori:

```
node automation/scripts/content-hub.mjs imatges-recents --state-dir .content-state
```

Et dirà, llegit de l'historial real: què s'ha publicat els últims 30 dies, **quins temes estan vetats avui**, quins **temes queden lliures** i quins **escenaris i subjectes** no pots repetir.

**Aquesta sortida mana sobre qualsevol idea que tinguis.** Si no la pots executar, llegeix directament `.content-state/daily-images.json`; si tampoc hi és, aplica igualment les regles del punt 1 amb el que puguis reconstruir.

## 1. Les tres regles d'antirepetició

1. **Tema**: tria'n un dels **TEMES LLIURES** que t'ha donat la comanda. Cap tema no es pot repetir dins de **12 dies**. La roda és tancada: `camp-i-mar`, `ciencia`, `ciutat`, `cultura`, `economia-domestica`, `educacio`, `esport`, `gent-gran-i-cures`, `industria`, `infancia-i-adolescencia`, `justicia-i-drets`, `llengua`, `medi-ambient`, `salut`, `seguretat-i-emergencies`, `treball`.
2. **Escenari** (el lloc): no pot coincidir amb cap dels **últims 30 dies**.
3. **Subjecte** (qui hi surt): no pot coincidir amb cap dels **últims 21 dies**.

S'han de complir totes tres. Si la idea que tens en falla una, canvia d'idea, no de justificació.

El tema del dia surt de la roda, **no de la notícia més gran del matí**. Si el tema lliure que tries lliga amb l'actualitat, millor; si no, la fotografia va igualment del tema que toca. La portada ja té cinc notícies per explicar el dia.

## 2. Clixés prohibits (són els que ja s'han gastat)

Aquestes composicions **no es poden tornar a fer**, ni amb variants:

- Una persona gran **sola a la taula de la cuina** mirant una tauleta, un mòbil o un altaveu intel·ligent.
- Un **pagès amb barret de palla** dret entre fileres d'arbres o de ceps **sostenint una tauleta**.
- Algú **assegut sol en un banc de parc o de plaça** mirant el mòbil amb posat pensatiu.
- Un professional qualsevol **dret al costat d'una màquina sostenint una tauleta amb gràfics**.
- Robots, androides, cervells lluminosos, planetes, hologrames, neó ciberpunk i poses de fotografia corporativa.

La regla que hi ha al darrere: **la fotografia no ha de ser per força «una persona mirant una pantalla»**. La major part de les vegades la tecnologia no s'ha de veure gens.

## 3. Varia també la manera de mirar

Cada dia canvia com a mínim **dos** d'aquests eixos respecte del dia anterior:

- **Escala**: pla general d'un lloc · pla mitjà de dues o tres persones · detall de mans, eines o objectes · retrat.
- **Nombre de persones**: ningú · una · una parella · un equip de feina · una cua, una aula, una grada.
- **Hora i llum**: matinada, migdia dur d'estiu, tarda, nit, interior de fluorescent, pluja.
- **Territori**: no tot és una masia o un pis de Barcelona. Polígons, ports, mercats, hospitals comarcals, escoles, laboratoris, obres, magatzems, càmpings, museus, biblioteques de barri, centres de dades, camps de futbol, estacions, càmeres frigorífiques, jutjats, ràdios locals.
- **Registre**: pot ser una escena d'espera, de discussió, de celebració, d'avorriment o de feina bruta; no sempre serenor contemplativa.

## 4. Criteri visual (es manté)

- La persona, la comunitat o la decisió humana han de ser el centre; la tecnologia queda en segon pla o directament fora de camp.
- Estètica documental, realista, contemporània i adequada per a un mitjà seriós.
- No generis text, logotips ni marques dins de la fotografia.
- Format vertical 4:5, amb espai visual a la part inferior per al peu editorial.
- Desa la imatge com `public/assets/daily-reflection-AAAA-MM-DD.jpg` (JPEG de debò, ≤1200 px de costat, <350 KB) i **no reutilitzis mai la fotografia d'un altre dia**.

## 5. El JSON

Retorna exclusivament aquest JSON a `incoming/daily-image.json`:

```json
{
  "date": "AAAA-MM-DD",
  "image": "./assets/daily-reflection-AAAA-MM-DD.jpg",
  "alt": "Descripció literal i accessible de la fotografia",
  "kicker": "IA × Societat",
  "title": "Una idea editorial breu",
  "caption": "Una frase que connecti la fotografia amb el tema del dia",
  "credit": "Imatge editorial generada amb IA",
  "tema": "un dels TEMES LLIURES de la roda temàtica",
  "escenari": "el lloc, en dues o tres paraules: «port pesquer», «aula de FP», «magatzem frigorífic»",
  "subjecte": "qui hi surt, en dues o tres paraules: «peixatera», «alumnes de cicle», «mosso de magatzem»",
  "body": "Text d'uns 5 paràgrafs, separats per una línia en blanc."
}
```

⚠️ **`tema`, `escenari` i `subjecte` són el que alimenta la memòria del sistema.** Sense aquests camps la fotografia es publica igualment, però l'endemà l'antirepetició treballa a cegues. Escriu-los sempre, i escriu-los honestament: si l'escena és una cuina de casa, posa-hi «cuina de casa», no un sinònim per esquivar el veto.

## 6. El text associat (`body`)

És el que es llegeix en clicar la fotografia a la portada (`imatge-del-dia.php`). **ABANS d'escriure'l, fes una cerca web** sobre la temàtica concreta de la imatge i fonamenta'l en fets, projectes o institucions reals i verificables; verifica el que afirmis i no inventis dades ni xifres. Uns 5 paràgrafs separats per una línia en blanc, en català periodístic, reflexiu i honest, sense cap frase de farciment.

**El `body` també ha d'anar amb el tema del dia, no amb el de sempre.** Si el tema d'avui és `llengua` o `esport`, el text va d'això: no el redirigeixis cap a la soledat de la gent gran ni cap a la digitalització del camp perquè hi hagi més material a mà.

## 7. No publiquis si

- la imatge no existeix, o té errors anatòmics, text il·legible, marques o clixés tecnològics;
- l'escena repeteix un tema, un escenari o un subjecte vetat pel punt 1;
- l'escena és una de les del punt 2.

En qualsevol d'aquests casos, torna a generar-la. Val més cinc minuts més que una fotografia que el lector ja ha vist tres vegades aquest mes.

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
