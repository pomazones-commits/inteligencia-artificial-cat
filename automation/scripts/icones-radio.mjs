#!/usr/bin/env node
// Logos de les emissores de «La IA a la ràdio» (11.10.2026). Ús:
//   node automation/scripts/icones-radio.mjs [--public-dir public]
//
// En Rafael va voler el logo de cada ràdio a les fitxes de /radio i a la banda
// de portada. Igual que les icones dels diaris del ressò de premsa
// (recull-premsa.mjs, d'on s'importen les comprovacions), la icona oficial de
// cada emissora (camp «icona» de public/data/radio.json → «emissores») es baixa
// UNA sola vegada i es desa AL NOSTRE SERVIDOR, a public/assets/radio/<nom>.<ext>:
// el lector no fa mai cap petició a l'emissora (vegeu l'avís legal). Si el
// fitxer ja hi és, no es torna a baixar; per renovar-lo, esborra'l.
//
// Escriu public/data/radio-icones.json ({"Nom de l'emissora": "/assets/radio/…"}),
// que llegeixen radio.php i radio-portada.js. Idempotent: si no hi ha cap icona
// nova, no canvia cap fitxer. Una icona que no es pot baixar només deixa un avís:
// la fitxa surt amb la inicial de l'emissora.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { iconaAcceptable, netejaSvg, slugMitja } from './recull-premsa.mjs';

export const DIR_ICONES_RADIO = 'assets/radio';
const UA = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8',
  'accept-language': 'ca,es;q=0.8,en;q=0.6'
};

async function locals(publicDir) {
  const mapa = new Map();
  let fitxers = [];
  try { fitxers = await readdir(join(publicDir, DIR_ICONES_RADIO)); } catch { return mapa; }
  for (const f of fitxers.sort()) {
    const m = /^([a-z0-9-]+)\.(png|svg|webp|jpg|ico)$/.exec(f);
    if (m && !mapa.has(m[1])) mapa.set(m[1], `/${DIR_ICONES_RADIO}/${f}`);
  }
  return mapa;
}

export async function principal(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--public-dir');
  const publicDir = i >= 0 ? argv[i + 1] : 'public';
  const dades = JSON.parse(await readFile(join(publicDir, 'data', 'radio.json'), 'utf8'));
  const emissores = Object.entries(dades.emissores || {});
  const tenim = await locals(publicDir);

  for (const [nom, e] of emissores) {
    const clau = slugMitja(nom);
    if (!clau || tenim.has(clau) || !/^https:\/\/[^\s"'<>]+$/.test(e?.icona || '')) continue;
    try {
      const r = await fetch(e.icona, { signal: AbortSignal.timeout(15000), headers: UA, redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const ext = iconaAcceptable(r.headers.get('content-type'), bytes, e.icona);
      if (!ext) throw new Error(`no és una icona acceptable (${r.headers.get('content-type')}, ${bytes.length} bytes)`);
      await mkdir(join(publicDir, DIR_ICONES_RADIO), { recursive: true });
      await writeFile(join(publicDir, DIR_ICONES_RADIO, `${clau}.${ext}`), ext === 'svg' ? netejaSvg(Buffer.from(bytes).toString('utf8')) : bytes);
      tenim.set(clau, `/${DIR_ICONES_RADIO}/${clau}.${ext}`);
      console.log(`Icona desada: ${nom} → /${DIR_ICONES_RADIO}/${clau}.${ext}`);
    } catch (error) {
      console.warn(`::warning::Icona de ${nom} no baixada (${error.message}); la fitxa surt amb la inicial.`);
    }
  }

  const mapa = {};
  for (const [nom] of emissores) {
    const ruta = tenim.get(slugMitja(nom));
    if (ruta) mapa[nom] = ruta;
  }
  const ruta = join(publicDir, 'data', 'radio-icones.json');
  const nou = `${JSON.stringify(mapa, null, 1)}\n`;
  let vell = '';
  try { vell = await readFile(ruta, 'utf8'); } catch { /* encara no existeix */ }
  if (vell !== nou) {
    await writeFile(ruta, nou);
    console.log(`Desat ${ruta} (${Object.keys(mapa).length} de ${emissores.length} emissores amb icona)`);
  } else {
    console.log('Cap icona nova.');
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  principal().then(code => process.exit(code)).catch(error => {
    console.warn(`::warning::Icones de ràdio interrompudes: ${error?.stack || error}`);
    process.exit(0);
  });
}
