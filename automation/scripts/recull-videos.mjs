#!/usr/bin/env node
// Recollida de vídeos dels canals oficials (09.10.2026).
//
// PER QUÈ EXISTEIX. Durant la primera setmana de la prova pilot de vídeos
// (06-09.10.2026) no en va sortir CAP: de 60 notícies, zero vídeos. La causa no
// era el criteri sinó el mètode de cerca: la sessió editorial havia de trobar
// els vídeos amb «site:youtube.com» a l'eina de cerca web, i aquesta eina
// ignora el filtre i no torna cap enllaç de YouTube. El sandbox de la sessió
// tampoc no arriba a youtube.com (403 del proxy), ni als RSS dels canals.
//
// QUÈ FA. Aquest script corre a GitHub Actions (videos.yml), que sí que hi
// arriba, i llegeix el RSS PÚBLIC de cada canal de la llista tancada
// automation/video-channels.json (no cal cap clau d'API):
//
//   1. Agafa els vídeos dels últims 21 dies (sense Shorts). Als canals amb
//      "filtre": true només els que parlen d'IA (títol o inici de la descripció).
//   2. Els fusiona amb public/data/videos.json, que és el que llegeixen la
//      secció /videos i la sessió editorial quan tria vídeos per a les notícies.
//   3. Aplica incoming/videos-assignats.json: la sessió editorial hi pot lligar
//      un vídeo que ha arribat TARD a una notícia que ja es va publicar (les
//      peces de 3Cat, les gravacions de congressos i els vídeos explicatius
//      solen arribar hores o dies després de la notícia escrita).
//   4. Lliga també els vídeos que ja porta una notícia publicada (camp `video`
//      del lot), perquè la secció hi posi l'enllaç a la notícia.
//   5. Baixa la miniatura de cada vídeo a public/assets/videos/<id>.jpg, perquè
//      la secció no demani res a servidors de Google abans que el lector faci
//      clic (avís legal: el web no envia l'adreça IP dels lectors a tercers).
//
// Només reescriu videos.json si la llista ha canviat (no hi ha commits buits).
// MAI no atura res: si un canal no respon, se'n conserven els vídeos que ja hi
// havia i acaba amb codi 0.
//
// Ús:
//   node automation/scripts/recull-videos.mjs [--canals automation/video-channels.json]
//     [--sortida public/data/videos.json] [--miniatures public/assets/videos]
//     [--assignacions incoming/videos-assignats.json] [--public-dir public]
//     [--fixtures <dir amb <channelId>.xml>] [--sense-miniatures] [--dry-run]
//   node automation/scripts/recull-videos.mjs --candidats [--dies 4]
//     → llista per a la sessió editorial (no baixa res; llegeix videos.json).

