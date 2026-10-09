#!/usr/bin/env node
// Ressò de premsa (10.10.2026).
//
// PER QUÈ EXISTEIX. En Rafael va comparar el web amb barcelonadot.org i hi va
// trobar a faltar que «es fan ressò d'articles de la premsa diària». Fins ara el
// web només mostrava les notícies que escriu la redacció; el que publicaven
// l'Ara, VilaWeb, La Vanguardia o El País sobre IA no surt enlloc.
//
// QUÈ FA. Corre a GitHub Actions (premsa.yml), perquè el sandbox de les sessions
// no arriba als diaris (403 del proxy), i llegeix el RSS PÚBLIC dels diaris de
// la llista tancada automation/press-sources.json (sense cap clau):
//
//   1. Agafa les peces dels últims 7 dies que parlen d'IA (al titular, o també
//      a l'inici de l'entradeta als feeds de tecnologia: camp "mira").
//   2. Les fusiona amb public/data/premsa.json, que és el que llegeixen la
//      banda de portada (public/premsa.js) i la pàgina /premsa (premsa.php).
//      Una peça conserva la data de la PRIMERA vegada que es va veure: alguns
//      feeds (Regió7) donen l'hora local marcada com a UTC i, sense això, la
//      peça quedaria «al futur» i el fitxer canviaria a cada passada.
//   3. Aplica incoming/premsa-destacats.json: la sessió editorial hi pot marcar
//      fins a 3 peces per lot com a destacades, amb un comentari propi (per què
//      val la pena llegir-la). Només s'accepten peces que ja són a la llista.
//   4. Si una notícia nostra cita la mateixa adreça com a font, la lliga
//      (camp `noticia`), perquè la pàgina hi posi «La notícia a IA.cat».
//
// DRETS. Mai no es desa ni es mostra el text de l'article ni la imatge: només
// el titular, el mitjà, la data i l'enllaç (com qualsevol recull de premsa).
//
// Només reescriu premsa.json si la llista ha canviat (cap commit buit). MAI no
// atura res: si un diari no respon, se'n conserven les peces que ja hi havia i
// acaba amb codi 0.
//
// Ús:
//   node automation/scripts/recull-premsa.mjs [--fonts automation/press-sources.json]
//     [--sortida public/data/premsa.json] [--destacats incoming/premsa-destacats.json]
//     [--public-dir public] [--fixtures <dir amb <id>.xml>] [--dry-run]
//   node automation/scripts/recull-premsa.mjs --candidats [--hores 30]
//     → llista per a la sessió editorial (no baixa res; llegeix premsa.json).

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DIES_FINESTRA = 7;
export const MAX_PECES = 250;
export const MAX_PER_FONT_I_PASSADA = 15;
export const MAX_DESTACATS = 3;
const DIA = 86400000;
const HORA = 3600000;
const AMBITS = new Set(['catala', 'estatal']);
const MIRA = new Set(['titol', 'titol+entradeta']);
const ID_FONT = /^[a-z0-9-]{2,30}$/;

// --- Detecció de peces sobre IA ---------------------------------------------
//
// Més estricta que la dels vídeos (recull-videos.mjs): als diaris en castellà
// «llama» és un verb i «Claude» o «Gemini» poden ser noms de persona o signes
// del zodíac. Per això els noms de producte van amb majúscula exacta.

const SIGLES = /(^|[^\p{L}\p{N}])(IA|AI|IAG|IAs|LLMs?|AGI)(?=$|[^\p{L}\p{N}])/u;
const TERMES = new RegExp([
  'intel[·.\\-‧•]?lig[eè]nci(?:a|es) artificials?', 'inteligencias? artificial(es)?', 'artificial intelligence',
  'aprenentatge autom[àa]tic', 'aprendizaje autom[áa]tico', 'machine learning', 'deep learning',
  'xarxes? neuronals?', 'redes? neuronales?', 'models? de llenguatge', 'modelos? de lenguaje',
  'xatbots?', 'chatbots?', 'deepfakes?', 'ultrafalsos?', 'algoritmes? generatius?'
].join('|'), 'iu');
const MARQUES = /(^|[^\p{L}\p{N}])(ChatGPT|OpenAI|Anthropic|DeepMind|Gemini|Copilot|Claude AI|Mistral AI|Grok|Perplexity|Midjourney|Sora|Llama \d|GPT-?\d[\w.-]*)(?=$|[^\p{L}\p{N}])/u;

