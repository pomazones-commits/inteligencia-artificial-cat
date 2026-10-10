/* Cartell de l'agenda a la portada (10.10.2026).
   En Rafael va comparar el web amb barcelonadot.org, que obre la portada amb el
   cartell d'una hackató d'IA. Aquí el cartell surt sol de public/data/agenda.json
   (el mateix fitxer de /agenda, que la tasca «Edicions» revisa cada dijous): no
   hi ha cap fitxer nou per mantenir.

   Quin acte surt al cartell (11.10.2026: amb carrusel):
     - Si AVUI hi ha més d'un acte gran en marxa (congrés, jornada, fira o
       hackató, o un de «destacat»), surten tots en un carrusel que en canvia
       cada 5 segons (màxim 6; primer els destacats i les hackatons).
     - Si no, un sol cartell: el primer «destacat» que encara no s'ha acabat; si
       no n'hi ha, la primera hackató dels propers 45 dies; si tampoc, el primer
       congrés, jornada o fira dels propers 21 dies.
   Un acte surt sol del cartell l'endemà que s'acaba (es compara amb el camp
   "fi" a l'hora de Barcelona): no cal tocar res. Si no queda cap acte, la banda
   s'amaga. Al costat, els propers actes.
   El carrusel s'atura quan el ratolí o el focus són a sobre, quan la pestanya
   no es veu i, del tot, si el lector té demanat «menys moviment» al sistema.

   El cartell és disseny propi (HTML i CSS): no fem servir el cartell oficial de
   l'organitzador, que té drets. Si un organitzador ens en dona permís, es pot
   posar la seva imatge al camp opcional "cartell" (ruta /assets/...). Amb
   "inscripcions": "tancades" (o si l'acte ja ha començat) el botó diu «Web de
   l'acte» en lloc d'«Inscripcions i bases».
   Banda pròpia amb CSS propi (cartell.css): no es toca portada.css. */
