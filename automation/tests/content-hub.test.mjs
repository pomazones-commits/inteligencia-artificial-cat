import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = resolve(import.meta.dirname, '..', 'scripts', 'content-hub.mjs');

function story(number, duplicate = false) {
  const id = duplicate ? 1 : number;
  return {
    category: number % 4 === 0 ? 'CATALUNYA' : 'TECNOLOGIA',
    read: '4 MIN',
    slug: `noticia-de-prova-${id}`,
    title: `Notícia de prova ${id}`,
    excerpt: `Resum verificable de la notícia ${id}.`,
    image: `./assets/noticia-${id}.jpg`,
    sourceName: 'Font de prova',
    sourceUrl: `https://example.com/noticia-${id}`,
    sourceDate: '2026-07-17',
    body: `Cos complet de la notícia de prova ${id}.`
  };
}

function run(args, cwd) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}

function parseAssignment(text) {
  return JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
}

test('acumula quatre lots de cinc fins a vint notícies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  for (let batch = 0; batch < 4; batch += 1) {
    const input = join(root, `batch-${batch}.json`);
    const items = Array.from({ length: 5 }, (_, index) => story(batch * 5 + index + 1));
    await writeFile(input, JSON.stringify(items), 'utf8');
    const result = run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root);
    assert.equal(result.status, 0, result.stderr);
  }
  const published = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  const status = JSON.parse(await readFile(join(root, 'content-status.json'), 'utf8'));
  assert.equal(published.length, 20);
  assert.equal(new Set(published.map(item => item.slug)).size, 20);
  assert.equal(status.batchCount, 4);
  assert.equal(status.newsCount, 20);
});

test('elimina duplicats per slug i URL', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const first = join(root, 'first.json');
  const second = join(root, 'second.json');
  await writeFile(first, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 1))), 'utf8');
  await writeFile(second, JSON.stringify([story(6), story(7), story(8), story(9), story(10, true)]), 'utf8');
  assert.equal(run(['ingest-news', '--input', first, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root).status, 0);
  assert.equal(run(['ingest-news', '--input', second, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root).status, 0);
  const published = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  assert.equal(published.length, 9);
});

test('un lot invàlid no modifica la portada anterior', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const valid = join(root, 'valid.json');
  const invalid = join(root, 'invalid.json');
  await writeFile(valid, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 1))), 'utf8');
  await writeFile(invalid, JSON.stringify([{ title: 'Lot trencat' }]), 'utf8');
  assert.equal(run(['ingest-news', '--input', valid, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root).status, 0);
  const before = await readFile(join(root, 'news.js'), 'utf8');
  const result = run(['ingest-news', '--input', invalid, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(join(root, 'news.js'), 'utf8'), before);
});

test('en canviar de dia inicia una edició nova', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const first = join(root, 'first.json');
  const second = join(root, 'second.json');
  await writeFile(first, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 1))), 'utf8');
  await writeFile(second, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 6))), 'utf8');
  run(['ingest-news', '--input', first, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root);
  run(['ingest-news', '--input', second, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-18'], root);
  const published = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  assert.equal(published.length, 5);
  assert.equal(published[0].slug, 'noticia-de-prova-6');
});

test('el radar només incorpora notícies catalanes i conserva els senyals anteriors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const { mkdir } = await import('node:fs/promises');
  await mkdir(root, { recursive: true });
  const previousRadar = [{
    place: 'Mataró', category: 'EDUCACIÓ', date: '15.07.2026',
    title: 'Senyal anterior curat', summary: 'Es conserva.',
    detail: 'Detall.', source: 'Font local', url: 'https://example.cat/senyal-anterior'
  }];
  await writeFile(join(root, 'radar.js'), `window.IA_RADAR = ${JSON.stringify(previousRadar, null, 2)};\n`, 'utf8');
  const input = join(root, 'batch.json');
  const catalana = { ...story(1), category: 'CATALUNYA', title: 'Barcelona posa en marxa un projecte d’IA', excerpt: 'La Generalitat hi participa.' };
  const global1 = { ...story(2), category: 'TECNOLOGIA', title: 'OpenAI presenta un model nou', excerpt: 'Anunci global sense vincle local.' };
  await writeFile(input, JSON.stringify([catalana, global1, story(3), story(5), story(7)].map((item, i) => ({ ...item, slug: `radar-prova-${i}`, sourceUrl: `https://example.com/radar-${i}`, category: item.category === 'CATALUNYA' ? 'CATALUNYA' : 'TECNOLOGIA', title: item.title.includes('Barcelona') || item.title.includes('OpenAI') ? item.title : `Notícia global ${i}` }))), 'utf8');
  assert.equal(run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root).status, 0);
  const radarText = await readFile(join(root, 'radar.js'), 'utf8');
  const radar = parseAssignment(radarText);
  assert.ok(radar.some(item => item.title === 'Barcelona posa en marxa un projecte d’IA'), 'la notícia catalana entra al radar');
  assert.ok(radar.some(item => item.title === 'Senyal anterior curat'), 'els senyals anteriors es conserven');
  assert.ok(!radar.some(item => item.title === 'OpenAI presenta un model nou'), 'les notícies globals no entren al radar');
});

test('una notícia amb seccio "radar" va només a La IA que passa aquí, no al feed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  const radarOnly = {
    ...story(1),
    slug: 'adopcio-empresa-espanyola-ia',
    sourceUrl: 'https://example.com/adopcio-espanyola',
    category: 'EMPRESA',
    title: 'Una empresa espanyola desplega IA a producció',
    excerpt: 'Cas d’ús real sense cap topònim català.',
    seccio: 'radar'
  };
  const general = { ...story(2), slug: 'noticia-general-ia', sourceUrl: 'https://example.com/general' };
  await writeFile(input, JSON.stringify([radarOnly, general, story(3), story(5), story(7)]), 'utf8');
  assert.equal(run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-23'], root).status, 0);

  const feedText = await readFile(join(root, 'news.js'), 'utf8');
  const feed = parseAssignment(feedText);
  assert.equal(feed.length, 4, 'el feed només conté les 4 notícies no marcades com a radar');
  assert.ok(!feed.some(item => item.slug === 'adopcio-empresa-espanyola-ia'), 'la notícia radar-only no surt al feed');
  assert.ok(!/"seccio"/.test(feedText), 'el camp intern seccio no arriba mai al contracte públic IA_NEWS');

  const radar = parseAssignment(await readFile(join(root, 'radar.js'), 'utf8'));
  assert.ok(radar.some(item => item.title === 'Una empresa espanyola desplega IA a producció'), 'la notícia radar-only entra al radar tot i no ser catalana');

  const archive = JSON.parse(await readFile(join(root, 'data', 'archive.json'), 'utf8'));
  assert.ok(!archive.some(item => item.slug === 'adopcio-empresa-espanyola-ia'), 'la notícia radar-only no s’arxiva a l’hemeroteca del feed');
});

