#!/usr/bin/env node
// Vídeos associats a les notícies (prova pilot des del 06.10.2026).
//
// La sessió editorial pot posar a una notícia un camp opcional
//   "video": { "url": "https://www.youtube.com/watch?v=…", "idioma": "en", "resum": "…" }
// però el seu sandbox no arriba a YouTube i no pot comprovar si el vídeo existeix,
// si és públic o si deixa inserir-se en altres webs. Ho fa aquest script, des de
// GitHub Actions (content-hub.yml), ABANS d'ingerir el lot:
//
//   - Consulta l'oEmbed públic de YouTube (no cal cap clau d'API).
//   - Si respon bé, hi afegeix l'identificador, el títol i el canal REALS (no els
//     que hagi escrit la sessió) i `verificat` amb la data d'avui.
//   - Si el vídeo no existeix, és privat o té la inserció desactivada (404/401/403)
//     o YouTube no respon després de dos intents, treu el camp `video`.
//
// content-hub.mjs només publica vídeos amb `verificat`. Aquest script MAI no
// atura la publicació: acaba sempre amb codi 0.
//
// Ús: node automation/scripts/videos.mjs --input incoming/news-batch.json [--dry-run]

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (ID_RE.test(text)) return text;
  let url;
  try { url = new URL(text); } catch { return ''; }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/')[1] || '';
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v') || '';
    const match = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
    if (!id && match) id = match[1];
  }
  return ID_RE.test(id) ? id : '';
}

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

async function oembed(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (response.ok) return { ok: true, data: await response.json() };
      // 401/403: inserció desactivada o privat; 404/400: no existeix. No cal reintentar.
      if ([400, 401, 403, 404].includes(response.status)) return { ok: false, reason: `HTTP ${response.status}` };
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
  }
  return { ok: false, reason: `sense resposta (${lastError})` };
}

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const input = inputIndex >= 0 ? args[inputIndex + 1] : '';
  const dryRun = args.includes('--dry-run');
  if (!input) {
    console.log('videos: falta --input; no faig res.');
    return;
  }
  const path = resolve(input);
  let payload;
  try {
    payload = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    console.log(`videos: no puc llegir ${input} (${error.message}); ho deixo com està.`);
    return;
  }
  const items = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(items)) return;

  let changed = false;
  for (const item of items) {
    if (!item || typeof item !== 'object' || !('video' in item)) continue;
    const video = item.video;
    const slug = item.slug || '(sense slug)';
    const id = youtubeId(video?.id) || youtubeId(video?.url);
    if (!id) {
      console.log(`videos: ${slug}: no és cap URL de YouTube vàlida; trec el vídeo.`);
      delete item.video;
      changed = true;
      continue;
    }
    // Es comprova sempre, també en una repesca: és barat i el `verificat` no
    // l'ha de poder posar mai la sessió editorial.
    const result = await oembed(id);
    if (!result.ok) {
      console.log(`::warning::videos: ${slug}: el vídeo ${id} no es pot inserir (${result.reason}); el trec.`);
      delete item.video;
      changed = true;
      continue;
    }
    const { title, author_name: canal, author_url: canalUrl } = result.data || {};
    item.video = {
      ...video,
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      titol: typeof title === 'string' ? title : '',
      canal: typeof canal === 'string' ? canal : '',
      canalUrl: typeof canalUrl === 'string' ? canalUrl : '',
      verificat: today()
    };
    console.log(`videos: ${slug}: d'acord — «${item.video.titol}» (${item.video.canal}).`);
    changed = true;
  }

  if (changed && !dryRun) {
    await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.log(`::warning::videos: error inesperat (${error.message}); el lot es publica igualment.`);
  });
}
