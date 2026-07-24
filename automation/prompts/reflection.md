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
