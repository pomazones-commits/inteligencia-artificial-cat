# Encàrrec diari: IA × Societat

Parteix de la reflexió editorial principal del dia i crea una fotografia periodística inspiradora sobre la relació entre intel·ligència artificial i societat.

## Criteri visual

- La persona, la comunitat o la decisió humana han de ser el centre; la tecnologia queda en segon pla.
- Estètica documental, realista, contemporània i adequada per a un mitjà seriós.
- Alterna edats, territoris, professions i situacions quotidianes de Catalunya.
- Evita robots, androides, cervells lluminosos, planetes, hologrames, neó ciberpunk i poses de fotografia corporativa.
- No generis text, logotips ni marques dins de la fotografia.
- Format vertical 4:5, amb espai visual a la part inferior per al peu editorial.
- Desa la imatge com `assets/daily-reflection-AAAA-MM-DD.webp` o `.jpg` i no reutilitzis la fotografia del dia anterior.

Després retorna exclusivament aquest JSON a `incoming/daily-image.json`:

```json
{
  "date": "AAAA-MM-DD",
  "image": "./assets/daily-reflection-AAAA-MM-DD.webp",
  "alt": "Descripció literal i accessible de la fotografia",
  "kicker": "IA × Societat",
  "title": "Una idea editorial breu",
  "caption": "Una frase que connecti la fotografia amb la reflexió del dia",
  "credit": "Imatge editorial generada amb IA",
  "body": "Text d'uns 5 paràgrafs, separats per una línia en blanc, sobre la relació entre la intel·ligència artificial i la temàtica CONCRETA de la fotografia del dia. Ha d'estar FONAMENTAT en una cerca web prèvia amb fets, projectes o institucions reals i verificables; res de farciment ni frases buides. Català periodístic, reflexiu i honest."
}
```

El camp "body" és el text associat que es mostra en clicar la fotografia a la portada (pàgina imatge-del-dia.php), a l'estil d'un article. ABANS d'escriure'l, fes una cerca web sobre la temàtica concreta de la imatge (IA i agricultura, IA i sanitat, IA i educació, IA i cultura...) i fonamenta el text en fets, projectes o institucions reals i verificables; verifica el que afirmis i no inventis dades ni xifres. Han de ser uns 5 paràgrafs separats per una línia en blanc, sense cap frase de farciment.

No publiquis el JSON si la imatge no existeix o si la composició conté errors anatòmics, text il·legible, marques o clixés tecnològics.
