#!/usr/bin/env node
// Valida public/data/radio.json (La IA a la ràdio, 11.10.2026). Ús:
//   node scripts/valida-radio.mjs [ruta-al-json]
// Surt amb codi 1 i la llista d'errors si alguna fitxa no compleix l'esquema
// o les regles editorials que es poden comprovar automàticament.
// No forma part dels tests del Content Hub a propòsit: un error en aquest
// fitxer manual no ha de poder aturar mai la publicació dels lots de notícies.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ruta = process.argv[2] || resolve(import.meta.dirname, '..', 'public', 'data', 'radio.json');
const errors = [];
let dades;
try {
  dades = JSON.parse(readFileSync(ruta, 'utf8'));
} catch (e) {
  console.error(`radio.json il·legible: ${e.message}`);
  process.exit(1);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s"'<>]*)?$/i;
// Han de coincidir amb $reproductors de public/radio.php i TIPUS de public/radio.js.
const REPRODUCTORS = {
  '3cat': { id: /^\d{4,9}$/, url: /^https:\/\/www\.3cat\.cat\/(3cat|catradio|3catinfo)\/.+\/audio\/(\d+)\/$/ },
  enllac: { id: null, url: HTTPS }
};
const paraules = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const avui = new Date().toISOString().slice(0, 10);

if (!ISO.test(dades.actualitzat || '')) errors.push('actualitzat: ha de ser AAAA-MM-DD');
const temes = dades.temes && typeof dades.temes === 'object' ? dades.temes : {};
if (!Object.keys(temes).length) errors.push('temes: falta el diccionari de temes');
if (!Array.isArray(dades.intervencions)) errors.push('intervencions: ha de ser una llista');

const ids = new Set();
const urls = new Set();
for (const [n, f] of (dades.intervencions || []).entries()) {
  const on = `fitxa ${n + 1} (${f.id || 'sense id'})`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.id || '')) errors.push(`${on}: id buit o amb caràcters no permesos`);
  if (ids.has(f.id)) errors.push(`${on}: id repetit`);
  ids.add(f.id);
  for (const camp of ['emissora', 'programa', 'titol', 'resum', 'durada']) {
    if (!String(f[camp] || '').trim()) errors.push(`${on}: falta ${camp}`);
  }
  if (!ISO.test(f.data || '')) errors.push(`${on}: data ha de ser AAAA-MM-DD`);
  else if (f.data > avui) errors.push(`${on}: data futura (${f.data})`);
  if (f.durada && !/^(\d+ h )?\d+ min$/.test(f.durada)) errors.push(`${on}: durada «${f.durada}» (format «53 min» o «1 h 9 min»)`);
  if (!temes[f.tema]) errors.push(`${on}: tema «${f.tema}» no és a «temes»`);
  if (!HTTPS.test(f.url || '')) errors.push(`${on}: url ha de ser https`);
  if (urls.has(f.url)) errors.push(`${on}: url repetida (la mateixa intervenció dues vegades?)`);
  urls.add(f.url);
  if (f.programa_url && !HTTPS.test(f.programa_url)) errors.push(`${on}: programa_url ha de ser https`);

  const convidats = Array.isArray(f.convidats) ? f.convidats : [];
  if (!convidats.length) errors.push(`${on}: cal almenys un convidat`);
  for (const c of convidats) {
    if (!String(c?.nom || '').trim()) errors.push(`${on}: convidat sense nom`);
    if (!String(c?.rol || '').trim()) errors.push(`${on}: falta el rol de ${c?.nom || 'un convidat'}`);
  }

  const n2 = paraules(f.resum);
  if (f.resum && (n2 < 30 || n2 > 80)) errors.push(`${on}: el resum té ${n2} paraules (30-80)`);
  if (f.resum && f.titol && f.resum.includes(f.titol)) errors.push(`${on}: el resum repeteix el títol`);

  const r = f.reproductor || {};
  const tipus = REPRODUCTORS[r.tipus];
  if (!tipus) { errors.push(`${on}: reproductor.tipus «${r.tipus}» no admès (${Object.keys(REPRODUCTORS).join(' | ')})`); continue; }
  if (tipus.id && !tipus.id.test(String(r.id || ''))) errors.push(`${on}: reproductor.id «${r.id}» no vàlid per a ${r.tipus}`);
  if (f.url && !tipus.url.test(f.url)) errors.push(`${on}: la url no és una pàgina d'àudio de ${r.tipus}`);
  if (r.tipus === '3cat') {
    const m = String(f.url || '').match(tipus.url);
    if (m && m[2] !== String(r.id)) errors.push(`${on}: l'id del reproductor (${r.id}) no coincideix amb el de la url (${m[2]})`);
    if (f.id !== `3cat-${r.id}`) errors.push(`${on}: per a 3Cat, l'id ha de ser «3cat-${r.id}»`);
  }
}

if (errors.length) {
  console.error(`radio.json: ${errors.length} error(s)\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`radio.json correcte: ${dades.intervencions.length} intervencions, ${Object.keys(temes).length} temes.`);
