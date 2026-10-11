#!/usr/bin/env node
// Cartells originals dels actes de l'agenda (11.10.2026).
//
// PER QUÈ EXISTEIX. La banda #cartell de la portada (public/cartell.js) pintava
// un cartell de disseny propi per a cada acte. En Rafael va demanar que hi surti
// el cartell ORIGINAL de l'acte, el que fa servir el mateix organitzador.
//
// QUÈ FA. Corre a GitHub Actions (cartells.yml), perquè el sandbox de les
// sessions no arriba a les webs dels actes (403 del proxy):
//
//   1. Agafa de public/data/agenda.json els actes GRANS (congrés, jornada, fira,
//      hackató, o qualsevol amb "destacat": true) que encara no s'han acabat i
//      que comencen d'aquí a DIES_HORITZO dies com a molt: són els únics que
//      poden sortir al cartell o a la llista «Propers actes d'IA».
//   2. Per a cadascun busca la imatge oficial:
//        - si l'acte porta "cartell_font" (adreça d'una imatge), aquesta;
//        - si no, la imatge que la web oficial ("url") declara per compartir-la
//          (og:image, og:image:secure_url, twitter:image o link rel=image_src).
//          És la que surt quan algú enllaça l'acte a les xarxes: l'organitzador
//          la publica precisament perquè es difongui.
//   3. La baixa, la comprova (format, mida mínima, proporció) i la desa al
//      NOSTRE servidor (public/assets/cartells/<clau>.jpg): el web no enllaça
//      mai recursos de tercers (regla 7 de la guia i avís legal).
//   4. Ho apunta a public/data/cartells.json, que llegeix cartell.js.
//
// No toca mai agenda.json (el manté la tasca setmanal). Camps que hi pot posar
// la sessió editorial:
//   "cartell": "/assets/..."  → imatge que ja tenim (té preferència sobre tot);
//   "cartell": false          → aquest acte NO porta cartell original (p. ex.
//                               si l'organitzador ho demana): se'n treu el fitxer;
//   "cartell_font": "https://…/cartell.jpg" → la imatge bona quan l'og:image de
//                               la web és un logo o una foto genèrica.
//
// Idempotent: una imatge ja desada no es torna a baixar, un error no es
// reintenta fins al cap de DIES_REINTENT dies, i cartells.json només es
// reescriu si ha canviat (cap commit buit). MAI no atura res: si una web no
// respon, aquell acte surt amb el cartell de disseny propi i el script acaba
// amb codi 0.
//
// Ús:
//   node automation/scripts/recull-cartells.mjs [--agenda public/data/agenda.json]
//     [--sortida public/data/cartells.json] [--public-dir public]
//     [--avui AAAA-MM-DD] [--fixtures <dir>] [--dry-run]
//   --fixtures: en comptes de baixar, llegeix <dir>/<clau>.html i <dir>/<clau>.img
//   (per als tests).

import { readFile, writeFile, mkdir, unlink, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DIES_HORITZO = 60;
export const DIES_REINTENT = 3;
export const DIES_CONSERVA = 2;          // després d'acabat, encara es conserva
export const MAX_PER_PASSADA = 30;
export const MIDA_MIN = 300;             // px, el costat curt
export const PROPORCIO_MIN = 0.5;        // alt/ample: més estret que A3 vertical no
export const PROPORCIO_MAX = 3.2;        // més allargat que una banda, tampoc
export const BYTES_MAX = 12 * 1024 * 1024;
export const COSTAT_MAX = 1200;          // px del fitxer que servim
export const DIR = 'assets/cartells';
export const GRANS = new Set(['congrés', 'jornada', 'fira', 'hackató']);
const DIA = 86400000;

const CAPCALERES = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  'accept-language': 'ca,es;q=0.8,en;q=0.5'
};

