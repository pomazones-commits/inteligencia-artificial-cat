/* Crida a l'Àgora al final de les peces (14.10.2026).
   A la tribuna, als estudis i a la reflexió del dia, just després del cos del
   text, una caixa «I tu, on et situes?» que porta a l'Àgora. Si alguna sala
   tracta el mateix tema que la peça (coincidència de paraules entre el text i
   el títol i la pregunta de la sala), enllaça directament a aquella sala; si
   no, a l'entrada de l'Àgora.
   Les sales surten de l'API pública de l'Àgora (/agora/api/index.php?a=topics,
   només lectura, la mateixa que fa servir agora-portada.js). Si l'API no
   respon, la crida surt igualment amb l'enllaç general.
   Espera que la pàgina hagi pintat la peça (#contingut deixa d'estar amagat):
   la reflexió carrega les dades de manera asíncrona. */
(() => {
  'use strict';
  if (window.__agoraCrida) return;
  window.__agoraCrida = true;

  const BASE = '/agora/';
  const BUIDES = new Set(('aquest aquesta aquests aquestes altre altra altres alguna algunes alguns algun ' +
    'perque tambe encara sobre entre quan quins quines quina quin qualsevol cadascun ' +
    'poden podem pot podria serien seria sera seran tenen tenir havia haver estan estar ' +
    'molts moltes molta molt menys mateix mateixa mateixos sense segons durant despres abans ' +
    'nostra nostre nostres vostra seves seus seva aixo allo totes tots tota ' +
    'intelligencia artificial artificials sistemes sistema models model').split(' '));

  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/l·l/g, 'll');
  const paraules = s => new Set(fold(s).split(/[^a-z0-9]+/).filter(w => w.length >= 5 && !BUIDES.has(w)));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function millorSala(sales, text) {
    const claus = paraules(text);
    let millor = null;
    for (const t of sales) {
      if (!t || !t.id || !t.title) continue;
      // Com a mínim dues paraules en comú, i almenys una del títol de la sala.
      let punts = 0;
      for (const w of paraules(`${t.title} ${t.q || ''}`)) if (claus.has(w)) punts += 1;
      const delTitol = [...paraules(t.title)].some(w => claus.has(w));
      if (delTitol && punts >= 2 && (!millor || punts > millor.punts)) millor = { t, punts };
    }
    return millor && millor.t;
  }

  function caixa(t) {
    const href = t ? `${BASE}#sala/${Number(t.id)}` : BASE;
    const cos = t
      ? `<p>Aquest tema es debat a l’Àgora, a la sala <strong>${esc(t.title)}</strong>${t.q ? `: <em>${esc(t.q)}</em>` : '.'}</p>`
      : '<p>A l’Àgora pots situar-te entre la mirada <b class="is-apo">apocalíptica</b> i la <b class="is-int">integrada</b> sobre els grans temes de la IA i conversar-ne amb altres lectors.</p>';
    const el = document.createElement('aside');
    el.className = 'agora-crida';
    el.setAttribute('aria-label', 'Debat a l’Àgora');
    el.innerHTML = `<p class="agora-crida__eti"><i aria-hidden="true"></i> L’Àgora · debat obert</p>
      <h2>I tu, on et situes?</h2>
      ${cos}
      <a class="agora-crida__boto" href="${esc(href)}">${t ? 'Dona la teva opinió' : 'Entra a l’Àgora'} <span aria-hidden="true">→</span></a>`;
    return el;
  }

  function posa() {
    const cos = document.getElementById('cos');
    if (!cos || document.querySelector('.agora-crida')) return;
    const text = `${(document.getElementById('titol') || {}).textContent || ''} ${cos.textContent || ''}`;
    const insereix = t => { if (!document.querySelector('.agora-crida')) cos.after(caixa(t)); };
    if (!window.fetch) return insereix(null);
    fetch(`${BASE}api/index.php?a=topics`, { credentials: 'omit', cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => insereix(d && d.ok && Array.isArray(d.topics) ? millorSala(d.topics, text) : null))
      .catch(() => insereix(null));
  }

  function espera() {
    const contingut = document.getElementById('contingut');
    if (!contingut) return;
    if (!contingut.hidden) return posa();
    const obs = new MutationObserver(() => { if (!contingut.hidden) { obs.disconnect(); posa(); } });
    obs.observe(contingut, { attributes: true, attributeFilter: ['hidden'] });
    setTimeout(() => obs.disconnect(), 20000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', espera);
  else espera();
})();