import { readFile, writeFile, mkdir, readdir, unlink, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DIES_FINESTRA = 21;
export const DIES_ENLLACATS = 365;
export const MAX_SOLTS = 200;
export const MAX_ENLLACATS = 400;
const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const CANAL_RE = /^UC[A-Za-z0-9_-]{22}$/;
const GRUPS = new Set(['catala', 'empreses', 'ciencia']);
const DIA = 86400000;

// --- Detecció de vídeos sobre IA ------------------------------------------

// Sigles: amb majúscules exactes, perquè «ai» o «ia» dins d'una paraula no comptin.
const IA_SIGLES = /(^|[^\p{L}\p{N}])(IA|AI|IAG|LLMs?|GPT(-\d+(\.\d+)?)?|AGI)(?=$|[^\p{L}\p{N}])/u;
const IA_TERMES = new RegExp([
  'intel[·.\\-‧•]?lig[eè]ncia artificial', 'inteligencia artificial', 'intelligence artificielle',
  'artificial intelligence', 'machine learning', 'aprenentatge autom[àa]tic', 'aprendizaje autom[áa]tico',
  'deep learning', 'xarxes? neuronals?', 'redes? neuronales?', 'neural networks?',
  'models? de llenguatge', 'modelos? de lenguaje', 'language models?',
  'chatgpt', 'openai', 'gemini', 'copilot', 'claude', 'anthropic', 'deepmind', 'llama',
  'chatbots?', 'xatbots?', 'ia generativa', 'generative ai', 'agents? d\'ia', 'ai agents?'
].join('|'), 'iu');

export function parlaDIA(text) {
  const t = String(text || '');
  return IA_SIGLES.test(t) || IA_TERMES.test(t);
}

// --- Llengua del vídeo (per als subtítols) ---------------------------------

const MARQUES = {
  ca: new Set(['amb', 'dels', 'als', 'aquest', 'aquesta', 'aquests', 'perquè', 'també', 'però', 'són', 'és', 'els', 'què', 'més', 'nou', 'nova', 'com', 'per', 'i', 'cap', 'fins', 'ara', 'avui']),
  es: new Set(['con', 'del', 'los', 'las', 'el', 'y', 'por', 'qué', 'más', 'nuevo', 'nueva', 'también', 'pero', 'son', 'es', 'para', 'cómo', 'hoy', 'ahora', 'hasta']),
  en: new Set(['the', 'and', 'with', 'of', 'for', 'how', 'what', 'new', 'is', 'are', 'to', 'your', 'our', 'we', 'in', 'on', 'from', 'this', 'meet', 'introducing'])
};

export function detectaIdioma(text, perDefecte = 'en') {
  const t = String(text || '').toLowerCase();
  const paraules = t.match(/[\p{L}·']+/gu) || [];
  const punts = { ca: 0, es: 0, en: 0 };
  for (const p of paraules) {
    for (const llengua of Object.keys(MARQUES)) if (MARQUES[llengua].has(p)) punts[llengua] += 1;
    if (/^[ld]'/.test(p) || p.includes('l·l')) punts.ca += 1;
  }
  if (/[ñ¿¡]/.test(t)) punts.es += 2;
  const ordre = Object.entries(punts).sort((a, b) => b[1] - a[1]);
  if (ordre[0][1] >= 2 && ordre[0][1] > ordre[1][1]) return ordre[0][0];
  return /^[a-z]{2}$/.test(perDefecte) ? perDefecte : 'en';
}

// --- RSS de YouTube ----------------------------------------------------------

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, ent) => {
      const e = ent.toLowerCase();
      if (e === 'amp') return '&';
      if (e === 'lt') return '<';
      if (e === 'gt') return '>';
      if (e === 'quot') return '"';
      if (e === 'apos') return "'";
      const code = e.startsWith('#x') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    });
}

function etiqueta(bloc, nom) {
  const re = new RegExp(`<${nom}(?:\\s[^>]*)?>([\\s\\S]*?)</${nom}>`);
  const m = String(bloc || '').match(re);
  return m ? decodeXml(m[1]).replace(/\s+/g, ' ').trim() : '';
}

export function parseFeed(xml) {
  const text = String(xml || '');
  const capcalera = text.split(/<entry[\s>]/)[0];
  const feed = { canal: etiqueta(capcalera, 'title'), canalId: etiqueta(capcalera, 'yt:channelId'), entrades: [] };
  for (const m of text.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g)) {
    const bloc = m[1];
    const id = etiqueta(bloc, 'yt:videoId');
    if (!ID_RE.test(id)) continue;
    const enllac = (bloc.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    feed.entrades.push({
      id,
      titol: etiqueta(bloc, 'title'),
      publicat: etiqueta(bloc, 'published'),
      descripcio: etiqueta(bloc, 'media:description'),
      shorts: /\/shorts\//.test(enllac)
    });
  }
  return feed;
}

export function seleccionaEntrades(feed, canal, { ara = new Date(), dies = DIES_FINESTRA, exclou = new Set() } = {}) {
  const limit = ara.getTime() - dies * DIA;
  const sostre = ara.getTime() + 3600000;
  const triats = [];
  for (const e of feed?.entrades || []) {
    if (e.shorts || exclou.has(e.id)) continue;
    const t = Date.parse(e.publicat);
    if (!Number.isFinite(t) || t < limit || t > sostre) continue;
    const inici = (e.descripcio || '').slice(0, 400);
    if (canal.filtre && !parlaDIA(`${e.titol}\n${inici}`)) continue;
    triats.push({
      id: e.id,
      titol: e.titol.slice(0, 200),
      canal: canal.nom,
      canalId: canal.id,
      grup: canal.grup,
      idioma: detectaIdioma(`${e.titol} ${inici.slice(0, 200)}`, canal.idioma),
      publicat: new Date(t).toISOString(),
      // Només per a la sessió editorial (per triar i resumir): la secció no la mostra.
      ...(inici ? { descripcio: inici.slice(0, 300) } : {})
    });
  }
  return triats;
}

// --- Fusió amb el que ja hi havia -------------------------------------------

function videoValid(v) {
  return v && typeof v === 'object' && ID_RE.test(v.id || '') && Number.isFinite(Date.parse(v.publicat || ''));
}

export function fusiona(existents, nous, { ara = new Date(), dies = DIES_FINESTRA, exclou = new Set() } = {}) {
  const limitSolts = ara.getTime() - dies * DIA;
  const limitEnllacats = ara.getTime() - DIES_ENLLACATS * DIA;
  const perId = new Map();
  for (const v of Array.isArray(existents) ? existents : []) {
    if (!videoValid(v) || exclou.has(v.id)) continue;
    const t = Date.parse(v.publicat);
    if (t < (v.noticia ? limitEnllacats : limitSolts)) continue;
    perId.set(v.id, { ...v });
  }
  for (const v of nous) {
    if (!videoValid(v) || exclou.has(v.id)) continue;
    const anterior = perId.get(v.id);
    if (!anterior) { perId.set(v.id, { ...v }); continue; }
    // El RSS mana sobre el títol (el canal el pot haver retocat); el que ha
    // decidit la sessió editorial (notícia, resum, llengua) es conserva.
    perId.set(v.id, {
      ...v,
      ...(anterior.noticia ? { idioma: anterior.idioma } : {}),
      ...pick(anterior, ['noticia', 'noticiaTitol', 'resum', 'miniatura'])
    });
  }
  const tots = [...perId.values()].sort(ordre);
  const solts = tots.filter(v => !v.noticia).slice(0, MAX_SOLTS);
  const enllacats = tots.filter(v => v.noticia).slice(0, MAX_ENLLACATS);
  return [...solts, ...enllacats].sort(ordre);
}

// Més nou primer; a igual data, per identificador (un ordre estable evita
// reescriure videos.json —i fer un commit— sense cap canvi real).
function ordre(a, b) {
  return (Date.parse(b.publicat) - Date.parse(a.publicat)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function pick(obj, claus) {
  const out = {};
  for (const k of claus) if (obj[k] !== undefined && obj[k] !== '') out[k] = obj[k];
  return out;
}

// --- Lligams vídeo ↔ notícia ------------------------------------------------

export function youtubeId(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (ID_RE.test(text)) return text;
  let url;
  try { url = new URL(text); } catch { return ''; }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/')[1] || '';
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v') || '';
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
    if (!id && m) id = m[1];
  }
  return ID_RE.test(id) ? id : '';
}

function lliga(video, slug, titol, resum, idioma) {
  video.noticia = slug;
  if (titol) video.noticiaTitol = String(titol).slice(0, 220);
  if (resum) video.resum = String(resum).replace(/\s+/g, ' ').trim().slice(0, 600);
  if (/^[a-z]{2}$/.test(idioma || '')) video.idioma = idioma;
}

// Una notícia té com a molt un vídeo: si un altre ja la tenia, se li treu.
function deslligaAltres(videos, slug, idQueEsQueda) {
  for (const v of videos) {
    if (v.noticia === slug && v.id !== idQueEsQueda) { delete v.noticia; delete v.noticiaTitol; delete v.resum; }
  }
}

/**
 * noticies: Map slug → { title, video? } (les notícies publicades).
 * Retorna { aplicades, rebutjades } i modifica `videos` al seu lloc.
 */
export function aplicaAssignacions(videos, assignacions, noticies) {
  const perId = new Map(videos.map(v => [v.id, v]));
  const aplicades = [];
  const rebutjades = [];
  for (const a of Array.isArray(assignacions) ? assignacions : []) {
    if (!a || typeof a !== 'object') continue;
    const id = youtubeId(String(a.video ?? a.id ?? a.url ?? ''));
    const slug = String(a.slug || '').trim();
    if (!id || !perId.has(id)) { rebutjades.push(`${id || a.video || '?'} → no és a la llista de vídeos recollits`); continue; }
    if (!noticies.has(slug)) { rebutjades.push(`${id} → «${slug}» no és cap notícia publicada`); continue; }
    const v = perId.get(id);
    if (v.noticia && v.noticia !== slug) { rebutjades.push(`${id} → ja està lligat a «${v.noticia}»`); continue; }
    if (noticies.get(slug).video && noticies.get(slug).video !== id) { rebutjades.push(`${id} → «${slug}» ja porta un altre vídeo`); continue; }
    deslligaAltres(videos, slug, id);
    lliga(v, slug, noticies.get(slug).title, a.resum, String(a.idioma || '').toLowerCase());
    aplicades.push(`${id} → ${slug}`);
  }
  return { aplicades, rebutjades };
}

/** Les notícies que ja porten `video` (camí del lot) queden lligades a la secció. */
export function lligaVideosDeNoticies(videos, noticies) {
  const perId = new Map(videos.map(v => [v.id, v]));
  let lligats = 0;
  for (const [slug, n] of noticies) {
    const v = n.video ? perId.get(n.video) : null;
    if (!v || v.noticia) continue;
    deslligaAltres(videos, slug, v.id);
    lliga(v, slug, n.title, n.resum, n.idioma);
    lligats += 1;
  }
  return lligats;
}

async function llegeixJson(ruta, perDefecte) {
  try { return JSON.parse(await readFile(ruta, 'utf8')); } catch { return perDefecte; }
}

export async function carregaNoticies(publicDir) {
  const noticies = new Map();
  const afegeix = item => {
    if (!item || typeof item !== 'object' || !item.slug) return;
    const anterior = noticies.get(item.slug) || {};
    const v = item.video && typeof item.video === 'object' ? item.video : null;
    noticies.set(item.slug, {
      title: item.title || anterior.title || '',
      video: (v && ID_RE.test(v.id || '') && v.verificat) ? v.id : anterior.video,
      resum: v?.resum || anterior.resum,
      idioma: v?.idioma || anterior.idioma
    });
  };
  const arxiu = await llegeixJson(join(publicDir, 'data', 'archive.json'), []);
  if (Array.isArray(arxiu)) arxiu.forEach(afegeix);
  const edicions = await llegeixJson(join(publicDir, 'data', 'arxiu.json'), {});
  for (const ed of Array.isArray(edicions?.editions) ? edicions.editions.slice(0, 30) : []) {
    (ed.items || []).forEach(afegeix);
  }
  const avui = await llegeixJson(join(publicDir, 'data', 'articles.json'), {});
  (Array.isArray(avui?.items) ? avui.items : []).forEach(afegeix);
  return noticies;
}

// --- Xarxa -------------------------------------------------------------------

async function baixa(url, { timeout = 15000, binari = false } = {}) {
  let darrer = '';
  for (let intent = 0; intent < 2; intent += 1) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { 'user-agent': 'inteligencia-artificial.cat (recollida de vídeos)' } });
      if (r.ok) return binari ? Buffer.from(await r.arrayBuffer()) : await r.text();
      darrer = `HTTP ${r.status}`;
      if (r.status === 404) break;
    } catch (error) {
      darrer = error?.name === 'TimeoutError' ? 'temps esgotat' : String(error?.message || error);
    }
  }
  throw new Error(darrer || 'error desconegut');
}

