#!/usr/bin/env node
// La IA a la ràdio — recollida automàtica de candidats i incorporació de fitxes
// (17.10.2026).
//
// PER QUÈ EXISTEIX. La secció /radio (11.10.2026) era manual del tot: les
// fitxes només entraven quan una sessió de Cowork les anava a buscar a mà. Sis
// dies després, les últimes eren del 10.10 i en Rafael va demanar que
// s'actualitzés més sovint. El sandbox de les sessions no arriba a les APIs de
// les emissores (api.3cat.cat, rtve.es i api.omny.fm donen error de xarxa), però
// GitHub Actions sí. Per això la feina es parteix en dues meitats:
//
//   1. «recull» (aquest script, a radio.yml): llegeix l'arxiu oficial dels
//      programes de la llista tancada automation/radio-sources.json, es queda
//      amb els àudios sobre IA dels últims dies i en desa les metadades OFICIALS
//      (títol, descripció, data, durada, adreça, reproductor) a
//      automation/radio-candidats.json. No escriu cap fitxa: el títol i el resum
//      han de ser PROPIS, i això ho fa la sessió editorial (CLAUDE.md).
//   2. «incorpora»: la sessió editorial deixa les fitxes ja escrites a
//      incoming/radio-fitxes.json (i els candidats que no valen, a «descartats»).
//      Aquest pas valida cada fitxa amb validaRadio() de scripts/valida-radio.mjs
//      i només afegeix a public/data/radio.json les que passen. Una fitxa dolenta
//      deixa un avís i prou: mai no atura res ni toca les fitxes que ja hi ha.
//
// Les sessions no escriuen mai public/data/radio.json directament quan treballen
// des dels candidats: així un lot que acabi en una PR (auto-merge-lots.yml només
// accepta incoming/** i public/assets/**) no queda encallat per una fitxa.
//
// Idempotent: si res no ha canviat, no reescriu cap fitxer. Si una font no
// respon, se'n conserven els candidats que ja hi havia i acaba amb codi 0.
//
// Ús:
//   node automation/scripts/recull-radio.mjs recull [--fonts automation/radio-sources.json]
//     [--dades public/data/radio.json] [--descartats automation/radio-descartats.json]
//     [--sortida automation/radio-candidats.json] [--fixtures <dir>] [--ara <ISO>]
//   node automation/scripts/recull-radio.mjs incorpora [--entrada incoming/radio-fitxes.json]
//     [--dades public/data/radio.json] [--descartats automation/radio-descartats.json] [--avui AAAA-MM-DD]
//   node automation/scripts/recull-radio.mjs llista [--sortida automation/radio-candidats.json]
//     → els candidats pendents, llegibles, per a la sessió editorial.
//
// Amb --fixtures, en lloc de fer peticions llegeix <dir>/<font>-<id o slug>.json
// (i <dir>/omny-programes.json): és el que fan servir els tests.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parlaDIA } from './recull-videos.mjs';
import { validaRadio } from '../../scripts/valida-radio.mjs';

const DIA = 86400000;
const UA = 'Mozilla/5.0 (compatible; IACatRadio/1.0; +https://inteligencia-artificial.cat/radio)';
const MAX_DESCRIPCIO = 1500;

// --- Utilitats ---------------------------------------------------------------

const ENTITATS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', laquo: '«', raquo: '»' };
export function textPla(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITATS[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugifica(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/l·l/g, 'll').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '') || 'audio';
}