(() => {
  'use strict';
  const banda = document.getElementById('cartell');
  if (!banda || !window.fetch) return;

  const MESOS = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];
  const DIES = ['dg.', 'dl.', 'dt.', 'dc.', 'dj.', 'dv.', 'ds.'];
  const NOM_TIPUS = { 'hackató': 'Hackató', 'congrés': 'Congrés', 'jornada': 'Jornada', 'fira': 'Fira', 'webinar': 'Webinar', 'curs': 'Curs', 'convocatòria': 'Convocatòria' };
  const DIA = 86400000;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const urlSegura = value => /^https:\/\/[^\s"'<>]+$/.test(String(value || '')) ? String(value) : '';
  const imatgeLocal = value => /^\/assets\/[A-Za-z0-9/_.-]+\.(jpe?g|png|webp)$/.test(String(value || '')) ? String(value) : '';

  // La data d'avui a Barcelona, en AAAA-MM-DD (els actes porten dates locals).
  const avuiIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const dataUtc = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const valida = iso => /^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''));

  function compteEnrere(inici, fi, avui) {
    if (inici <= avui && avui <= fi) return inici === fi ? 'Avui' : 'Ara mateix, en marxa';
    const dies = Math.round((dataUtc(inici) - dataUtc(avui)) / DIA);
    if (dies === 1) return 'Demà';
    if (dies < 7) return `D'aquí a ${dies} dies`;
    if (dies < 14) return "D'aquí a una setmana";
    if (dies < 60) return `D'aquí a ${Math.round(dies / 7)} setmanes`;
    return `D'aquí a ${Math.round(dies / 30)} mesos`;
  }

  function dates(inici, fi) {
    const a = dataUtc(inici);
    const b = dataUtc(fi);
    if (inici === fi) return { gran: String(a.getUTCDate()), petit: `${MESOS[a.getUTCMonth()]} ${a.getUTCFullYear()}`, llarg: `${DIES[a.getUTCDay()]} ${a.getUTCDate()} ${MESOS[a.getUTCMonth()]}` };
    const mateixMes = a.getUTCMonth() === b.getUTCMonth();
    return {
      gran: mateixMes ? `${a.getUTCDate()}–${b.getUTCDate()}` : `${a.getUTCDate()} ${MESOS[a.getUTCMonth()]}–${b.getUTCDate()}`,
      petit: `${MESOS[b.getUTCMonth()]} ${b.getUTCFullYear()}`,
      llarg: `${DIES[a.getUTCDay()]} ${a.getUTCDate()}${mateixMes ? '' : ` ${MESOS[a.getUTCMonth()]}`} – ${DIES[b.getUTCDay()]} ${b.getUTCDate()} ${MESOS[b.getUTCMonth()]}`
    };
  }

  const GRANS = new Set(['congrés', 'jornada', 'fira', 'hackató']);
  const PAS_MS = 5000;
  const MAX_DIAPOS = 6;

  function tria(actes, avui) {
    const dinsDe = (a, dies) => (dataUtc(a.inici) - dataUtc(avui)) / DIA <= dies;
    return actes.find(a => a.destacat === true)
      || actes.find(a => a.tipus === 'hackató' && dinsDe(a, 45))
      || actes.find(a => ['congrés', 'jornada', 'fira'].includes(a.tipus) && dinsDe(a, 21))
      || null;
  }

  // Els actes del cartell: tots els grans que són en marxa avui (si n'hi ha més
  // d'un, fan carrusel) o, si no, l'únic que tria la regla de sempre.
  function diapositives(actes, avui) {
    const avuiMateix = actes
      .filter(a => a.inici <= avui && avui <= a._fi && (GRANS.has(a.tipus) || a.destacat === true))
      .sort((a, b) => (b.destacat === true) - (a.destacat === true) || (b.tipus === 'hackató') - (a.tipus === 'hackató') || a.inici.localeCompare(b.inici));
    if (avuiMateix.length > 1) return avuiMateix.slice(0, MAX_DIAPOS);
    const una = tria(actes, avui);
    return una ? [una] : [];
  }

  function posterHtml(acte, avui, i, total) {
    const d = dates(acte.inici, acte._fi);
    const url = urlSegura(acte.url);
    const tipus = NOM_TIPUS[acte.tipus] || 'Acte';
    const enMarxa = acte.inici <= avui && avui <= acte._fi;
    const tancades = enMarxa || acte.inscripcions === 'tancades';
    const xips = [acte.format, acte.preu, acte.inscripcions === 'tancades' ? 'inscripcions tancades' : ''].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
    const imatge = imatgeLocal(acte.cartell);
    const idTitol = `cartell-titol-${i}`;
    const carrusel = total > 1;
    return `
        <article class="cartell-poster${imatge ? ' cartell-poster--imatge' : ''}${carrusel ? ' cartell-diapo' : ''}${i === 0 ? ' is-active' : ''}" aria-labelledby="${idTitol}"${carrusel ? ` role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${total}"${i === 0 ? '' : ' aria-hidden="true" inert'}` : ''}>
          ${imatge ? `<img class="cartell-poster__img" src="${esc(imatge)}" alt="" loading="lazy">` : '<div class="cartell-poster__trama" aria-hidden="true"></div>'}
          <div class="cartell-poster__cap">
            <p class="cartell-poster__tipus">${esc(tipus)}</p>
            <p class="cartell-poster__compte">${esc(compteEnrere(acte.inici, acte._fi, avui))}</p>
          </div>
          <div class="cartell-poster__data" aria-hidden="true"><strong>${esc(d.gran)}</strong><span>${esc(d.petit)}</span></div>
          <h2 id="${idTitol}" class="cartell-poster__titol">${esc(acte.titol)}</h2>
          ${acte.lema ? `<p class="cartell-poster__lema">${esc(acte.lema)}</p>` : ''}
          <p class="cartell-poster__desc">${esc(acte.descripcio || '')}</p>
          <dl class="cartell-poster__fitxa">
            <div><dt>Quan</dt><dd><time datetime="${esc(acte.inici)}">${esc(d.llarg)}</time></dd></div>
            ${acte.lloc ? `<div><dt>On</dt><dd>${esc(acte.lloc)}</dd></div>` : ''}
            ${acte.organitza ? `<div><dt>Organitza</dt><dd>${esc(acte.organitza)}</dd></div>` : ''}
            ${acte.premi ? `<div><dt>Premis</dt><dd>${esc(acte.premi)}</dd></div>` : ''}
          </dl>
          ${xips ? `<p class="cartell-poster__xips">${xips}</p>` : ''}
          <p class="cartell-poster__accions">
            ${url ? `<a class="cartell-boto" href="${esc(url)}" target="_blank" rel="noopener">${tancades ? "Web de l'acte" : acte.tipus === 'hackató' ? 'Inscripcions i bases' : 'Web oficial'} <span aria-hidden="true">↗</span></a>` : ''}
            <a class="cartell-enllac" href="/agenda">Tota l'agenda <span aria-hidden="true">→</span></a>
          </p>
        </article>`;
  }

  function pinta(llistaActes, propers, avui) {
    const total = llistaActes.length;
    const llista = propers.map(p => {
      const dp = dates(p.inici, p._fi);
      const u = urlSegura(p.url);
      return `<li><a${u ? ` href="${esc(u)}" target="_blank" rel="noopener"` : ''}><time datetime="${esc(p.inici)}">${esc(dp.llarg)}</time><strong>${esc(p.titol)}</strong><span>${esc([NOM_TIPUS[p.tipus], p.lloc].filter(Boolean).join(' · '))}</span></a></li>`;
    }).join('');
    const posters = llistaActes.map((a, i) => posterHtml(a, avui, i, total)).join('');
    const controls = total > 1 ? `
          <div class="cartell-controls">
            <button type="button" class="cartell-ctrl" data-cartell="anterior" aria-label="Acte anterior">←</button>
            <div class="cartell-punts" role="tablist" aria-label="Tria l'acte">${llistaActes.map((a, i) => `<button type="button" role="tab" class="cartell-punt${i === 0 ? ' is-active' : ''}" data-cartell-punt="${i}" aria-selected="${i === 0}" aria-label="${esc(a.titol)}"></button>`).join('')}</div>
            <button type="button" class="cartell-ctrl" data-cartell="seguent" aria-label="Acte següent">→</button>
            <span class="cartell-compte" aria-hidden="true"><b data-cartell-n>1</b> / ${total}</span>
            <button type="button" class="cartell-ctrl cartell-ctrl--pausa" data-cartell="pausa" aria-pressed="false" aria-label="Atura el carrusel">❚❚</button>
          </div>` : '';

    banda.innerHTML = `
      <div class="cartell-layout">
        <div class="cartell-escena${total > 1 ? ' cartell-escena--carrusel' : ''}"${total > 1 ? ` aria-roledescription="carrusel" aria-label="Actes d'IA d'avui"` : ''}>
          <div class="cartell-pista">${posters}</div>${controls}
        </div>
        ${llista ? `<aside class="cartell-propers" aria-labelledby="cartell-propers-titol">
          <p class="cartell-propers__eti">Agenda</p>
          <h3 id="cartell-propers-titol">Propers actes d'IA</h3>
          <ol>${llista}</ol>
          <a class="cartell-enllac" href="/agenda">Veure'ls tots <span aria-hidden="true">→</span></a>
        </aside>` : ''}
      </div>`;
    banda.hidden = false;
    if (total > 1) engega(total);
  }

  function engega(total) {
    const diapos = [...banda.querySelectorAll('.cartell-diapo')];
    const punts = [...banda.querySelectorAll('.cartell-punt')];
    const n = banda.querySelector('[data-cartell-n]');
    const pausa = banda.querySelector('[data-cartell="pausa"]');
    const escena = banda.querySelector('.cartell-escena');
    const quiet = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let actual = 0;
    let temporitzador = null;
    let aturatPerUsuari = quiet;
    let aSobre = false;

    const mostra = i => {
      actual = (i + total) % total;
      diapos.forEach((d, k) => {
        const on = k === actual;
        d.classList.toggle('is-active', on);
        if (on) { d.removeAttribute('aria-hidden'); d.removeAttribute('inert'); } else { d.setAttribute('aria-hidden', 'true'); d.setAttribute('inert', ''); }
      });
      punts.forEach((p, k) => { p.classList.toggle('is-active', k === actual); p.setAttribute('aria-selected', String(k === actual)); });
      if (n) n.textContent = String(actual + 1);
    };
    const para = () => { clearInterval(temporitzador); temporitzador = null; };
    const arrenca = () => {
      para();
      if (aturatPerUsuari || aSobre || document.hidden) return;
      temporitzador = setInterval(() => mostra(actual + 1), PAS_MS);
    };
    const pintaPausa = () => {
      pausa.setAttribute('aria-pressed', String(aturatPerUsuari));
      pausa.setAttribute('aria-label', aturatPerUsuari ? 'Torna a engegar el carrusel' : 'Atura el carrusel');
      pausa.textContent = aturatPerUsuari ? '▶' : '❚❚';
    };

    banda.addEventListener('click', e => {
      const b = e.target.closest('[data-cartell], [data-cartell-punt]');
      if (!b) return;
      if (b.dataset.cartell === 'anterior') mostra(actual - 1);
      else if (b.dataset.cartell === 'seguent') mostra(actual + 1);
      else if (b.dataset.cartell === 'pausa') { aturatPerUsuari = !aturatPerUsuari; pintaPausa(); }
      else if (b.dataset.cartellPunt !== undefined) mostra(Number(b.dataset.cartellPunt));
      arrenca();
    });
    escena.addEventListener('mouseenter', () => { aSobre = true; para(); });
    escena.addEventListener('mouseleave', () => { aSobre = false; arrenca(); });
    escena.addEventListener('focusin', () => { aSobre = true; para(); });
    escena.addEventListener('focusout', e => { if (!escena.contains(e.relatedTarget)) { aSobre = false; arrenca(); } });
    document.addEventListener('visibilitychange', arrenca);
    // Lliscar amb el dit (iPad, mòbil).
    let x0 = null;
    escena.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    escena.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) { mostra(actual + (dx < 0 ? 1 : -1)); arrenca(); }
    });
    pintaPausa();
    arrenca();
  }

  fetch('/data/agenda.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then(dades => {
      const avui = avuiIso();
      const actes = (Array.isArray(dades?.actes) ? dades.actes : [])
        .filter(a => a && a.titol && valida(a.inici) && a.tipus !== 'convocatòria')
        .map(a => ({ ...a, _fi: valida(a.fi) && a.fi >= a.inici ? a.fi : a.inici }))
        .filter(a => a._fi >= avui)
        .sort((a, b) => a.inici.localeCompare(b.inici));
      const llista = diapositives(actes, avui);
      if (!llista.length) return;
      // Des del 10.10.2026 l'agenda també porta trobades, cursos i webinars (un
      // centenar d'actes): a la portada, només els grans (congressos, jornades,
      // fires i hackatons). La resta és a /agenda.
      pinta(llista, actes.filter(a => !llista.includes(a) && GRANS.has(a.tipus)).slice(0, 4), avui);
    })
    .catch(() => {});
})();