async function existeix(ruta) {
  try { await access(ruta); return true; } catch { return false; }
}

async function miniatures(videos, dir, { limit = 60 } = {}) {
  await mkdir(dir, { recursive: true });
  let baixades = 0;
  for (const v of videos) {
    const fitxer = join(dir, `${v.id}.jpg`);
    if (await existeix(fitxer)) { v.miniatura = `/assets/videos/${v.id}.jpg`; continue; }
    delete v.miniatura;
    if (baixades >= limit) continue;
    try {
      const bytes = await baixa(`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, { timeout: 10000, binari: true });
      if (bytes.length < 500 || bytes.length > 300000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('no és un JPEG');
      await writeFile(fitxer, bytes);
      v.miniatura = `/assets/videos/${v.id}.jpg`;
      baixades += 1;
    } catch (error) {
      console.warn(`::warning::Miniatura de ${v.id} no baixada (${error.message}); la secció hi posarà un fons llis.`);
    }
  }
  // Fora les miniatures de vídeos que ja no hi són (només fitxers amb nom d'identificador).
  const vius = new Set(videos.map(v => `${v.id}.jpg`));
  for (const nom of await readdir(dir).catch(() => [])) {
    if (/^[A-Za-z0-9_-]{11}\.jpg$/.test(nom) && !vius.has(nom)) await unlink(join(dir, nom)).catch(() => {});
  }
  return baixades;
}

// --- Configuració ------------------------------------------------------------

export function validaCanals(config) {
  const canals = [];
  const errors = [];
  for (const c of Array.isArray(config?.canals) ? config.canals : []) {
    if (!c || !CANAL_RE.test(c.id || '') || !c.nom || !GRUPS.has(c.grup)) { errors.push(`canal invàlid: ${JSON.stringify(c)}`); continue; }
    canals.push({ nom: String(c.nom), id: c.id, grup: c.grup, idioma: /^[a-z]{2}$/.test(c.idioma || '') ? c.idioma : 'en', filtre: c.filtre !== false });
  }
  const exclou = new Set((Array.isArray(config?.exclou) ? config.exclou : []).filter(id => ID_RE.test(id)));
  return { canals, exclou, errors };
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const clau = a.slice(2);
    if (['dry-run', 'sense-miniatures', 'candidats'].includes(clau)) out[clau] = true;
    else { out[clau] = argv[i + 1]; i += 1; }
  }
  return out;
}

const CAMPS = ['id', 'titol', 'canal', 'canalId', 'grup', 'idioma', 'publicat', 'descripcio', 'miniatura', 'noticia', 'noticiaTitol', 'resum'];

// Sempre els mateixos camps i en el mateix ordre: el fitxer només canvia quan
// canvia el contingut.
export function canonic(v) {
  const out = {};
  for (const k of CAMPS) if (v[k] !== undefined && v[k] !== '') out[k] = v[k];
  return out;
}

function mateixaLlista(a, b) {
  return JSON.stringify(a.map(canonic)) === JSON.stringify(b.map(canonic));
}

function dataCurta(iso) {
  return String(iso || '').slice(0, 10).split('-').reverse().join('.');
}

export async function principal(argv = process.argv.slice(2), ara = new Date()) {
  const o = args(argv);
  const arrel = process.cwd();
  const rutaSortida = resolve(arrel, o.sortida || 'public/data/videos.json');
  const anterior = await llegeixJson(rutaSortida, {});
  const existents = Array.isArray(anterior?.videos) ? anterior.videos : [];

  if (o.candidats) {
    const dies = Number(o.dies) > 0 ? Number(o.dies) : 4;
    const limit = ara.getTime() - dies * DIA;
    const llista = existents.filter(v => Date.parse(v.publicat) >= limit);
    console.log(`Vídeos recollits dels últims ${dies} dies: ${llista.length} (actualitzat ${anterior.actualitzat || '?'})`);
    for (const v of llista) {
      console.log(`${dataCurta(v.publicat)} | ${v.id} | ${v.idioma} | ${v.canal} | ${v.titol}${v.noticia ? `  [ja lligat a ${v.noticia}]` : ''}`);
    }
    return 0;
  }

  const config = await llegeixJson(resolve(arrel, o.canals || 'automation/video-channels.json'), null);
  const { canals, exclou, errors } = validaCanals(config);
  for (const e of errors) console.warn(`::warning::${e}`);
  if (!canals.length) { console.warn('::warning::Cap canal vàlid: no es toca res.'); return 0; }

  const nous = [];
  let ok = 0;
  for (const canal of canals) {
    try {
      const xml = o.fixtures
        ? await readFile(join(resolve(arrel, o.fixtures), `${canal.id}.xml`), 'utf8')
        : await baixa(`https://www.youtube.com/feeds/videos.xml?channel_id=${canal.id}`);
      const feed = parseFeed(xml);
      if (feed.canalId && feed.canalId !== canal.id) throw new Error(`el RSS és d'un altre canal (${feed.canalId})`);
      const triats = seleccionaEntrades(feed, canal, { ara, exclou });
      nous.push(...triats);
      ok += 1;
      console.log(`${canal.nom} («${feed.canal}»): ${feed.entrades.length} al RSS, ${triats.length} triats`);
    } catch (error) {
      console.warn(`::warning::${canal.nom}: RSS no llegit (${error.message}); se'n conserven els vídeos que ja hi havia.`);
    }
  }

  const videos = fusiona(existents, nous, { ara, exclou });
  const noticies = await carregaNoticies(resolve(arrel, o['public-dir'] || 'public'));
  const lligats = lligaVideosDeNoticies(videos, noticies);
  const assignacions = await llegeixJson(resolve(arrel, o.assignacions || 'incoming/videos-assignats.json'), []);
  const { aplicades, rebutjades } = aplicaAssignacions(videos, assignacions, noticies);
  for (const a of aplicades) console.log(`Lligat (assignació de la sessió editorial): ${a}`);
  for (const r of rebutjades) console.warn(`::warning::Assignació rebutjada: ${r}`);
  if (lligats) console.log(`Lligats ${lligats} vídeos que ja portava una notícia publicada.`);

  if (!o['sense-miniatures'] && !o['dry-run']) {
    const n = await miniatures(videos, resolve(arrel, o.miniatures || 'public/assets/videos'));
    if (n) console.log(`Miniatures noves: ${n}`);
  } else {
    // Sense baixar res, es conserven les rutes que ja hi havia.
    for (const v of videos) {
      const prev = existents.find(e => e.id === v.id);
      if (prev?.miniatura) v.miniatura = prev.miniatura; else delete v.miniatura;
    }
  }

  console.log(`Canals llegits: ${ok}/${canals.length}. Vídeos a la llista: ${videos.length} (${videos.filter(v => v.noticia).length} lligats a una notícia).`);
  if (mateixaLlista(existents, videos)) { console.log('Cap canvi: no es reescriu videos.json.'); return 0; }
  if (o['dry-run']) { console.log('--dry-run: no s\'escriu res.'); return 0; }
  const sortida = {
    nota: 'GENERAT per automation/scripts/recull-videos.mjs (workflow videos.yml). No l\'editis a mà: per treure un vídeo, posa\'n l\'identificador a "exclou" d\'automation/video-channels.json.',
    actualitzat: ara.toISOString(),
    canals: canals.length,
    videos: videos.map(canonic)
  };
  await mkdir(dirname(rutaSortida), { recursive: true });
  await writeFile(rutaSortida, `${JSON.stringify(sortida, null, 1)}\n`);
  console.log(`Desat ${rutaSortida}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  principal().then(code => process.exit(code)).catch(error => {
    console.warn(`::warning::Recollida de vídeos interrompuda: ${error?.stack || error}`);
    process.exit(0);
  });
}