test('en canviar de dia arxiva l’edició anterior a data/arxiu.json', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const first = join(root, 'first.json');
  const second = join(root, 'second.json');
  await writeFile(first, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 1))), 'utf8');
  await writeFile(second, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 6))), 'utf8');
  assert.equal(run(['ingest-news', '--input', first, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root).status, 0);
  assert.equal(run(['ingest-news', '--input', second, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-18'], root).status, 0);
  const arxiu = JSON.parse(await readFile(join(root, 'data', 'arxiu.json'), 'utf8'));
  assert.equal(arxiu.editions[0].date, '17.07.2026');
  assert.equal(arxiu.editions[0].items.length, 5);
  // Un segon canvi de dia no duplica l'edició arxivada.
  const third = join(root, 'third.json');
  await writeFile(third, JSON.stringify([story(11)]), 'utf8');
  assert.equal(run(['ingest-news', '--input', third, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-19'], root).status, 0);
  const arxiu2 = JSON.parse(await readFile(join(root, 'data', 'arxiu.json'), 'utf8'));
  assert.equal(arxiu2.editions.filter(e => e.date === '17.07.2026').length, 1);
});

test('una notícia sense imatge és vàlida i actualitza articles.json i latest.json', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  const senseImatge = story(1);
  delete senseImatge.image;
  await writeFile(input, JSON.stringify([senseImatge, story(2)]), 'utf8');
  const result = run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-17'], root);
  assert.equal(result.status, 0, result.stderr);
  const articles = JSON.parse(await readFile(join(root, 'data', 'articles.json'), 'utf8'));
  assert.equal(articles.items.length, 2);
  assert.equal(articles.items[0].image, undefined);
  const latest = JSON.parse(await readFile(join(root, 'content', 'latest.json'), 'utf8'));
  assert.deepEqual(Object.keys(latest.items[0]).sort(), ['category', 'excerpt', 'read', 'title']);
});

test('valida i publica les peces editorials setmanals', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const analysis = join(root, 'analysis.json');
  const reflection = join(root, 'reflection.json');
  await writeFile(analysis, JSON.stringify({ title: 'Una anàlisi de prova', excerpt: 'Context i criteri per entendre el canvi.' }), 'utf8');
  await writeFile(reflection, JSON.stringify({
    title: 'Una reflexió de prova',
    dek: 'Una idea per continuar pensant.',
    body: ['Primer paràgraf.', 'Segon paràgraf.']
  }), 'utf8');
  const analysisResult = run(['ingest-editorial', '--type', 'analysis', '--input', analysis, '--public-dir', root, '--state-dir', join(root, 'state')], root);
  const reflectionResult = run(['ingest-editorial', '--type', 'reflection', '--input', reflection, '--public-dir', root, '--state-dir', join(root, 'state')], root);
  assert.equal(analysisResult.status, 0, analysisResult.stderr);
  assert.equal(reflectionResult.status, 0, reflectionResult.stderr);
  assert.match(await readFile(join(root, 'analysis.js'), 'utf8'), /window\.IA_ANALYSIS/);
  assert.match(await readFile(join(root, 'reflection.js'), 'utf8'), /window\.IA_REFLECTION/);
});

// ── Arxiu de l'anàlisi (08.09.2026) ─────────────────────────────────────────
// Fins avui l'anàlisi era l'única peça de la casa sense arxiu: la nova
// sobreescrivia l'anterior i la vella desapareixia del web.

function analysisPayload(n, extra = {}) {
  return {
    title: `Anàlisi ${n}`,
    excerpt: `Entradeta de l'anàlisi ${n}.`,
    body: [`Primer paràgraf de l'anàlisi ${n}.`, `Segon paràgraf de l'anàlisi ${n}.`],
    date: `0${n}.09.2026`,
    ...extra
  };
}

async function publicaAnalisi(root, payload) {
  const input = join(root, `analysis-${payload.title.replace(/\W+/g, '-')}.json`);
  await writeFile(input, JSON.stringify(payload), 'utf8');
  return run(['ingest-editorial', '--type', 'analysis', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state')], root);
}

test('l’anàlisi vigent passa a l’arxiu quan n’arriba una de nova', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  assert.equal((await publicaAnalisi(root, analysisPayload(1))).status, 0);
  assert.equal((await publicaAnalisi(root, analysisPayload(2))).status, 0);
  const vigent = JSON.parse((await readFile(join(root, 'analysis.js'), 'utf8')).match(/= ([\s\S]+);\n$/)[1]);
  const arxiu = parseAssignment(await readFile(join(root, 'analysis-arxiu.js'), 'utf8'));
  assert.equal(vigent.title, 'Anàlisi 2');
  assert.equal(arxiu.length, 1);
  assert.equal(arxiu[0].title, 'Anàlisi 1');
  // L'arxiu ha de conservar la peça sencera, no només el titular.
  assert.equal(arxiu[0].body.length, 2);
});

test('reingerir la mateixa anàlisi no la duplica ni la deixa alhora vigent i arxivada', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  await publicaAnalisi(root, analysisPayload(1));
  await publicaAnalisi(root, analysisPayload(2));
  // «Run workflow» a mà: el workflow reingereix sempre, també sense canvis.
  await publicaAnalisi(root, analysisPayload(2));
  const arxiu = parseAssignment(await readFile(join(root, 'analysis-arxiu.js'), 'utf8'));
  assert.equal(arxiu.length, 1);
  assert.equal(arxiu.filter(item => item.title === 'Anàlisi 2').length, 0);
});

function quadernPayload(n) {
  return {
    title: `Quadern ${n}`,
    dek: `Entradeta del quadern ${n}.`,
    body: [`Primer paràgraf del quadern ${n}.`, `Segon paràgraf del quadern ${n}.`],
    date: `1${n}.09.2026`
  };
}

async function publicaQuadern(root, payload) {
  const input = join(root, `reflection-${payload.title.replace(/\W+/g, '-')}.json`);
  await writeFile(input, JSON.stringify(payload), 'utf8');
  return run(['ingest-editorial', '--type', 'reflection', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state')], root);
}

test('el quadern vigent passa a quadern-arxiu.js quan n’arriba un de nou', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  assert.equal((await publicaQuadern(root, quadernPayload(1))).status, 0);
  assert.equal((await publicaQuadern(root, quadernPayload(2))).status, 0);
  const vigent = JSON.parse((await readFile(join(root, 'reflection.js'), 'utf8')).match(/= ([\s\S]+);\n$/)[1]);
  const arxiu = parseAssignment(await readFile(join(root, 'quadern-arxiu.js'), 'utf8'));
  assert.equal(vigent.title, 'Quadern 2');
  assert.equal(arxiu.length, 1);
  assert.equal(arxiu[0].title, 'Quadern 1');
  assert.equal(arxiu[0].body.length, 2);
  // L'anàlisi i el quadern tenen arxius separats.
  await assert.rejects(readFile(join(root, 'analysis-arxiu.js'), 'utf8'));
});

test('reingerir el mateix quadern no el duplica ni el deixa alhora vigent i arxivat', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  await publicaQuadern(root, quadernPayload(1));
  await publicaQuadern(root, quadernPayload(2));
  await publicaQuadern(root, quadernPayload(2));
  const arxiu = parseAssignment(await readFile(join(root, 'quadern-arxiu.js'), 'utf8'));
  assert.equal(arxiu.length, 1);
  assert.equal(arxiu.filter(item => item.title === 'Quadern 2').length, 0);
});

test('l’arxiu d’anàlisis es queda en 52 peces', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  for (let i = 1; i <= 55; i += 1) {
    const r = await publicaAnalisi(root, { ...analysisPayload(1), title: `Anàlisi ${i}`, date: '01.09.2026' });
    assert.equal(r.status, 0, r.stderr);
  }
  const arxiu = parseAssignment(await readFile(join(root, 'analysis-arxiu.js'), 'utf8'));
  assert.equal(arxiu.length, 52);
  assert.equal(arxiu[0].title, 'Anàlisi 54');
});

test('una anàlisi que declara una il·lustració inexistent no es publica', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const { mkdir } = await import('node:fs/promises');
  const fallida = await publicaAnalisi(root, analysisPayload(1, { image: './assets/no-hi-es.jpg', alt: 'Una il·lustració que no existeix enlloc.' }));
  assert.equal(fallida.status, 1);
  assert.match(fallida.stderr, /no existeix/);
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'assets', 'hi-es.jpg'), 'jpg', 'utf8');
  const bona = await publicaAnalisi(root, analysisPayload(1, { image: './assets/hi-es.jpg', alt: 'Una il·lustració que sí que existeix.' }));
  assert.equal(bona.status, 0, bona.stderr);
  assert.match(await readFile(join(root, 'analysis.js'), 'utf8'), /hi-es\.jpg/);
});

