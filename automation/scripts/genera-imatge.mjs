#!/usr/bin/env node
// Genera UNA il·lustració amb Gemini i la desa com a JPEG a public/assets/ (08.11.2026).
//
// Per què existeix: el 08.11.2026 (lot de les 18.05) un script improvisat
// cridava Gemini i convertia la imatge en un mateix bucle de reintents. La
// conversió fallava sempre (el fitxer intermedi es deia «.raw» i ImageMagick
// el llegia com a foto RAW de càmera), i cada fallada tornava a cridar l'API:
// 24 imatges pagades per 6 notícies. Aquest script ho fa impossible:
//
//   1. La crida a l'API i la conversió van SEPARADES. El que torna Gemini es
//      desa primer tal com arriba, amb l'extensió que diuen els seus bytes
//      (.png, .jpg o .webp), a la carpeta temporal. Si després la conversió
//      falla, l'script s'atura amb un error i NO torna a cridar mai l'API:
//      la imatge ja pagada es recupera amb `--converteix <fitxer>`.
//   2. Només es reintenta la crida si l'error és tècnic (xarxa, 429, 5xx),
//      que no genera cap imatge: 3 vegades com a màxim, a 10, 30 i 60 s.
//      Una resposta sense imatge (bloqueig, prompt rebutjat) no es reintenta.
//   3. Sostre dur de 3 generacions per notícia i dia (la regla de CLAUDE.md),
//      comptat en un registre a la carpeta temporal del sistema. La quarta
//      crida per al mateix slug es nega abans de tocar l'API.
//
// Ús:
//   GEMINI_KEY=… node automation/scripts/genera-imatge.mjs --slug <slug> --prompt "<prompt>" [--data AAAAMMDD] [--aspecte 4:3]
//   node automation/scripts/genera-imatge.mjs --converteix <fitxer> --slug <slug> [--data AAAAMMDD]
//   node automation/scripts/genera-imatge.mjs --recompte          (generacions d'avui per slug)
//   Fotografia del dia: --slug daily-reflection --fitxer daily-reflection-AAAA-MM-DD.jpg --aspecte 4:5
//
// La clau només es llegeix de la variable d'entorn GEMINI_KEY: no l'escriguis
// mai en cap fitxer del repositori.
//
// Conversió: amb `sharp` si està instal·lat; si no, amb ImageMagick (`convert`)
// i el format d'entrada sempre explícit (png:, jpeg:, webp:). Sortida: JPEG
// progressiu, 1.200 px de costat com a màxim, per sota de 350 KB.
// Proves: node --test automation/tests/genera-imatge.test.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const MAX_GENERACIONS = 3;
export const MAX_COSTAT = 1200;
export const MAX_BYTES = 350 * 1024;
export const MIN_BYTES = 30 * 1024;
const MODEL = 'gemini-2.5-flash-image';
const ARREL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function formatDeBytes(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export function avuiAAAAMMDD(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(d).replaceAll('-', '');
}

function dirTemporal() {
  const d = path.join(os.tmpdir(), 'iacat-imatges');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function rutaRegistre(dir = dirTemporal()) { return path.join(dir, 'generacions.json'); }

export function llegeixRegistre(ruta = rutaRegistre()) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return {}; }
}

export function generacionsFetes(registre, data, slug) {
  return registre?.[data]?.[slug] ?? 0;
}

export function apuntaGeneracio(data, slug, ruta = rutaRegistre()) {
  const r = llegeixRegistre(ruta);
  r[data] ??= {};
  r[data][slug] = (r[data][slug] ?? 0) + 1;
  fs.writeFileSync(ruta, JSON.stringify(r, null, 2));
  return r[data][slug];
}

export function validaSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function teSharp() {
  try { execFileSync(process.execPath, ['-e', "require('sharp')"], { stdio: 'ignore', cwd: ARREL }); return true; } catch { return false; }
}

