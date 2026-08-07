#!/usr/bin/env node

import { appendFile, copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const ASSIGNMENTS = {
  news: { variable: 'IA_NEWS', file: 'news.js' },
  radar: { variable: 'IA_RADAR', file: 'radar.js' },
  analysis: { variable: 'IA_ANALYSIS', file: 'analysis.js' },
  reflection: { variable: 'IA_REFLECTION', file: 'reflection.js' },
  dailyImage: { variable: 'IA_DAILY_IMAGE', file: 'daily-image.js' },
  // «La reflexió del dia» (des del 04.08.2026): el balanç diari que s'escriu amb
  // l'últim lot de notícies. No s'ha de confondre amb el Quadern IA setmanal
  // (reflection.js) ni amb la fotografia del dia (assets/daily-reflection-*.jpg).
  dailyReflection: { variable: 'IA_REFLEXIO_DIARIA', file: 'reflexio-diaria.js' },
  dailyReflectionArchive: { variable: 'IA_REFLEXIONS_ARXIU', file: 'reflexions-arxiu.js' }
};

// L'encàrrec demana 5-6 paràgrafs. Els límits durs són més amplis a posta: una
// peça de 4 o de 7 paràgrafs es publica igualment (amb un avís al log) en comptes
// de deixar el dia sense reflexió, que seria el pitjor resultat possible.
const REFLEXIO_PARAGRAFS_MIN = 4;
const REFLEXIO_PARAGRAFS_MAX = 8;
const REFLEXIO_ARXIU_MAX = 90;

const REQUIRED_NEWS_FIELDS = [
  'category', 'read', 'slug', 'title', 'excerpt',
  'sourceName', 'sourceUrl', 'sourceDate', 'body'
];

function parseArguments(argv) {
  const [command, ...tokens] = argv;
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new Error(`Argument desconegut: ${token}`);
    const key = token.slice(2);
    const next = tokens[index + 1];
    if (!next || next.startsWith('--')) options[key] = true;
    else {
      options[key] = next;
      index += 1;
    }
  }
  return { command, options };
}

function editionDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function displayDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePayload(text, expectedType) {
  const source = text.trim();
  if (!source) throw new Error('El fitxer rebut és buit.');
  try {
    return JSON.parse(source);
  } catch {
    const opening = expectedType === 'news' || expectedType === 'radar' ? '[' : '{';
    const closing = expectedType === 'news' || expectedType === 'radar' ? ']' : '}';
    const start = source.indexOf(opening);
    const end = source.lastIndexOf(closing);
    if (start === -1 || end <= start) throw new Error('No s’ha trobat cap bloc JSON vàlid.');
    try {
      return JSON.parse(source.slice(start, end + 1));
    } catch (error) {
      throw new Error(`El JSON no és vàlid: ${error.message}`);
    }
  }
}

function ensureWebUrl(value, field, index) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error(`Notícia ${index + 1}: ${field} ha de ser una URL http(s).`);
  }
}

