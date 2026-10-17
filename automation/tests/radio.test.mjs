// Tests de la recollida automàtica de «La IA a la ràdio» (17.10.2026).
// node --test automation/tests/radio.test.mjs
// Separats dels del Content Hub a propòsit: un error en aquesta secció no ha
// d'aturar mai la publicació dels lots de notícies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  dataIso, durada, segonsDe, textPla, llegeix3Cat, llegeixRtve, llegeixOmny,
  recull, incorpora, firma
} from '../scripts/recull-radio.mjs';

const ARA = new Date('2026-10-17T08:00:00Z');

const dadesBase = () => ({
  actualitzat: '2026-10-11',
  temes: { societat: 'Societat', eines: 'Eines' },
  emissores: {
    'Catalunya Ràdio': { web: 'https://www.3cat.cat/catradio/' },
    'Ràdio 4': { web: 'https://www.rtve.es/play/radio/radio-4/' },
    RAC1: { web: 'https://www.rac1.cat/' }
  },
  intervencions: [{
    id: '3cat-1293456', emissora: 'Catalunya Ràdio', programa: 'Revolució 4.0',
    programa_url: 'https://www.3cat.cat/3cat/revolucio/', data: '2026-10-10', durada: '53 min',
    titol: 'Metges que no existeixen', convidats: [{ nom: 'Marc Amorós', rol: 'periodista' }],
    resum: Array(35).fill('paraula').join(' '), tema: 'societat',
    url: 'https://www.3cat.cat/3cat/metges/audio/1293456/', reproductor: { tipus: '3cat', id: '1293456' }
  }]
});

const fonts = {
  dies: 21, durada_minima_min: 3, omny_org: 'org',
  programes: [
    { font: '3cat', id: 1780, emissora: 'Catalunya Ràdio', programa: 'Revolució 4.0', programa_url: 'https://www.3cat.cat/3cat/revolucio/' },
    { font: 'rtve', id: 1030997, emissora: 'Ràdio 4', programa: 'La tàctica', programa_url: 'https://www.rtve.es/play/audios/la-tactica/' },
    { font: 'omny', slug: 'via-lliure', emissora: 'RAC1', programa: 'Via lliure' }
  ]
};

const resposta3Cat = {
  resposta: { paginacio: { total_items: 4 }, items: { item: [
    // ja publicada: no ha de sortir
    { id: 1293456, titol: 'La IA fabrica metges', entradeta: 'La intel·ligència artificial...', data_publicacio: '10/10/2026 12:00:00', durada: '00:53:00' },
    // nova i sobre IA (a la descripció)
    { id: 1294001, titol: 'Robots a casa', nom_friendly: 'robots-a-casa', entradeta: '<p>Parlem de com la <b>intel·ligència artificial</b> entra a les llars &amp; a les feines.</p>', data_publicacio: '16/10/2026 21:00:00', durada: '00:48:30' },
    // sobre IA però massa curta (un tall d'un minut)
    { id: 1294002, titol: 'Un minut d\'IA', entradeta: 'IA', data_publicacio: '15/10/2026 08:00:00', durada: '00:01:10' },
    // no parla d'IA
    { id: 1294003, titol: 'El futbol del cap de setmana', entradeta: 'Resultats', data_publicacio: '16/10/2026 10:00:00', durada: '00:30:00' },
    // massa antiga
    { id: 1280000, titol: 'La IA i l\'escola', entradeta: 'IA', data_publicacio: '01/09/2026 10:00:00', durada: '00:30:00' }
  ] } }
};

const respostaRtve = { page: { items: [
  { id: 17270001, title: 'La tàctica - ChatGPT a l\'aula', description: '<p>Debat sobre models de llenguatge a l\'escola.</p>', publicationDate: '15-10-2026 18:00:00', duration: 3300000, htmlUrl: 'https://www.rtve.es/play/audios/la-tactica/tactica-chatgpt-aula/17270001/' },
  { id: 17270002, title: 'La tàctica - Política municipal', description: 'Res a veure', publicationDate: '15-10-2026 19:00:00', duration: 3300000, htmlUrl: 'https://www.rtve.es/play/audios/la-tactica/politica/17270002/' }
] } };

