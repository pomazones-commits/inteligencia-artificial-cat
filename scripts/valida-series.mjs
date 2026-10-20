#!/usr/bin/env node
// Valida public/series.js (sèries de «La tribuna» i «Estudis», 12.10.2026) i les
// peces que hi apunten. Ús: node scripts/valida-series.mjs
//
// Comprova:
//   1. que l'última assignació de window.IA_SERIES és JSON pur (inc/peces.php la
//      llegeix amb json_decode: una coma final o unes cometes simples la trencarien
//      en silenci i la pàgina de la sèrie deixaria de funcionar);
//   2. que cada sèrie té els camps que fan servir series.js i veus-de-civicai.php;
//   3. que el logo existeix a public/;
//   4. que cada peça amb "serie" apunta a una sèrie que existeix;
//   5. que cap veu de CIVICAi no és la tribuna ni l'estudi vigents (14.10.2026);
//   6. que tribuna-arxiu.js va per data, de la més recent a la més antiga.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const arrel = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const errors = [];

const text = readFileSync(join(arrel, 'series.js'), 'utf8');
const marques = [...text.matchAll(/^window\.IA_SERIES\s*=\s*/gm)];
let series = null;
if (!marques.length) {
  errors.push('series.js: no hi ha cap «window.IA_SERIES = …» a la columna 0');
} else {
  const darrera = marques.at(-1);
  const json = text.slice(darrera.index + darrera[0].length).trim().replace(/;\s*$/, '');
  try { series = JSON.parse(json); } catch (e) { errors.push('series.js: IA_SERIES no és JSON pur (' + e.message + ')'); }
}

// «web» és opcional des del 20.10.2026 (Veus de l'administració no és cap entitat).
const OBLIGATORIS = ['nom', 'cami', 'entitat', 'logo', 'descripcio'];
for (const [clau, s] of Object.entries(series || {})) {
  if (!/^[a-z0-9-]+$/.test(clau)) errors.push(`sèrie «${clau}»: la clau només pot tenir minúscules, xifres i guionets`);
  for (const camp of OBLIGATORIS) if (!s[camp] || typeof s[camp] !== 'string') errors.push(`sèrie «${clau}»: falta «${camp}»`);
  if (s.cami && !s.cami.startsWith('/')) errors.push(`sèrie «${clau}»: «cami» ha de començar per /`);
  if (s.web && !/^https?:\/\//.test(s.web)) errors.push(`sèrie «${clau}»: «web» ha de ser una URL`);
  if (s.crida && !/^https?:\/\//.test(s.crida.href || '')) errors.push(`sèrie «${clau}»: «crida.href» ha de ser una URL`);
  if (s.logo && !existsSync(join(arrel, s.logo.replace(/^\//, '')))) errors.push(`sèrie «${clau}»: no existeix el logo ${s.logo}`);
}

// El codi de series.js s'ha d'executar sense errors i exposar window.IASeries.
const ctx = { window: {}, document: {} };
try {
  vm.runInNewContext(text, ctx);
  if (typeof ctx.window.IASeries?.marca !== 'function') errors.push('series.js: no exposa window.IASeries.marca');
} catch (e) {
  errors.push('series.js no s\'executa: ' + e.message);
}

// Peces que apunten a una sèrie.
const dades = { window: {} };
for (const f of ['tribuna.js', 'tribuna-arxiu.js', 'estudis.js', 'estudis-arxiu.js']) {
  vm.runInNewContext(readFileSync(join(arrel, f), 'utf8'), dades);
}
const w = dades.window;
const peces = [w.IA_TRIBUNA, ...(w.IA_TRIBUNA_ARXIU || []), w.IA_ESTUDI, ...(w.IA_ESTUDIS_ARXIU || [])].filter(Boolean);
let enSerie = 0;
for (const p of peces) {
  if (p.serie === undefined) continue;
  enSerie++;
  if (!series || !series[p.serie]) errors.push(`«${p.title}»: la sèrie «${p.serie}» no existeix a series.js`);
}

// 5. Des del 14.10.2026 (decisió d'en Rafael), les veus de CIVICAi no ocupen mai la
//    tribuna ni l'estudi vigents: es publiquen directament a tribuna-arxiu.js (o
//    estudis-arxiu.js) i surten a la banda #veus-civicai i a /veus-de-civicai.
for (const [nom, p] of [['tribuna.js', w.IA_TRIBUNA], ['estudis.js', w.IA_ESTUDI]]) {
  if (p && p.serie === 'veus-de-civicai') {
    errors.push(`${nom}: «${p.title}» és de «Veus de CIVICAi» i no pot ser la peça vigent; va a l'arxiu (al davant, per data)`);
  }
}

// 6. L'arxiu de la tribuna ha d'anar per data, de la més recent a la més antiga
//    (la banda de la portada i l'arxiu ho suposen).
const clauData = (d) => String(d || '').split('.').reverse().join('');
const arxiu = w.IA_TRIBUNA_ARXIU || [];
for (let i = 1; i < arxiu.length; i++) {
  if (clauData(arxiu[i].date) > clauData(arxiu[i - 1].date)) {
    errors.push(`tribuna-arxiu.js: «${arxiu[i].title}» (${arxiu[i].date}) és més recent que la peça que té al davant (${arxiu[i - 1].date})`);
  }
}

if (errors.length) {
  console.error('✗ series.js:\n  - ' + errors.join('\n  - '));
  process.exit(1);
}
console.log(`✓ series.js: ${Object.keys(series).length} sèrie(s), ${enSerie} peça(ces) en sèrie de ${peces.length}`);