function validateNews(payload) {
  const items = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El lot ha de contenir almenys una notícia.');
  }
  if (items.length > 20) throw new Error('Un lot no pot contenir més de 20 notícies.');

  const seenSlugs = new Set();
  return items.map((raw, index) => {
    const item = {};
    for (const field of REQUIRED_NEWS_FIELDS) {
      item[field] = normalizeText(raw?.[field]);
      if (!item[field]) throw new Error(`Notícia ${index + 1}: falta el camp ${field}.`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) {
      throw new Error(`Notícia ${index + 1}: l’slug només pot contenir minúscules, xifres i guions.`);
    }
    if (seenSlugs.has(item.slug)) throw new Error(`Slug duplicat dins del lot: ${item.slug}.`);
    seenSlugs.add(item.slug);
    ensureWebUrl(item.sourceUrl, 'sourceUrl', index);
    // La imatge és opcional (la portada gestiona targetes sense imatge),
    // però si hi és, ha de ser una URL o una ruta web vàlida.
    const image = normalizeText(raw?.image);
    if (image) {
      if (!/^(https?:\/\/|\.\/|\/)/.test(image)) {
        throw new Error(`Notícia ${index + 1}: image ha de ser una URL o ruta web.`);
      }
      item.image = image;
    }
    // Encaminament opcional entre seccions (camp intern, no forma part del
    // contracte públic IA_NEWS). Per defecte (absent o "senyal"): la notícia va
    // al feed "El senyal d'avui" i, si té context català, també es deriva a
    // "La IA que passa aquí". Amb "radar": va NOMÉS al radar "La IA que passa
    // aquí" i no apareix mai al feed principal ni a l'hemeroteca.
    const seccio = normalizeText(raw?.seccio).toLocaleLowerCase('ca');
    if (seccio) {
      if (seccio !== 'radar' && seccio !== 'senyal') {
        throw new Error(`Notícia ${index + 1}: seccio només pot ser "radar" o "senyal".`);
      }
      if (seccio === 'radar') item.seccio = 'radar';
    }
    return item;
  });
}

function validateEditorial(type, payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new Error(`${type} ha de ser un objecte JSON.`);
  }
  if (!normalizeText(payload.title)) throw new Error(`${type}: falta title.`);
  if (type === 'analysis' && !normalizeText(payload.excerpt)) {
    throw new Error('analysis: falta excerpt.');
  }
  if (type === 'reflection') {
    if (!normalizeText(payload.dek)) throw new Error('reflection: falta dek.');
    if (!Array.isArray(payload.body) || payload.body.length < 2 || payload.body.some(item => !normalizeText(item))) {
      throw new Error('reflection: body ha de contenir almenys dos paràgrafs.');
    }
  }
  return payload;
}

