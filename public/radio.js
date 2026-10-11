/* La IA a la ràdio (11.10.2026) — reproductor oficial només en clicar.
 *
 * Cada fitxa de /radio porta un botó. El reproductor de l'emissora (un iframe
 * seu, amb les seves galetes) no es carrega fins que el lector hi fa clic:
 * abans, la pàgina no fa cap petició a tercers.
 *
 * Tipus admesos: han de coincidir amb $reproductors de radio.php i amb
 * scripts/valida-radio.mjs. Per afegir-ne un, comprova primer que l'emissora
 * ofereix codi d'inserció oficial i que deixa incrustar-lo.
 */
(() => {
  const TIPUS = {
    // Codi oficial de 3Cat (Catalunya Ràdio, Catalunya Informació…), botó «Comparteix».
    '3cat': { valid: id => /^\d{4,9}$/.test(id), src: id => `https://www.3cat.cat/3cat/audio/${id}/embed/`, ratio: '16 / 9' },
    // Reproductor d'RTVE Play (Ràdio 4).
    rtve: { valid: id => /^\d{5,10}$/.test(id), src: id => `https://www.rtve.es/drmn/embed/audio/${id}`, ratio: '16 / 9' },
    // RAC1 publica els talls a Omny: és el reproductor que dona la mateixa emissora.
    omny: { valid: id => /^[a-z0-9-]+\/[a-z0-9-]+$/.test(id), src: id => `https://omny.fm/shows/${id}/embed`, alt: 180 },
    soundcloud: {
      valid: id => /^\d{4,12}$/.test(id),
      src: id => `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://api.soundcloud.com/tracks/${id}`)}&color=%23233a82&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false&visual=false`,
      alt: 166
    },
    // Vídeo del programa a YouTube, sempre des del domini sense galetes.
    youtube: { valid: id => /^[A-Za-z0-9_-]{11}$/.test(id), src: id => `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&hl=ca`, ratio: '16 / 9' }
  };

  function carrega(caixa) {
    const tipus = TIPUS[caixa.dataset.radioTipus || ''];
    const id = caixa.dataset.radioId || '';
    if (!tipus || !tipus.valid(id)) return;
    const marc = document.createElement('div');
    marc.className = 'ona__marc';
    if (tipus.alt) { marc.style.aspectRatio = 'auto'; marc.style.height = `${tipus.alt}px`; marc.classList.add('ona__marc--barra'); }
    else marc.style.aspectRatio = tipus.ratio;
    const iframe = document.createElement('iframe');
    iframe.src = tipus.src(id);
    iframe.title = `Reproductor de l'emissora: ${caixa.dataset.radioTitol || 'àudio'}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
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
