/* La IA a la ràdio a la portada (11.10.2026).
   Banda #radio, just després de «La premsa en parla»: les últimes entrevistes i
   debats sobre IA a les ràdios en català, amb el logo de l'emissora. Llegeix
   public/data/radio.json (fitxes MANUALS) i public/data/radio-icones.json (logos
   desats al nostre servidor pel workflow radio-icones.yml). Cada fitxa porta a
   /radio, on hi ha el resum i el reproductor oficial de l'emissora: a la portada
   no es carrega cap reproductor ni cap recurs de les emissores.

   Surten les 4 més recents dels últims 60 dies, com a màxim una per emissora
   perquè no ho ompli una sola ràdio. Si n'hi ha menys de tres, la banda no surt.
   Banda pròpia amb CSS propi (radio-portada.css): no es toca portada.css. */
(() => {
  'use strict';
  const banda = document.getElementById('radio');
  if (!banda || !window.fetch) return;

  const MAX = 4;
  const PER_EMISSORA = 1;
  const DIES = 60;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mesos = ['de gener', 'de febrer', 'de març', 'd’abril', 'de maig', 'de juny', 'de juliol', 'd’agost', 'de setembre', 'd’octubre', 'de novembre', 'de desembre'];
  const data = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${Number(m[3])} ${mesos[Number(m[2]) - 1]}` : ''; };
  const idFitxa = id => `r-${String(id || '').toLowerCase().replace(/[^a-z0-9-]/g, '')}`;

  function logo(emissora, icones) {
    const ruta = icones[emissora];
    if (/^\/assets\/radio\/[a-z0-9-]+\.(png|svg|webp|jpg|ico)$/.test(ruta || '')) {
      return `<span class="radio-peca__logo"><img src="${esc(ruta)}" alt="" width="34" height="34" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('is-buit');this.remove()"></span>`;
    }
    const inicial = String(emissora || 'R').replace(/^(Ràdio|Radio)\s+/, '').charAt(0).toUpperCase();
    return `<span class="radio-peca__logo is-buit" aria-hidden="true">${esc(inicial)}</span>`;
  }

  function tria(fitxes, ara) {
    const limit = new Date(ara - DIES * 86400000).toISOString().slice(0, 10);
    const vives = fitxes
      .filter(f => f && f.titol && /^\d{4}-\d{2}-\d{2}$/.test(f.data || '') && f.data >= limit)
      .sort((a, b) => b.data.localeCompare(a.data));
    const triades = [];
    const per = new Map();
    for (const f of vives) {
      if (triades.length >= MAX) break;
      const n = per.get(f.emissora) || 0;
      if (n >= PER_EMISSORA) continue;
      per.set(f.emissora, n + 1);
      triades.push(f);
    }
    return triades;
  }

  function peca(f, icones) {
    const convidats = (Array.isArray(f.convidats) ? f.convidats : []).filter(c => c && c.nom);
    const qui = convidats.length
      ? `<p class="radio-peca__qui"><span>${convidats.length > 1 ? 'Hi parlen' : 'Hi parla'}</span> ${esc(convidats.slice(0, 2).map(c => c.nom).join(' i '))}${convidats.length > 2 ? ' i més' : ''}</p>`
      : '';
    const durada = f.durada ? ` · ${esc(f.durada)}` : '';
    return `<li class="radio-peca">
        <a class="radio-peca__enllac" href="/radio#${esc(idFitxa(f.id))}">
          <span class="radio-peca__cap">${logo(f.emissora, icones)}<span><strong>${esc(f.emissora)}</strong><small>${esc(f.programa || '')}</small></span></span>
          <span class="radio-peca__titol">${esc(f.titol)}</span>
          ${qui}
          <span class="radio-peca__peu"><time datetime="${esc(f.data)}">${esc(data(f.data))}</time>${durada}<span class="radio-peca__escolta">Escolta-la <span aria-hidden="true">→</span></span></span>
        </a>
      </li>`;
  }

  Promise.all([
    fetch('/data/radio.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)),
    fetch('/data/radio-icones.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).catch(() => ({}))
  ]).then(([dades, icones]) => {
    const fitxes = Array.isArray(dades?.intervencions) ? dades.intervencions : [];
    const triades = tria(fitxes, Date.now());
    if (triades.length < 3) return;
    const emissores = new Set(fitxes.map(f => f.emissora).filter(Boolean)).size;
    banda.innerHTML = `
      <div class="radio-layout">
        <header class="radio-cap">
          <div>
            <p class="radio-cap__eti"><i aria-hidden="true"></i> La IA a la ràdio</p>
            <h2 id="radio-titol">Escolta qui en sap</h2>
          </div>
          <p>Entrevistes i debats sobre intel·ligència artificial a les ràdios en català${emissores > 1 ? `: ${fitxes.length} intervencions de ${emissores} emissores` : ''}. Amb un resum nostre i el reproductor de cada emissora.</p>
          <a class="radio-cap__tot" href="/radio">Totes les intervencions <span aria-hidden="true">→</span></a>
        </header>
        <ol class="radio-llista">${triades.map(f => peca(f, icones || {})).join('')}</ol>
      </div>`;
    banda.hidden = false;
  }).catch(() => {});
})();
