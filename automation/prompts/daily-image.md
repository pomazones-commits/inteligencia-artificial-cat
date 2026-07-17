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
  "credit": "Imatge editorial generada amb IA"
}
```

No publiquis el JSON si la imatge no existeix o si la composició conté errors anatòmics, text il·legible, marques o clixés tecnològics.