function validateDailyImage(payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new Error('daily-image ha de ser un objecte JSON.');
  }
  const required = ['date', 'image', 'alt', 'kicker', 'title', 'caption', 'credit'];
  const item = Object.fromEntries(required.map(field => [field, normalizeText(payload[field])]));
  for (const field of required) {
    if (!item[field]) throw new Error(`daily-image: falta ${field}.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) throw new Error('daily-image: date ha de tenir el format AAAA-MM-DD.');
  if (!/^(https?:\/\/|\.\/|\/)/.test(item.image)) throw new Error('daily-image: image ha de ser una URL o ruta web.');
  if (item.alt.length < 25) throw new Error('daily-image: alt ha de descriure la fotografia.');
  // Text associat opcional per a la pàgina "La imatge del dia"; conserva els paràgrafs.
  const body = String(payload.body ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .join('\n\n');
  if (body) item.body = body;
  return item;
}

// «La reflexió del dia»: balanç del dia escrit a partir de les notícies del dia.
// Camps: date (AAAA-MM-DD), title, dek, body (paràgrafs) i, opcionalment, read i
// signals (les notícies del dia en què es basa, per enllaçar-les des de la peça).
function validateDailyReflection(payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new Error('reflexió del dia ha de ser un objecte JSON.');
  }
  const date = normalizeText(payload.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('reflexió del dia: date ha de tenir el format AAAA-MM-DD.');
  }
  const title = normalizeText(payload.title);
  const dek = normalizeText(payload.dek);
  if (!title) throw new Error('reflexió del dia: falta title.');
  if (!dek) throw new Error('reflexió del dia: falta dek.');
  const body = (Array.isArray(payload.body)
    ? payload.body.map(normalizeText)
    : String(payload.body ?? '').replace(/\r\n/g, '\n').split(/\n{2,}/).map(part => part.trim())
  ).filter(Boolean);
  if (body.length < REFLEXIO_PARAGRAFS_MIN) {
    throw new Error(`reflexió del dia: body ha de tenir com a mínim ${REFLEXIO_PARAGRAFS_MIN} paràgrafs.`);
  }
  if (body.length > REFLEXIO_PARAGRAFS_MAX) {
    throw new Error(`reflexió del dia: body no pot passar de ${REFLEXIO_PARAGRAFS_MAX} paràgrafs.`);
  }
  const item = { date, title, dek, body };

  // Senyals del dia: les notícies en què es basa la reflexió. `slug` enllaça amb
  // article.php; `url` només s'admet si és http(s). Un senyal sense títol s'ignora.
  const signals = (Array.isArray(payload.signals) ? payload.signals : [])
    .map(signal => {
      if (!signal || typeof signal !== 'object') return null;
      const signalTitle = normalizeText(signal.title);
      if (!signalTitle) return null;
      const slug = normalizeText(signal.slug);
      const url = normalizeText(signal.url);
      const entry = { title: signalTitle };
      if (/^[a-z0-9-]+$/.test(slug)) entry.slug = slug;
      else if (/^https?:\/\//.test(url)) entry.url = url;
      return entry;
    })
    .filter(Boolean)
    .slice(0, 6);
  if (signals.length) item.signals = signals;

  const words = body.join(' ').split(/\s+/).filter(Boolean).length;
  item.read = normalizeText(payload.read) || `${Math.max(2, Math.round(words / 200))} MIN`;
  item.words = words;
  return item;
}

function mergeNews(incoming, previous, limit) {
  const merged = [];
  const slugs = new Set();
  const urls = new Set();
  for (const item of [...incoming, ...previous]) {
    const url = item.sourceUrl.toLocaleLowerCase('ca');
    if (slugs.has(item.slug) || urls.has(url)) continue;
    slugs.add(item.slug);
    urls.add(url);
    merged.push(item);
    if (merged.length === limit) break;
  }
  return merged;
}

// Coincidència de paraula completa: evita falsos positius per subcadena, com ara
// 'vic' dins "vicepresident", 'bsc' dins "subscripcions" o 'reus' dins "correus".
// Les fronteres es defineixen amb lletres unicode (accents inclosos) i xifres, de
// manera que els termes accentuats ("català", "mataró") també hi funcionen bé.
function wholeWord(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
}

function detectPlace(story) {
  const text = `${story.title} ${story.excerpt} ${story.body}`;
  const places = ['Barcelona', 'Girona', 'Lleida', 'Tarragona', 'Mataró', 'Flix', 'Sabadell', 'Terrassa', 'Manresa', 'Reus'];
  return places.find(place => wholeWord(place).test(text)) || 'Catalunya';
}

function radarCategory(story) {
  const category = story.category.toLocaleUpperCase('ca');
  if (/RECERCA|CIÈNCIA|UNIVERSITAT/.test(category)) return 'RECERCA';
  if (/EMPRESA|MERCAT|NEGOCI|STARTUP/.test(category)) return 'EMPRESA';
  if (/GOVERN|POLÍT|REGUL/.test(category)) return 'POLÍTIQUES';
  if (/EDUC/.test(category)) return 'EDUCACIÓ';
  if (/SEGUR|CIBER/.test(category)) return 'SEGURETAT';
  return 'IA I SOCIETAT';
}

// Termes que identifiquen una notícia d'àmbit català: topònims, institucions i
// EMPRESES/ENTITATS catalanes amb nom propi inconfusible. Les empreses hi són
// perquè una notícia corporativa ("CaixaBank crea una unitat de...") sovint no
// esmenta cap topònim al títol ni al resum, i sense això no es derivava al
// radar (va passar el 24.07.2026 amb CaixaBank). Només noms que no poden
// aparèixer per casualitat en una notícia global.
const LOCAL_TERMS = [
  'catalunya', 'català', 'catalana', 'catalanes', 'països catalans', 'barcelona', 'girona', 'lleida', 'tarragona', 'mataró', 'flix', 'sabadell', 'terrassa', 'manresa', 'reus', 'badalona', 'hospitalet', 'vic', 'granollers', 'igualada', 'generalitat', 'aina', 'softcatalà', 'bsc', 'upc', 'uab', 'ub', 'urv',
  'caixabank', 'fundació la caixa', 'criteriacaixa', 'banc sabadell', 'grifols', 'cellnex', 'fluidra', 'seat', 'cupra', 'esade', 'uoc', 'upf', 'udg', 'udl', 'eurecat', 'submer', 'openchip', 'i2cat', 'mobile world congress', 'mwc', 'tv3', '3cat', 'mare nostrum', 'marenostrum'
];

// Els termes de LOCAL_TERMS han de ser INCONFUSIBLES: la comparació no distingeix
// majúscules, així que un terme que també sigui una paraula corrent del català
// cola notícies globals al radar. El 30.07.2026 hi va entrar una notícia de Meta
// perquè el titular deia que l'aposta per la IA «asseca la caixa» (la tresoreria)
// i la llista contenia 'la caixa'. Substituït per 'fundació la caixa'. Abans
// d'afegir cap terme nou, pregunta't si podria sortir per casualitat en una
// notícia internacional.
function isLocalStory(story) {
  // L'slug també compta: sovint porta el nom de l'entitat encara que el títol
  // s'hagi escurçat. El cos NO s'inclou per evitar falsos positius (una notícia
  // global que esmenta Barcelona de passada no és local).
  const haystack = `${story.category} ${story.title} ${story.excerpt} ${(story.slug || '').replace(/-/g, ' ')}`;
  return LOCAL_TERMS.some(term => wholeWord(term).test(haystack));
}

// Deriva senyals de radar de les notícies realment catalanes del dia i, a més,
// de les que s'han marcat explícitament amb seccio "radar" (adopció d'IA per
// empreses de l'entorn, encara que no portin cap topònim català). Les notícies
// globals de sempre no s'hi disfressen mai de locals.
function deriveRadar(items, date) {
  return items.filter(story => story.seccio === 'radar' || isLocalStory(story)).map(story => ({
    place: detectPlace(story),
    category: radarCategory(story),
    date: displayDate(date),
    title: story.title,
    summary: story.excerpt,
    detail: story.body,
    source: story.sourceName,
    url: story.sourceUrl
  }));
}

// Combina els senyals nous amb els que ja hi havia a radar.js:
// els nous al davant, sense duplicats per URL ni per títol, fins a `limit`.
function mergeRadar(incoming, previous, limit = 8) {
  const merged = [];
  const urls = new Set();
  const titles = new Set();
  for (const item of [...incoming, ...previous]) {
    const url = normalizeText(item?.url).toLocaleLowerCase('ca');
    const title = normalizeText(item?.title).toLocaleLowerCase('ca');
    if (!title) continue;
    if ((url && urls.has(url)) || titles.has(title)) continue;
    if (url) urls.add(url);
    titles.add(title);
    merged.push(item);
    if (merged.length === limit) break;
  }
  return merged;
}

// Llegeix un fitxer públic `window.X = [...]` i en retorna el valor JSON.
async function readAssignment(path, opening = '[', closing = ']', fallback = []) {
  if (!(await exists(path))) return fallback;
  try {
    const text = await readFile(path, 'utf8');
    const start = text.indexOf(opening);
    const end = text.lastIndexOf(closing);
    if (start === -1 || end <= start) return fallback;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return fallback;
  }
}

// En canviar de dia, l'edició anterior s'afegeix a l'hemeroteca pública
// (public/data/arxiu.json, format {editions: [{date, items}]}) si no hi és.
async function archivePreviousEdition(publicDir, previousState, newDate) {
  const previousDate = previousState?.editionDate;
  const previousItems = Array.isArray(previousState?.items) ? previousState.items : [];
  if (!previousDate || previousDate === newDate || previousItems.length === 0) return false;
  const arxiuPath = join(publicDir, 'data', 'arxiu.json');
  const arxiu = await readJson(arxiuPath, { editions: [] });
  if (!Array.isArray(arxiu.editions)) arxiu.editions = [];
  const label = displayDate(previousDate);
  if (arxiu.editions.some(edition => edition?.date === label)) return false;
  arxiu.editions.unshift({ date: label, items: previousItems });
  await atomicWrite(arxiuPath, `${JSON.stringify(arxiu, null, 2)}\n`);
  return true;
}

function serializeAssignment(variable, value) {
  return `window.${variable} = ${JSON.stringify(value, null, 2)};\n`;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path, fallback) {
  if (!(await exists(path))) return fallback;
  return JSON.parse(await readFile(path, 'utf8'));
}

async function atomicWrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
}

async function backupFile(path, backupDir, label) {
  if (!(await exists(path))) return;
  await mkdir(backupDir, { recursive: true });
  await copyFile(path, join(backupDir, `${label}-${Date.now()}-${basename(path)}`));
}

async function ingestNews(options) {
  if (!options.input) throw new Error('Falta --input amb el lot generat per Claude.');
  const publicDir = resolve(options['public-dir'] || '.');
  const stateDir = resolve(options['state-dir'] || '.content-state');
  const target = Number(options.target || 20);
  if (!Number.isInteger(target) || target < 5 || target > 50) throw new Error('--target ha de ser entre 5 i 50.');
  const date = options.date || editionDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--date ha de tenir el format AAAA-MM-DD.');

  const inputText = await readFile(resolve(options.input), 'utf8');
  const incoming = validateNews(parsePayload(inputText, 'news'));
  const statePath = join(stateDir, 'news-state.json');
  const previousState = await readJson(statePath, { editionDate: date, items: [], batches: 0 });
  const previous = previousState.editionDate === date && Array.isArray(previousState.items) && previousState.items.length
    ? validateNews(previousState.items)
    : [];
  // Encaminament de seccions: les notícies marcades amb seccio "radar" van
  // NOMÉS a "La IA que passa aquí" (via deriveRadar més avall) i no entren al
  // feed "El senyal d'avui" ni a l'acumulació del dia. La resta segueix el flux
  // habitual; els traiem el camp intern perquè no arribi al contracte públic.
  const feedIncoming = incoming.filter(story => story.seccio !== 'radar');
  for (const story of feedIncoming) delete story.seccio;
  const items = mergeNews(feedIncoming, previous, target);

  // Xarxa de seguretat d'imatges: si una notícia no porta el camp `image` però el
  // fitxer generat ja existeix a public/assets/<slug>-AAAAMMDD.(jpg|webp|png),
  // enllaça'l automàticament. Purament additiu: mai treu ni sobreescriu una imatge.
  const compactDate = date.replace(/-/g, '');
  for (const item of items) {
    if (item.image) continue;
    for (const ext of ['jpg', 'webp', 'png']) {
      const candidate = join(publicDir, 'assets', `${item.slug}-${compactDate}.${ext}`);
      if (await exists(candidate)) {
        item.image = `./assets/${item.slug}-${compactDate}.${ext}`;
        break;
      }
    }
  }

  const now = new Date().toISOString();
  const state = {
    editionDate: date,
    updatedAt: now,
    batches: previousState.editionDate === date ? Number(previousState.batches || 0) + 1 : 1,
    target,
    items
  };

  // Hemeroteca: si el dia ha canviat, l'edició anterior queda arxivada abans de res.
  await archivePreviousEdition(publicDir, previousState, date);

  const newsPath = join(publicDir, 'news.js');
  await backupFile(newsPath, join(stateDir, 'backups'), date);
  await atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await atomicWrite(newsPath, serializeAssignment(ASSIGNMENTS.news.variable, items));

  // Radar català: senyals nous només de notícies catalanes + senyals anteriors, fins a 8.
  const radarPath = join(publicDir, 'radar.js');
  const existingRadar = await readAssignment(radarPath);
  const radar = mergeRadar(deriveRadar(incoming, date), Array.isArray(existingRadar) ? existingRadar : []);
  if (radar.length) {
    await backupFile(radarPath, join(stateDir, 'backups'), date);
    await atomicWrite(radarPath, serializeAssignment(ASSIGNMENTS.radar.variable, radar));
  }

  // Contractes existents del web: data/articles.json (article.php) i content/latest.json.
  await atomicWrite(join(publicDir, 'data', 'articles.json'), `${JSON.stringify({ updatedAt: now, items }, null, 2)}\n`);
  await atomicWrite(join(publicDir, 'content', 'latest.json'), `${JSON.stringify({
    updatedAt: now,
    items: items.map(({ category, read, title, excerpt }) => ({ category, read, title, excerpt }))
  }, null, 2)}\n`);

  const archivePath = join(stateDir, 'archive.json');
  const archive = await readJson(archivePath, { items: [] });
  const archivedItems = mergeNews(
    items.map(item => ({ ...item, editionDate: date })),
    Array.isArray(archive.items) ? archive.items : [],
    1000
  );
  await atomicWrite(archivePath, `${JSON.stringify({ updatedAt: now, items: archivedItems }, null, 2)}\n`);
  await atomicWrite(join(publicDir, 'data', 'archive.json'), `${JSON.stringify(archivedItems, null, 2)}\n`);

  const newsletter = {
    editionDate: date,
    generatedAt: now,
    subject: `La setmana d’IA: ${items[0]?.title || 'les històries essencials'}`,
    lead: items[0] || null,
    stories: items.slice(0, 5)
  };
  await atomicWrite(join(publicDir, 'data', 'newsletter.json'), `${JSON.stringify(newsletter, null, 2)}\n`);

  const status = {
    ok: true,
    editionDate: date,
    generatedAt: now,
    target,
    newsCount: items.length,
    batchCount: state.batches,
    radarCount: radar.length || (Array.isArray(existingRadar) ? existingRadar.length : 0),
    newsletterCount: newsletter.stories.length
  };
  await atomicWrite(join(publicDir, 'content-status.json'), `${JSON.stringify(status, null, 2)}\n`);
  process.stdout.write(`${items.length}/${target} notícies publicades; lot ${state.batches} del dia ${date}.\n`);
}

async function ingestEditorial(options) {
  const type = options.type;
  if (!['analysis', 'reflection'].includes(type)) throw new Error('--type ha de ser analysis o reflection.');
  if (!options.input) throw new Error('Falta --input.');
  const publicDir = resolve(options['public-dir'] || '.');
  const stateDir = resolve(options['state-dir'] || '.content-state');
  const payload = validateEditorial(type, parsePayload(await readFile(resolve(options.input), 'utf8'), type));
  // Data de creació garantida (DD.MM.AAAA): si la peça no la porta, es posa la del dia.
  if (!normalizeText(payload.date)) payload.date = displayDate(editionDate());
  const output = join(publicDir, ASSIGNMENTS[type].file);
  await backupFile(output, join(stateDir, 'backups'), editionDate());
  await atomicWrite(output, serializeAssignment(ASSIGNMENTS[type].variable, payload));
  process.stdout.write(`${type} validat i publicat.\n`);
}

async function ingestDailyImage(options) {
  if (!options.input) throw new Error('Falta --input.');
  const publicDir = resolve(options['public-dir'] || '.');
  const stateDir = resolve(options['state-dir'] || '.content-state');
  const payload = validateDailyImage(parsePayload(await readFile(resolve(options.input), 'utf8'), 'daily-image'));
  if (!payload.image.startsWith('http')) {
    const localImage = join(publicDir, payload.image.replace(/^\.\//, '').replace(/^\//, ''));
    if (!(await exists(localImage))) throw new Error(`daily-image: no existeix l’arxiu ${payload.image}.`);
  }
  const output = join(publicDir, ASSIGNMENTS.dailyImage.file);
  await backupFile(output, join(stateDir, 'backups'), payload.date);
  await atomicWrite(output, serializeAssignment(ASSIGNMENTS.dailyImage.variable, payload));
  process.stdout.write(`Fotografia editorial del ${payload.date} validada i publicada.\n`);
}

// Publica «La reflexió del dia» i fa rodar l'arxiu: la peça vigent, si és d'un
// altre dia, passa al davant de reflexions-arxiu.js. Tornar a executar-ho el
// mateix dia (correcció, segona passada) substitueix la peça sense duplicar res.
async function ingestDailyReflection(options) {
  if (!options.input) throw new Error('Falta --input.');
  const publicDir = resolve(options['public-dir'] || '.');
  const stateDir = resolve(options['state-dir'] || '.content-state');
  const payload = validateDailyReflection(
    parsePayload(await readFile(resolve(options.input), 'utf8'), 'daily-reflection')
  );
  if (payload.body.length < 5 || payload.body.length > 6) {
    process.stdout.write(`AVÍS: la reflexió del dia té ${payload.body.length} paràgrafs (l'encàrrec en demana 5 o 6).\n`);
  }

  const currentPath = join(publicDir, ASSIGNMENTS.dailyReflection.file);
  const archivePath = join(publicDir, ASSIGNMENTS.dailyReflectionArchive.file);
  const current = await readAssignment(currentPath, '{', '}', null);
  const stored = await readAssignment(archivePath, '[', ']', []);
  let archive = Array.isArray(stored) ? stored.filter(item => item && item.date) : [];
  if (current && current.date && current.date !== payload.date) {
    archive = [current, ...archive.filter(item => item.date !== current.date)];
  }
  // La peça del dia mai no ha de ser alhora la vigent i la primera de l'arxiu.
  archive = archive.filter(item => item.date !== payload.date).slice(0, REFLEXIO_ARXIU_MAX);

  await backupFile(currentPath, join(stateDir, 'backups'), payload.date);
  await atomicWrite(currentPath, serializeAssignment(ASSIGNMENTS.dailyReflection.variable, payload));
  await atomicWrite(archivePath, serializeAssignment(ASSIGNMENTS.dailyReflectionArchive.variable, archive));
  process.stdout.write(`Reflexió del dia ${payload.date} publicada (${payload.body.length} paràgrafs, ${payload.words} paraules); ${archive.length} a l'arxiu.\n`);
}

// ———————————————————————————————————————————————————————————————————————————
// «pending»: queda res a incoming/ que no s'hagi arribat a publicar?
//
// Existeix per a la repesca programada dels crons de `content-hub.yml` i
// `reflexio-del-dia.yml` (afegits el 07.08.2026 arran de l'incident del lot
// 18.05, que va quedar orfe 11 hores perquè el seu push va morir dins d'una
// avaria de GitHub Actions i el trigger no es torna a disparar mai).
//
// ⚠️ Per què cal aquesta comprovació i no n'hi ha prou de tornar a ingerir:
// `ingest-news` NO és idempotent. Encara que no hi hagi cap notícia nova,
// cada passada incrementa `batches`, reescriu tots els segells de temps
// (`updatedAt`, `generatedAt`) i deixa una còpia nova a `.content-state/backups/`.
// Un cron cada 30 minuts sense guarda generaria ~48 commits i desplegaments
// inútils al dia, i el `batchCount` diria 48 lots en lloc de 4.
//
// Escriu «yes» o «no» a stdout, el motiu a stderr, i `pending=yes|no` a
// $GITHUB_OUTPUT si la variable hi és. Sempre acaba amb codi 0: que no hi hagi
// feina no és cap error. Si el fitxer d'entrada és corrupte, en canvi, sí que
// falla (codi 1) — val més que el cron es queixi que no pas que calli.
async function pendingWork(options) {
  const what = options.what;
  if (!['news', 'daily-reflection'].includes(what)) {
    throw new Error('--what ha de ser news o daily-reflection.');
  }
  if (!options.input) throw new Error('Falta --input.');
  const publicDir = resolve(options['public-dir'] || '.');
  const stateDir = resolve(options['state-dir'] || '.content-state');
  const inputPath = resolve(options.input);

  let pending = false;
  let reason;

  if (!(await exists(inputPath))) {
    reason = `no hi ha cap ${basename(inputPath)}`;
  } else if (what === 'news') {
    const incoming = validateNews(parsePayload(await readFile(inputPath, 'utf8'), 'news'));
    // Les notícies marcades com a "radar" no entren ni al feed ni a l'arxiu,
    // de manera que no hi ha cap rastre fiable per saber si ja s'han ingerit.
    // Un lot que només en porti no dispara la repesca: val més no fer res que
    // reingerir en bucle. El camí normal (push a incoming/) sí que el cobreix.
    const slugs = incoming.filter(story => story.seccio !== 'radar').map(story => story.slug);
    if (!slugs.length) {
      reason = 'el lot només porta senyals de radar; la repesca no hi arriba';
    } else {
      const archive = await readJson(join(stateDir, 'archive.json'), { items: [] });
      const publicat = new Set((Array.isArray(archive.items) ? archive.items : []).map(item => item?.slug));
      const falten = slugs.filter(slug => !publicat.has(slug));
      pending = falten.length > 0;
      reason = pending
        ? `${falten.length} de ${slugs.length} notícies sense publicar: ${falten.join(', ')}`
        : `les ${slugs.length} notícies del lot ja són publicades`;
    }
  } else {
    const payload = validateDailyReflection(parsePayload(await readFile(inputPath, 'utf8'), 'daily-reflection'));
    const vigent = await readAssignment(join(publicDir, ASSIGNMENTS.dailyReflection.file), '{', '}', null);
    pending = !vigent?.date || vigent.date !== payload.date;
    reason = pending
      ? `la reflexió pendent és del ${payload.date} i la publicada ${vigent?.date ? `és del ${vigent.date}` : 'no existeix'}`
      : `la reflexió del ${payload.date} ja és publicada`;
  }

  process.stdout.write(`${pending ? 'yes' : 'no'}\n`);
  process.stderr.write(`Feina pendent (${what}): ${pending ? 'SÍ' : 'no'} — ${reason}.\n`);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `pending=${pending ? 'yes' : 'no'}\n`);
  }
}

