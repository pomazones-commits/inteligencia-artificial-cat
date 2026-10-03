#!/usr/bin/env node
// Valida public/data/centres-dades.json (03.10.2026). Ús:
//   node scripts/valida-centres-dades.mjs
// Surt amb codi 1 i la llista d'errors si alguna fitxa no compleix l'esquema
// o els criteris editorials que es poden comprovar automàticament.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ruta = resolve(import.meta.dirname, '..', 'public', 'data', 'centres-dades.json');
const dades = JSON.parse(readFileSync(ruta, 'utf8'));
const errors = [];
const TERRITORIS = ['Catalunya', 'Comunitat Valenciana', 'Illes Balears', 'Andorra', 'Catalunya Nord'];
const ESTATS = ['en funcionament', 'en construcció', 'en tramitació', 'aturat', 'descartat'];
const ORIGENS = ['promotor', 'administració', 'oficial', 'premsa'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const URL_OK = u => /^https?:\/\//.test(u);

if (!ISO.test(dades.actualitzat || '')) errors.push('actualitzat: ha de ser AAAA-MM-DD');
const ids = new Set();
for (const [n, it] of (dades.items || []).entries()) {
  const on = `fitxa ${n + 1} (${it.id || 'sense id'})`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(it.id || '')) errors.push(`${on}: id buit o amb caràcters no permesos`);
  if (ids.has(it.id)) errors.push(`${on}: id repetit`);
  ids.add(it.id);
  for (const camp of ['nom', 'promotor', 'tipus']) if (!it[camp]) errors.push(`${on}: falta ${camp}`);
  if (!TERRITORIS.includes(it.territori)) errors.push(`${on}: territori «${it.territori}» no admès`);
  if (!ESTATS.includes(it.estat)) errors.push(`${on}: estat «${it.estat}» no admès (${ESTATS.join(' | ')})`);
  for (const camp of ['potencia', 'inversio']) {
    const x = it[camp];
    if (!x || typeof x !== 'object') { errors.push(`${on}: falta ${camp}`); continue; }
    const valor = camp === 'potencia' ? x.mw : x.meur;
    if (valor !== null && typeof valor !== 'number') errors.push(`${on}: ${camp} ha de ser un número o null`);
    if (valor !== null && !ORIGENS.includes(x.origen)) errors.push(`${on}: ${camp}.origen ha de ser ${ORIGENS.join(' | ')}`);
  }
  for (const ll of it.llocs || []) {
    if (!Array.isArray(ll) || ll.length !== 2 || ll[0] < 37 || ll[0] > 43.5 || ll[1] < -2 || ll[1] > 4.5) errors.push(`${on}: coordenades fora dels territoris: ${JSON.stringify(ll)}`);
  }
  for (const t of it.tramits || []) {
    if (!t.organisme || !t.fet) errors.push(`${on}: tràmit sense organisme o sense fet`);
    if (t.url && !URL_OK(t.url)) errors.push(`${on}: tràmit amb URL no vàlida`);
    if (t.data && !ISO.test(t.data)) errors.push(`${on}: tràmit amb data no AAAA-MM-DD`);
  }
  for (const o of it.ocupacio || []) if (!o.xifra || !o.qui_ho_diu) errors.push(`${on}: una xifra d'ocupació ha de dir qui la dona`);
  if (it.polemica && it.polemica.critica) {
    if (!(it.polemica.respostes || []).length && !it.polemica.nota) errors.push(`${on}: polèmica sense resposta ni nota que digui que no n'hi ha`);
  }
  for (const c of it.cronologia || []) if (!ISO.test(c.data || '') || !c.fet) errors.push(`${on}: entrada de cronologia sense data AAAA-MM-DD o sense fet`);
  if (!(it.fonts || []).length || !(it.fonts || []).every(f => URL_OK(f.url || ''))) errors.push(`${on}: cal almenys una font amb URL`);
  if (!ISO.test(it.verificat || '')) errors.push(`${on}: verificat ha de ser AAAA-MM-DD`);
  const text = JSON.stringify(it);
  if (/Països Catalans|País Valencià/.test(text)) errors.push(`${on}: denominació territorial no admesa (vegeu CLAUDE.md)`);
}
for (const c of dades.canvis || []) {
  if (!ISO.test(c.data || '') || !c.fet) errors.push(`canvis: entrada sense data o sense fet`);
  if (c.id && !ids.has(c.id)) errors.push(`canvis: l'id «${c.id}» no existeix`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${ids.size} fitxes vàlides.`);