test('publica una fotografia diària només si existeix i té metadades accessibles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const imageDir = join(root, 'assets');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(imageDir, { recursive: true });
  await writeFile(join(imageDir, 'daily.jpg'), 'imatge-de-prova', 'utf8');
  const input = join(root, 'daily-image.json');
  await writeFile(input, JSON.stringify({
    date: '2026-07-17',
    image: './assets/daily.jpg',
    alt: 'Dues persones conversen davant d’un ordinador en una biblioteca.',
    kicker: 'IA × Societat',
    title: 'La tecnologia també és una conversa',
    caption: 'Una mirada humana a la transformació digital.',
    credit: 'Imatge editorial generada amb IA'
  }), 'utf8');
  const result = run(['ingest-daily-image', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state')], root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(join(root, 'daily-image.js'), 'utf8'), /window\.IA_DAILY_IMAGE/);
});

test('una notícia d’empresa catalana (CaixaBank) es deriva al radar encara que no porti cap topònim', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  const caixabank = {
    ...story(1),
    slug: 'caixabank-unitat-ciberseguretat-ia',
    sourceUrl: 'https://example.com/caixabank-ciberseguretat',
    category: 'SEGURETAT',
    title: 'CaixaBank crea una unitat de ciberseguretat per a la intel·ligència artificial',
    excerpt: 'L’entitat financera integra la nova unitat dins de CaixaBank Tech.'
  };
  const global1 = { ...story(2), slug: 'noticia-global-ia', sourceUrl: 'https://example.com/global-radar', title: 'Un laboratori presenta un model nou', excerpt: 'Anunci global sense vincle local.' };
  await writeFile(input, JSON.stringify([caixabank, global1, story(3), story(5), story(7)]), 'utf8');
  assert.equal(run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-24'], root).status, 0);

  const radar = parseAssignment(await readFile(join(root, 'radar.js'), 'utf8'));
  assert.ok(radar.some(item => item.title.startsWith('CaixaBank crea una unitat')), 'la notícia de CaixaBank entra al radar per nom d’entitat catalana');
  assert.equal(radar.find(item => item.title.startsWith('CaixaBank')).category, 'SEGURETAT', 'la categoria SEGURETAT es conserva al radar');
  assert.ok(!radar.some(item => item.title === 'Un laboratori presenta un model nou'), 'les notícies globals continuen fora del radar');

  const feed = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  assert.ok(feed.some(item => item.slug === 'caixabank-unitat-ciberseguretat-ia'), 'la notícia catalana també surt al feed (va als dos llocs)');
});

test('una notícia global que diu «la caixa» en sentit de tresoreria NO es cola al radar', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  // Cas real del 30.07.2026: 'la caixa' era a LOCAL_TERMS i la comparació no
  // distingeix majúscules, així que aquest titular de Meta va entrar al radar.
  const meta = {
    ...story(1),
    slug: 'meta-resultats-ia-caixa',
    sourceUrl: 'https://example.com/meta-resultats',
    category: 'EMPRESA',
    title: 'Meta guanya un 28% més però l’aposta per la IA li asseca la caixa',
    excerpt: 'L’acció cau fins a un 10% després de presentar resultats.'
  };
  const catalana = {
    ...story(2),
    slug: 'fundacio-la-caixa-beques-ia',
    sourceUrl: 'https://example.com/fundacio-la-caixa',
    category: 'EMPRESA',
    title: 'La Fundació la Caixa amplia les beques de recerca en intel·ligència artificial',
    excerpt: 'La convocatòria creix un 20% respecte de l’any passat.'
  };
  await writeFile(input, JSON.stringify([meta, catalana, story(3), story(5), story(7)]), 'utf8');
  assert.equal(run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-07-30'], root).status, 0);

  const radar = parseAssignment(await readFile(join(root, 'radar.js'), 'utf8'));
  assert.ok(!radar.some(item => item.title.startsWith('Meta guanya')), 'la notícia global de Meta no entra al radar per la paraula «caixa»');
  assert.ok(radar.some(item => item.title.startsWith('La Fundació la Caixa')), 'la Fundació la Caixa sí que es deriva al radar');
});

test('les peces catalanes sense cap terme de LOCAL_TERMS entren al radar amb seccio "catalunya" o pels termes nous', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  // Casos reals del 29 i el 30.09.2026: cap de les dues peces no es va derivar al radar.
  const govern = {
    ...story(1),
    slug: 'govern-veto-ia-menors-14-anys-escola-llei',
    sourceUrl: 'https://example.com/govern-veto',
    category: 'EDUCACIÓ',
    title: 'El Govern vol prohibir la IA als alumnes menors de 14 anys a l’escola i prepara una llei de benestar digital',
    excerpt: 'L’Executiu preveu tenir l’avantprojecte de llei el març del 2027.',
    seccio: 'catalunya'
  };
  const mossos = {
    ...story(2),
    slug: 'mossos-lectio-ia-predictiva-bcn-desperta',
    sourceUrl: 'https://example.com/mossos-lectio',
    category: 'SEGURETAT',
    title: 'Interior defensa la IA per «actuar abans de qualsevol risc» i posa com a exemple els lectors de matrícules Lectio dels Mossos',
    excerpt: 'La secretària general del Departament va presentar la IA en el fòrum BCN Desperta!'
  };
  const global1 = { ...story(3), slug: 'noticia-global-ia', sourceUrl: 'https://example.com/global-radar', title: 'Un laboratori presenta un model nou', excerpt: 'Anunci global sense vincle local.' };
  await writeFile(input, JSON.stringify([govern, mossos, global1, story(5), story(7)]), 'utf8');
  assert.equal(run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-09-30'], root).status, 0);

  const radar = parseAssignment(await readFile(join(root, 'radar.js'), 'utf8'));
  assert.ok(radar.some(item => item.title.startsWith('El Govern vol prohibir')), 'seccio "catalunya" força l’entrada al radar');
  assert.ok(radar.some(item => item.title.startsWith('Interior defensa la IA')), '«Mossos» i «BCN» ja identifiquen una peça catalana');
  assert.ok(!radar.some(item => item.title === 'Un laboratori presenta un model nou'), 'les notícies globals continuen fora del radar');

  const feed = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  assert.ok(feed.some(item => item.slug === govern.slug), 'la peça "catalunya" també surt al feed');
  assert.ok(feed.every(item => !('seccio' in item)), 'el camp intern seccio no arriba mai a IA_NEWS');
});

test('centres de dades (03.10.2026): etiqueta temàtica per a totes i radar només per a les del territori', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  const molins = {
    ...story(1),
    slug: 'quetta-centre-dades-molins-rei',
    sourceUrl: 'https://example.com/quetta-molins',
    category: 'INFRAESTRUCTURA',
    title: 'Quetta obté les llicències del seu centre de dades de 10 MW a Molins de Rei',
    excerpt: 'L’empresa preveu 50 llocs de treball directes.'
  };
  const texas = {
    ...story(2),
    slug: 'openai-centre-dades-texas',
    sourceUrl: 'https://example.com/openai-texas',
    category: 'INFRAESTRUCTURA',
    title: 'OpenAI construirà un centre de dades d’un gigawatt a Texas',
    excerpt: 'El campus tindrà la seva pròpia central de gas.'
  };
  await writeFile(input, JSON.stringify([molins, texas, story(3), story(5), story(7)]), 'utf8');
  assert.equal(run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-10-03'], root).status, 0);

  const feed = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  assert.deepEqual(feed.find(item => item.slug === molins.slug).etiquetes, ['centres-de-dades'], 'la de Molins de Rei porta l’etiqueta');
  assert.deepEqual(feed.find(item => item.slug === texas.slug).etiquetes, ['centres-de-dades'], 'la de Texas també: l’etiqueta és temàtica');
  assert.ok(!('etiquetes' in feed.find(item => item.slug === 'noticia-de-prova-3')), 'una notícia qualsevol no porta etiqueta');

  const radar = parseAssignment(await readFile(join(root, 'radar.js'), 'utf8'));
  assert.ok(radar.some(item => item.title.startsWith('Quetta obté')), '«Molins de Rei» la fa local');
  assert.ok(!radar.some(item => item.title.startsWith('OpenAI construirà')), 'un centre de dades a Texas no entra al radar');
});

// ——— La reflexió del dia (04.08.2026) ———

function reflexio(date, paragrafs = 5, extra = {}) {
  return {
    date,
    title: `El fil del ${date}`,
    dek: 'Una frase que resumeix què s’hi veu avui.',
    body: Array.from({ length: paragrafs }, (_, index) =>
      `Paràgraf ${index + 1} del balanç del dia, escrit a partir de les notícies publicades avui.`),
    ...extra
  };
}

function parseObjectAssignment(text) {
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

test('publica la reflexió del dia i fa rodar l’arxiu quan canvia de dia', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const primer = join(root, 'reflexio-1.json');
  await writeFile(primer, JSON.stringify(reflexio('2026-08-04', 5, {
    signals: [
      { title: 'Una notícia del dia', slug: 'una-noticia-del-dia' },
      { title: 'Un senyal del radar', url: 'https://example.com/senyal' },
      { title: 'Sense enllaç vàlid', slug: 'Slug Invàlid' }
    ]
  })), 'utf8');
  assert.equal(run(['ingest-daily-reflection', '--input', primer, '--public-dir', root, '--state-dir', state], root).status, 0);

  const vigent = parseObjectAssignment(await readFile(join(root, 'reflexio-diaria.js'), 'utf8'));
  assert.equal(vigent.date, '2026-08-04');
  assert.equal(vigent.body.length, 5);
  assert.equal(vigent.read, '2 MIN', 'el temps de lectura es calcula sol si no ve donat (mínim 2 minuts)');
  assert.equal(vigent.signals.length, 3, 'un slug invàlid no descarta el senyal, només l’enllaç');
  assert.equal(vigent.signals[0].slug, 'una-noticia-del-dia');
  assert.equal(vigent.signals[1].url, 'https://example.com/senyal');
  assert.ok(!vigent.signals[2].slug && !vigent.signals[2].url, 'un slug amb espais no arriba mai a l’HTML');
  assert.deepEqual(parseAssignment(await readFile(join(root, 'reflexions-arxiu.js'), 'utf8')), [], 'el primer dia l’arxiu queda buit');

  const segon = join(root, 'reflexio-2.json');
  await writeFile(segon, JSON.stringify(reflexio('2026-08-05', 6)), 'utf8');
  assert.equal(run(['ingest-daily-reflection', '--input', segon, '--public-dir', root, '--state-dir', state], root).status, 0);

  assert.equal(parseObjectAssignment(await readFile(join(root, 'reflexio-diaria.js'), 'utf8')).date, '2026-08-05');
  const arxiu = parseAssignment(await readFile(join(root, 'reflexions-arxiu.js'), 'utf8'));
  assert.equal(arxiu.length, 1, 'la reflexió d’ahir passa a l’arxiu');
  assert.equal(arxiu[0].date, '2026-08-04');
});

test('tornar a publicar la reflexió del mateix dia la substitueix sense duplicar-la', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  for (const [dia, titol] of [['2026-08-04', 'Primera'], ['2026-08-05', 'Segona'], ['2026-08-05', 'Segona corregida']]) {
    const input = join(root, `r-${titol.replace(/\s/g, '-')}.json`);
    await writeFile(input, JSON.stringify({ ...reflexio(dia), title: titol }), 'utf8');
    assert.equal(run(['ingest-daily-reflection', '--input', input, '--public-dir', root, '--state-dir', state], root).status, 0);
  }
  const vigent = parseObjectAssignment(await readFile(join(root, 'reflexio-diaria.js'), 'utf8'));
  const arxiu = parseAssignment(await readFile(join(root, 'reflexions-arxiu.js'), 'utf8'));
  assert.equal(vigent.title, 'Segona corregida');
  assert.equal(arxiu.length, 1, 'la correcció no afegeix una segona entrada del mateix dia');
  assert.equal(arxiu[0].date, '2026-08-04');
  assert.ok(!arxiu.some(item => item.date === vigent.date), 'la peça vigent mai no és alhora a l’arxiu');
});