export function parlaDIA(text) {
  const t = String(text || '');
  return SIGLES.test(t) || TERMES.test(t) || MARQUES.test(t);
}

// --- RSS 2.0 i Atom ---------------------------------------------------------

const ENTITATS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', middot: '·', hellip: '…', ndash: '–', mdash: '—' };

function decodeEntitats(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ent) => {
    const e = ent.toLowerCase();
    if (ENTITATS[e] !== undefined) return ENTITATS[e];
    if (e.startsWith('#')) {
      const code = e.startsWith('#x') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return match;
  });
}

export function netejaText(value) {
  let t = String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Dues passades: Nació Digital dona «l&amp;apos;» (entitat codificada dues vegades).
  t = decodeEntitats(decodeEntitats(t));
  return t.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function etiqueta(bloc, ...noms) {
  for (const nom of noms) {
    const re = new RegExp(`<${nom}(?:\\s[^>]*)?>([\\s\\S]*?)</${nom}>`, 'i');
    const m = String(bloc || '').match(re);
    if (m) return netejaText(m[1]);
  }
  return '';
}

export function parseFeed(xml) {
  const text = String(xml || '');
  const entrades = [];
  const blocs = [...text.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m => ({ bloc: m[1], atom: false }));
  if (!blocs.length) {
    for (const m of text.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)) blocs.push({ bloc: m[1], atom: true });
  }
  for (const { bloc, atom } of blocs) {
    let url = '';
    if (atom) {
      url = (bloc.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || bloc.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '';
    } else {
      url = etiqueta(bloc, 'link');
      if (!/^https?:\/\//i.test(url)) {
        const guid = etiqueta(bloc, 'guid');
        if (/^https?:\/\//i.test(guid)) url = guid;
      }
    }
    entrades.push({
      titol: etiqueta(bloc, 'title'),
      url: netejaText(url),
      data: etiqueta(bloc, 'pubDate', 'dc:date', 'published', 'updated'),
      entradeta: etiqueta(bloc, 'description', 'summary', 'subtitle').slice(0, 400)
    });
  }
  return entrades;
}

// --- Adreces ------------------------------------------------------------------

// Adreça canònica: https, sense paràmetres de seguiment, sense fragment ni barra final.
export function urlCanonica(value) {
  let u;
  try { u = new URL(String(value || '').trim()); } catch { return ''; }
  if (!/^https?:$/.test(u.protocol)) return '';
  u.protocol = 'https:';
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|ref$|rss|int$|_ga|mc_|ns_|ocid|cmpid)/i.test(k)) u.searchParams.delete(k);
  }
  u.hostname = u.hostname.toLowerCase();
  let s = u.toString();
  if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
  return s;
}

export function idPeca(url) {
  return createHash('sha1').update(urlCanonica(url)).digest('hex').slice(0, 12);
}

function clauTitol(font, titol) {
  return `${font}|${String(titol || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()}`;
}

// --- Selecció ----------------------------------------------------------------

export function seleccionaEntrades(entrades, font, { ara = new Date(), dies = DIES_FINESTRA, exclou = new Set() } = {}) {
  const limit = ara.getTime() - dies * DIA;
  const triats = [];
  for (const e of entrades || []) {
    const url = urlCanonica(e.url);
    if (!url || !e.titol || exclou.has(url)) continue;
    let t = Date.parse(e.data);
    if (!Number.isFinite(t)) continue;
    if (t > ara.getTime() + HORA) t = ara.getTime();
    if (t < limit) continue;
    const mira = font.mira === 'titol+entradeta' ? `${e.titol}\n${(e.entradeta || '').slice(0, 300)}` : e.titol;
    if (!parlaDIA(mira)) continue;
    triats.push({
      id: idPeca(url),
      mitja: font.nom,
      font: font.id,
      llengua: font.llengua,
      ambit: font.ambit,
      titol: e.titol.slice(0, 240),
      url,
      publicat: new Date(t).toISOString()
    });
    if (triats.length >= MAX_PER_FONT_I_PASSADA) break;
  }
  return triats;
}

