/*
  Producció editorial diària: RSS -> resum en català -> imatge original -> JSON del web.
  Es deixa en mode esborrany per defecte. Activa PUBLISH_MODE=auto només quan el
  criteri editorial i les fonts hagin estat acordats.
*/
import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';

const root = process.cwd();
const out = path.join(root, 'public/content/latest.json');
const imageDir = path.join(root, 'public/assets/daily');
const feeds = [
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.technologyreview.com/topic/artificial-intelligence/feed/'
];
const strip = (s = '') => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const between = (item, tag) => (item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [])[1] || '';
function readRss(xml) {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(m => ({title: strip(between(m[0], 'title')), url: strip(between(m[0], 'link')), description: strip(between(m[0], 'description'))})).filter(x => x.title && x.url);
}
async function fetchStories() {
  const all = await Promise.all(feeds.map(async url => { try { return readRss(await (await fetch(url, {headers:{'user-agent':'IAcat editorial bot/1.0'}})).text()); } catch { return []; } }));
  return all.flat().slice(0, 10);
}
function extractJson(text) { const match = text.match(/\{[\s\S]*\}/); if (!match) throw new Error('El model no ha retornat JSON.'); return JSON.parse(match[0]); }
async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('Falta OPENAI_API_KEY. Desa-la com a secret, mai al codi.');
  const sources = await fetchStories();
  if (!sources.length) throw new Error('No s’han pogut llegir fonts RSS.');
  const client = new OpenAI();
  const brief = `Ets l’editor d’un mitjà català. A partir NOMÉS d’aquestes fonts, selecciona 3 notícies d’interès general sobre IA. No inventis dades, titulars ni atribucions. Redacta en català clar. Respon només JSON vàlid: {"items":[{"category":"MÓN|SOCIETAT|EINES|RECERCA","read":"X MIN","title":"...","excerpt":"...","url":"URL original","source":"mitjà"}]}. Fonts: ${JSON.stringify(sources)}`;
  const response = await client.responses.create({ model: 'gpt-5', input: brief });
  const edition = extractJson(response.output_text);
  if (!Array.isArray(edition.items) || edition.items.length < 1) throw new Error('Edició invàlida.');
  await fs.mkdir(imageDir, {recursive:true});
  const date = new Date().toISOString().slice(0,10);
  for (const [index, item] of edition.items.entries()) {
    const image = await client.images.generate({ model: 'gpt-image-2', size: '1536x1024', prompt: `Editorial news illustration for an article titled “${item.title}”. Concept: ${item.excerpt}. Cinematic Catalan cultural magazine art direction, abstract and human-centred, dark navy, ultraviolet, electric cyan and restrained warm amber, no words, no logos, no watermark, no recognisable people.` });
    const imageName = `${date}-${index + 1}.png`;
    if (image.data?.[0]?.b64_json) {
      await fs.writeFile(path.join(imageDir, imageName), Buffer.from(image.data[0].b64_json, 'base64'));
      item.image = `/assets/daily/${imageName}`;
    }
  }
  const document = { updatedAt: new Date().toISOString(), generated: true, items: edition.items };
  await fs.writeFile(out, JSON.stringify(document, null, 2) + '\n');
  console.log(`Edició creada: ${edition.items.length} peces amb imatges originals.`);
}
main().catch(err => { console.error(err.message); process.exit(1); });
