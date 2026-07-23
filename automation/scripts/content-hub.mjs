#!/usr/bin/env node

import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const ASSIGNMENTS = {
  news: { variable: 'IA_NEWS', file: 'news.js' },
  radar: { variable: 'IA_RADAR', file: 'radar.js' },
  analysis: { variable: 'IA_ANALYSIS', file: 'analysis.js' },
  reflection: { variable: 'IA_REFLECTION', file: 'reflection.js' },
  dailyImage: { variable: 'IA_DAILY_IMAGE', file: 'daily-image.js' }
};

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
  return 'IA I SOCIETAT';
}

const LOCAL_TERMS = ['catalunya', 'català', 'catalana', 'catalanes', 'països catalans', 'barcelona', 'girona', 'lleida', 'tarragona', 'mataró', 'flix', 'sabadell', 'terrassa', 'manresa', 'reus', 'badalona', 'vic', 'granollers', 'igualada', 'generalitat', 'aina', 'softcatalà', 'bsc', 'upc', 'uab', 'ub', 'urv'];

function isLocalStory(story) {
  const haystack = `${story.category} ${story.title} ${story.excerpt}`;
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

async function validateCommand(options) {
  if (!options.input || !options.type) throw new Error('Falten --input i --type.');
  const text = await readFile(resolve(options.input), 'utf8');
  const payload = parsePayload(text, options.type);
  if (options.type === 'news') validateNews(payload);
  else validateEditorial(options.type, payload);
  process.stdout.write(`${options.type}: contingut vàlid.\n`);
}

function usage() {
  return `Ús:
  node content-hub.mjs ingest-news --input news.js --public-dir . --state-dir .content-state
  node content-hub.mjs ingest-editorial --type analysis|reflection --input fitxer.json --public-dir .
  node content-hub.mjs ingest-daily-image --input daily-image.json --public-dir .
  node content-hub.mjs validate --type news|analysis|reflection --input fitxer.json\n`;
}

try {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === 'ingest-news') await ingestNews(options);
  else if (command === 'ingest-editorial') await ingestEditorial(options);
  else if (command === 'ingest-daily-image') await ingestDailyImage(options);
  else if (command === 'validate') await validateCommand(options);
  else {
    process.stdout.write(usage());
    process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  process.stderr.write(`Content Hub: ${error.message}\n`);
  process.exitCode = 1;
}