function pecaValida(p) {
  return p && typeof p === 'object' && /^[0-9a-f]{12}$/.test(p.id || '') && urlCanonica(p.url) && p.titol && Number.isFinite(Date.parse(p.publicat || ''));
}

export function fusiona(existents, nous, { ara = new Date(), dies = DIES_FINESTRA, exclou = new Set() } = {}) {
  const limit = ara.getTime() - dies * DIA;
  const perId = new Map();
  for (const p of Array.isArray(existents) ? existents : []) {
    if (!pecaValida(p) || exclou.has(urlCanonica(p.url))) continue;
    if (Date.parse(p.publicat) < limit) continue;
    perId.set(p.id, { ...p });
  }
  for (const p of nous) {
    if (!pecaValida(p) || exclou.has(p.url)) continue;
    const anterior = perId.get(p.id);
    if (!anterior) { perId.set(p.id, { ...p }); continue; }
    // El titular del RSS mana (el diari el pot haver retocat); la data és la de
    // la primera vegada que es va veure, i el que ha decidit la sessió es conserva.
    perId.set(p.id, {
      ...p,
      publicat: Date.parse(anterior.publicat) < Date.parse(p.publicat) ? anterior.publicat : p.publicat,
      ...pick(anterior, ['destacat', 'comentari', 'noticia', 'noticiaTitol'])
    });
  }
  // La mateixa peça pot sortir a dos feeds del mateix diari (portada i
  // tecnologia) amb adreces lleugerament diferents: es queda la primera vista.
  const vistos = new Set();
  const tots = [...perId.values()].sort(ordreAntic).filter(p => {
    const clau = clauTitol(p.mitja, p.titol);
    if (vistos.has(clau)) return false;
    vistos.add(clau);
    return true;
  });
  return tots.sort(ordre).slice(0, MAX_PECES);
}

