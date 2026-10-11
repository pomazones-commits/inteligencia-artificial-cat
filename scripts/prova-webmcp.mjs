// Prova de public/webmcp.js (11.10.2026): carrega el fitxer en un entorn de
// navegador simulat amb un document.modelContext fals, comprova que registra
// les quatre eines i les executa contra les dades reals de public/.
//
//   node scripts/prova-webmcp.mjs
//
// No fa cap petició de xarxa: fetch() llegeix els fitxers de public/.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const arrel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const codi = readFileSync(path.join(arrel, 'webmcp.js'), 'utf8');

const fetchLocal = async ruta => {
  const fitxer = path.join(arrel, String(ruta).split('?')[0].replace(/^\//, ''));
  const text = readFileSync(fitxer, 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text };
};

function entorn({ ambApi = true, aNavigator = false } = {}) {
  const eines = new Map();
  const modelContext = {
    registerTool(eina) {
      if (eines.has(eina.name)) throw new Error('duplicada');
      eines.set(eina.name, eina);
      return Promise.resolve();
    }
  };
  const document = ambApi && !aNavigator ? { modelContext } : {};
  const navigator = ambApi && aNavigator ? { modelContext } : {};
  const window = {};
  const context = vm.createContext({ window, document, navigator, fetch: fetchLocal, Intl, Date, JSON, Promise, Error, Number, String, RegExp, Math, Array, Object, encodeURIComponent });
  vm.runInContext(codi, context);
  return { eines, context };
}

let proves = 0;
const prova = async (nom, fn) => { await fn(); proves++; console.log('✓', nom); };

await prova('sense API no registra res ni falla', () => {
  const { eines } = entorn({ ambApi: false });
  assert.equal(eines.size, 0);
});

await prova('registra les quatre eines, totes de només lectura', () => {
  const { eines } = entorn();
  assert.deepEqual([...eines.keys()].sort(), ['iacat_agenda', 'iacat_cerca_hemeroteca', 'iacat_llegeix_noticia', 'iacat_noticies_avui']);
  for (const e of eines.values()) {
    assert.equal(e.annotations.readOnlyHint, true, e.name);
    assert.equal(typeof e.description, 'string');
    assert.equal(e.inputSchema.type, 'object');
    assert.equal(typeof e.execute, 'function');
  }
});

await prova('també funciona amb l\'API antiga navigator.modelContext', () => {
  const { eines } = entorn({ aNavigator: true });
  assert.equal(eines.size, 4);
});

await prova('carregar-lo dues vegades no duplica res', () => {
  const { eines, context } = entorn();
  vm.runInContext(codi, context);
  assert.equal(eines.size, 4);
});

const { eines } = entorn();
const crida = async (nom, entrada) => JSON.parse(await eines.get(nom).execute(entrada, {}));
const edicio = JSON.parse(readFileSync(path.join(arrel, 'data/articles.json'), 'utf8'));
const arxiu = JSON.parse(readFileSync(path.join(arrel, 'data/arxiu.json'), 'utf8'));

await prova('iacat_noticies_avui torna l\'edició i el radar', async () => {
  const r = await crida('iacat_noticies_avui', {});
  assert.equal(r.noticies.length, edicio.items.length);
  assert.match(r.noticies[0].url, /^https:\/\/inteligencia-artificial\.cat\/article\.php\?slug=/);
  assert.ok(Array.isArray(r.radar_catalunya) && r.radar_catalunya.length > 0);
  const sense = await crida('iacat_noticies_avui', { incloure_radar: false, maxim: 2 });
  assert.equal(sense.noticies.length, Math.min(2, edicio.items.length));
  assert.equal(sense.radar_catalunya, undefined);
});

await prova('accepta els arguments com a text JSON (navegadors antics)', async () => {
  const r = JSON.parse(await eines.get('iacat_noticies_avui').execute('{"maxim":1,"incloure_radar":false}', {}));
  assert.equal(r.noticies.length, 1);
});

await prova('iacat_llegeix_noticia troba una d\'avui i una de l\'hemeroteca', async () => {
  const avui = await crida('iacat_llegeix_noticia', { slug: edicio.items[0].slug });
  assert.equal(avui.titol, edicio.items[0].title);
  assert.ok(avui.cos.length > 200);
  const vella = arxiu.editions.at(-1).items[0];
  const r = await crida('iacat_llegeix_noticia', { slug: `https://inteligencia-artificial.cat/article.php?slug=${vella.slug}` });
  assert.equal(r.titol, vella.title);
  assert.match(r.edicio, /^\d{4}-\d{2}-\d{2}$/);
  const cap = await crida('iacat_llegeix_noticia', { slug: 'no-existeix-de-cap-manera' });
  assert.ok(cap.error);
});

await prova('iacat_cerca_hemeroteca ignora accents i respecta els filtres', async () => {
  const amb = await crida('iacat_cerca_hemeroteca', { consulta: 'intel·ligència' });
  const sense = await crida('iacat_cerca_hemeroteca', { consulta: 'INTELLIGENCIA' });
  assert.ok(amb.coincidencies > 0);
  assert.equal(amb.coincidencies, sense.coincidencies);
  assert.ok(amb.resultats.length <= 10);
  const datat = await crida('iacat_cerca_hemeroteca', { consulta: 'OpenAI', des_de: '2026-10-01', maxim: 25 });
  assert.ok(datat.resultats.every(x => x.edicio >= '2026-10-01'));
  const buida = await crida('iacat_cerca_hemeroteca', { consulta: '' });
  assert.ok(buida.error);
});

await prova('iacat_agenda només torna actes vigents i filtra per territori', async () => {
  const r = await crida('iacat_agenda', { des_de: '2026-10-11', maxim: 50 });
  assert.ok(r.actes.every(x => (x.fi || x.inici) >= '2026-10-11'));
  const ordenats = r.actes.map(x => x.inici);
  assert.deepEqual(ordenats, [...ordenats].sort());
  const cv = await crida('iacat_agenda', { territori: 'comunitat-valenciana', des_de: '2026-01-01', maxim: 50 });
  assert.ok(cv.actes.length > 0 && cv.actes.every(x => x.territori === 'comunitat-valenciana'));
});

console.log(`\n${proves} proves superades.`);