async function validateCommand(options) {
  if (!options.input || !options.type) throw new Error('Falten --input i --type.');
  const text = await readFile(resolve(options.input), 'utf8');
  const payload = parsePayload(text, options.type);
  if (options.type === 'news') validateNews(payload);
  else if (options.type === 'daily-reflection') validateDailyReflection(payload);
  else validateEditorial(options.type, payload);
  process.stdout.write(`${options.type}: contingut vàlid.\n`);
}

function usage() {
  return `Ús:
  node content-hub.mjs ingest-news --input news.js --public-dir . --state-dir .content-state
  node content-hub.mjs ingest-editorial --type analysis|reflection --input fitxer.json --public-dir .
  node content-hub.mjs ingest-daily-image --input daily-image.json --public-dir .
  node content-hub.mjs ingest-daily-reflection --input daily-reflection.json --public-dir .
  node content-hub.mjs validate --type news|analysis|reflection|daily-reflection --input fitxer.json
  node content-hub.mjs pending --what news|daily-reflection --input fitxer.json --public-dir . --state-dir .content-state\n`;
}

try {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === 'ingest-news') await ingestNews(options);
  else if (command === 'ingest-editorial') await ingestEditorial(options);
  else if (command === 'ingest-daily-image') await ingestDailyImage(options);
  else if (command === 'ingest-daily-reflection') await ingestDailyReflection(options);
  else if (command === 'validate') await validateCommand(options);
  else if (command === 'pending') await pendingWork(options);
  else {
    process.stdout.write(usage());
    process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  process.stderr.write(`Content Hub: ${error.message}\n`);
  process.exitCode = 1;
}