test('rebutja una reflexió del dia sense data vàlida o massa curta', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const senseData = join(root, 'sense-data.json');
  await writeFile(senseData, JSON.stringify({ ...reflexio('2026-08-04'), date: '04.08.2026' }), 'utf8');
  const resultatData = run(['ingest-daily-reflection', '--input', senseData, '--public-dir', root, '--state-dir', join(root, 'state')], root);
  assert.equal(resultatData.status, 1);
  assert.match(resultatData.stderr, /AAAA-MM-DD/);

  const curta = join(root, 'curta.json');
  await writeFile(curta, JSON.stringify(reflexio('2026-08-04', 3)), 'utf8');
  const resultatCurta = run(['ingest-daily-reflection', '--input', curta, '--public-dir', root, '--state-dir', join(root, 'state')], root);
  assert.equal(resultatCurta.status, 1);
  assert.match(resultatCurta.stderr, /paràgrafs/);
});

// ——— Repesca programada: la guarda «pending» (07.08.2026) ———
//
// Aquests tests protegeixen el cron de content-hub.yml i reflexio-del-dia.yml.
// El risc que cobreixen: `ingest-news` no és idempotent, i una guarda que
// digués «yes» sempre convertiria la repesca en ~48 commits buits al dia.

function pending(args, cwd) {
  const result = run(args, cwd);
  return { status: result.status, veredicte: result.stdout.trim(), stderr: result.stderr };
}

test('pending(news): diu «yes» amb un lot sense ingerir i «no» un cop publicat', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const lot = join(root, 'news-batch.json');
  await writeFile(lot, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 1))), 'utf8');
  const args = ['pending', '--what', 'news', '--input', lot, '--public-dir', root, '--state-dir', state];

  const abans = pending(args, root);
  assert.equal(abans.status, 0);
  assert.equal(abans.veredicte, 'yes', 'un lot que no s’ha ingerit mai és feina pendent');

  assert.equal(run(['ingest-news', '--input', lot, '--public-dir', root, '--state-dir', state, '--date', '2026-08-07'], root).status, 0);

  const despres = pending(args, root);
  assert.equal(despres.status, 0);
  assert.equal(despres.veredicte, 'no', 'un cop publicat, la repesca no ha de tornar a ingerir');
});