const valida = iso => /^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''));
const dataUtc = iso => { const [y, m, d] = String(iso).split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const diesEntre = (de, a) => Math.round((dataUtc(a) - dataUtc(de)) / DIA);
export const avuiBarcelona = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// La clau d'un acte: data d'inici + títol en forma de slug. La mateixa funció
// viu a public/cartell.js (clauActe): si en canvies una, canvia l'altra.
export function clauActe(acte) {
  const slug = String(acte?.titol || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60).replace(/-+$/g, '');
  return `${acte?.inici || ''}-${slug}`;
}

const fiDe = a => (valida(a.fi) && a.fi >= a.inici ? a.fi : a.inici);

export function candidats(actes, avui, dies = DIES_HORITZO) {
  return (Array.isArray(actes) ? actes : [])
    .filter(a => a && a.titol && valida(a.inici) && a.tipus !== 'convocatòria')
    .filter(a => GRANS.has(a.tipus) || a.destacat === true)
    .filter(a => fiDe(a) >= avui && diesEntre(avui, a.inici) <= dies)
    .filter(a => a.cartell !== false && !(typeof a.cartell === 'string' && a.cartell.startsWith('/assets/')))
    .filter(a => urlHttps(a.cartell_font) || urlHttps(a.url))
    .sort((a, b) => a.inici.localeCompare(b.inici));
}

export function urlHttps(u, base) {
  try {
    const url = new URL(String(u || '').trim().replace(/&amp;/g, '&'), base);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}

// La imatge que la web declara per compartir-se, en ordre de preferència.
export function extreuImatge(html, base) {
  const text = String(html || '');
  const metes = [...text.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const attr = (tag, nom) => {
    const m = tag.match(new RegExp(`\\b${nom}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
    return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
  };
  const ordre = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'];
  for (const clau of ordre) {
    for (const tag of metes) {
      const nom = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase();
      if (nom !== clau) continue;
      const u = urlHttps(attr(tag, 'content'), base);
      if (u) return u;
    }
  }
  const link = [...text.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).find(t => /\brel\s*=\s*["']?image_src/i.test(t));
  if (link) return urlHttps(attr(link, 'href'), base);
  return null;
}

// Format i mides llegits de la capçalera del fitxer (sense dependències).
export function mides(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const u16 = (i, le = false) => (le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1]);
  const u32 = i => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { format: 'png', amplada: u32(16), alcada: u32(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const llarg = u16(i + 2);
      if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) {
        return { format: 'jpeg', amplada: u16(i + 7), alcada: u16(i + 5) };
      }
      i += 2 + llarg;
    }
    return { format: 'jpeg', amplada: 0, alcada: 0 };
  }
  if (b.length > 30 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') {
    const tipus = String.fromCharCode(...b.slice(12, 16));
    if (tipus === 'VP8 ') return { format: 'webp', amplada: u16(26, true) & 0x3fff, alcada: u16(28, true) & 0x3fff };
    if (tipus === 'VP8L') {
      const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { format: 'webp', amplada: (v & 0x3fff) + 1, alcada: ((v >> 14) & 0x3fff) + 1 };
    }
    if (tipus === 'VP8X') return { format: 'webp', amplada: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), alcada: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  }
  return null;
}

export function acceptable(m) {
  if (!m) return 'no és una imatge JPEG, PNG ni WebP';
  if (!m.amplada || !m.alcada) return 'no se n\'han pogut llegir les mides';
  if (Math.min(m.amplada, m.alcada) < MIDA_MIN) return `massa petita (${m.amplada}×${m.alcada}), segurament un logo`;
  const p = m.alcada / m.amplada;
  if (p < 1 / PROPORCIO_MAX || p > 1 / PROPORCIO_MIN) return `proporció estranya (${m.amplada}×${m.alcada})`;
  return null;
}

async function baixa(url, accept) {
  let darrer = '';
  for (let intent = 0; intent < 2; intent += 1) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow', headers: { ...CAPCALERES, accept } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const llarg = Number(r.headers.get('content-length') || 0);
      if (llarg > BYTES_MAX) throw new Error(`massa gran (${llarg} bytes)`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.length > BYTES_MAX) throw new Error(`massa gran (${bytes.length} bytes)`);
      return { bytes, url: r.url || url };
    } catch (error) {
      darrer = error.message;
      if (intent === 0) await new Promise(res => setTimeout(res, 2000));
    }
  }
  throw new Error(darrer);
}

// Reescriu la imatge com a JPEG d'un màxim de COSTAT_MAX px amb sharp (s'instal·la
// al workflow). Sense sharp (proves locals), es desa tal com ve si és un JPEG.
async function normalitza(bytes, m) {
  try {
    const { default: sharp } = await import('sharp');
    const sortida = await sharp(Buffer.from(bytes), { failOn: 'error' })
      .rotate()
      .resize({ width: COSTAT_MAX, height: COSTAT_MAX, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 84, progressive: true, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { bytes: sortida.data, amplada: sortida.info.width, alcada: sortida.info.height };
  } catch (error) {
    if (m.format === 'jpeg' && bytes.length <= 1.5 * 1024 * 1024) return { bytes, amplada: m.amplada, alcada: m.alcada };
    throw new Error(`no s'ha pogut convertir a JPEG (${error.code === 'ERR_MODULE_NOT_FOUND' ? 'falta sharp' : error.message})`);
  }
}

// Una imatge gairebé d'un sol color (un fons buit, 11.10.2026: La Salle) no és
// cap cartell. Només es pot mirar amb sharp; sense, es dona per bona.
export async function gairebeBuida(bytes) {
  try {
    const { default: sharp } = await import('sharp');
    const { channels } = await sharp(Buffer.from(bytes)).stats();
    return channels.slice(0, 3).every(c => c.stdev < 10);
  } catch { return false; }
}

async function existeix(ruta) {
  try { await access(ruta); return true; } catch { return false; }
}

async function recull(acte, clau, { fixtures }) {
  let pagina = null;
  let font = urlHttps(acte.cartell_font);
  if (!font) {
    pagina = urlHttps(acte.url);
    const html = fixtures
      ? await readFile(join(fixtures, `${clau}.html`), 'utf8')
      : Buffer.from((await baixa(pagina, 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8')).bytes).toString('utf8');
    font = extreuImatge(html, pagina);
    if (!font) throw new Error('la web no declara cap imatge per compartir (og:image)');
  }
  const bytes = fixtures
    ? new Uint8Array(await readFile(join(fixtures, `${clau}.img`)))
    : (await baixa(font, 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8')).bytes;
  const m = mides(bytes);
  const motiu = acceptable(m);
  if (motiu) throw new Error(motiu);
  if (await gairebeBuida(bytes)) throw new Error('imatge gairebé buida (d\'un sol color)');
  const final = await normalitza(bytes, m);
  return { pagina: pagina || urlHttps(acte.url), font, ...final };
}

function canonic(mapa) {
  const out = {};
  for (const k of Object.keys(mapa).sort()) out[k] = mapa[k];
  return out;
}

export async function executa(opts) {
  const avui = opts.avui || avuiBarcelona();
  const agenda = JSON.parse(await readFile(opts.agenda, 'utf8'));
  const actes = Array.isArray(agenda?.actes) ? agenda.actes : [];
  let anterior = {};
  try { anterior = JSON.parse(await readFile(opts.sortida, 'utf8')).cartells || {}; } catch { anterior = {}; }

  const vius = new Set(actes.filter(a => a && valida(a.inici) && diesEntre(fiDe(a), avui) <= DIES_CONSERVA && a.cartell !== false).map(clauActe));
  const mapa = {};
  for (const [clau, entrada] of Object.entries(anterior)) if (vius.has(clau)) mapa[clau] = entrada;

  let baixades = 0;
  let intents = 0;
  for (const acte of candidats(actes, avui)) {
    if (intents >= MAX_PER_PASSADA) break;
    const clau = clauActe(acte);
    const ja = mapa[clau];
    const fontActual = urlHttps(acte.cartell_font);
    if (ja?.imatge && (!fontActual || ja.font === fontActual) && await existeix(join(opts.publicDir, ja.imatge.replace(/^\//, '')))) continue;
    if (ja?.error && ja.provat && diesEntre(ja.provat, avui) < DIES_REINTENT && (ja.cartell_font || null) === fontActual) continue;
    intents += 1;
    try {
      const r = await recull(acte, clau, opts);
      const ruta = `/${DIR}/${clau}.jpg`;
      if (!opts.dryRun) {
        await mkdir(join(opts.publicDir, DIR), { recursive: true });
        await writeFile(join(opts.publicDir, DIR, `${clau}.jpg`), r.bytes);
      }
      mapa[clau] = { imatge: ruta, amplada: r.amplada, alcada: r.alcada, font: r.font, pagina: r.pagina, organitza: acte.organitza || undefined, recollit: avui };
      baixades += 1;
      console.log(`Cartell desat: ${acte.titol} → ${ruta} (${r.amplada}×${r.alcada}, de ${r.font})`);
    } catch (error) {
      mapa[clau] = { error: String(error.message || error).slice(0, 200), provat: avui, ...(fontActual ? { cartell_font: fontActual } : {}) };
      console.warn(`::notice::${acte.titol}: sense cartell original (${mapa[clau].error}); surt el de disseny propi.`);
    }
  }

  // Fitxers d'actes passats o marcats "cartell": false: fora del repositori.
  for (const [clau, entrada] of Object.entries(anterior)) {
    if (mapa[clau]?.imatge === entrada.imatge || !entrada.imatge || opts.dryRun) continue;
    try { await unlink(join(opts.publicDir, entrada.imatge.replace(/^\//, ''))); console.log(`Cartell retirat: ${entrada.imatge}`); } catch { /* ja no hi era */ }
  }

  const nou = canonic(mapa);
  const abans = JSON.stringify(canonic(anterior));
  const canvia = JSON.stringify(nou) !== abans;
  if (canvia && !opts.dryRun) {
    await writeFile(opts.sortida, `${JSON.stringify({ actualitzat: avui, nota: "Imatges oficials dels actes, desades al nostre servidor. Les genera automation/scripts/recull-cartells.mjs: no s'edita a mà.", cartells: nou }, null, 2)}\n`);
  }
  console.log(`${baixades} cartells nous; ${Object.values(nou).filter(e => e.imatge).length} en total; ${canvia ? 'cartells.json actualitzat' : 'cap canvi'}.`);
  return { mapa: nou, canvia };
}

function llegeixArgs(argv) {
  const opts = { agenda: 'public/data/agenda.json', sortida: 'public/data/cartells.json', publicDir: 'public', fixtures: null, dryRun: false, avui: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--agenda') opts.agenda = argv[++i];
    else if (a === '--sortida') opts.sortida = argv[++i];
    else if (a === '--public-dir') opts.publicDir = argv[++i];
    else if (a === '--fixtures') opts.fixtures = argv[++i];
    else if (a === '--avui') opts.avui = argv[++i];
    else if (a === '--dry-run') opts.dryRun = true;
  }
  for (const k of ['agenda', 'sortida', 'publicDir']) opts[k] = resolve(opts[k]);
  if (opts.fixtures) opts.fixtures = resolve(opts.fixtures);
  return opts;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  executa(llegeixArgs(process.argv.slice(2))).catch(error => {
    console.warn(`::warning::Recollida de cartells interrompuda: ${error.message}`);
    process.exit(0);
  });
}
