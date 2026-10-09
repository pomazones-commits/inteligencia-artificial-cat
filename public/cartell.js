/* Cartell de l'agenda a la portada (10.10.2026).
   En Rafael va comparar el web amb barcelonadot.org, que obre la portada amb el
   cartell d'una hackató d'IA. Aquí el cartell surt sol de public/data/agenda.json
   (el mateix fitxer de /agenda, que la tasca «Edicions» revisa el dia 1 de cada
   mes): no hi ha cap fitxer nou per mantenir.

   Quin acte surt al cartell, per ordre:
     1. el primer acte amb "destacat": true que encara no s'ha acabat;
     2. si no n'hi ha cap, la primera hackató dels propers 45 dies;
     3. si tampoc, el primer congrés, jornada o fira dels propers 21 dies.
   Si no n'hi ha cap, la banda queda amagada. Al costat, els propers actes.

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

  function tria(actes, avui) {
    const dinsDe = (a, dies) => (dataUtc(a.inici) - dataUtc(avui)) / DIA <= dies;
    return actes.find(a => a.destacat === true)
      || actes.find(a => a.tipus === 'hackató' && dinsDe(a, 45))
      || actes.find(a => ['congrés', 'jornada', 'fira'].includes(a.tipus) && dinsDe(a, 21))
      || null;
  }

  function pinta(acte, propers, avui) {
    const d = dates(acte.inici, acte._fi);
    const url = urlSegura(acte.url);
    const tipus = NOM_TIPUS[acte.tipus] || 'Acte';
    const enMarxa = acte.inici <= avui && avui <= acte._fi;
    const tancades = enMarxa || acte.inscripcions === 'tancades';
    const xips = [acte.format, acte.preu, tancades ? 'inscripcions tancades' : ''].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
    const imatge = imatgeLocal(acte.cartell);
    const llista = propers.map(p => {
      const dp = dates(p.inici, p._fi);
      const u = urlSegura(p.url);
      return `<li><a${u ? ` href="${esc(u)}" target="_blank" rel="noopener"` : ''}><time datetime="${esc(p.inici)}">${esc(dp.llarg)}</time><strong>${esc(p.titol)}</strong><span>${esc([NOM_TIPUS[p.tipus], p.lloc].filter(Boolean).join(' · '))}</span></a></li>`;
    }).join('');

    banda.innerHTML = `
      <div class="cartell-layout">
        <article class="cartell-poster${imatge ? ' cartell-poster--imatge' : ''}" aria-labelledby="cartell-titol">
          ${imatge ? `<img class="cartell-poster__img" src="${esc(imatge)}" alt="" loading="lazy">` : '<div class="cartell-poster__trama" aria-hidden="true"></div>'}
          <div class="cartell-poster__cap">
            <p class="cartell-poster__tipus">${esc(tipus)}</p>
            <p class="cartell-poster__compte">${esc(compteEnrere(acte.inici, acte._fi, avui))}</p>
          </div>
          <div class="cartell-poster__data" aria-hidden="true"><strong>${esc(d.gran)}</strong><span>${esc(d.petit)}</span></div>
          <h2 id="cartell-titol" class="cartell-poster__titol">${esc(acte.titol)}</h2>
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
        </article>
        ${llista ? `<aside class="cartell-propers" aria-labelledby="cartell-propers-titol">
          <p class="cartell-propers__eti">Agenda</p>
          <h3 id="cartell-propers-titol">Propers actes d'IA</h3>
          <ol>${llista}</ol>
          <a class="cartell-enllac" href="/agenda">Veure'ls tots <span aria-hidden="true">→</span></a>
        </aside>` : ''}
      </div>`;
    banda.hidden = false;
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
      const acte = tria(actes, avui);
      if (!acte) return;
      pinta(acte, actes.filter(a => a !== acte).slice(0, 4), avui);
    })
    .catch(() => {});
})();
