// Fotos dels col·laboradors: de Google Drive a public/assets/ (19.10.2026)
// =====================================================================
//
// Per què existeix: els retrats dels col·laboradors arriben com a adjunts de
// Gmail. L'script d'Apps Script `automation/apps-script/adjunts-col-laboracions.gs`
// (al compte de Google d'en Rafael) els copia a la carpeta de Drive
// «IA.cat — adjunts de col·laboracions» amb l'enllaç obert. Les sessions de
// Claude no poden baixar res de Drive (la xarxa del sandbox només arriba a
// GitHub), però el runner d'Actions sí.
//
// Com es fa servir: la sessió troba la foto al Drive (connector de Google
// Drive, `search_files` a la carpeta) i n'afegeix l'identificador a
// `incoming/fotos-drive.json`:
//
//   [{ "drive": "<id del fitxer a Drive>",
//      "desti": "public/assets/tribuna-aurea-rodriguez-20261102.jpg",
//      "credit": "opcional, només per al registre" }]
//
// En fer push, el workflow `fotos-drive.yml` executa aquest script: baixa cada
// foto, la gira segons l'EXIF, la redueix a 1200 px de costat llarg com a
// màxim, la desa com a JPEG progressiu de menys de 350 KB i treu l'entrada de
// la cua. Les que fallen hi queden amb el camp `error` i el workflow surt en
// vermell.
//
// Regles: el destí ha de ser `public/assets/<nom>.jpg` (sense subcarpetes
// noves ni `..`); si el fitxer ja existeix no es sobreescriu, llevat que
// l'entrada porti `"sobreescriu": true`.
//
// Ús: node automation/scripts/fotos-drive.mjs [--cua incoming/fotos-drive.json]

import { readFile, writeFile, access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const MAX_COSTAT = 1200;
export const MAX_BYTES = 350 * 1024;
const QUALITATS = [84, 78, 72, 66, 60];

const RE_DRIVE = /^[A-Za-z0-9_-]{20,100}$/;
const RE_DESTI = /^public\/assets\/[a-z0-9][a-z0-9-]*\.jpg$/;

export function validaEntrada(e) {
  if (!e || typeof e !== 'object') return 'entrada buida o mal formada';
  if (typeof e.drive !== 'string' || !RE_DRIVE.test(e.drive)) return 'camp "drive" absent o no és un identificador de Drive';
  if (typeof e.desti !== 'string' || !RE_DESTI.test(e.desti)) {
    return 'camp "desti" invàlid: ha de ser public/assets/<nom-en-minúscules>.jpg';
  }
  return null;
}

export function urlDescarrega(id) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;
}

export async function converteix(entrada, sharp) {
  const base = sharp(entrada, { failOn: 'none' })
    .rotate()
    .resize({ width: MAX_COSTAT, height: MAX_COSTAT, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' });
  let sortida = null;
  for (const quality of QUALITATS) {
    sortida = await base.clone().jpeg({ quality, progressive: true, mozjpeg: true }).toBuffer();
    if (sortida.length <= MAX_BYTES) break;
  }
  return sortida;
}

async function existeix(ruta) {
  try { await access(ruta); return true; } catch { return false; }
}

async function baixa(id) {
  const resposta = await fetch(urlDescarrega(id), { redirect: 'follow' });
  if (!resposta.ok) throw new Error(`Drive ha respost ${resposta.status}`);
  const tipus = resposta.headers.get('content-type') || '';
  const dades = Buffer.from(await resposta.arrayBuffer());
  if (tipus.includes('text/html')) {
    throw new Error("Drive ha tornat una pàgina web i no la foto: el fitxer no té l'enllaç obert "
      + "(l'script d'Apps Script encara no l'ha compartit, o han passat més de 21 dies)");
  }
  return dades;
}

export async function processa(cua, { sharp, baixa: baixaFn = baixa, escriu = writeFile, existeixFn = existeix } = {}) {
  const pendents = [];
  const fets = [];
  for (const e of cua) {
    const problema = validaEntrada(e);
    if (problema) { pendents.push({ ...e, error: problema }); continue; }
    if (!e.sobreescriu && await existeixFn(e.desti)) {
      fets.push({ desti: e.desti, nota: 'ja existia; no s\'ha tocat' });
      continue;
    }
    try {
      const original = await baixaFn(e.drive);
      const jpeg = await converteix(original, sharp);
      await escriu(e.desti, jpeg);
      const meta = await sharp(jpeg).metadata();
      fets.push({ desti: e.desti, mida: jpeg.length, amplada: meta.width, alcada: meta.height });
    } catch (err) {
      pendents.push({ ...e, error: String(err && err.message || err) });
    }
  }
  return { pendents, fets };
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--cua');
  const rutaCua = i !== -1 ? args[i + 1] : 'incoming/fotos-drive.json';
  let cua = [];
  try { cua = JSON.parse(await readFile(rutaCua, 'utf8')); } catch { cua = []; }
  if (!Array.isArray(cua) || cua.length === 0) { console.log('Cua buida: cap foto per baixar.'); return; }

  const { default: sharp } = await import('sharp');
  const { pendents, fets } = await processa(cua, { sharp });
  for (const f of fets) {
    console.log(f.nota ? `== ${f.desti}: ${f.nota}` : `-> ${f.desti}: ${f.amplada}×${f.alcada}, ${Math.round(f.mida / 1024)} KB`);
  }
  for (const p of pendents) console.log(`::error::${p.desti || p.drive || '(entrada)'}: ${p.error}`);
  await writeFile(rutaCua, JSON.stringify(pendents, null, 2) + '\n');
  if (pendents.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