function ordre(a, b) {
  return (Date.parse(b.publicat) - Date.parse(a.publicat)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function ordreAntic(a, b) {
  return -ordre(a, b);
}

function pick(obj, claus) {
  const out = {};
  for (const k of claus) if (obj[k] !== undefined && obj[k] !== '') out[k] = obj[k];
  return out;
}

// --- Destacats de la sessió editorial -----------------------------------------

export function aplicaDestacats(peces, destacats) {
  const perUrl = new Map(peces.map(p => [p.url, p]));
  const aplicats = [];
  const rebutjats = [];
  for (const d of (Array.isArray(destacats) ? destacats : []).slice(0, 20)) {
    if (aplicats.length >= MAX_DESTACATS) { rebutjats.push('massa destacats en un lot (màxim 3)'); break; }
    const url = urlCanonica(d?.url);
    const comentari = String(d?.comentari || '').replace(/\s+/g, ' ').trim();
    const p = url ? perUrl.get(url) : null;
    if (!p) { rebutjats.push(`${d?.url || JSON.stringify(d)}: no és a la llista recollida`); continue; }
    if (comentari.length < 30) { rebutjats.push(`${url}: falta el comentari (mínim 30 caràcters)`); continue; }
    p.destacat = true;
    p.comentari = comentari.slice(0, 360);
    aplicats.push(url);
  }
  return { aplicats, rebutjats };
}

// --- Lligam amb les notícies del web --------------------------------------------

async function llegeixJson(ruta, perDefecte) {
  try { return JSON.parse(await readFile(ruta, 'utf8')); } catch { return perDefecte; }
}

export async function carregaFonts(publicDir) {
  const perUrl = new Map();
  const afegeix = item => {
    if (!item || typeof item !== 'object' || !item.slug || !item.sourceUrl) return;
    const url = urlCanonica(item.sourceUrl);
    if (url && !perUrl.has(url)) perUrl.set(url, { slug: item.slug, title: item.title || '' });
  };
  const avui = await llegeixJson(join(publicDir, 'data', 'articles.json'), {});
  (Array.isArray(avui?.items) ? avui.items : []).forEach(afegeix);
  const arxiu = await llegeixJson(join(publicDir, 'data', 'archive.json'), []);
  if (Array.isArray(arxiu)) arxiu.slice(0, 200).forEach(afegeix);
  return perUrl;
}

export function lligaNoticies(peces, fontsWeb) {
  let n = 0;
  for (const p of peces) {
    const nostra = fontsWeb.get(p.url);
    if (!nostra || p.noticia === nostra.slug) continue;
    p.noticia = String(nostra.slug).replace(/[^a-z0-9-]/g, '');
    if (nostra.title) p.noticiaTitol = String(nostra.title).slice(0, 220);
    n += 1;
  }
  return n;
}

// --- Configuració -------------------------------------------------------------

export function validaFonts(config) {
  const fonts = [];
  const errors = [];
  for (const f of Array.isArray(config?.fonts) ? config.fonts : []) {
    let ok = f && ID_FONT.test(f.id || '') && f.nom && AMBITS.has(f.ambit) && /^https:\/\//.test(f.url || '');
    if (ok && fonts.some(x => x.id === f.id)) ok = false;
    if (!ok) { errors.push(`font invàlida: ${JSON.stringify(f)}`); continue; }
    fonts.push({ id: f.id, nom: String(f.nom), url: f.url, llengua: /^[a-z]{2}$/.test(f.llengua || '') ? f.llengua : 'ca', ambit: f.ambit, mira: MIRA.has(f.mira) ? f.mira : 'titol' });
  }
  const exclou = new Set((Array.isArray(config?.exclou) ? config.exclou : []).map(urlCanonica).filter(Boolean));
  return { fonts, exclou, errors };
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const clau = a.slice(2);
    if (['dry-run', 'candidats'].includes(clau)) out[clau] = true;
    else { out[clau] = argv[i + 1]; i += 1; }
  }
  return out;
}

const CAMPS = ['id', 'mitja', 'font', 'llengua', 'ambit', 'titol', 'url', 'publicat', 'destacat', 'comentari', 'noticia', 'noticiaTitol'];

export function canonic(p) {
  const out = {};
  for (const k of CAMPS) if (p[k] !== undefined && p[k] !== '' && p[k] !== false) out[k] = p[k];
  return out;
}

// Primer ens identifiquem; si el diari respon 403/406 (els de Prensa Ibérica —El
// Periódico, Regió7, Diari de Girona— van tornar 406 a la primera passada del
// 10.10.2026, i al navegador el mateix RSS sí que surt), es torna a provar amb
// les capçaleres d'un navegador corrent.
const CAPCALERES = [
  { 'user-agent': 'Mozilla/5.0 (compatible; inteligencia-artificial.cat recull de premsa; +https://inteligencia-artificial.cat/premsa)', accept: 'application/rss+xml, application/xml, text/xml, */*' },
  { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36', accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'ca,es;q=0.8,en;q=0.5' }
];

async function baixa(url, { timeout = 15000 } = {}) {
  let darrer = '';
  for (let intent = 0; intent < 3; intent += 1) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(timeout),
        headers: CAPCALERES[Math.min(intent, CAPCALERES.length - 1)]
      });
      if (r.ok) return await r.text();
      darrer = `HTTP ${r.status}`;
      if (r.status === 404 || r.status === 410) break;
    } catch (error) {
      darrer = error?.name === 'TimeoutError' ? 'temps esgotat' : String(error?.message || error);
    }
  }
  throw new Error(darrer || 'error desconegut');
}

function hora(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ca', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
}