const respostaOmnyProgrames = { Programs: [{ Id: 'p1', Slug: 'via-lliure-entrevista' }, { Id: 'p2', Slug: 'versio-rac1' }] };
const respostaOmnyClips = { Clips: [
  { Id: 'c1', Title: 'Pep Martorell sobre la IA', Description: 'Entrevista sobre intel·ligència artificial', PublishedUtc: '2026-10-14T09:00:00Z', DurationSeconds: 1500, EmbedUrl: 'https://omny.fm/shows/via-lliure-entrevista/pep-martorell-sobre-la-ia/embed' }
] };

async function ambFixtures() {
  const dir = await mkdtemp(join(tmpdir(), 'radio-'));
  await writeFile(join(dir, '3cat-1780.json'), JSON.stringify(resposta3Cat));
  await writeFile(join(dir, 'rtve-1030997.json'), JSON.stringify(respostaRtve));
  await writeFile(join(dir, 'omny-programes.json'), JSON.stringify(respostaOmnyProgrames));
  await writeFile(join(dir, 'omny-via-lliure-entrevista.json'), JSON.stringify(respostaOmnyClips));
  return dir;
}

const obtenirDe = dir => async clau => JSON.parse(await readFile(join(dir, `${clau}.json`), 'utf8'));

test('formats de data i durada de les emissores', () => {
  assert.equal(dataIso('16/10/2026 21:00:00'), '2026-10-16');
  assert.equal(dataIso('5-10-2026 08:00:00'), '2026-10-05');
  assert.equal(dataIso('2026-10-14T09:00:00Z'), '2026-10-14');
  assert.equal(segonsDe('00:48:30'), 2910);
  assert.equal(segonsDe('48:30'), 2910);
  assert.equal(durada(2910), '49 min');
  assert.equal(durada(3720), '1 h 2 min');
  assert.equal(durada(0), '');
  assert.equal(textPla('<p>A &amp; B&nbsp;<b>C</b></p>'), 'A & B C');
  // RTVE escapa l'HTML dues vegades.
  assert.equal(textPla('atenci&amp;oacute; telef&ograve;nica, l&rsquo;acord, can&ccedil;\u00f3, q&uuml;esti&oacute;'), 'atenció telefònica, l’acord, cançó, qüestió');
});

test('lectors de 3Cat, RTVE i Omny', () => {
  const a = llegeix3Cat(resposta3Cat).find(x => x.font_id === '1294001');
  assert.equal(a.url, 'https://www.3cat.cat/3cat/robots-a-casa/audio/1294001/');
  assert.deepEqual(a.reproductor, { tipus: '3cat', id: '1294001' });
  const r = llegeixRtve(respostaRtve)[0];
  assert.equal(r.data, '2026-10-15');
  assert.equal(r.segons, 3300);
  const o = llegeixOmny(respostaOmnyClips)[0];
  assert.equal(o.reproductor.id, 'via-lliure-entrevista/pep-martorell-sobre-la-ia');
  assert.equal(o.url, 'https://omny.fm/shows/via-lliure-entrevista/pep-martorell-sobre-la-ia');
});

test('recull: només àudios nous, sobre IA, recents i de més de 3 minuts', async () => {
  const dir = await ambFixtures();
  const r = await recull({ fonts, dades: dadesBase(), ara: ARA, obtenir: obtenirDe(dir) });
  assert.deepEqual(r.candidats.map(c => c.id), ['3cat-1294001', 'rtve-17270001', 'rac1-20261014-pep-martorell-sobre-la-ia']);
  assert.ok(r.fonts.every(f => f.estat === 'ok'));
  const c = r.candidats[0];
  assert.equal(c.durada, '49 min');
  assert.equal(c.programa, 'Revolució 4.0');
  assert.match(c.descripcio_original, /intel·ligència artificial entra a les llars & a les feines/);
  assert.equal(c.ia_al_titol, false);
});

