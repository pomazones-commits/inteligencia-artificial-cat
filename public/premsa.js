/* Ressò de premsa a la portada (10.10.2026).
   Banda #premsa: què publiquen avui els diaris sobre IA. Llegeix
   public/data/premsa.json, que omple sol el workflow premsa.yml
   (automation/scripts/recull-premsa.mjs) amb el RSS públic dels diaris de
   automation/press-sources.json. Només titular, mitjà, hora i enllaç: el text és
   del diari i s'hi llegeix.

   Primer les peces que la sessió editorial ha destacat (amb el seu comentari),
   després les més recents de les últimes 36 hores, com a màxim dues per diari
   perquè no ho ompli un sol mitjà. Si n'hi ha menys de tres, la banda no surt.
   Banda pròpia amb CSS propi (premsa.css): no es toca portada.css. */
(() => {
  'use strict';
  const banda = document.getElementById('premsa');
  if (!banda || !window.fetch) return;

  const MAX = 8;
  const PER_DIARI = 2;
  const HORES = 36;
  const LLENGUA = { es: 'en castellà', en: 'en anglès', fr: 'en francès' };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const urlSegura = value => /^https:\/\/[^\s"'<>]+$/.test(String(value || '')) ? String(value) : '';

  function quan(iso, ara) {
    const t = Date.parse(iso);
    const min = Math.max(0, Math.round((ara - t) / 60000));
    if (min < 60) return min <= 1 ? 'ara mateix' : `fa ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `fa ${h} h`;
    const dia = new Intl.DateTimeFormat('ca', { timeZone: 'Europe/Madrid', weekday: 'long' }).format(new Date(t));
    return h < 48 ? 'ahir' : dia;
  }

  function tria(articles, ara) {
    const limit = ara - HORES * 3600000;
    const vius = articles.filter(p => p && urlSegura(p.url) && p.titol && Date.parse(p.publicat) >= limit);
    const destacats = vius.filter(p => p.destacat && p.comentari).slice(0, 3);
    const triats = [...destacats];
    const perDiari = new Map();
    for (const p of destacats) perDiari.set(p.mitja, (perDiari.get(p.mitja) || 0) + 1);
    for (const p of vius) {
      if (triats.length >= MAX) break;
      if (triats.includes(p)) continue;
      const n = perDiari.get(p.mitja) || 0;
      if (n >= PER_DIARI) continue;
      perDiari.set(p.mitja, n + 1);
      triats.push(p);
    }
    return triats;
  }

  function peca(p, ara) {
    const url = urlSegura(p.url);
    const llengua = LLENGUA[p.llengua] ? `<span class="premsa-peca__llengua">${LLENGUA[p.llengua]}</span>` : '';
    const nostra = /^[a-z0-9-]+$/.test(p.noticia || '') ? `<a class="premsa-peca__nostra" href="/article.php?slug=${esc(p.noticia)}">La notícia a IA.cat</a>` : '';
    return `<li class="premsa-peca${p.destacat && p.comentari ? ' premsa-peca--destacada' : ''}">
        <p class="premsa-peca__meta"><strong>${esc(p.mitja)}</strong><time datetime="${esc(p.publicat)}">${esc(quan(p.publicat, ara))}</time>${llengua}</p>
        <h3 class="premsa-peca__titol"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.titol)}<span class="premsa-peca__fora" aria-hidden="true"> ↗</span><span class="sr-only"> (s'obre a ${esc(p.mitja)})</span></a></h3>
        ${p.destacat && p.comentari ? `<p class="premsa-peca__comentari"><span>Per què llegir-la</span> ${esc(p.comentari)}</p>` : ''}
        ${nostra}
      </li>`;
  }

  fetch('/data/premsa.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then(dades => {
      const ara = Date.now();
      const articles = Array.isArray(dades?.articles) ? dades.articles : [];
      const triats = tria(articles, ara);
      if (triats.length < 3) return;
      const diaris = new Set(articles.filter(p => Date.parse(p.publicat) >= ara - 86400000).map(p => p.mitja)).size;
      banda.innerHTML = `
        <div class="premsa-layout">
          <header class="premsa-cap">
            <p class="premsa-cap__eti"><i aria-hidden="true"></i> Ressò de premsa</p>
            <h2 id="premsa-titol">La premsa en parla</h2>
            <p>Què publiquen avui els diaris sobre intel·ligència artificial${diaris > 1 ? `: ${diaris} capçaleres en les últimes 24 hores` : ''}. Els titulars porten a la peça original.</p>
            <a class="premsa-cap__tot" href="/premsa">Tot el recull de premsa <span aria-hidden="true">→</span></a>
          </header>
          <ol class="premsa-llista">${triats.map(p => peca(p, ara)).join('')}</ol>
        </div>`;
      banda.hidden = false;
    })
    .catch(() => {});
})();
