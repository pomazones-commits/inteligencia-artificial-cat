/* Vídeos associats a les notícies (prova pilot des del 06.10.2026).
 *
 * La pàgina de l'article només mostra una miniatura amb un botó. El reproductor
 * de YouTube (pesat, i amb galetes de Google) no es carrega fins que el lector
 * hi fa clic: així no alenteix la pàgina al Quest ni a l'iPad i no hi ha cap
 * galeta abans que el lector decideixi mirar el vídeo. Es fa servir el domini
 * youtube-nocookie.com.
 *
 * Subtítols: el reproductor s'obre amb la interfície en català i els subtítols
 * activats (hl=ca, cc_lang_pref=ca, cc_load_policy=1). Si el vídeo té pista en
 * català, la tria; si no, intenta activar la traducció automàtica de YouTube
 * al català. Aquesta segona part no és documentada per Google: si no funciona,
 * el lector té la indicació escrita sota el vídeo per activar-la a mà.
 */
(() => {
  const PARAMS = 'autoplay=1&rel=0&playsinline=1&hl=ca&cc_lang_pref=ca&cc_load_policy=1';
  let apiPromise = null;

  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('iframe_api'));
      document.head.appendChild(script);
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    return apiPromise;
  }

  function catalanCaptions(player) {
    try {
      const tracks = player.getOption('captions', 'tracklist') || [];
      if (!tracks.length) return false;
      const own = tracks.find(track => (track.languageCode || '').toLowerCase().startsWith('ca'));
      if (own) {
        player.setOption('captions', 'track', { languageCode: own.languageCode });
      } else {
        // Traducció automàtica de YouTube a partir de la primera pista.
        const base = tracks.find(track => track.kind !== 'asr') || tracks[0];
        player.setOption('captions', 'track', {
          languageCode: base.languageCode,
          translationLanguage: { languageCode: 'ca', languageName: 'Català' }
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  function plainIframe(frame, id, title) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${PARAMS}`;
    iframe.title = title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.replaceChildren(iframe);
  }

  function play(button) {
    const frame = button.closest('.iac-video__frame');
    const id = button.dataset.videoId;
    const lang = button.dataset.videoLang || '';
    const title = button.dataset.videoTitle || 'Vídeo de YouTube';
    if (!frame || !/^[A-Za-z0-9_-]{11}$/.test(id || '')) return;
    frame.classList.add('is-loading');
    // Vídeo ja en català: no cal tocar els subtítols.
    if (lang === 'ca') { plainIframe(frame, id, title); return; }

    loadApi().then(YT => {
      const target = document.createElement('div');
      frame.replaceChildren(target);
      let done = false;
      const player = new YT.Player(target, {
        host: 'https://www.youtube-nocookie.com',
        videoId: id,
        playerVars: {
          autoplay: 1, rel: 0, playsinline: 1, hl: 'ca', cc_lang_pref: 'ca', cc_load_policy: 1,
          origin: window.location.origin
        },
        events: {
          onReady: event => {
            const iframe = event.target.getIframe();
            iframe.title = title;
            try { event.target.playVideo(); } catch { /* el navegador pot demanar un segon toc */ }
          },
          // El mòdul de subtítols es carrega quan comença el vídeo.
          onApiChange: () => { if (!done) done = catalanCaptions(player); },
          onStateChange: event => {
            if (!done && event.data === 1) setTimeout(() => { if (!done) done = catalanCaptions(player); }, 800);
          }
        }
      });
    }).catch(() => plainIframe(frame, id, title));
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.iac-video__play');
    if (!button) return;
    event.preventDefault();
    play(button);
  });
})();