test('pending(news): «no» encara que hagi canviat el dia — el que compta és si les notícies són publicades', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const lot = join(root, 'news-batch.json');
  await writeFile(lot, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 1))), 'utf8');
  assert.equal(run(['ingest-news', '--input', lot, '--public-dir', root, '--state-dir', state, '--date', '2026-08-06'], root).status, 0);
  // Endemà: l'edició del dia és una altra, però el lot d'ahir ja és a l'arxiu.
  const veredicte = pending(['pending', '--what', 'news', '--input', lot, '--public-dir', root, '--state-dir', state], root);
  assert.equal(veredicte.veredicte, 'no', 'l’arxiu acumula entre dies i evita reingerir un lot vell');
});

test('pending(news): un lot ingerit a mitges es considera pendent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const primer = join(root, 'primer.json');
  const segon = join(root, 'segon.json');
  await writeFile(primer, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 1))), 'utf8');
  await writeFile(segon, JSON.stringify([story(3), story(4), story(98), story(99), story(100)]), 'utf8');
  assert.equal(run(['ingest-news', '--input', primer, '--public-dir', root, '--state-dir', state, '--date', '2026-08-07'], root).status, 0);
  const veredicte = pending(['pending', '--what', 'news', '--input', segon, '--public-dir', root, '--state-dir', state], root);
  assert.equal(veredicte.veredicte, 'yes', 'si en falta una de sola, el lot encara és feina pendent');
  assert.match(veredicte.stderr, /noticia-de-prova-98/);
});

test('pending(news): un lot només de radar no dispara la repesca', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const lot = join(root, 'nomes-radar.json');
  await writeFile(lot, JSON.stringify([{ ...story(1), seccio: 'radar' }, { ...story(2), seccio: 'radar' }]), 'utf8');
  const veredicte = pending(['pending', '--what', 'news', '--input', lot, '--public-dir', root, '--state-dir', join(root, 'state')], root);
  assert.equal(veredicte.status, 0);
  assert.equal(veredicte.veredicte, 'no', 'els senyals de radar no deixen rastre a l’arxiu: millor no reingerir en bucle');
});

test('pending: sense fitxer d’entrada no hi ha feina, i no és cap error', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  for (const what of ['news', 'daily-reflection']) {
    const veredicte = pending(['pending', '--what', what, '--input', join(root, 'no-hi-es.json'), '--public-dir', root, '--state-dir', join(root, 'state')], root);
    assert.equal(veredicte.status, 0, `pending(${what}) no ha de fallar si no hi ha fitxer`);
    assert.equal(veredicte.veredicte, 'no');
  }
});

test('pending(daily-reflection): compara la data pendent amb la publicada', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const ahir = join(root, 'ahir.json');
  const avui = join(root, 'avui.json');
  await writeFile(ahir, JSON.stringify(reflexio('2026-08-06')), 'utf8');
  await writeFile(avui, JSON.stringify(reflexio('2026-08-07')), 'utf8');

  const senseRes = pending(['pending', '--what', 'daily-reflection', '--input', ahir, '--public-dir', root, '--state-dir', state], root);
  assert.equal(senseRes.veredicte, 'yes', 'si no hi ha cap reflexió publicada, la pendent és feina');

  assert.equal(run(['ingest-daily-reflection', '--input', ahir, '--public-dir', root, '--state-dir', state], root).status, 0);
  assert.equal(pending(['pending', '--what', 'daily-reflection', '--input', ahir, '--public-dir', root, '--state-dir', state], root).veredicte, 'no',
    'la del 06 ja és publicada: la repesca no la torna a escriure');
  assert.equal(pending(['pending', '--what', 'daily-reflection', '--input', avui, '--public-dir', root, '--state-dir', state], root).veredicte, 'yes',
    'la del 07 encara no hi és: això és exactament l’incident del 06.08');
});

test('pending: un fitxer corrupte falla en comptes de callar', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const trencat = join(root, 'trencat.json');
  await writeFile(trencat, '{ això no és JSON', 'utf8');
  const veredicte = pending(['pending', '--what', 'news', '--input', trencat, '--public-dir', root, '--state-dir', join(root, 'state')], root);
  assert.equal(veredicte.status, 1, 'val més que el cron es queixi que no pas que ignori un lot il·legible');
});

test('pending: --what desconegut és un error', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  assert.equal(pending(['pending', '--what', 'fotografia', '--input', join(root, 'x.json')], root).status, 1);
});

// ── Memòria de la fotografia editorial del dia (14.08.2026) ──────────────────

async function fotografia(root, date, eixos = {}) {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'assets', `daily-${date}.jpg`), 'imatge-de-prova', 'utf8');
  const input = join(root, `daily-image-${date}.json`);
  await writeFile(input, JSON.stringify({
    date,
    image: `./assets/daily-${date}.jpg`,
    alt: `Descripció accessible de la fotografia del ${date}.`,
    kicker: 'IA × Societat',
    title: `Fotografia del ${date}`,
    caption: 'Una frase que connecta la imatge amb el tema del dia.',
    credit: 'Imatge editorial generada amb IA',
    ...eixos
  }), 'utf8');
  return input;
}

function recents(args, cwd) {
  const result = run(['imatges-recents', ...args, '--json'], cwd);
  return { status: result.status, stderr: result.stderr, dades: result.status === 0 ? JSON.parse(result.stdout) : null };
}

test('la fotografia del dia queda apuntada a l’historial amb els tres eixos', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const input = await fotografia(root, '2026-08-14', { tema: 'esport', escenari: 'pavelló municipal', subjecte: 'entrenadora' });
  assert.equal(run(['ingest-daily-image', '--input', input, '--public-dir', root, '--state-dir', state], root).status, 0);

  const historial = JSON.parse(await readFile(join(state, 'daily-images.json'), 'utf8'));
  assert.equal(historial.items.length, 1);
  assert.deepEqual(
    { ...historial.items[0], title: undefined, alt: undefined },
    { date: '2026-08-14', tema: 'esport', escenari: 'pavelló municipal', subjecte: 'entrenadora', title: undefined, alt: undefined }
  );
});

test('tornar a publicar la fotografia del mateix dia substitueix l’entrada, no la duplica', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const primera = await fotografia(root, '2026-08-14', { tema: 'esport', escenari: 'pavelló municipal', subjecte: 'entrenadora' });
  assert.equal(run(['ingest-daily-image', '--input', primera, '--public-dir', root, '--state-dir', state], root).status, 0);
  await writeFile(primera, JSON.stringify({
    ...JSON.parse(await readFile(primera, 'utf8')), tema: 'llengua', escenari: 'ràdio local', subjecte: 'locutora'
  }), 'utf8');
  assert.equal(run(['ingest-daily-image', '--input', primera, '--public-dir', root, '--state-dir', state], root).status, 0);

  const historial = JSON.parse(await readFile(join(state, 'daily-images.json'), 'utf8'));
  assert.equal(historial.items.length, 1, 'una correcció del mateix dia no pot deixar dues entrades');
  assert.equal(historial.items[0].tema, 'llengua');
});

test('una fotografia sense els eixos es publica igualment: val més la portada que la memòria', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const input = await fotografia(root, '2026-08-14');
  const result = run(['ingest-daily-image', '--input', input, '--public-dir', root, '--state-dir', state], root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /falta el camp "tema"/, 'però ha de quedar constància al log');
  const historial = JSON.parse(await readFile(join(state, 'daily-images.json'), 'utf8'));
  assert.equal(historial.items[0].tema, '');
  assert.equal(historial.items[0].title, 'Fotografia del 2026-08-14');
});