// Data de l'emissora → AAAA-MM-DD. Accepta «10/10/2026 12:00:00» (3Cat),
// «10-10-2026 12:00:00» (RTVE), ISO (Omny) i mil·lisegons.
export function dataIso(valor) {
  if (valor == null || valor === '') return '';
  if (typeof valor === 'number') return new Date(valor).toISOString().slice(0, 10);
  const s = String(valor).trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

// Durada en segons → «53 min» / «1 h 2 min» (el format de radio.json).
export function durada(segons) {
  const s = Number(segons);
  if (!Number.isFinite(s) || s <= 0) return '';
  const min = Math.max(1, Math.round(s / 60));
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}

// «00:53:12», «53:12», «3192» (segons) → segons.
export function segonsDe(valor) {
  if (valor == null || valor === '') return 0;
  if (typeof valor === 'number') return valor;
  const s = String(valor).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const parts = s.split(':').map(Number);
  if (parts.some(n => !Number.isFinite(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function opcions(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      o[k] = v;
    } else o._.push(a);
  }
  return o;
}

async function llegeixJson(ruta, perDefecte) {
  try {
    return JSON.parse(await readFile(ruta, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT' && perDefecte !== undefined) return perDefecte;
    throw e;
  }
}

async function escriuJson(ruta, dades) {
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, JSON.stringify(dades, null, 2) + '\n');
}

function obtenidor(fixtures) {
  if (fixtures) {
    return async clau => JSON.parse(await readFile(join(fixtures, `${clau}.json`), 'utf8'));
  }
  return async (_clau, url) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  };
}

// --- Lectura de cada font -----------------------------------------------------
// Cada lector torna una llista d'«àudios» normalitzats:
// { font_id, data, segons, titol, descripcio, url, reproductor }

export function llegeix3Cat(json) {
  const items = json?.resposta?.items?.item;
  return (Array.isArray(items) ? items : items ? [items] : []).map(i => {
    const id = String(i.id ?? '').trim();
    const slug = i.nom_friendly ? slugifica(i.nom_friendly) : slugifica(i.titol);
    return {
      font_id: id,
      data: dataIso(i.data_publicacio ?? i.data_emissio ?? i.data),
      segons: segonsDe(i.durada ?? i.durada_segons),
      titol: textPla(i.titol),
      descripcio: textPla(i.entradeta || i.descripcio || i.text || ''),
      url: `https://www.3cat.cat/3cat/${slug}/audio/${id}/`,
      reproductor: { tipus: '3cat', id }
    };
  }).filter(a => /^\d{4,9}$/.test(a.font_id));
}

export function llegeixRtve(json) {
  const items = json?.page?.items;
  return (Array.isArray(items) ? items : []).map(i => {
    const id = String(i.id ?? '').trim();
    // duration ve en mil·lisegons.
    const ms = Number(i.duration);
    return {
      font_id: id,
      data: dataIso(i.publicationDate ?? i.dateOfEmission),
      segons: Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0,
      titol: textPla(i.title || i.longTitle),
      descripcio: textPla(i.description || i.shortDescription || ''),
      url: String(i.htmlUrl || '').replace(/^http:/, 'https:').replace(/([^/])$/, '$1/'),
      reproductor: { tipus: 'rtve', id }
    };
  }).filter(a => /^\d{5,10}$/.test(a.font_id) && a.url);
}

export function llegeixOmny(json) {
  const items = json?.Clips;
  return (Array.isArray(items) ? items : []).map(c => {
    // EmbedUrl: https://omny.fm/shows/<programa>/<clip>/embed
    const m = String(c.EmbedUrl || c.PublishedUrl || '').match(/omny\.fm\/shows\/([a-z0-9-]+\/[a-z0-9-]+)/);
    const camí = m ? m[1] : '';
    return {
      font_id: String(c.Id || camí),
      data: dataIso(c.PublishedUtc ?? c.PublishedUtcString),
      segons: Number(c.DurationSeconds) || 0,
      titol: textPla(c.Title),
      descripcio: textPla(c.Description || c.Summary || ''),
      url: camí ? `https://omny.fm/shows/${camí}` : '',
      reproductor: { tipus: 'omny', id: camí }
    };
  }).filter(a => a.reproductor.id && OMNY_ID.test(a.reproductor.id));
}
const OMNY_ID = /^[a-z0-9-]+\/[a-z0-9-]+$/;

// --- recull ----------------------------------------------------------------------

function idFitxa(programa, a) {
  if (a.reproductor.tipus === '3cat') return `3cat-${a.font_id}`;
  if (a.reproductor.tipus === 'rtve') return `rtve-${a.font_id}`;
  // RAC1 i altres d'Omny: emissora + data + un tros del clip, perquè sigui curt i estable.
  const pref = slugifica(programa.emissora).split('-')[0] || 'omny';
  let tros = '';
  for (const mot of slugifica(a.reproductor.id.split('/')[1]).split('-')) {
    if ((tros ? tros.length + 1 : 0) + mot.length > 40) break;
    tros = tros ? `${tros}-${mot}` : mot;
  }
  return `${pref}-${a.data.replace(/-/g, '')}-${tros || 'clip'}`;
}

export function claus(fitxa) {
  const r = fitxa.reproductor || {};
  return [fitxa.id, r.tipus && r.id ? `${r.tipus}:${r.id}` : null, fitxa.url].filter(Boolean);
}

export async function recull({ fonts, dades, descartats = [], anterior = null, ara = new Date(), obtenir }) {
  const dies = Number(fonts.dies) || 21;
  const minimSegons = (Number(fonts.durada_minima_min) || 3) * 60;
  const des = new Date(ara.getTime() - dies * DIA).toISOString().slice(0, 10);
  const avui = ara.toISOString().slice(0, 10);

  const coneguts = new Set();
  for (const f of dades.intervencions || []) for (const k of claus(f)) coneguts.add(k);
  for (const d of descartats) {
    if (d?.id) coneguts.add(d.id);
    if (d?.reproductor?.tipus && d?.reproductor?.id) coneguts.add(`${d.reproductor.tipus}:${d.reproductor.id}`);
  }

  // Programes d'Omny: l'API dona els shows per id; els busquem pel començament del slug.
  let programesOmny = null;
  const necessitaOmny = (fonts.programes || []).some(p => p.font === 'omny');
  if (necessitaOmny) {
    try {
      const j = await obtenir('omny-programes', `https://api.omny.fm/orgs/${fonts.omny_org}/programs`);
      programesOmny = Array.isArray(j?.Programs) ? j.Programs : [];
    } catch (e) {
      programesOmny = { error: e.message };
    }
  }

  const estat = [];
  const trobats = [];
  for (const p of fonts.programes || []) {
    const fila = { font: p.font, emissora: p.emissora, programa: p.programa };
    try {
      let audios = [];
      if (p.font === '3cat') {
        const j = await obtenir(`3cat-${p.id}`, `https://api.3cat.cat/audios?programaradio_id=${p.id}&items_pagina=60&ordre=-data_publicacio`);
        audios = llegeix3Cat(j);
      } else if (p.font === 'rtve') {
        const j = await obtenir(`rtve-${p.id}`, `https://www.rtve.es/api/programas/${p.id}/audios.json?size=60`);
        audios = llegeixRtve(j);
      } else if (p.font === 'omny') {
        if (!Array.isArray(programesOmny)) throw new Error(`llista de programes d'Omny: ${programesOmny?.error || 'no disponible'}`);
        const shows = programesOmny.filter(s => String(s.Slug || '').startsWith(p.slug));
        if (!shows.length) throw new Error(`cap show d'Omny comença per «${p.slug}»`);
        for (const s of shows.slice(0, 6)) {
          const j = await obtenir(`omny-${s.Slug}`, `https://api.omny.fm/orgs/${fonts.omny_org}/programs/${s.Id}/clips?pageSize=40`);
          audios.push(...llegeixOmny(j));
        }
      } else {
        throw new Error(`font desconeguda «${p.font}»`);
      }
      let ia = 0;
      for (const a of audios) {
        if (!a.data || a.data < des || a.data > avui) continue;
        if (a.segons && a.segons < minimSegons) continue;
        const iaTitol = parlaDIA(a.titol);
        if (!iaTitol && !parlaDIA(a.descripcio.slice(0, 600))) continue;
        ia++;
        const id = idFitxa(p, a);
        if (coneguts.has(id) || coneguts.has(`${a.reproductor.tipus}:${a.reproductor.id}`) || coneguts.has(a.url)) continue;
        trobats.push({
          id,
          emissora: p.emissora,
          programa: p.programa,
          programa_url: p.programa_url || '',
          data: a.data,
          durada: durada(a.segons),
          titol_original: a.titol,
          descripcio_original: a.descripcio.slice(0, MAX_DESCRIPCIO),
          descripcio_curta: a.descripcio.split(/\s+/).filter(Boolean).length < 25,
          ia_al_titol: iaTitol,
          url: a.url,
          reproductor: a.reproductor
        });
      }
      fila.estat = 'ok';
      fila.audios = audios.length;
      fila.sobre_ia = ia;
    } catch (e) {
      fila.estat = 'error';
      fila.error = String(e.message || e).slice(0, 200);
    }
    estat.push(fila);
  }

  // Una font caiguda no ha de fer desaparèixer els candidats que ja havia donat.
  const caigudes = new Set(estat.filter(f => f.estat === 'error').map(f => `${f.emissora}|${f.programa}`));
  const nous = new Map(trobats.map(c => [c.id, c]));
  for (const c of anterior?.candidats || []) {
    if (nous.has(c.id)) continue;
    if (!caigudes.has(`${c.emissora}|${c.programa}`)) continue;
    if (c.data < des) continue;
    if (claus(c).some(k => coneguts.has(k))) continue;
    nous.set(c.id, c);
  }
  const candidats = [...nous.values()].sort((a, b) => b.data.localeCompare(a.data) || a.id.localeCompare(b.id));
  return { generat: ara.toISOString(), finestra_dies: dies, fonts: estat, candidats };
}

// Firma per decidir si val la pena reescriure el fitxer: els candidats i l'estat
// de cada font (no els comptadors ni l'hora, que canvien a cada passada).
export function firma(r) {
  return JSON.stringify({
    c: (r?.candidats || []).map(c => c.id + '|' + c.titol_original + '|' + c.durada),
    f: (r?.fonts || []).map(f => `${f.emissora}|${f.programa}|${f.estat}`)
  });
}

// --- incorpora ---------------------------------------------------------------------

export function incorpora({ dades, entrada, descartats = [], avui = new Date().toISOString().slice(0, 10) }) {
  const fitxes = Array.isArray(entrada) ? entrada : Array.isArray(entrada?.fitxes) ? entrada.fitxes : [];
  const nousDescartats = Array.isArray(entrada?.descartats) ? entrada.descartats : [];
  const avisos = [];
  const afegides = [];
  let actual = structuredClone(dades);
  const base = validaRadio(actual, { avui }).length;

  for (const f of fitxes) {
    if (!f || typeof f !== 'object') continue;
    const presents = new Set((actual.intervencions || []).flatMap(claus));
    if (claus(f).some(k => presents.has(k))) continue; // ja hi és: idempotent
    const prova = structuredClone(actual);
    prova.intervencions = [f, ...(prova.intervencions || [])]
      .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
    const errors = validaRadio(prova, { avui });
    if (errors.length > base) {
      const propis = errors.filter(e => e.includes(`(${f.id || 'sense id'})`));
      avisos.push(`fitxa «${f.id || 'sense id'}» rebutjada: ${(propis.length ? propis : errors).slice(0, 4).join('; ')}`);
      continue;
    }
    actual = prova;
    afegides.push(f.id);
  }
  if (afegides.length) actual.actualitzat = avui;

  const registre = [...descartats];
  const ja = new Set(registre.map(d => d.id));
  let descartatsNous = 0;
  for (const d of nousDescartats) {
    const id = typeof d === 'string' ? d : d?.id;
    if (!id || ja.has(id)) continue;
    registre.push({ id, data: avui, motiu: String((typeof d === 'object' && d.motiu) || '').slice(0, 200) });
    ja.add(id);
    descartatsNous++;
  }
  // El registre de descartats només ha de recordar els de la finestra de recollida
  // i una mica més: més enllà, l'àudio ja no tornaria a sortir com a candidat.
  const llindar = new Date(new Date(avui).getTime() - 90 * DIA).toISOString().slice(0, 10);
  const registreNet = registre.filter(d => !d.data || d.data >= llindar);

  return { dades: actual, afegides, avisos, descartats: registreNet, descartatsNous };
}

// --- CLI -------------------------------------------------------------------------

async function main() {
  const o = opcions(process.argv.slice(2));
  const ordre = o._[0] || 'recull';
  const rutaDades = o.dades || 'public/data/radio.json';
  const rutaDescartats = o.descartats || 'automation/radio-descartats.json';
  const rutaSortida = o.sortida || 'automation/radio-candidats.json';

  if (ordre === 'recull') {
    const fonts = await llegeixJson(o.fonts || 'automation/radio-sources.json');
    const dades = await llegeixJson(rutaDades);
    const descartats = await llegeixJson(rutaDescartats, []);
    const anterior = await llegeixJson(rutaSortida, null);
    const ara = o.ara ? new Date(o.ara) : new Date();
    const r = await recull({ fonts, dades, descartats, anterior, ara, obtenir: obtenidor(o.fixtures) });
    for (const f of r.fonts) {
      if (f.estat === 'ok') console.log(`${f.emissora} · ${f.programa}: ${f.audios} àudios, ${f.sobre_ia} sobre IA a la finestra`);
      else console.log(`::warning::${f.emissora} · ${f.programa}: ${f.error}`);
    }
    console.log(`Candidats pendents: ${r.candidats.length}`);
    if (o['dry-run']) return console.log(JSON.stringify(r, null, 2));
    if (anterior && firma(anterior) === firma(r)) return console.log('Cap canvi a la llista de candidats.');
    await escriuJson(rutaSortida, r);
    return;
  }

  if (ordre === 'incorpora') {
    const entrada = await llegeixJson(o.entrada || 'incoming/radio-fitxes.json', { fitxes: [], descartats: [] });
    const dades = await llegeixJson(rutaDades);
    const descartats = await llegeixJson(rutaDescartats, []);
    const r = incorpora({ dades, entrada, descartats, avui: o.avui || undefined });
    for (const a of r.avisos) console.log(`::warning::${a}`);
    if (r.afegides.length) {
      await escriuJson(rutaDades, r.dades);
      console.log(`Fitxes noves a radio.json: ${r.afegides.join(', ')}`);
    } else console.log('Cap fitxa nova per incorporar.');
    if (r.descartatsNous || JSON.stringify(r.descartats) !== JSON.stringify(descartats)) {
      await escriuJson(rutaDescartats, r.descartats);
      console.log(`Registre de descartats: ${r.descartats.length} (${r.descartatsNous} de nous).`);
    }
    return;
  }

  if (ordre === 'llista') {
    const r = await llegeixJson(rutaSortida, { candidats: [] });
    const dades = await llegeixJson(rutaDades);
    const descartats = await llegeixJson(rutaDescartats, []);
    const coneguts = new Set([...(dades.intervencions || []).flatMap(claus), ...descartats.map(d => d.id)]);
    const pendents = (r.candidats || []).filter(c => !claus(c).some(k => coneguts.has(k)));
    console.log(`Recollida: ${r.generat || '—'} · ${pendents.length} candidats pendents`);
    for (const f of r.fonts || []) if (f.estat !== 'ok') console.log(`  (font caiguda: ${f.emissora} · ${f.programa}: ${f.error})`);
    for (const c of pendents) {
      console.log(`\n[${c.id}] ${c.data} · ${c.emissora} · ${c.programa} · ${c.durada || 'sense durada'}${c.descripcio_curta ? ' · ⚠️ descripció curta' : ''}`);
      console.log(`  Títol de l'emissora: ${c.titol_original}`);
      console.log(`  Descripció: ${c.descripcio_original}`);
      console.log(`  ${c.url}  reproductor ${c.reproductor.tipus}:${c.reproductor.id}`);
    }
    return;
  }

  console.error(`Ordre desconeguda «${ordre}» (recull | incorpora | llista)`);
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(e => {
    // Mai no atura res: un error inesperat queda al log i prou.
    console.log(`::warning::recull-radio: ${e.stack || e.message}`);
  });
}
