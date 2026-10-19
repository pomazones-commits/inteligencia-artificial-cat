// Proves de automation/scripts/fotos-drive.mjs (19.10.2026).
// Necessita `sharp` (npm install --no-save sharp@0.34); si no hi és, se salten
// les proves de conversió i només es comproven les validacions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validaEntrada, urlDescarrega, processa, MAX_COSTAT, MAX_BYTES } from '../scripts/fotos-drive.mjs';

let sharp = null;
try { ({ default: sharp } = await import('sharp')); } catch { sharp = null; }

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';

test('accepta una entrada correcta', () => {
  assert.equal(validaEntrada({ drive: ID, desti: 'public/assets/tribuna-aurea-rodriguez-20261102.jpg' }), null);
});

test('rebutja destins fora de public/assets o amb camins estranys', () => {
  for (const desti of [
    'public/index.html',
    'public/assets/../app.js',
    'public/assets/sub/foto.jpg',
    'public/assets/Foto.JPG',
    'public/assets/foto.png',
    '.github/workflows/x.jpg'
  ]) {
    assert.ok(validaEntrada({ drive: ID, desti }), desti);
  }
});

test('rebutja identificadors de Drive que no ho són', () => {
  assert.ok(validaEntrada({ drive: 'https://drive.google.com/x', desti: 'public/assets/a.jpg' }));
  assert.ok(validaEntrada({ drive: 'curt', desti: 'public/assets/a.jpg' }));
  assert.ok(validaEntrada(null));
});

test("l'adreça de descàrrega és la de drive.usercontent", () => {
  assert.match(urlDescarrega(ID), /^https:\/\/drive\.usercontent\.google\.com\/download\?id=1AbC/);
});

test('converteix un PNG gran i transparent a JPEG lleuger', { skip: !sharp && 'sense sharp' }, async () => {
  const png = await sharp({
    create: { width: 3000, height: 2000, channels: 4, background: { r: 20, g: 120, b: 200, alpha: 0.5 } }
  }).png().toBuffer();
  const escrits = {};
  const { pendents, fets } = await processa(
    [{ drive: ID, desti: 'public/assets/prova-20261019.jpg' }],
    { sharp, baixa: async () => png, escriu: async (r, d) => { escrits[r] = d; }, existeixFn: async () => false }
  );
  assert.deepEqual(pendents, []);
  assert.equal(fets.length, 1);
  const jpeg = escrits['public/assets/prova-20261019.jpg'];
  const meta = await sharp(jpeg).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(Math.max(meta.width, meta.height), MAX_COSTAT);
  assert.ok(jpeg.length <= MAX_BYTES);
});

test('no sobreescriu una foto que ja existeix', { skip: !sharp && 'sense sharp' }, async () => {
  const { pendents, fets } = await processa(
    [{ drive: ID, desti: 'public/assets/ja-hi-es.jpg' }],
    { sharp, baixa: async () => { throw new Error('no hauria de baixar'); }, existeixFn: async () => true }
  );
  assert.deepEqual(pendents, []);
  assert.match(fets[0].nota, /ja existia/);
});

test('una baixada fallida queda a la cua amb el motiu', { skip: !sharp && 'sense sharp' }, async () => {
  const { pendents } = await processa(
    [{ drive: ID, desti: 'public/assets/falla.jpg' }],
    { sharp, baixa: async () => { throw new Error("no té l'enllaç obert"); }, existeixFn: async () => false }
  );
  assert.equal(pendents.length, 1);
  assert.match(pendents[0].error, /enllaç obert/);
});