test('imatges-recents veta els temes dels últims 12 dies i deixa lliure la resta de la roda', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  for (const [date, tema] of [['2026-08-01', 'camp-i-mar'], ['2026-08-13', 'salut'], ['2026-08-14', 'gent-gran-i-cures']]) {
    const input = await fotografia(root, date, { tema, escenari: `escenari ${date}`, subjecte: `subjecte ${date}` });
    assert.equal(run(['ingest-daily-image', '--input', input, '--public-dir', root, '--state-dir', state], root).status, 0);
  }

  const { dades } = recents(['--state-dir', state, '--date', '2026-08-15'], root);
  assert.deepEqual(dades.temesVetats, ['gent-gran-i-cures', 'salut']);
  assert.ok(!dades.temesLliures.includes('salut'));
  assert.ok(dades.temesLliures.includes('camp-i-mar'), 'el tema de fa 14 dies torna a ser lliure');
  assert.equal(dades.temesVetats.length + dades.temesLliures.length, 16, 'la roda temàtica és tancada');
});

test('imatges-recents aplica finestres diferents a l’escenari (30 dies) i al subjecte (21)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const input = await fotografia(root, '2026-07-20', { tema: 'camp-i-mar', escenari: 'Cuina de casa', subjecte: 'Dona Gran' });
  assert.equal(run(['ingest-daily-image', '--input', input, '--public-dir', root, '--state-dir', state], root).status, 0);

  const { dades } = recents(['--state-dir', state, '--date', '2026-08-14'], root);
  assert.deepEqual(dades.escenarisVetats, ['cuina-de-casa'], 'fa 25 dies: encara veta l’escenari');
  assert.deepEqual(dades.subjectesVetats, [], 'fa 25 dies: el subjecte ja torna a ser lliure');
});

test('imatges-recents compara sense accents ni majúscules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const input = await fotografia(root, '2026-08-14', { tema: 'Educació', escenari: 'Aula de FP', subjecte: 'Alumnes' });
  assert.equal(run(['ingest-daily-image', '--input', input, '--public-dir', root, '--state-dir', state], root).status, 0);
  const { dades } = recents(['--state-dir', state, '--date', '2026-08-15'], root);
  assert.deepEqual(dades.temesVetats, ['educacio'], '«Educació» i «educacio» són el mateix tema');
  assert.deepEqual(dades.escenarisVetats, ['aula-de-fp']);
});

test('imatges-recents sense historial no falla: només diu que tota la roda és lliure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const { status, dades } = recents(['--state-dir', join(root, 'state'), '--date', '2026-08-15'], root);
  assert.equal(status, 0);
  assert.equal(dades.items.length, 0);
  assert.equal(dades.temesLliures.length, 16);
});

test('--dies només retalla la llista, mai els vetos', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const state = join(root, 'state');
  const input = await fotografia(root, '2026-08-05', { tema: 'cultura', escenari: 'sala de concerts', subjecte: 'tècnica de so' });
  assert.equal(run(['ingest-daily-image', '--input', input, '--public-dir', root, '--state-dir', state], root).status, 0);

  const { dades } = recents(['--state-dir', state, '--date', '2026-08-14', '--dies', '3'], root);
  assert.equal(dades.items.length, 0, 'amb --dies 3 no es llista res de fa nou dies…');
  assert.deepEqual(dades.temesVetats, ['cultura'], '…però el tema segueix vetat');
  assert.deepEqual(dades.subjectesVetats, ['tecnica-de-so']);
});

// ── Fotografies reals amb llicència (27.09.2026) ─────────────────────────────
test('una foto amb llicència (-foto.jpg) conserva el crèdit fins a news.js i articles.json', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  const foto = {
    ...story(1),
    image: './assets/noticia-1-20260926-foto.jpg',
    imageCredit: 'Arnau Carbonell / Generalitat de Catalunya',
    imageLicense: 'CC0',
    imageSourceUrl: 'https://govern.cat/gov/notes-premsa/1/x',
    imageFetch: 'https://cdn-govern.watchity.net/govern/images/1.jpg'
  };
  await writeFile(input, JSON.stringify([foto, story(2)]), 'utf8');
  const result = run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-09-26'], root);
  assert.equal(result.status, 0, result.stderr);
  const published = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  const item = published.find(story => story.slug === 'noticia-de-prova-1');
  assert.equal(item.imageCredit, 'Arnau Carbonell / Generalitat de Catalunya');
  assert.equal(item.imageLicense, 'CC0');
  assert.equal(item.imageSourceUrl, 'https://govern.cat/gov/notes-premsa/1/x');
  assert.equal(item.imageFetch, undefined, 'el camp intern no arriba mai al web');
  const articles = JSON.parse(await readFile(join(root, 'data', 'articles.json'), 'utf8'));
  assert.equal(articles.items.find(story => story.slug === 'noticia-de-prova-1').imageCredit, item.imageCredit);
  assert.equal(published.find(story => story.slug === 'noticia-de-prova-2').imageCredit, undefined);
});

test('un crèdit de foto damunt d’una il·lustració (sense -foto) es descarta', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  const falsa = { ...story(1), imageCredit: 'Algú', imageLicense: 'CC0', imageSourceUrl: 'https://govern.cat/x' };
  const sensImatge = { ...story(2), imageCredit: 'Algú', imageLicense: 'CC0' };
  delete sensImatge.image;
  await writeFile(input, JSON.stringify([falsa, sensImatge]), 'utf8');
  const result = run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-09-26'], root);
  assert.equal(result.status, 0, result.stderr);
  for (const item of parseAssignment(await readFile(join(root, 'news.js'), 'utf8'))) {
    assert.equal(item.imageCredit, undefined, item.slug);
    assert.equal(item.imageLicense, undefined, item.slug);
    assert.equal(item.imageSourceUrl, undefined, item.slug);
  }
});

test('fotos-llicencia.py passa les seves proves sense xarxa', () => {
  const py = resolve(import.meta.dirname, '..', 'scripts', 'fotos-llicencia.py');
  const result = spawnSync('python3', [py, '--self-test'], { encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') return; // sense python3 no hi ha res a provar
  if (/No module named 'PIL'/.test(result.stderr)) return; // Pillow s'instal·la al workflow només si cal
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\d+ proves OK/);
});

// ── Vídeos associats (prova pilot des del 06.10.2026) ─────────────────────────
test('publica un vídeo verificat i el conserva en el lot següent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const first = join(root, 'first.json');
  const second = join(root, 'second.json');
  const items = Array.from({ length: 5 }, (_, index) => story(index + 1));
  items[0].video = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
    idioma: 'EN',
    resum: 'Resum en català del vídeo.',
    titol: 'Títol real',
    canal: 'Canal oficial',
    canalUrl: 'https://www.youtube.com/@canal',
    verificat: '2026-10-06'
  };
  await writeFile(first, JSON.stringify(items), 'utf8');
  await writeFile(second, JSON.stringify(Array.from({ length: 5 }, (_, index) => story(index + 6))), 'utf8');
  const args = file => ['ingest-news', '--input', file, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-10-06'];
  assert.equal(run(args(first), root).status, 0);
  assert.equal(run(args(second), root).status, 0);
  const published = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  const withVideo = published.find(item => item.slug === 'noticia-de-prova-1');
  assert.deepEqual(withVideo.video, {
    id: 'dQw4w9WgXcQ',
    verificat: '2026-10-06',
    titol: 'Títol real',
    canal: 'Canal oficial',
    canalUrl: 'https://www.youtube.com/@canal',
    idioma: 'en',
    resum: 'Resum en català del vídeo.'
  });
  assert.equal(published.filter(item => item.video).length, 1);
  const articles = JSON.parse(await readFile(join(root, 'data', 'articles.json'), 'utf8'));
  assert.equal(articles.items.find(item => item.slug === 'noticia-de-prova-1').video.id, 'dQw4w9WgXcQ');
});

