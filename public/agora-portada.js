/* L'Àgora a la portada (13.10.2026).
   Banda #agora, just després de «La reflexió del dia»: les sales de debat de
   l'Àgora (/agora/) amb més participació, cadascuna amb la seva imatge, la
   pregunta i una barra que mostra com es reparteixen les posicions entre la
   mirada apocalíptica i la integrada. Les dades surten en directe de l'API
   pública de l'Àgora (/agora/api/index.php?a=topics, només lectura i sense
   dades personals). Si l'Àgora no respon, la banda no surt.
   Banda pròpia amb CSS propi (agora-portada.css): no es toca portada.css. */
(() => {
  'use strict';
  const banda = document.getElementById('agora');
  if (!banda || !window.fetch) return;

  const MAX = 4;
  const BASE = '/agora/';
  const POS = [-2, -1, 0, 1, 2];
  const COLOR = { '-2': '#c8432e', '-1': '#e0806b', '0': '#9aa1bd', '1': '#d9b45a', '2': '#b8901f' };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const persones = n => n === 1 ? '1 persona situada' : `${n} persones situades`;

  function tria(sales) {
    // Primer les que tenen més gent situada; a igualtat, les que tenen imatge,
    // i després l'ordre de l'Àgora.
    return sales
      .filter(t => t && t.id && t.title && t.q)
      .map((t, i) => ({ ...t, i, n: POS.reduce((s, v) => s + (Number((t.dist || {})[String(v)]) || 0), 0) }))
      .sort((a, b) => (b.n - a.n) || ((b.thumb ? 1 : 0) - (a.thumb ? 1 : 0)) || (a.i - b.i))
      .slice(0, MAX);
  }

  function barra(t) {
    if (!t.n) return '<span class="agora-sala__barra is-buida" aria-hidden="true"></span>';
    const trams = POS.map(v => {
      const c = Number((t.dist || {})[String(v)]) || 0;
      return c ? `<i style="width:${(c / t.n * 100).toFixed(2)}%;background:${COLOR[String(v)]}"></i>` : '';
    }).join('');
    const apo = (Number(t.dist['-2']) || 0) + (Number(t.dist['-1']) || 0);
    const int = (Number(t.dist['1']) || 0) + (Number(t.dist['2']) || 0);
    return `<span class="agora-sala__barra" role="img" aria-label="${apo} apocalíptiques, ${int} integrades i ${t.n - apo - int} entremig">${trams}</span>`;
  }

  function sala(t) {
    const img = /^uploads\/topics\/[0-9]+-t\.jpg(\?v=[0-9]+)?$/.test(t.thumb || '')
      ? `<img src="${esc(BASE + t.thumb)}" alt="" width="480" height="320" loading="lazy" decoding="async" onerror="this.remove()">`
      : '';
    return `<li class="agora-sala">
        <a class="agora-sala__enllac" href="${BASE}#sala/${Number(t.id)}">
          <span class="agora-sala__foto" aria-hidden="true">${img}</span>
          <span class="agora-sala__cos">
            <strong class="agora-sala__titol">${esc(t.title)}</strong>
            <span class="agora-sala__pregunta">${esc(t.q)}</span>
            ${barra(t)}
            <small class="agora-sala__meta">${t.n ? esc(persones(t.n)) : 'Sigues la primera persona a situar-t’hi'}${t.here ? ` · <b>${Number(t.here)} ara mateix</b>` : ''}</small>
          </span>
        </a>
      </li>`;
  }

  function pinta(sales) {
    const total = sales.reduce((s, t) => s + t.n, 0);
    banda.innerHTML = `<div class="agora-layout">
        <header class="agora-cap">
          <div>
            <p class="agora-cap__eti"><i aria-hidden="true"></i> L’Àgora · debat obert</p>
            <h2 id="agora-titol">On et situes davant la intel·ligència que ve?</h2>
          </div>
          <p>Tria un tema, situa’t entre la mirada <b class="is-apo">apocalíptica</b> i la <b class="is-int">integrada</b>, i conversa amb altres persones dels territoris de parla catalana. En Fèlix, un moderador fet amb IA, vetlla per la convivència i en fa la síntesi.</p>
          <a class="agora-cap__tot" href="${BASE}">Entra a l’Àgora <span aria-hidden="true">→</span></a>
        </header>
        <div class="agora-eix" aria-hidden="true"><span>Apocalíptica</span><i></i><span>Integrada</span></div>
        <ol class="agora-llista">${sales.map(sala).join('')}</ol>
        ${total ? '' : '<p class="agora-peu">Les sales acaben d’obrir-se: les primeres opinions marcaran el to del debat.</p>'}
      </div>`;
    banda.hidden = false;
  }

  fetch(`${BASE}api/index.php?a=topics`, { credentials: 'omit', cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      const sales = d && d.ok && Array.isArray(d.topics) ? tria(d.topics) : [];
      if (sales.length >= 2) pinta(sales);
    })
    .catch(() => {});
})();