// Converteix un fitxer d'imatge (PNG, JPEG o WebP) en el JPEG final. No crida mai cap API.
export async function converteix(origen, desti) {
  const buf = fs.readFileSync(origen);
  const format = formatDeBytes(buf);
  if (!format) throw new Error(`${origen} no és cap PNG, JPEG ni WebP (primers bytes: ${buf.subarray(0, 8).toString('hex')})`);
  fs.mkdirSync(path.dirname(desti), { recursive: true });
  const provisional = `${desti}.tmp-${process.pid}.jpg`;
  let sharp = null;
  if (teSharp()) {
    try { ({ default: sharp } = await import('sharp')); } catch { sharp = null; }
  }
  for (const qualitat of [86, 80, 74, 68, 60]) {
    if (sharp) {
      await sharp(buf).rotate().resize({ width: MAX_COSTAT, height: MAX_COSTAT, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).jpeg({ quality: qualitat, progressive: true, mozjpeg: true }).toFile(provisional);
    } else {
      execFileSync('convert', [`${format}:${origen}`, '-auto-orient', '-resize', `${MAX_COSTAT}x${MAX_COSTAT}>`,
        '-background', 'white', '-flatten', '-strip', '-interlace', 'JPEG', '-quality', String(qualitat), `jpeg:${provisional}`],
        { stdio: ['ignore', 'ignore', 'pipe'] });
    }
    if (fs.statSync(provisional).size <= MAX_BYTES) break;
  }
  const sortida = fs.readFileSync(provisional);
  if (formatDeBytes(sortida) !== 'jpeg') { fs.rmSync(provisional, { force: true }); throw new Error('la conversió no ha donat un JPEG'); }
  if (sortida.length < MIN_BYTES) { fs.rmSync(provisional, { force: true }); throw new Error(`JPEG massa petit (${sortida.length} bytes): imatge probablement buida`); }
  if (sortida.length > MAX_BYTES) { fs.rmSync(provisional, { force: true }); throw new Error(`JPEG massa gros (${sortida.length} bytes) fins i tot amb qualitat 60`); }
  fs.renameSync(provisional, desti);
  return { bytes: sortida.length, format };
}

// Una sola generació. Només reintenta errors tècnics (no hi ha imatge pagada).
export async function demanaImatge({ prompt, aspecte = '4:3', clau, fetchFn = globalThis.fetch, esperes = [10_000, 30_000, 60_000], dormir = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const cos = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspecte } } });
  let darrerError = null;
  for (let intent = 0; intent <= esperes.length; intent++) {
    if (intent > 0) await dormir(esperes[intent - 1]);
    let resp;
    try {
      resp = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': clau, 'Content-Type': 'application/json' }, body: cos
      });
    } catch (e) { darrerError = new Error(`error de xarxa: ${e.message}`); continue; }
    if (resp.status === 429 || resp.status >= 500) { darrerError = new Error(`HTTP ${resp.status} (error tècnic, es reintenta)`); continue; }
    const text = await resp.text();
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
    let dades;
    try { dades = JSON.parse(text); } catch { throw new Error(`resposta que no és JSON: ${text.slice(0, 200)}`); }
    const parts = dades?.candidates?.[0]?.content?.parts ?? [];
    const imatge = parts.find((p) => p?.inlineData?.data);
    if (!imatge) throw new Error(`Gemini no ha tornat cap imatge (no es reintenta sol): ${text.slice(0, 300)}`);
    return Buffer.from(imatge.inlineData.data, 'base64');
  }
  throw darrerError ?? new Error('error desconegut');
}

function arguments_(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--recompte') a.recompte = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}

async function main() {
  const a = arguments_(process.argv.slice(2));
  const data = a.data ?? avuiAAAAMMDD();
  if (a.recompte) {
    const r = llegeixRegistre();
    console.log(JSON.stringify(r[data] ?? {}, null, 2));
    const total = Object.values(r[data] ?? {}).reduce((s, n) => s + n, 0);
    console.log(`Imatges: ${total} generades per ${Object.keys(r[data] ?? {}).length} notícies (${data})`);
    return;
  }
  if (!validaSlug(a.slug)) throw new Error('cal --slug en minúscules, xifres i guions');
  if (!/^\d{8}$/.test(data)) throw new Error('--data ha de ser AAAAMMDD');
  if (a.fitxer !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/.test(a.fitxer)) throw new Error('--fitxer ha de ser un nom com daily-reflection-2026-11-09.jpg (sense carpetes)');
  const desti = path.join(ARREL, 'public', 'assets', a.fitxer ?? `${a.slug}-${data}.jpg`);

  if (a.converteix) {
    const r = await converteix(a.converteix, desti);
    console.log(`OK ${path.relative(ARREL, desti)} (${r.bytes} bytes, de ${r.format}; cap crida a l'API)`);
    return;
  }

  if (!a.prompt) throw new Error('cal --prompt');
  const clau = process.env.GEMINI_KEY;
  if (!clau) throw new Error('falta la variable d\'entorn GEMINI_KEY');
  const fetes = generacionsFetes(llegeixRegistre(), data, a.slug);
  if (fetes >= MAX_GENERACIONS) {
    throw new Error(`${a.slug} ja té ${fetes} generacions avui: és el màxim (${MAX_GENERACIONS}). No es torna a cridar Gemini. Si hi ha una imatge desada a ${dirTemporal()}, recupera-la amb --converteix.`);
  }

  const buf = await demanaImatge({ prompt: a.prompt, aspecte: a.aspecte ?? '4:3', clau });
  const n = apuntaGeneracio(data, a.slug);
  const format = formatDeBytes(buf);
  const original = path.join(dirTemporal(), `${a.slug}-${data}-g${n}.${format === 'jpeg' ? 'jpg' : (format ?? 'bin')}`);
  fs.writeFileSync(original, buf);
  console.log(`Generació ${n}/${MAX_GENERACIONS} per a ${a.slug}: original desat a ${original}`);
  try {
    const r = await converteix(original, desti);
    console.log(`OK ${path.relative(ARREL, desti)} (${r.bytes} bytes)`);
  } catch (e) {
    console.error(`ERROR DE CONVERSIÓ: ${e.message}`);
    console.error(`La imatge JA ESTÀ PAGADA i desada a ${original}. NO la tornis a generar: arregla la conversió i fes`);
    console.error(`  node automation/scripts/genera-imatge.mjs --converteix ${original} --slug ${a.slug} --data ${data}`);
    process.exit(3);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`ERROR: ${e.message}`); process.exit(1); });
}
