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
