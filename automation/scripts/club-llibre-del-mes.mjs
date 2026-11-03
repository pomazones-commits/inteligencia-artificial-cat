#!/usr/bin/env node
// Club de lectura (03.11.2026): posa «llibre_del_mes» de public/data/club-lectura.json
// d'acord amb «calendari_llibre_del_mes» (entrada del mes en curs a l'hora de Madrid
// o, si no n'hi ha, la darrera ja començada). La pàgina del club ja tria sola el llibre
// pel calendari; això manté el camp al dia per al butlletí i qualsevol altre lector.
// Edita només el bloc «llibre_del_mes» (la resta del fitxer queda byte a byte igual).
// Ús: node automation/scripts/club-llibre-del-mes.mjs --public-dir public [--mes AAAA-MM]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function mesDeMadrid(data = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).formatToParts(data);
  return `${parts.find((p) => p.type === 'year').value}-${parts.find((p) => p.type === 'month').value}`;
}

export function triaDelMes(club, mes) {
  const ids = new Set((club.llibres || []).map((b) => b.id));
  let tria = null;
  for (const e of club.calendari_llibre_del_mes || []) {
    if (!e || !/^\d{4}-\d{2}$/.test(e.mes || '') || e.mes > mes || !ids.has(e.id)) continue;
    if (!tria || e.mes > tria.mes) tria = e;
  }
  return tria ? { id: tria.id, mes: tria.mes, motiu: tria.motiu || '' } : null;
}

// Retorna el text nou del fitxer, o null si no cal cap canvi.
export function sincronitza(text, mes) {
  const club = JSON.parse(text);
  const tria = triaDelMes(club, mes);
  const actual = club.llibre_del_mes || {};
  if (!tria || (actual.id === tria.id && actual.mes === tria.mes && actual.motiu === tria.motiu)) return null;
  const bloc = /\n "llibre_del_mes": \{[\s\S]*?\n \}(,?)\n/;
  if (!bloc.test(text)) throw new Error('no trobo el bloc «llibre_del_mes» a club-lectura.json');
  const nou = text.replace(bloc, (_m, coma) =>
    `\n "llibre_del_mes": {\n  "id": ${JSON.stringify(tria.id)},\n  "mes": ${JSON.stringify(tria.mes)},\n  "motiu": ${JSON.stringify(tria.motiu)}\n }${coma}\n`);
  if (JSON.parse(nou).llibre_del_mes.id !== tria.id) throw new Error('la sincronització ha fallat');
  return nou;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opcio = (nom) => { const i = args.indexOf(`--${nom}`); return i >= 0 ? args[i + 1] : undefined; };
  const fitxer = join(resolve(opcio('public-dir') || 'public'), 'data', 'club-lectura.json');
  const mes = opcio('mes') || mesDeMadrid();
  const nou = sincronitza(readFileSync(fitxer, 'utf8'), mes);
  if (nou === null) {
    console.log(`club: el llibre del mes ja és al dia (${mes})`);
  } else {
    writeFileSync(fitxer, nou);
    console.log(`club: llibre del mes → ${JSON.parse(nou).llibre_del_mes.id} (${mes})`);
  }
}
