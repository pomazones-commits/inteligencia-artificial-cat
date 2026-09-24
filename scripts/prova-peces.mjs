// Comprova que public/peces.js (navegador) i public/inc/peces.php (servidor)
// donen EXACTAMENT els mateixos identificadors per a totes les peces.
// Ús: node scripts/prova-peces.mjs   (cal php a la màquina)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const pub = new URL('../public/', import.meta.url);
const llegeix = (f) => readFileSync(new URL(f, pub), 'utf8');

const w = {};
vm.runInNewContext(llegeix('peces.js'), { window: w, document: {} });
const dades = {};
for (const f of ['tribuna.js', 'tribuna-arxiu.js', 'estudis.js', 'estudis-arxiu.js', 'analysis.js',
  'analysis-arxiu.js', 'reflection.js', 'reflexio-diaria.js', 'reflexions-arxiu.js']) {
  vm.runInNewContext(llegeix(f), { window: dades });
}
const seccions = {
  tribuna: [dades.IA_TRIBUNA, dades.IA_TRIBUNA_ARXIU],
  estudis: [dades.IA_ESTUDI, dades.IA_ESTUDIS_ARXIU],
  analisi: [dades.IA_ANALYSIS, dades.IA_ANALISIS_ARXIU],
  quadern: [dades.IA_REFLECTION, null],
  reflexio: [dades.IA_REFLEXIO_DIARIA, dades.IA_REFLEXIONS_ARXIU]
};

const php = execFileSync('php', ['-r', `
  require '${new URL('inc/peces.php', pub).pathname}';
  $o = [];
  foreach (array_keys(iacat_seccions()) as $t) { foreach (iacat_peces($t) as $p) { $o[$t][] = [$p['id'], $p['idx']]; } }
  foreach (['Intel·ligència artificial: què és?', 'L’EncíclicAI i el PapAI', 'Ça va? Ñandú ŀl'] as $x) { $o['slug'][] = iacat_slug($x); }
  echo json_encode($o);
`], { encoding: 'utf8' });
const servidor = JSON.parse(php);

let total = 0;
for (const [tipus, [vigent, arxiu]] of Object.entries(seccions)) {
  const llista = [vigent].concat(arxiu || []);
  const ids = w.IAPeces.ids(tipus, llista);
  const navegador = [];
  const vistos = new Set();
  llista.forEach((item, k) => {
    if (!ids[k] || vistos.has(ids[k])) return;
    vistos.add(ids[k]);
    navegador.push([ids[k], k === 0 ? -1 : k - 1]);
  });
  assert.deepEqual(navegador, servidor[tipus] || [], `diferència a ${tipus}`);
  total += navegador.length;
  const u = new Set(navegador.map(x => x[0]));
  assert.equal(u.size, navegador.length, `ids repetits a ${tipus}`);
}
assert.deepEqual(['Intel·ligència artificial: què és?', 'L’EncíclicAI i el PapAI', 'Ça va? Ñandú ŀl'].map(w.IAPeces.slug), servidor.slug);
console.log(`OK: ${total} peces, mateixos identificadors al navegador i al servidor.`);
console.log(servidor.slug.join(' | '));
