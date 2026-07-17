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