test('descarta sense aturar el lot els vídeos no verificats o amb URL dolenta', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-content-hub-'));
  const input = join(root, 'batch.json');
  const items = Array.from({ length: 5 }, (_, index) => story(index + 1));
  items[0].video = { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', idioma: 'en', resum: 'Sense verificar.' };
  items[1].video = { url: 'https://vimeo.com/12345', verificat: '2026-10-06' };
  items[2].video = { url: 'https://www.youtube.com/@canal', verificat: '2026-10-06' };
  items[3].video = 'https://youtu.be/dQw4w9WgXcQ';
  await writeFile(input, JSON.stringify(items), 'utf8');
  const result = run(['ingest-news', '--input', input, '--public-dir', root, '--state-dir', join(root, 'state'), '--date', '2026-10-06'], root);
  assert.equal(result.status, 0, result.stderr);
  const published = parseAssignment(await readFile(join(root, 'news.js'), 'utf8'));
  assert.equal(published.length, 5);
  assert.equal(published.filter(item => 'video' in item).length, 0);
});

test('reconeix les adreces de YouTube i rebutja les altres', async () => {
  const { youtubeId } = await import(resolve(import.meta.dirname, '..', 'scripts', 'videos.mjs'));
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ?si=abc'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://www.youtube.com/@OpenAI'), '');
  assert.equal(youtubeId('https://www.youtube.com/playlist?list=PL123'), '');
  assert.equal(youtubeId('https://evil.example/watch?v=dQw4w9WgXcQ'), '');
  assert.equal(youtubeId(''), '');
});

// --- Recollida de vídeos dels canals oficials (09.10.2026) ------------------

const recull = resolve(import.meta.dirname, '..', 'scripts', 'recull-videos.mjs');
const CANAL_3CAT = 'UCKseJ43xWvnywQzl6kYbf0g';
const CANAL_OPENAI = 'UCXZCJLdBC09xxGZ6gcdrc6A';

