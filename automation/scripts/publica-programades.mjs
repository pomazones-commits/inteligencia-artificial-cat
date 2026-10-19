// Publicació programada de les col·laboracions (19.10.2026)
// ========================================================
//
// Per què existeix: fins al 19.10.2026, cada tribuna, veu de CIVICAi o peça
// d'empresa la publicava una sessió de Claude el dia que tocava. Si la tasca no
// es disparava (el Mac d'en Rafael apagat, una sessió sense permís de push…),
// la peça no sortia. Ara la sessió (o la tasca «Cua de publicació») només deixa
// la peça, ja preparada i aprovada per en Rafael, a la cua
// `incoming/peces-programades.json`, i aquest script la publica sol el dia que toca.
//
// Format de la cua:
//
//   [{ "seccio": "veus-de-civicai",           // o "veus-de-civicai-estudi",
//                                              //   "empresa", "tribuna", "estudi"
//      "publica": "2026-10-21",               // dia de publicació (hora de Madrid)
//      "peca": { …camps de CLAUDE.md… } }]    // "date" el posa l'script
//
// Què fa amb cada entrada que ja toca (publica <= avui, a Madrid):
//   - veus-de-civicai        → al lloc per data de public/tribuna-arxiu.js (cal "serie")
//   - veus-de-civicai-estudi → al lloc per data de public/estudis-arxiu.js (cal "serie")
//   - empresa                → al davant de public/empresa.js
//   - tribuna                → public/tribuna.js; la vigent passa a tribuna-arxiu.js
//   - estudi                 → public/estudis.js; el vigent passa a estudis-arxiu.js
//   i després puja el ?v= (amb lletra) dels fitxers tocats als HTML que els
//   carreguen, VERSIO_MANUAL d'app.js i el ?v= d'app.js a index.html.
//
// Salvaguardes: si la foto de la peça encara no és a public/ (p. ex. el workflow
// fotos-drive.yml no l'ha baixada), l'entrada s'espera a la passada següent. Si ja
// hi ha publicada una peça amb el mateix títol, l'entrada es treu de la cua sense
// tornar-la a publicar. Una entrada mal formada queda a la cua amb el camp "error".
//
// Ús: node automation/scripts/publica-programades.mjs [--public public]
//       [--cua incoming/peces-programades.json] [--avui AAAA-MM-DD]
// Escriu a stdout una línia «PUBLICADA: …» per peça; acaba amb codi 1 si hi ha
// entrades amb error.

import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SECCIONS = {
  'veus-de-civicai': { fitxer: 'tribuna-arxiu.js', variable: 'IA_TRIBUNA_ARXIU', tipus: 'arxiu', serie: true },
  'veus-de-civicai-estudi': { fitxer: 'estudis-arxiu.js', variable: 'IA_ESTUDIS_ARXIU', tipus: 'arxiu', serie: true },
  empresa: { fitxer: 'empresa.js', variable: 'IA_EMPRESA', tipus: 'arxiu' },
  tribuna: { fitxer: 'tribuna.js', variable: 'IA_TRIBUNA', tipus: 'vigent', arxiu: 'tribuna-arxiu.js', variableArxiu: 'IA_TRIBUNA_ARXIU' },
  estudi: { fitxer: 'estudis.js', variable: 'IA_ESTUDI', tipus: 'vigent', arxiu: 'estudis-arxiu.js', variableArxiu: 'IA_ESTUDIS_ARXIU' }
};

// HTML que carreguen cada fitxer de dades amb ?v= (CLAUDE.md, «La tribuna» i «Veus d'empresa»).
export const HTML_DE = {
  'tribuna.js': ['tribuna.html', 'arxiu-tribuna.html'],
  'tribuna-arxiu.js': ['tribuna.html', 'arxiu-tribuna.html'],
  'estudis.js': ['estudi.html', 'arxiu-estudis.html'],
  'estudis-arxiu.js': ['estudi.html', 'arxiu-estudis.html'],
  'empresa.js': ['empresa.html']
};

const OBLIGATORIS = ['category', 'read', 'author', 'role', 'title', 'excerpt', 'body'];

export function avuiMadrid(ara = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ara);
}

export function horaMadrid(ara = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' }).format(ara);
}