export async function principal(argv = process.argv.slice(2), ara = new Date()) {
  const o = args(argv);
  const arrel = process.cwd();
  const rutaSortida = resolve(arrel, o.sortida || 'public/data/premsa.json');
  const anterior = await llegeixJson(rutaSortida, {});
  const existents = Array.isArray(anterior?.articles) ? anterior.articles : [];

  if (o.candidats) {
    const hores = Number(o.hores) > 0 ? Number(o.hores) : 30;
    const limit = ara.getTime() - hores * HORA;
    const llista = existents.filter(p => Date.parse(p.publicat) >= limit);
    console.log(`Peces de premsa sobre IA de les últimes ${hores} hores: ${llista.length} (actualitzat ${anterior.actualitzat || '?'})`);
    for (const p of llista) {
      console.log(`${hora(p.publicat)} | ${p.mitja} | ${p.titol} | ${p.url}${p.destacat ? '  [ja destacada]' : ''}${p.noticia ? `  [font de ${p.noticia}]` : ''}`);
    }
    return 0;
  }

  const config = await llegeixJson(resolve(arrel, o.fonts || 'automation/press-sources.json'), null);
  const { fonts, exclou, errors } = validaFonts(config);
  for (const e of errors) console.warn(`::warning::${e}`);
  if (!fonts.length) { console.warn('::warning::Cap font vàlida: no es toca res.'); return 0; }

  const nous = [];
  let ok = 0;
  for (const font of fonts) {
    try {
      const xml = o.fixtures
        ? await readFile(join(resolve(arrel, o.fixtures), `${font.id}.xml`), 'utf8')
        : await baixa(font.url);
      const entrades = parseFeed(xml);
      if (!entrades.length) throw new Error('el feed no porta cap peça (ha canviat d\'adreça?)');
      const triats = seleccionaEntrades(entrades, font, { ara, exclou });
      nous.push(...triats);
      ok += 1;
      console.log(`${font.nom} (${font.id}): ${entrades.length} al RSS, ${triats.length} sobre IA`);
    } catch (error) {
      console.warn(`::warning::${font.nom} (${font.id}): RSS no llegit (${error.message}); se'n conserven les peces que ja hi havia.`);
    }
  }

  const peces = fusiona(existents, nous, { ara, exclou });
  const destacats = await llegeixJson(resolve(arrel, o.destacats || 'incoming/premsa-destacats.json'), []);
  const { aplicats, rebutjats } = aplicaDestacats(peces, destacats);
  for (const a of aplicats) console.log(`Destacada per la sessió editorial: ${a}`);
  for (const r of rebutjats) console.warn(`::warning::Destacat rebutjat: ${r}`);
  const lligades = lligaNoticies(peces, await carregaFonts(resolve(arrel, o['public-dir'] || 'public')));
  if (lligades) console.log(`Lligades ${lligades} peces a notícies del web que les citen com a font.`);

  console.log(`Diaris llegits: ${ok}/${fonts.length}. Peces a la llista: ${peces.length} (${peces.filter(p => p.destacat).length} destacades).`);
  const abans = JSON.stringify(existents.map(canonic));
  const despres = JSON.stringify(peces.map(canonic));
  if (abans === despres) { console.log('Cap canvi: no es reescriu premsa.json.'); return 0; }
  if (o['dry-run']) { console.log('--dry-run: no s\'escriu res.'); return 0; }
  const sortida = {
    nota: 'GENERAT per automation/scripts/recull-premsa.mjs (workflow premsa.yml). No l\'editis a mà: per treure una peça, posa\'n l\'adreça a "exclou" d\'automation/press-sources.json; per destacar-ne una, incoming/premsa-destacats.json.',
    actualitzat: ara.toISOString(),
    fonts: fonts.length,
    articles: peces.map(canonic)
  };
  await mkdir(dirname(rutaSortida), { recursive: true });
  await writeFile(rutaSortida, `${JSON.stringify(sortida, null, 1)}\n`);
  console.log(`Desat ${rutaSortida}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  principal().then(code => process.exit(code)).catch(error => {
    console.warn(`::warning::Recollida de premsa interrompuda: ${error?.stack || error}`);
    process.exit(0);
  });
}
