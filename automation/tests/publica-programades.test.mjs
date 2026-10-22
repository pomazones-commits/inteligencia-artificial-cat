// Proves d'automation/scripts/publica-programades.mjs (19.10.2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validaEntrada, insereixPerData, nouSegellHtml, nouSegellXifres, llegeixDades, escriuDades, processa, dataPeca
} from '../scripts/publica-programades.mjs';

const peca = (extra = {}) => ({
  category: 'TRIBUNA', read: '4 MIN', author: 'Autora', role: 'Càrrec', title: 'Títol', excerpt: 'Entradeta', body: 'Cos', photo: './assets/hi-es.jpg', ...extra
});

function fsFals(fitxers) {
  const escrits = {};
  return {
    escrits,
    fs: {
      readFile: async (r) => { const k = r.replace(/^.*\/public\//, ''); if (!(k in fitxers)) throw new Error('no hi és: ' + k); return fitxers[k]; },
      writeFile: async (r, t) => { escrits[r.replace(/^.*\/public\//, '')] = t; },
      existeix: async (r) => r.endsWith('hi-es.jpg')
    }
  };
}

const BASE = {
  'tribuna.js': '// capçalera\nwindow.IA_TRIBUNA = ' + JSON.stringify({ date: '17.10.2026', title: 'Vigent', author: 'A' }) + ';\n',
  'tribuna-arxiu.js': '// arxiu\nwindow.IA_TRIBUNA_ARXIU = ' + JSON.stringify([{ date: '15.10.2026', title: 'X', author: 'S' }, { date: '12.10.2026', title: 'Y', author: 'M' }]) + ';\n',
  'empresa.js': '/* empresa */\nwindow.IA_EMPRESA = ' + JSON.stringify([{ date: '15.10.2026', title: 'E', author: 'Y' }]) + ';\n',
  'tribuna.html': '<script src="./tribuna.js?v=2026101701a"></script>\n<script src="./tribuna-arxiu.js?v=2026101701a"></script>',
  'arxiu-tribuna.html': '<script src="./tribuna.js?v=2026101701a"></script>\n<script src="./tribuna-arxiu.js?v=2026101701a"></script>',
  'empresa.html': '<script src="./empresa.js?v=2026101601a"></script>',
  'app.js': "  const VERSIO_MANUAL = '2026101702';\n",
  'index.html': '<script defer src="./app.js?v=2026101802"></script>'
};

test('valida les seccions i la sèrie de CIVICAi', () => {
  assert.equal(validaEntrada({ seccio: 'empresa', publica: '2026-10-20', peca: peca() }), null);
  assert.match(validaEntrada({ seccio: 'veus-de-civicai', publica: '2026-10-21', peca: peca() }), /serie/);
  assert.match(validaEntrada({ seccio: 'tribuna', publica: '2026-10-21', peca: peca({ serie: 'veus-de-civicai' }) }), /no pot anar/);
  // 22.10.2026: «Veus de l'administració» és una secció com CIVICAi.
  assert.equal(validaEntrada({ seccio: 'veus-de-l-administracio', publica: '2026-10-27', peca: peca({ serie: 'veus-de-l-administracio' }) }), null);
  assert.equal(validaEntrada({ seccio: 'veus-de-l-administracio-estudi', publica: '2026-10-27', peca: peca({ serie: 'veus-de-l-administracio' }) }), null);
  assert.match(validaEntrada({ seccio: 'veus-de-l-administracio', publica: '2026-10-27', peca: peca() }), /serie/);
  assert.match(validaEntrada({ seccio: 'tribuna', publica: '2026-10-27', peca: peca({ serie: 'veus-de-l-administracio' }) }), /no pot anar/);
  assert.match(validaEntrada({ seccio: 'res', publica: '2026-10-21', peca: peca() }), /desconeguda/);
  assert.match(validaEntrada({ seccio: 'empresa', publica: '21.10.2026', peca: peca() }), /AAAA-MM-DD/);
});

test('insereix per data, al davant de les del mateix dia', () => {
  const l = [{ date: '15.10.2026', title: 'a' }, { date: '12.10.2026', title: 'b' }];
  insereixPerData(l, { date: '14.10.2026', title: 'c' });
  insereixPerData(l, { date: '15.10.2026', title: 'd' });
  assert.deepEqual(l.map((x) => x.title), ['d', 'a', 'c', 'b']);
});

test('els segells dels HTML porten lletra i els de xifres sempre pugen', () => {
  assert.match(nouSegellHtml('2026-10-21', '06', '2026101701a'), /^2026102106[a-z]$/);
  assert.notEqual(nouSegellHtml('2026-10-21', '06', '2026102106p'), '2026102106p');
  assert.equal(nouSegellXifres('2026-10-21', '2026101702'), '2026102101');
  assert.equal(nouSegellXifres('2026-10-21', '2026102101'), '2026102102');
});

test('llegeix i reescriu un fitxer de dades sense perdre la capçalera', () => {
  const { capcalera, dades } = llegeixDades(BASE['tribuna-arxiu.js'], 'IA_TRIBUNA_ARXIU');
  assert.equal(capcalera, '// arxiu\n');
  const text = escriuDades(capcalera, 'IA_TRIBUNA_ARXIU', dades);
  assert.deepEqual(llegeixDades(text, 'IA_TRIBUNA_ARXIU').dades, dades);
});

test('no publica res abans d\'hora', async () => {
  const { fs, escrits } = fsFals(BASE);
  const r = await processa({ arrel: '/x/public', avui: '2026-10-19', hora: '06', fs,
    cua: [{ seccio: 'empresa', publica: '2026-10-20', peca: peca() }] });
  assert.equal(r.publicades.length, 0);
  assert.equal(r.pendents.length, 1);
  assert.deepEqual(escrits, {});
});

test('publica una veu de CIVICAi a l\'arxiu i puja les versions', async () => {
  const { fs, escrits } = fsFals(BASE);
  const r = await processa({ arrel: '/x/public', avui: '2026-10-21', hora: '06', fs,
    cua: [{ seccio: 'veus-de-civicai', publica: '2026-10-21', peca: peca({ serie: 'veus-de-civicai', title: 'Nova' }) }] });
  assert.equal(r.publicades.length, 1);
  const arxiu = llegeixDades(escrits['tribuna-arxiu.js'], 'IA_TRIBUNA_ARXIU').dades;
  assert.equal(arxiu[0].title, 'Nova');
  assert.equal(arxiu[0].date, dataPeca('2026-10-21'));
  assert.ok(!('tribuna.js' in escrits), 'una veu no toca la tribuna vigent');
  assert.match(escrits['tribuna.html'], /tribuna-arxiu\.js\?v=2026102106p/);
  assert.match(escrits['app.js'], /VERSIO_MANUAL = '2026102101'/);
  assert.match(escrits['index.html'], /app\.js\?v=2026102101/);
});

test('una tribuna nova envia la vigent a l\'arxiu', async () => {
  const { fs, escrits } = fsFals(BASE);
  await processa({ arrel: '/x/public', avui: '2026-10-22', hora: '06', fs,
    cua: [{ seccio: 'tribuna', publica: '2026-10-22', peca: peca({ title: 'Tribuna nova' }) }] });
  assert.equal(llegeixDades(escrits['tribuna.js'], 'IA_TRIBUNA').dades.title, 'Tribuna nova');
  const arxiu = llegeixDades(escrits['tribuna-arxiu.js'], 'IA_TRIBUNA_ARXIU').dades;
  assert.deepEqual(arxiu.map((x) => x.title), ['Vigent', 'X', 'Y']);
});

test('espera la foto si encara no és al web', async () => {
  const { fs } = fsFals(BASE);
  const r = await processa({ arrel: '/x/public', avui: '2026-10-21', hora: '06', fs,
    cua: [{ seccio: 'empresa', publica: '2026-10-20', peca: peca({ photo: './assets/falta.jpg' }) }] });
  assert.equal(r.publicades.length, 0);
  assert.match(r.pendents[0].espera, /encara no és/);
});

test('no publica cap peça sense foto', async () => {
  const { fs } = fsFals(BASE);
  const r = await processa({ arrel: '/x/public', avui: '2026-10-21', hora: '06', fs,
    cua: [{ seccio: 'empresa', publica: '2026-10-20', peca: peca({ photo: '' }) }] });
  assert.equal(r.publicades.length, 0);
  assert.match(r.pendents[0].espera, /falta la foto/);
});

test('no torna a publicar una peça que ja hi és', async () => {
  const { fs, escrits } = fsFals(BASE);
  const r = await processa({ arrel: '/x/public', avui: '2026-10-21', hora: '06', fs,
    cua: [{ seccio: 'empresa', publica: '2026-10-20', peca: peca({ title: 'E' }) }] });
  assert.equal(r.publicades.length, 0);
  assert.equal(r.descartades.length, 1);
  assert.equal(r.pendents.length, 0);
  assert.deepEqual(escrits, {});
});
