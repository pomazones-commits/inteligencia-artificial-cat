# intel·ligència artificial.cat

Portada editorial en català sobre intel·ligència artificial, pensada per ser ràpida, accessible i visualment immersiva.

## Veure la portada

```bash
npm install
npm run dev
```

Obre `http://localhost:4173`.

## Edició automàtica (configuració necessària)

El flux de `.github/workflows/daily-edition.yml` llegeix fonts RSS, en genera una selecció en català, crea una imatge original i actualitza `public/content/latest.json` cada dia. Per activar-lo cal:

1. Pujar aquesta carpeta a un repositori de GitHub i connectar-lo a l’allotjament (GitHub Pages, Vercel o Netlify).
2. Afegir `OPENAI_API_KEY` com a secret del repositori. No la posis mai en un fitxer del projecte.
3. Revisar la llista `feeds` de `scripts/publish-daily.mjs`, les llicències d’ús de cada font i el protocol editorial.
4. Executar manualment el flux una primera vegada i validar exactitud, atribució, drets i to abans d’acceptar la programació diària.

La publicació automàtica és útil per a una selecció o butlletí, però la responsabilitat editorial continua essent humana: el guió obliga el model a treballar només amb les fonts aportades i manté l’enllaç a l’original.

## Actius

La portada usa `public/assets/hero-barcelona-ai.png`, una imatge original generada amb IA per a aquest projecte.