test('recull: els descartats no tornen a sortir', async () => {
  const dir = await ambFixtures();
  const r = await recull({ fonts, dades: dadesBase(), descartats: [{ id: 'rtve-17270001', data: '2026-10-16' }], ara: ARA, obtenir: obtenirDe(dir) });
  assert.ok(!r.candidats.some(c => c.id === 'rtve-17270001'));
});

test('recull: una font caiguda conserva els candidats que ja havia donat', async () => {
  const dir = await ambFixtures();
  const primer = await recull({ fonts, dades: dadesBase(), ara: ARA, obtenir: obtenirDe(dir) });
  const caiguda = async (clau, url) => { if (clau.startsWith('rtve')) throw new Error('HTTP 503'); return obtenirDe(dir)(clau, url); };
  const segon = await recull({ fonts, dades: dadesBase(), anterior: primer, ara: ARA, obtenir: caiguda });
  assert.ok(segon.candidats.some(c => c.id === 'rtve-17270001'));
  assert.equal(segon.fonts.find(f => f.font === 'rtve').estat, 'error');
  // I la firma només canvia per l'estat de la font, no per l'hora.
  const tercer = await recull({ fonts, dades: dadesBase(), anterior: primer, ara: new Date(ARA.getTime() + 3600e3), obtenir: obtenirDe(dir) });
  assert.equal(firma(tercer), firma(primer));
  assert.notEqual(firma(segon), firma(primer));
});

const fitxaNova = () => ({
  id: '3cat-1294001', emissora: 'Catalunya Ràdio', programa: 'Revolució 4.0',
  programa_url: 'https://www.3cat.cat/3cat/revolucio/', data: '2026-10-16', durada: '49 min',
  titol: 'La IA entra a casa', convidats: [{ nom: 'Algú', rol: 'investigadora' }],
  resum: Array(40).fill('mot').join(' '), tema: 'eines',
  url: 'https://www.3cat.cat/3cat/robots-a-casa/audio/1294001/', reproductor: { tipus: '3cat', id: '1294001' }
});

test('incorpora: afegeix les fitxes vàlides, ordenades i amb la data al dia', () => {
  const r = incorpora({ dades: dadesBase(), entrada: { fitxes: [fitxaNova()] }, avui: '2026-10-17' });
  assert.deepEqual(r.afegides, ['3cat-1294001']);
  assert.equal(r.dades.intervencions[0].id, '3cat-1294001');
  assert.equal(r.dades.actualitzat, '2026-10-17');
  assert.deepEqual(r.avisos, []);
});

test('incorpora: rebutja la fitxa que no passa la validació i no toca la resta', () => {
  const dolenta = { ...fitxaNova(), resum: 'massa curt' };
  const r = incorpora({ dades: dadesBase(), entrada: { fitxes: [dolenta] }, avui: '2026-10-17' });
  assert.deepEqual(r.afegides, []);
  assert.equal(r.avisos.length, 1);
  assert.match(r.avisos[0], /paraules/);
  assert.equal(r.dades.intervencions.length, 1);
  assert.equal(r.dades.actualitzat, '2026-10-11');
});

test('incorpora: és idempotent i registra els descartats', () => {
  const primer = incorpora({ dades: dadesBase(), entrada: { fitxes: [fitxaNova()], descartats: [{ id: 'rtve-17270001', motiu: 'secció d\'humor' }] }, avui: '2026-10-17' });
  const segon = incorpora({ dades: primer.dades, entrada: { fitxes: [fitxaNova()], descartats: ['rtve-17270001'] }, descartats: primer.descartats, avui: '2026-10-17' });
  assert.deepEqual(segon.afegides, []);
  assert.equal(segon.dades.intervencions.length, 2);
  assert.equal(segon.descartats.length, 1);
  assert.equal(segon.descartatsNous, 0);
});

test('el validador continua funcionant com a ordre i amb les dades reals', () => {
  const sortida = execFileSync('node', ['scripts/valida-radio.mjs'], { encoding: 'utf8' });
  assert.match(sortida, /radio\.json correcte/);
});
