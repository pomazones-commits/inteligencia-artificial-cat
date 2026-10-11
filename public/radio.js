/* La IA a la ràdio (11.10.2026) — reproductor oficial només en clicar.
 *
 * Cada fitxa de /radio porta un botó. El reproductor de l'emissora (un iframe
 * seu, amb les seves galetes) no es carrega fins que el lector hi fa clic:
 * abans, la pàgina no fa cap petició a tercers.
 *
 * Tipus admesos: han de coincidir amb $reproductors de radio.php.
 * Per afegir-ne un, comprova primer que l'emissora ofereix codi d'inserció
 * oficial (botó «Comparteix» / «Insereix») i que deixa incrustar-lo.
 */
(() => {
  const TIPUS = {
    // Codi oficial de 3Cat (Catalunya Ràdio, Catalunya Informació, iCat…),
    // tal com el dona el botó «Comparteix» de cada àudio.
    '3cat': {
      valid: id => /^\d{4,9}$/.test(id),
      src: id => `https://www.3cat.cat/3cat/audio/${id}/embed/`,
      ratio: '16 / 9'
    }
  };

  function carrega(caixa) {
    const tipus = TIPUS[caixa.dataset.radioTipus || ''];
    const id = caixa.dataset.radioId || '';
    if (!tipus || !tipus.valid(id)) return;
    const marc = document.createElement('div');
    marc.className = 'ona__marc';
    marc.style.aspectRatio = tipus.ratio;
    const iframe = document.createElement('iframe');
    iframe.src = tipus.src(id);
    iframe.title = `Reproductor de l'emissora: ${caixa.dataset.radioTitol || 'àudio'}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('scrolling', 'no');
    marc.appendChild(iframe);
    const avis = document.createElement('p');
    avis.className = 'ona__avis';
    avis.textContent = 'Prem el botó de reproducció del reproductor de l’emissora.';
    caixa.replaceChildren(marc, avis);
    caixa.classList.add('is-obert');
    iframe.focus({ preventScroll: true });
  }

  document.addEventListener('click', event => {
    const boto = event.target.closest('.ona__play');
    if (!boto) return;
    const caixa = boto.closest('.ona__reproductor');
    if (!caixa) return;
    event.preventDefault();
    carrega(caixa);
  });
})();
