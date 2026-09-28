# Encàrrec setmanal: anàlisi

Escriu en català una anàlisi original sobre el tema d'intel·ligència artificial més rellevant de la setmana per al públic de Catalunya. Prioritza conseqüències, context i criteri; evita el sensacionalisme, la publicitat i les afirmacions sense font. No copiïs frases de les fonts.

Retorna exclusivament JSON vàlid amb aquesta forma:

```json
{
  "title": "Títol precís i atractiu",
  "excerpt": "Resum editorial de 25 a 45 paraules",
  "body": ["Paràgraf 1", "Paràgraf 2", "Paràgraf 3"],
  "sources": [{"name": "Nom de la font", "url": "https://..."}]
}
```

Totes les URL han de correspondre a fonts reals consultades. Si no hi ha prou evidència, no generis el contingut i informa de l'error.

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
