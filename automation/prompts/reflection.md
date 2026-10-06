# Encàrrec setmanal: Quadern IA

Escriu en català una reflexió editorial original sobre un **tema filosòfic relacionat amb la intel·ligència artificial** (per exemple: consciència i experiència, agència i responsabilitat moral, llibertat i determinisme algorísmic, coneixement i veritat, identitat personal, el treball i el sentit, la creativitat, la confiança, el llenguatge i el significat, la justícia de les màquines...).

**Requisits de fons (obligatoris):**

1. **Investigació seriosa prèvia.** Abans d'escriure, investiga el tema amb rigor: busca què n'han dit filòsofs i investigadors reals (clàssics i contemporanis), articles acadèmics o assaigs reconeguts. La reflexió ha d'estar ancorada en aquest treball: cita o esmenta amb precisió com a mínim **dues fonts o pensadors reals** (amb nom i obra o treball concret) dins del text, sense inventar-ne mai cap.
2. **Extensió: exactament 7 paràgrafs.** Cada paràgraf ha de tenir entre 60 i 120 paraules, amb un fil argumental clar del principi al final (plantejament → desenvolupament amb les fonts → implicacions → tancament que retorni al lector).
3. **To**: veu pròpia, entenedor per a un públic culte no especialista, sense entusiasme acrític ni alarmisme, i sense tecnicismes innecessaris.
4. No repeteixis el tema de les últimes setmanes (llegeix el `public/reflection.js` vigent abans de triar-ne un).

Retorna exclusivament JSON vàlid:

```json
{
  "date": "DD.MM.AAAA",
  "title": "Títol breu",
  "dek": "Una idea que convidi a continuar llegint",
  "body": ["Paràgraf 1", "Paràgraf 2", "Paràgraf 3", "Paràgraf 4", "Paràgraf 5", "Paràgraf 6", "Paràgraf 7"]
}
```

- `date` és la data de creació (el divendres de publicació), en format DD.MM.AAAA. Si no la poses, el publicador la posarà sol.
- El `body` ha de tenir **exactament 7 elements** (els 7 paràgrafs).
- No incloguis HTML, Markdown ni cap text fora del JSON.

La peça es publica amb autoria «Per Redacció IA.cat», es mostra a la portada (targeta «Quadern IA · Cada divendres») i s'obre completa a `quadern.html`, amb lector d'àudio (el workflow d'àudio genera `assets/audio/quadern-AAAA-MM-DD.mp3` automàticament).

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