export function dataPeca(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}.${m}.${a}`;
}

function clauData(dmy) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dmy || '');
  return m ? `${m[3]}${m[2]}${m[1]}` : '00000000';
}

export function validaEntrada(e) {
  if (!e || typeof e !== 'object') return 'entrada buida o mal formada';
  const s = SECCIONS[e.seccio];
  if (!s) return `secció desconeguda «${e.seccio}» (vàlides: ${Object.keys(SECCIONS).join(', ')})`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.publica || '')) return 'camp "publica" absent o no és AAAA-MM-DD';
  const p = e.peca;
  if (!p || typeof p !== 'object') return 'falta l\'objecte "peca"';
  for (const camp of OBLIGATORIS) if (!p[camp] || typeof p[camp] !== 'string') return `a la peça li falta «${camp}»`;
  if (s.serie && p.serie !== 'veus-de-civicai') return 'una veu de CIVICAi ha de portar "serie": "veus-de-civicai"';
  if (!s.serie && p.serie === 'veus-de-civicai') return `una peça amb "serie": "veus-de-civicai" no pot anar a «${e.seccio}»`;
  if (p.photo && !/^\.\/assets\/[A-Za-z0-9._-]+$/.test(p.photo)) return 'el camp "photo" ha de ser ./assets/<fitxer> o ""';
  return null;
}

/** Llegeix un fitxer de dades: retorna { capcalera, dades } (la capçalera és tot el que hi ha abans de l'assignació). */
export function llegeixDades(text, variable) {
  const re = new RegExp(`^window\\.${variable}\\s*=\\s*`, 'gm');
  const marques = [...text.matchAll(re)];
  if (!marques.length) throw new Error(`no hi ha cap «window.${variable} = …» a la columna 0`);
  const darrera = marques.at(-1);
  const json = text.slice(darrera.index + darrera[0].length).trim().replace(/;\s*$/, '');
  return { capcalera: text.slice(0, darrera.index), dades: JSON.parse(json) };
}

export function escriuDades(capcalera, variable, dades) {
  return `${capcalera}window.${variable} = ${JSON.stringify(dades, null, 2)};\n`;
}

/** Insereix una peça en una llista ordenada per data, de la més recent a la més antiga (al davant de les del mateix dia). */
export function insereixPerData(llista, peca) {
  const clau = clauData(peca.date);
  const i = llista.findIndex((x) => clauData(x.date) <= clau);
  if (i === -1) llista.push(peca); else llista.splice(i, 0, peca);
  return llista;
}

/** Nou ?v= amb lletra final (CLAUDE.md: mai només xifres). */
export function nouSegellHtml(avuiIso, hora, actual = '') {
  const base = `${avuiIso.replaceAll('-', '')}${hora}`;
  for (const lletra of 'pqrstuvwxyz') {
    const v = `${base}${lletra}`;
    if (v !== actual) return v;
  }
  return `${base}z`;
}

/** Nou segell de xifres AAAAMMDDNN, sempre més gran que l'actual. */
export function nouSegellXifres(avuiIso, actual = '') {
  const dia = avuiIso.replaceAll('-', '');
  if (actual.startsWith(dia)) {
    const n = Number(actual.slice(8)) + 1;
    return `${dia}${String(n).padStart(2, '0')}`;
  }
  return `${dia}01`;
}

async function existeix(ruta) {
  try { await access(ruta); return true; } catch { return false; }
}

export async function processa({ arrel, cua, avui, hora, fs = { readFile, writeFile, existeix } }) {
  const textos = new Map();
  const llegeix = async (fitxer) => {
    if (!textos.has(fitxer)) textos.set(fitxer, await fs.readFile(join(arrel, fitxer), 'utf8'));
    return textos.get(fitxer);
  };
  const tocats = new Set();
  const pendents = [];
  const publicades = [];
  const descartades = [];

  const ordenada = [...cua].sort((a, b) => String(a.publica).localeCompare(String(b.publica)));
  for (const e of ordenada) {
    const problema = validaEntrada(e);
    if (problema) { pendents.push({ ...e, error: problema }); continue; }
    if (e.publica > avui) { pendents.push(e); continue; }
    const { error, ...net } = e;
    const s = SECCIONS[e.seccio];
    const peca = { date: dataPeca(e.publica), ...net.peca };
    peca.date = dataPeca(e.publica);

    if (peca.photo && !(await fs.existeix(join(arrel, peca.photo.replace(/^\.\//, ''))))) {
      pendents.push({ ...net, espera: `la foto ${peca.photo} encara no és a public/` });
      continue;
    }

    // Ja publicada? (mateix títol en qualsevol fitxer de la secció)
    const fitxersSeccio = [s.fitxer, s.arxiu].filter(Boolean);
    let jaHiEs = false;
    for (const f of fitxersSeccio) {
      const variable = f === s.fitxer ? s.variable : s.variableArxiu;
      const { dades } = llegeixDades(await llegeix(f), variable);
      const llista = Array.isArray(dades) ? dades : (dades ? [dades] : []);
      if (llista.some((x) => x && x.title === peca.title)) jaHiEs = true;
    }
    if (jaHiEs) { descartades.push({ seccio: e.seccio, title: peca.title, motiu: 'ja estava publicada' }); continue; }

    if (s.tipus === 'arxiu') {
      const { capcalera, dades } = llegeixDades(await llegeix(s.fitxer), s.variable);
      insereixPerData(dades, peca);
      textos.set(s.fitxer, escriuDades(capcalera, s.variable, dades));
      tocats.add(s.fitxer);
    } else {
      const vigent = llegeixDades(await llegeix(s.fitxer), s.variable);
      if (vigent.dades) {
        const arxiu = llegeixDades(await llegeix(s.arxiu), s.variableArxiu);
        insereixPerData(arxiu.dades, vigent.dades);
        textos.set(s.arxiu, escriuDades(arxiu.capcalera, s.variableArxiu, arxiu.dades));
        tocats.add(s.arxiu);
      }
      textos.set(s.fitxer, escriuDades(vigent.capcalera, s.variable, peca));
      tocats.add(s.fitxer);
    }
    publicades.push({ seccio: e.seccio, date: peca.date, author: peca.author, title: peca.title });
  }

  if (tocats.size) {
    // ?v= dels fitxers tocats als HTML que els carreguen
    const htmls = new Set([...tocats].flatMap((f) => HTML_DE[f] || []));
    for (const h of htmls) {
      let text = await llegeix(h);
      for (const f of tocats) {
        const re = new RegExp(`(src="\\./${f.replace('.', '\\.')}\\?v=)([0-9A-Za-z]+)(")`, 'g');
        text = text.replace(re, (_, a, actual, c) => `${a}${nouSegellHtml(avui, hora, actual)}${c}`);
      }
      textos.set(h, text);
      tocats.add(h);
    }
    // VERSIO_MANUAL d'app.js i ?v= d'app.js a index.html
    let app = await llegeix('app.js');
    app = app.replace(/(const VERSIO_MANUAL = ')(\d+)(';)/, (_, a, actual, c) => `${a}${nouSegellXifres(avui, actual)}${c}`);
    textos.set('app.js', app);
    tocats.add('app.js');
    let index = await llegeix('index.html');
    index = index.replace(/(src="\.\/app\.js\?v=)(\d+)(")/, (_, a, actual, c) => `${a}${nouSegellXifres(avui, actual)}${c}`);
    textos.set('index.html', index);
    tocats.add('index.html');

    for (const f of tocats) await fs.writeFile(join(arrel, f), textos.get(f));
  }

  pendents.sort((a, b) => String(a.publica).localeCompare(String(b.publica)));
  return { publicades, pendents, descartades, tocats: [...tocats] };
}

async function main() {
  const args = process.argv.slice(2);
  const opcio = (nom, defecte) => { const i = args.indexOf(nom); return i !== -1 ? args[i + 1] : defecte; };
  const arrel = opcio('--public', 'public');
  const rutaCua = opcio('--cua', 'incoming/peces-programades.json');
  const avui = opcio('--avui', avuiMadrid());
  const hora = horaMadrid();

  let cua = [];
  try { cua = JSON.parse(await readFile(rutaCua, 'utf8')); } catch { cua = []; }
  if (!Array.isArray(cua) || !cua.length) { console.log('Cua buida: cap peça programada.'); return; }

  const { publicades, pendents, descartades } = await processa({ arrel, cua, avui, hora });
  for (const p of publicades) console.log(`PUBLICADA: ${p.seccio} · ${p.date} · ${p.author} — ${p.title}`);
  for (const d of descartades) console.log(`== Fora de la cua (${d.motiu}): ${d.seccio} — ${d.title}`);
  for (const p of pendents) {
    if (p.error) console.log(`::error::${p.seccio || '?'} ${p.publica || '?'}: ${p.error}`);
    else if (p.espera) console.log(`::warning::${p.seccio} ${p.publica} (${p.peca.author}): ${p.espera}; es torna a provar a la passada següent.`);
    else console.log(`.. Programada: ${p.seccio} · ${p.publica} · ${p.peca.author}`);
  }
  await writeFile(rutaCua, JSON.stringify(pendents, null, 2) + '\n');
  if (pendents.some((p) => p.error)) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
