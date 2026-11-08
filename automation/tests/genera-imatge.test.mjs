// Proves de automation/scripts/genera-imatge.mjs (08.11.2026).
// La conversió necessita ImageMagick (`convert`) o `sharp`; si no n'hi ha cap,
// aquestes proves se salten. Cap prova no crida l'API de debò.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  formatDeBytes, converteix, demanaImatge, generacionsFetes, apuntaGeneracio, llegeixRegistre,
  validaSlug, MAX_GENERACIONS, MAX_BYTES, MIN_BYTES, SORTIDA
} from '../scripts/genera-imatge.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/genera-imatge.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prova-genera-imatge-'));

let teConvert = true;
try { execFileSync('convert', ['-version'], { stdio: 'ignore' }); } catch { teConvert = false; }

function pngDeProva(ruta) {
  // Soroll de colors: comprimeix malament, així el JPEG passa dels 30 KB.
  execFileSync('convert', ['-size', '1400x1050', 'plasma:', `png:${ruta}`]);
}

test('reconeix el format pels bytes, no per l\'extensió', () => {
  assert.equal(formatDeBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
  assert.equal(formatDeBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
  assert.equal(formatDeBytes(Buffer.from('RIFF0000WEBPVP8 ')), 'webp');
  assert.equal(formatDeBytes(Buffer.from('{"error":1}')), null);
});

test('valida els slugs', () => {
  assert.ok(validaSlug('anthropic-generadors-gas'));
  for (const s of ['', 'Amb-Majuscula', '../x', 'a_b', 'acaba-']) assert.ok(!validaSlug(s), s);
});

test('cas del 08.11.2026: un PNG desat amb extensió .raw es converteix bé', { skip: !teConvert }, async () => {
  const raw = path.join(tmp, 'imatge.raw');
  pngDeProva(raw);
  const desti = path.join(tmp, 'sortida-20261108.jpg');
  const r = await converteix(raw, desti);
  assert.equal(r.format, 'png');
  const sortida = fs.readFileSync(desti);
  assert.equal(formatDeBytes(sortida), 'jpeg');
  assert.ok(sortida.length >= MIN_BYTES && sortida.length <= MAX_BYTES, String(sortida.length));
  const mida = execFileSync('identify', ['-format', '%w %h', desti]).toString().split(' ').map(Number);
  assert.ok(Math.max(...mida) <= 1200, mida.join('x'));
});

test('un fitxer que no és imatge falla sense deixar cap JPEG', async () => {
  const dolent = path.join(tmp, 'resposta.json');
  fs.writeFileSync(dolent, '{"error": "quota"}');
  const desti = path.join(tmp, 'no-ha-d-existir-20261108.jpg');
  await assert.rejects(converteix(dolent, desti), /no és cap PNG/);
  assert.ok(!fs.existsSync(desti));
});

test('demanaImatge reintenta els errors tècnics i torna la imatge', async () => {
  let crides = 0;
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const fetchFn = async () => {
    crides++;
    if (crides < 3) return new Response('ocupat', { status: crides === 1 ? 503 : 429 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: png.toString('base64') } }] } }] }), { status: 200 });
  };
  const buf = await demanaImatge({ prompt: 'x', clau: 'k', fetchFn, dormir: async () => {} });
  assert.equal(crides, 3);
  assert.deepEqual(buf, png);
});

test('demanaImatge NO reintenta una resposta sense imatge', async () => {
  let crides = 0;
  const fetchFn = async () => { crides++; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'no' }] } }] }), { status: 200 }); };
  await assert.rejects(demanaImatge({ prompt: 'x', clau: 'k', fetchFn, dormir: async () => {} }),
    (e) => e.codi === SORTIDA.PROMPT_REBUTJAT && /NO és motiu per passar a Pollinations/.test(e.message));
  assert.equal(crides, 1);
});

test('demanaImatge es rendeix després de 3 reintents tècnics', async () => {
  let crides = 0;
  const fetchFn = async () => { crides++; return new Response('', { status: 500 }); };
  await assert.rejects(demanaImatge({ prompt: 'x', clau: 'k', fetchFn, dormir: async () => {} }),
    (e) => e.codi === SORTIDA.GEMINI_NO_DISPONIBLE && /HTTP 500/.test(e.message) && /sí que pots fer servir el recanvi de Pollinations/.test(e.message));
  assert.equal(crides, 4);
});

test('el registre compta les generacions per data i slug', () => {
  const ruta = path.join(tmp, 'registre.json');
  assert.equal(generacionsFetes(llegeixRegistre(ruta), '20261108', 'a'), 0);
  apuntaGeneracio('20261108', 'a', ruta);
  apuntaGeneracio('20261108', 'a', ruta);
  apuntaGeneracio('20261109', 'a', ruta);
  assert.equal(generacionsFetes(llegeixRegistre(ruta), '20261108', 'a'), 2);
  assert.equal(generacionsFetes(llegeixRegistre(ruta), '20261109', 'a'), 1);
});

test('la línia d\'ordres es nega a passar del sostre sense cridar l\'API', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'prova-sostre-'));
  fs.mkdirSync(path.join(tmpdir, 'iacat-imatges'));
  fs.writeFileSync(path.join(tmpdir, 'iacat-imatges', 'generacions.json'), JSON.stringify({ '20261108': { 'nota-prova': MAX_GENERACIONS } }));
  const r = spawnSync(process.execPath, [SCRIPT, '--slug', 'nota-prova', '--data', '20261108', '--prompt', 'x'], {
    env: { ...process.env, TMPDIR: tmpdir, GEMINI_KEY: 'clau-falsa-que-no-s-ha-de-fer-servir', HTTPS_PROXY: 'http://127.0.0.1:9' },
    encoding: 'utf8'
  });
  assert.equal(r.status, SORTIDA.SOSTRE);
  assert.match(r.stderr, /és el màxim/);
  assert.match(r.stderr, /NO és motiu per passar a Pollinations/);
});

test('un 400 és prompt rebutjat (no Pollinations) i un 403 és clau dolenta (sí Pollinations)', async () => {
  const amb = (status) => async () => new Response('{}', { status });
  await assert.rejects(demanaImatge({ prompt: 'x', clau: 'k', fetchFn: amb(400), dormir: async () => {} }), (e) => e.codi === SORTIDA.PROMPT_REBUTJAT);
  await assert.rejects(demanaImatge({ prompt: 'x', clau: 'k', fetchFn: amb(403), dormir: async () => {} }), (e) => e.codi === SORTIDA.GEMINI_NO_DISPONIBLE);
});