function feedXml(canalId, nom, entrades) {
  const cos = entrades.map(e => `
 <entry>
  <id>yt:video:${e.id}</id><yt:videoId>${e.id}</yt:videoId><yt:channelId>${canalId}</yt:channelId>
  <title>${e.titol}</title>
  <link rel="alternate" href="https://www.youtube.com/${e.shorts ? 'shorts/' : 'watch?v='}${e.id}"/>
  <published>${e.publicat}</published>
  <media:group><media:title>${e.titol}</media:title><media:description>${e.descripcio || ''}</media:description></media:group>
 </entry>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <yt:channelId>${canalId}</yt:channelId>
 <title>${nom}</title>${cos}
</feed>`;
}

const ARA = new Date('2026-10-09T20:00:00Z');

test('vídeos: del RSS només entren els d’IA, d’aquests dies i sense Shorts', async () => {
  const { parseFeed, seleccionaEntrades } = await import(recull);
  const xml = feedXml(CANAL_3CAT, '3CatInfo', [
    { id: 'AAAAAAAAAA1', titol: 'La IA arriba als hospitals: així funciona', publicat: '2026-10-09T10:00:00+00:00' },
    { id: 'AAAAAAAAAA2', titol: 'El temps: pluges a l&apos;Empordà', publicat: '2026-10-09T09:00:00+00:00', descripcio: 'Previsió del dia' },
    { id: 'AAAAAAAAAA3', titol: 'IA: el resum en un minut', publicat: '2026-10-09T08:00:00+00:00', shorts: true },
    { id: 'AAAAAAAAAA4', titol: 'Un algoritme a l&#39;escola', publicat: '2026-10-08T08:00:00+00:00', descripcio: 'Reportatge sobre la intel·ligència artificial a les aules' },
    { id: 'AAAAAAAAAA5', titol: 'La IA del 2025', publicat: '2026-08-01T08:00:00+00:00' },
    { id: 'AAAAAAAAAA6', titol: 'La iaia de Sabadell fa 100 anys', publicat: '2026-10-09T07:00:00+00:00' }
  ]);
  const feed = parseFeed(xml);
  assert.equal(feed.canalId, CANAL_3CAT);
  assert.equal(feed.entrades.length, 6);
  assert.equal(feed.entrades[1].titol, "El temps: pluges a l'Empordà");
  const triats = seleccionaEntrades(feed, { nom: '3CatInfo', id: CANAL_3CAT, grup: 'catala', idioma: 'ca', filtre: true }, { ara: ARA });
  assert.deepEqual(triats.map(v => v.id), ['AAAAAAAAAA1', 'AAAAAAAAAA4']);
  assert.equal(triats[0].grup, 'catala');
  assert.equal(triats[0].idioma, 'ca');
  assert.equal(triats[0].publicat, '2026-10-09T10:00:00.000Z');

  // Un canal que és tot d'IA (sense filtre) ho agafa tot, menys els Shorts i el que és vell.
  const oa = parseFeed(feedXml(CANAL_OPENAI, 'OpenAI', [
    { id: 'BBBBBBBBBB1', titol: 'How we built our new data center', publicat: '2026-10-09T10:00:00+00:00' },
    { id: 'BBBBBBBBBB2', titol: 'Shorts', publicat: '2026-10-09T10:00:00+00:00', shorts: true }
  ]));
  const triatsOa = seleccionaEntrades(oa, { nom: 'OpenAI', id: CANAL_OPENAI, grup: 'empreses', idioma: 'en', filtre: false }, { ara: ARA });
  assert.deepEqual(triatsOa.map(v => v.id), ['BBBBBBBBBB1']);
  assert.equal(triatsOa[0].idioma, 'en');
});

test('vídeos: detecta l’IA sense confondre-la amb paraules que la contenen', async () => {
  const { parlaDIA, detectaIdioma } = await import(recull);
  for (const t of ['La IA a les escoles', 'Introducing our new AI agents', 'GPT-6 explained', 'Copilot a Windows', 'Model de llenguatge en català', 'intel·ligència artificial i salut', 'Intel.ligencia artificial']) {
    assert.equal(parlaDIA(t), true, t);
  }
  for (const t of ['La iaia de Sabadell', 'Dia de la Mercè', 'Maig a Barcelona', 'Paella i arròs', 'Daily news']) {
    assert.equal(parlaDIA(t), false, t);
  }
  assert.equal(detectaIdioma('La IA arriba als hospitals amb els metges', 'en'), 'ca');
  assert.equal(detectaIdioma('La IA llega a los hospitales con los médicos', 'ca'), 'es');
  assert.equal(detectaIdioma('How the new model works for developers', 'ca'), 'en');
  assert.equal(detectaIdioma('GPT-6', 'en'), 'en');
});

test('vídeos: la fusió conserva el que ha decidit la sessió i caduca els vídeos solts', async () => {
  const { fusiona } = await import(recull);
  const existents = [
    { id: 'CCCCCCCCCC1', titol: 'Títol vell', canal: 'OpenAI', canalId: CANAL_OPENAI, grup: 'empreses', idioma: 'ca', publicat: '2026-10-08T10:00:00.000Z', noticia: 'gpt-6', noticiaTitol: 'GPT-6', resum: 'Resum.' },
    { id: 'CCCCCCCCCC2', titol: 'Solt i vell', canal: 'OpenAI', canalId: CANAL_OPENAI, grup: 'empreses', idioma: 'en', publicat: '2026-09-01T10:00:00.000Z' },
    { id: 'CCCCCCCCCC3', titol: 'Lligat i vell', canal: 'OpenAI', canalId: CANAL_OPENAI, grup: 'empreses', idioma: 'en', publicat: '2026-09-01T10:00:00.000Z', noticia: 'vella' },
    { id: 'CCCCCCCCCC4', titol: 'Exclòs', canal: 'OpenAI', canalId: CANAL_OPENAI, grup: 'empreses', idioma: 'en', publicat: '2026-10-09T10:00:00.000Z' },
    { id: 'malament', publicat: '2026-10-09T10:00:00.000Z' }
  ];
  const nous = [
    { id: 'CCCCCCCCCC1', titol: 'Títol nou', canal: 'OpenAI', canalId: CANAL_OPENAI, grup: 'empreses', idioma: 'en', publicat: '2026-10-08T10:00:00.000Z' },
    { id: 'CCCCCCCCCC5', titol: 'Nou', canal: 'OpenAI', canalId: CANAL_OPENAI, grup: 'empreses', idioma: 'en', publicat: '2026-10-09T11:00:00.000Z' }
  ];
  const fusionats = fusiona(existents, nous, { ara: ARA, exclou: new Set(['CCCCCCCCCC4']) });
  assert.deepEqual(fusionats.map(v => v.id), ['CCCCCCCCCC5', 'CCCCCCCCCC1', 'CCCCCCCCCC3']);
  const lligat = fusionats.find(v => v.id === 'CCCCCCCCCC1');
  assert.equal(lligat.titol, 'Títol nou');
  assert.equal(lligat.noticia, 'gpt-6');
  assert.equal(lligat.resum, 'Resum.');
  assert.equal(lligat.idioma, 'ca');
});

test('vídeos: les assignacions tardanes només lliguen vídeos de la llista a notícies publicades', async () => {
  const { aplicaAssignacions, lligaVideosDeNoticies } = await import(recull);
  const base = { canal: '3CatInfo', canalId: CANAL_3CAT, grup: 'catala', idioma: 'ca', publicat: '2026-10-09T10:00:00.000Z' };
  const videos = [
    { ...base, id: 'DDDDDDDDDD1', titol: 'U' },
    { ...base, id: 'DDDDDDDDDD2', titol: 'Dos', noticia: 'una-altra' },
    { ...base, id: 'DDDDDDDDDD3', titol: 'Tres' },
    { ...base, id: 'DDDDDDDDDD4', titol: 'Quatre' }
  ];
  const noticies = new Map([
    ['noticia-a', { title: 'Notícia A' }],
    ['noticia-b', { title: 'Notícia B', video: 'ZZZZZZZZZZ9' }],
    ['una-altra', { title: 'Una altra' }],
    ['noticia-c', { title: 'Notícia C', video: 'DDDDDDDDDD4', resum: 'Del lot.', idioma: 'ca' }]
  ]);
  const { aplicades, rebutjades } = aplicaAssignacions(videos, [
    { slug: 'noticia-a', video: 'https://www.youtube.com/watch?v=DDDDDDDDDD1', resum: '  Peça   del 324. ' },
    { slug: 'noticia-a', video: 'EEEEEEEEEE1' },
    { slug: 'no-existeix', video: 'DDDDDDDDDD3' },
    { slug: 'noticia-a', video: 'DDDDDDDDDD2' },
    { slug: 'noticia-b', video: 'DDDDDDDDDD3' },
    'brossa'
  ], noticies);
  assert.deepEqual(aplicades, ['DDDDDDDDDD1 → noticia-a']);
  assert.equal(rebutjades.length, 4);
  assert.equal(videos[0].noticia, 'noticia-a');
  assert.equal(videos[0].noticiaTitol, 'Notícia A');
  assert.equal(videos[0].resum, 'Peça del 324.');
  assert.equal(videos[2].noticia, undefined);

  // El vídeo que ja porta una notícia del lot també hi queda lligat.
  assert.equal(lligaVideosDeNoticies(videos, noticies), 1);
  assert.equal(videos[3].noticia, 'noticia-c');
  assert.equal(videos[3].resum, 'Del lot.');
});

test('vídeos: la comanda desa la llista i no la reescriu si no ha canviat', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ia-videos-'));
  const fixtures = join(root, 'fx');
  const publicDir = join(root, 'public');
  await spawnSync('mkdir', ['-p', fixtures, join(publicDir, 'data')]);
  await writeFile(join(root, 'canals.json'), JSON.stringify({
    canals: [
      { nom: '3CatInfo', id: CANAL_3CAT, grup: 'catala', idioma: 'ca', filtre: true },
      { nom: 'OpenAI', id: CANAL_OPENAI, grup: 'empreses', idioma: 'en', filtre: false },
      { nom: 'Sense RSS', id: 'UC0000000000000000000000', grup: 'ciencia', idioma: 'en', filtre: true },
      { nom: 'Dolent', id: 'no-es-un-canal', grup: 'empreses' }
    ],
    exclou: []
  }));
  const ahir = new Date(Date.now() - 86400000).toISOString();
  await writeFile(join(fixtures, `${CANAL_3CAT}.xml`), feedXml(CANAL_3CAT, '3CatInfo', [{ id: 'FFFFFFFFFF1', titol: 'La IA i el català', publicat: ahir }]));
  await writeFile(join(fixtures, `${CANAL_OPENAI}.xml`), feedXml(CANAL_OPENAI, 'OpenAI', [{ id: 'FFFFFFFFFF2', titol: 'Introducing a new model', publicat: ahir }]));
  await writeFile(join(publicDir, 'data', 'archive.json'), JSON.stringify([{ slug: 'el-catala-i-la-ia', title: 'El català i la IA' }]));
  await writeFile(join(root, 'assignats.json'), JSON.stringify([{ slug: 'el-catala-i-la-ia', video: 'FFFFFFFFFF1' }]));
  const sortida = join(publicDir, 'data', 'videos.json');
  const args = ['--canals', join(root, 'canals.json'), '--sortida', sortida, '--assignacions', join(root, 'assignats.json'),
    '--public-dir', publicDir, '--fixtures', fixtures, '--sense-miniatures'];
  const primera = spawnSync(process.execPath, [recull, ...args], { cwd: root, encoding: 'utf8' });
  assert.equal(primera.status, 0, primera.stderr);
  const dades = JSON.parse(await readFile(sortida, 'utf8'));
  assert.deepEqual(dades.videos.map(v => v.id).sort(), ['FFFFFFFFFF1', 'FFFFFFFFFF2']);
  assert.equal(dades.videos.find(v => v.id === 'FFFFFFFFFF1').noticia, 'el-catala-i-la-ia');
  assert.match(primera.stderr, /Sense RSS: RSS no llegit/);
  assert.match(primera.stderr, /canal invàlid/);

  const abans = await readFile(sortida, 'utf8');
  const segona = spawnSync(process.execPath, [recull, ...args], { cwd: root, encoding: 'utf8' });
  assert.equal(segona.status, 0, segona.stderr);
  assert.match(segona.stdout, /Cap canvi/);
  assert.equal(await readFile(sortida, 'utf8'), abans);

  const candidats = spawnSync(process.execPath, [recull, '--candidats', '--sortida', sortida], { cwd: root, encoding: 'utf8' });
  assert.equal(candidats.status, 0, candidats.stderr);
  assert.match(candidats.stdout, /FFFFFFFFFF2 \| en \| OpenAI \| Introducing a new model/);
  assert.match(candidats.stdout, /ja lligat a el-catala-i-la-ia/);
});
