(() => {
  // ——— Càrrega de dades amb frescor horària ———
  // Els fitxers de dades es carreguen amb un segell horari perquè la portada
  // reflecteixi cada actualització del dia sense haver de tocar mai l'HTML.
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0')
  ].join('');

  // Peces MANUALS (tribuna, estudis, sèries): a més del segell horari porten una
  // versió fixa. Si una sessió publica una peça nova, la CDN pot tenir desat el
  // fitxer vell amb el segell de l'hora en curs (12.10.2026: la tribuna nova no
  // sortia a la portada fins a l'hora següent). Puja aquesta versió (i el ?v=
  // d'app.js a index.html) cada vegada que publiquis una tribuna o un estudi.
  const VERSIO_MANUAL = '2026103101';
  const MANUALS = ['./tribuna.js', './tribuna-arxiu.js', './estudis.js', './estudis-arxiu.js', './series.js', './empresa.js'];
  const loadScript = src => new Promise(resolve => {
    const script = document.createElement('script');
    script.src = `${src}?v=${stamp}${MANUALS.includes(src) ? 'm' + VERSIO_MANUAL : ''}`;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.append(script);
  });

  const dataReady = Promise.all([
    loadScript('./news.js'),
    loadScript('./radar.js'),
    loadScript('./analysis.js'),
    loadScript('./tribuna.js'),
    loadScript('./estudis.js'),
    loadScript('./series.js'),
    loadScript('./reflection.js'),
    loadScript('./reflexio-diaria.js'),
    loadScript('./daily-image.js')
  ]);

  const statusReady = fetch(`./content-status.json?v=${stamp}`)
    .then(response => (response.ok ? response.json() : null))
    .catch(() => null);

  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  const storyHref = story => story.slug ? `./article.php?slug=${encodeURIComponent(story.slug)}` : (story.url || '#');
  // Crèdit d'una fotografia real amb llicència (27.09.2026): les llicències
  // demanen citar l'autor allà on es mostra la foto. Estils en línia per no
  // tocar portada.css. Les il·lustracions no en porten (el peu és a l'article).
  const photoCredit = story => story.imageCredit
    ? `<span class="foto-credit" style="position:absolute;right:8px;bottom:8px;z-index:2;max-width:calc(100% - 16px);padding:2px 7px;border-radius:3px;background:rgba(17,21,38,.62);color:#fff;font-size:11px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none">Foto: ${escapeHTML(story.imageCredit)}</span>`
    : '';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(news, radar, status) {
    // ——— Data i capçalera de l'edició ———
    const dateFormatter = new Intl.DateTimeFormat('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const currentDate = document.querySelector('#current-date');
    currentDate.textContent = dateFormatter.format(now).replace(/^./, c => c.toUpperCase());
    currentDate.dateTime = now.toISOString().slice(0, 10);
    const updatedAt = status?.generatedAt ? new Date(status.generatedAt) : now;
    document.querySelector('#edition-time').textContent = new Intl.DateTimeFormat('ca-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(updatedAt);
    document.querySelector('#edition-count').textContent = `${news.length} ${news.length === 1 ? 'història' : 'històries'}`;
    // ——— Repartiment (15.10.2026, decisió d'en Rafael) ———
    // Carrusel = les 4 destacades. «En moviment» s'ha retirat i la graella és
    // l'edició sencera («Totes les notícies d'avui»): hi surten totes, també les
    // del carrusel. Cap notícia no surt més de dues vegades. Així la graella ja
    // té 5 notícies després del lot de les 06:05 i no es veu buida fins al migdia.
    const carouselNews = news.slice(0, 4);
    const gridNews = news;
    document.querySelector('#news-count').textContent = gridNews.length
      ? `L'edició sencera · ${gridNews.length} ${gridNews.length === 1 ? 'notícia' : 'notícies'}`
      : `L'edició sencera`;
    const newsSection = document.querySelector('#totes');
    if (newsSection) newsSection.hidden = !gridNews.length;

    // ——— Temes del dia (barra superior) ———
    const interestLinks = document.querySelector('#interest-links');
    if (news.length >= 3) {
      const shorten = title => title.length > 44 ? `${title.slice(0, 44).replace(/\s+\S*$/, '')}…` : title;
      interestLinks.innerHTML = news.slice(0, 4).map(story =>
        `<a href="${escapeHTML(storyHref(story))}">${escapeHTML(shorten(story.title))}</a>`
      ).join('');
    }

    // ——— Fotografia editorial diària ———
    const dailyFigure = document.querySelector('#daily-visual');
    const dailyImageEl = document.querySelector('#daily-visual-image');
    // 21.10.2026: index.html ja no porta cap foto fixa (abans s'hi veia un instant la
    // imatge inaugural del 17.07). La figura surt amb .is-loading i només es mostra quan
    // la foto del dia s'ha carregat; si no n'hi ha o falla, s'amaga com abans.
    const hideDailyVisual = () => {
      dailyFigure.hidden = true;
      document.querySelector('#portada').classList.add('no-visual');
    };
    const showDailyVisual = () => dailyFigure.classList.remove('is-loading');
    dailyImageEl.addEventListener('load', showDailyVisual);
    dailyImageEl.addEventListener('error', hideDailyVisual);
    if (window.IA_DAILY_IMAGE && window.IA_DAILY_IMAGE.image) {
      const dailyImage = window.IA_DAILY_IMAGE;
      dailyImageEl.src = dailyImage.image;
      if (dailyImageEl.complete && dailyImageEl.naturalWidth) showDailyVisual();
      dailyImageEl.alt = dailyImage.alt || '';
      document.querySelector('#daily-visual-kicker').textContent = dailyImage.kicker || 'IA × Societat';
      document.querySelector('#daily-visual-title').textContent = dailyImage.title || '';
      document.querySelector('#daily-visual-caption').textContent = dailyImage.caption || '';
      document.querySelector('#daily-visual-credit').textContent = dailyImage.credit || 'Imatge editorial generada amb IA';
      if (dailyImage.date) {
        const [year, month, day] = dailyImage.date.split('-');
        document.querySelector('#daily-image-date').textContent = `Imatge del dia · ${day}.${month}.${year}`;
      }
    } else {
      hideDailyVisual();
    }

    // La fotografia del dia neix de la reflexió editorial: en clicar-la s'obre el Quadern IA.
    dailyFigure.setAttribute('role', 'link');
    dailyFigure.setAttribute('tabindex', '0');
    dailyFigure.setAttribute('aria-label', 'Imatge del dia: obre la reflexió relacionada del Quadern IA');
    function openRelatedContent() {
      window.location.href = './imatge-del-dia.php'; return;
      const reflectionBody = document.querySelector('#reflection-body');
      const toggle = document.querySelector('[data-reflection-toggle]');
      if (reflectionBody && reflectionBody.hidden && toggle) toggle.click();
      const related = document.querySelector('#opinions');
      if (!related) return;
      const before = window.scrollY;
      related.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => {
        if (Math.abs(window.scrollY - before) < 40) related.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 350);
    }
    dailyFigure.addEventListener('click', openRelatedContent);
    dailyFigure.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openRelatedContent(); }
    });

    // ——— Navegació, cerca, butlletí i mode focus (sempre actius) ———
    setupChrome(news, reduceMotion);

    // ——— Carrusel de destacades ———
    if (!news.length) {
      // Sense dades no hi ha res a animar: s'amaguen els blocs de notícies.
      document.querySelector('#ultima-hora').hidden = true;
      document.querySelector('#totes').hidden = true;
      return;
    }
    let activeIndex = 0;
    let carouselTimer;
    const stage = document.querySelector('#carousel-stage');
    const progress = document.querySelector('#carousel-progress');
    const count = document.querySelector('#carousel-count');
    const dailyStories = carouselNews;

    function renderCarousel() {
      const story = dailyStories[activeIndex];
      const indexLabel = String(activeIndex + 1).padStart(2, '0');
      const totalLabel = String(dailyStories.length).padStart(2, '0');
      stage.innerHTML = `
        <article class="hero-story" aria-label="Notícia ${activeIndex + 1} de ${dailyStories.length}">
          <a class="hero-story__image" href="${escapeHTML(storyHref(story))}">
            ${story.image ? `<img src="${escapeHTML(story.image)}" alt="" fetchpriority="high">${photoCredit(story)}` : ''}
          </a>
          <div class="hero-story__content">
            <p class="story-number">${indexLabel} — ${totalLabel}</p>
            <div>
              <p class="story-meta"><i></i>${escapeHTML(story.category)} · ${escapeHTML(story.read || '5 MIN')}</p>
              <h2><a href="${escapeHTML(storyHref(story))}">${escapeHTML(story.title)}</a></h2>
              <p class="hero-story__dek">${escapeHTML(story.excerpt || '')}</p>
            </div>
            <a class="story-cta" href="${escapeHTML(storyHref(story))}">Llegir la notícia <span>↗</span></a>
          </div>
        </article>`;
      [...progress.children].forEach((button, index) => button.classList.toggle('active', index === activeIndex));
      count.textContent = `${indexLabel} / ${totalLabel}`;
    }

    dailyStories.forEach((story, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Mostra la notícia ${index + 1}: ${story.title}`);
      button.addEventListener('click', () => { activeIndex = index; renderCarousel(); restartCarousel(); });
      progress.append(button);
    });

    function nextStory(direction = 1) {
      activeIndex = (activeIndex + direction + dailyStories.length) % dailyStories.length;
      renderCarousel();
    }
    function restartCarousel() {
      window.clearInterval(carouselTimer);
      // Reinicia la barra de temps de la notícia activa perquè vagi sincronitzada amb el canvi.
      const activeButton = progress.children[activeIndex];
      if (activeButton) { activeButton.classList.remove('active'); void activeButton.offsetWidth; activeButton.classList.add('active'); }
      // 11 s per notícia (25.10.2026; abans 9 s). Ha de coincidir amb l'animació carrusel-temps de portada.css.
      if (!reduceMotion) carouselTimer = window.setInterval(() => nextStory(1), 11000);
    }
    document.querySelector('#carousel-prev').addEventListener('click', () => { nextStory(-1); restartCarousel(); });
    document.querySelector('#carousel-next').addEventListener('click', () => { nextStory(1); restartCarousel(); });
    document.querySelector('.daily-carousel').addEventListener('mouseenter', () => window.clearInterval(carouselTimer));
    document.querySelector('.daily-carousel').addEventListener('mouseleave', restartCarousel);
    // ——— Alçada estable del carrusel ———
    // Cada notícia té un titular d'una llargada diferent, així que el bloc creixia
    // i s'encongia a cada canvi automàtic i tot el que hi ha a sota de la portada
    // pujava i baixava mentre es llegia. Aquí es recorren totes les notícies del
    // dia, es mesura la més alta i es reserva aquesta alçada: no es retalla res i
    // res no es mou. Es recalcula si canvia l'amplada de la finestra.
    let lockedWidth = 0;
    function lockStageHeight() {
      const width = Math.round(stage.getBoundingClientRect().width);
      if (!width) return;
      lockedWidth = width;
      const shown = activeIndex;
      stage.style.minHeight = '';
      stage.setAttribute('aria-busy', 'true');
      let tallest = 0;
      for (let index = 0; index < dailyStories.length; index += 1) {
        activeIndex = index;
        renderCarousel();
        tallest = Math.max(tallest, stage.getBoundingClientRect().height);
      }
      activeIndex = shown;
      renderCarousel();
      stage.removeAttribute('aria-busy');
      if (tallest) stage.style.minHeight = `${Math.ceil(tallest)}px`;
    }

    renderCarousel();
    lockStageHeight();
    restartCarousel();
    // Les tipografies pròpies poden canviar el nombre de línies del titular.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockStageHeight);
    let resizeTimer;
    window.addEventListener('resize', () => {
      if (Math.round(stage.getBoundingClientRect().width) === lockedWidth) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(lockStageHeight, 200);
    });

    // ——— Graella de notícies del dia ———
    const newsGrid = document.querySelector('#news-grid');
    // 14.10.2026: l'última fila sempre plena. A escriptori la graella fa 7+5 i
    // després files de 3; si en sobren 2, van a mitges, i si en sobra 1, les quatre
    // últimes fan dues files de 2 (abans, amb 12 notícies, l'última quedava sola).
    // A tauleta (files de 2), si el total és senar l'última ocupa tota l'amplada.
    function cardClass(i, total) {
      const classes = ['news-card'];
      if (total === 1) classes.push('news-card--ple');
      const resta = total > 2 ? (total - 2) % 3 : 0;
      const desde = resta === 2 ? total - 2 : resta === 1 && total >= 6 ? total - 4 : Infinity;
      if (resta === 1 && total < 6 && i === total - 1) classes.push('news-card--ple');
      if (i >= desde) classes.push('news-card--mig');
      if (total % 2 === 1 && i === total - 1) classes.push('news-card--senar-final');
      return classes.join(' ');
    }
    // 18.10.2026: les notícies que ja són al carrusel porten .news-card--al-carrusel
    // a la graella completa (no a la cerca). Només mobil.css les amaga (≤600 px); a
    // la tauleta i a l'escriptori la graella continua sent l'edició sencera (decisió
    // del 15.10). No es marquen si a la graella en quedarien menys de 4, perquè de
    // bon matí no es vegi buida.
    const alCarrusel = new Set(carouselNews);
    const marcaCarrusel = gridNews.length - carouselNews.length >= 4;
    function renderNews(items) {
      const marca = marcaCarrusel && items === gridNews;
      newsGrid.innerHTML = items.map((story, i) => `
        <article class="${cardClass(i, items.length)}${marca && alCarrusel.has(story) ? ' news-card--al-carrusel' : ''}">
          <a href="${escapeHTML(storyHref(story))}">
            ${story.image ? `<div class="news-card__image"${story.imageCredit ? ' style="position:relative"' : ''}><img src="${escapeHTML(story.image)}" alt="" loading="lazy">${photoCredit(story)}</div>` : ''}
            <p class="story-meta"><i></i>${escapeHTML(story.category)} · ${escapeHTML(story.read || '5 MIN')}</p>
            <h3>${escapeHTML(story.title)}</h3>
            <p>${escapeHTML(story.excerpt || '')}</p>
          </a>
        </article>`).join('');
    }
    renderNews(gridNews);

    // ——— Radar català ———
    // 11.10.2026: cada targeta porta miniatura. La imatge ve de radar.js; si l'entrada
    // és antiga i no en té, es busca la mateixa notícia entre les del dia (per URL de
    // la font o per títol). Si tampoc hi és, es mostra el lloc en gran (mai un buit).
    const newsByKey = new Map();
    news.forEach(story => {
      if (!story.image) return;
      if (story.sourceUrl) newsByKey.set(`u:${story.sourceUrl}`, story);
      if (story.title) newsByKey.set(`t:${story.title}`, story);
    });
    const radarThumb = item => {
      const match = item.image ? item : (newsByKey.get(`u:${item.url}`) || newsByKey.get(`t:${item.title}`));
      if (match && match.image) {
        return `<div class="radar-card__thumb"><img src="${escapeHTML(match.image)}" alt="" loading="lazy">${photoCredit(match)}</div>`;
      }
      return `<div class="radar-card__thumb radar-card__thumb--lloc" aria-hidden="true"><span>${escapeHTML(item.place || 'Catalunya')}</span></div>`;
    };
    // 18.10.2026: les entrades del radar que ja surten a la graella del dia porten
    // .radar-card--repetida. Només mobil.css les amaga (≤600 px); a la tauleta i a
    // l'escriptori no canvia res. No es marquen si al radar en quedarien menys de 3.
    const aLaGraella = new Set();
    gridNews.forEach(story => {
      if (story.sourceUrl) aLaGraella.add(`u:${story.sourceUrl}`);
      if (story.title) aLaGraella.add(`t:${story.title}`);
    });
    const radarItems = radar.slice(0, 8);
    const esRepetida = item => aLaGraella.has(`u:${item.url}`) || aLaGraella.has(`t:${item.title}`);
    const marcaRepetides = radarItems.filter(item => !esRepetida(item)).length >= 3;
    document.querySelector('#radar-grid').innerHTML = radarItems.map(item => `
      <a class="radar-card${marcaRepetides && esRepetida(item) ? ' radar-card--repetida' : ''}" href="${escapeHTML(item.url || '#')}" ${item.url ? 'target="_blank" rel="noreferrer"' : ''}>
        ${radarThumb(item)}
        <p class="radar-card__place"><span>${escapeHTML(item.place)} · ${escapeHTML(item.category)}</span><span>${escapeHTML(item.date)}</span></p>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.summary || '')}</p>
      </a>`).join('');

    // ——— La reflexió del dia (balanç diari; fitxer generat reflexio-diaria.js) ———
    // Es publica amb l'últim lot del dia (18:05). La banda mostra la peça d'avui
    // i, de matinada, encara la d'ahir; però quan arriba el primer lot de notícies
    // del dia (content-status.json amb editionDate d'avui), la d'ahir s'amaga
    // perquè la portada no sembli endarrerida, i la banda no torna fins que es
    // publica la reflexió nova al vespre. Si un matí el lot falla (o no es pot
    // llegir l'estat), la peça d'ahir es continua mostrant: val més una reflexió
    // d'ahir que una portada mig buida. La peça sempre segueix a l'arxiu.
    if (window.IA_REFLEXIO_DIARIA && window.IA_REFLEXIO_DIARIA.title) {
      const reflexio = window.IA_REFLEXIO_DIARIA;
      const [year, month, day] = String(reflexio.date || '').split('-');
      const humanDate = day ? `${day}.${month}.${year}` : '';
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      const daysOld = day
        ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${reflexio.date}T00:00:00Z`)) / 86400000)
        : 99;
      const hiHaNoticiesDAvui = news.length > 0 && status?.editionDate === today;
      const reflexioVigent = (daysOld >= -1 && daysOld <= 0) || (daysOld === 1 && !hiHaNoticiesDAvui);
      if (reflexioVigent) {
        document.querySelector('#reflexio-title').textContent = reflexio.title;
        document.querySelector('#reflexio-diaria-dek').textContent = reflexio.dek || '';
        document.querySelector('#reflexio-mark').textContent = humanDate;
        document.querySelector('#reflexio-diaria-eyebrow').textContent = reflexio.read
          ? `La reflexió del dia · ${String(reflexio.read).toLowerCase()}`
          : 'La reflexió del dia';
        document.querySelector('#reflexio-diaria-byline').textContent = humanDate
          ? `Per Redacció IA.cat · ${humanDate}`
          : 'Per Redacció IA.cat';

        // Els senyals del dia: les notícies en què es basa la reflexió.
        const senyals = Array.isArray(reflexio.signals) ? reflexio.signals.filter(item => item && item.title) : [];
        if (senyals.length) {
          const list = document.querySelector('#reflexio-senyals');
          const label = document.createElement('li');
          label.className = 'reflexio-senyals__label';
          label.textContent = 'Es basa en';
          list.append(label);
          senyals.forEach(signal => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            if (signal.slug) {
              link.href = `./article.php?slug=${encodeURIComponent(signal.slug)}`;
            } else if (signal.url) {
              link.href = signal.url;
              link.target = '_blank';
              link.rel = 'noreferrer';
            } else {
              link.href = './reflexio.html';
            }
            // Els titulars llargs s'escurcen a la portada (sencers a reflexio.html).
            const label = String(signal.title);
            link.textContent = label.length > 58 ? `${label.slice(0, 58).replace(/\s+\S*$/, '')}…` : label;
            link.title = label;
            item.append(link);
            list.append(item);
          });
          list.hidden = false;
        }
        document.querySelector('#reflexio-del-dia').hidden = false;
      }
    }

    // ——— La tribuna (article d'autor, fitxer manual tribuna.js) ———
    // Sèrie de la peça vigent (20.10.2026, «Veus de l'administració»): capçalera
    // amb la icona i el nom de la sèrie, enllaçada a la seva pàgina, damunt de
    // l'etiqueta de la banda (mateix estil que la marca de «Veus de CIVICAi»).
    const marcaSerie = (item, etiqueta) => {
      const s = item && item.serie && window.IA_SERIES ? window.IA_SERIES[item.serie] : null;
      if (!s || !etiqueta || !etiqueta.parentNode) return;
      const a = document.createElement('a');
      a.className = 'veus-marca serie-marca-portada';
      a.href = '.' + s.cami;
      // Estil en línia: les bandes donen forma de botó a tots els <a> de dins.
      a.style.cssText = 'display:flex;align-items:center;gap:14px;width:fit-content;padding:0;margin:0 0 18px;border:0;border-radius:0;background:none;box-shadow:none;min-height:0;color:var(--ink,#10131a);text-decoration:none';
      const img = document.createElement('img');
      img.src = s.logo;
      img.alt = '';
      img.width = 26;
      img.height = 26;
      img.style.cssText = 'display:block;width:26px;height:26px';
      const nom = document.createElement('span');
      nom.textContent = s.nom;
      a.append(img, nom);
      etiqueta.parentNode.insertBefore(a, etiqueta);
    };
    // 20.10.2026: la banda #tribuna es manté a la portada (decisió d'en Rafael).
    // 29.10.2026: la peça d'aquesta banda (i les de les bandes de Veus) ja NO surt també a
    // «Les seccions»: seccions-portada.php reprodueix aquesta regla per excloure-les.
    // 22.10.2026: una peça de «Veus de l'administració» no ocupa mai la banda de la tribuna
    // ni la de l'estudi: surt a la seva banda (#veus-administracio).
    const esAdministracio = (p) => p && p.serie === 'veus-de-l-administracio';
    // 22.10.2026 (decisió d'en Rafael, 05.54 h): «La tribuna» ja no és un format sinó l'espai
    // destacat de la portada que ocupen per torn, 2 dies cadascun, les peces noves dels
    // convidats: articles d'opinió i entrevistes (tribuna.js) i estudis (estudis.js). Es mostra
    // la més recent de les dues vigents. La banda «Estudi a fons» ha desaparegut.
    // CIVICAi, empresa i administració tenen banda pròpia i no hi entren.
    const clauDataPortada = (d) => String(d || '').split('.').reverse().join('');
    const candidatesTribuna = [window.IA_TRIBUNA, window.IA_ESTUDI]
      .filter((p) => p && p.title && !esAdministracio(p) && p.serie !== 'veus-de-civicai');
    const destacada = candidatesTribuna.reduce((a, b) => (a && clauDataPortada(a.date) >= clauDataPortada(b.date) ? a : b), null);
    if (destacada && document.querySelector('#tribuna')) {
      const tribuna = destacada;
      const esEstudi = tribuna === window.IA_ESTUDI;
      const band = document.querySelector('#tribuna');
      document.querySelector('#tribuna-title').textContent = tribuna.title;
      document.querySelector('#tribuna-excerpt').textContent = tribuna.excerpt || '';
      const format = esEstudi ? 'estudi' : (tribuna.category === 'ENTREVISTA' ? 'entrevista' : '');
      document.querySelector('#tribuna-eyebrow').textContent = ['La tribuna', format, tribuna.read ? tribuna.read.toLowerCase() : ''].filter(Boolean).join(' · ');
      const enllacTribuna = document.querySelector('#tribuna-link');
      if (enllacTribuna && esEstudi) {
        enllacTribuna.href = './estudi.html';
        enllacTribuna.firstChild.textContent = 'Llegir l’estudi ';
      } else if (enllacTribuna && format === 'entrevista') {
        enllacTribuna.firstChild.textContent = 'Llegir l’entrevista ';
      }
      marcaSerie(tribuna, document.querySelector('#tribuna-eyebrow'));
      // Byline: autor · càrrec, amb l'entitat enllaçada si la peça porta org/orgUrl
      // (mateixa lògica que IAPeces.rolAmbEnllac, que la portada no carrega).
      const byline = document.querySelector('#tribuna-byline');
      byline.textContent = tribuna.author || '';
      if (tribuna.role) {
        if (tribuna.author) byline.appendChild(document.createTextNode(' · '));
        const org = String(tribuna.org || '');
        const href = String(tribuna.orgUrl || '');
        const i = org ? tribuna.role.indexOf(org) : -1;
        if (/^https?:\/\//i.test(href)) {
          const a = document.createElement('a');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener';
          if (i < 0) {
            a.textContent = tribuna.role;
            byline.appendChild(a);
          } else {
            byline.appendChild(document.createTextNode(tribuna.role.slice(0, i)));
            a.textContent = org;
            byline.appendChild(a);
            byline.appendChild(document.createTextNode(tribuna.role.slice(i + org.length)));
          }
        } else {
          byline.appendChild(document.createTextNode(tribuna.role));
        }
      }
      if (tribuna.photo) {
        const img = document.querySelector('#tribuna-img');
        img.src = tribuna.photo;
        img.alt = tribuna.photoAlt || `Retrat de ${tribuna.author || ''}`.trim();
        document.querySelector('#tribuna-photo').hidden = false;
      } else {
        document.querySelector('.tribuna-layout').classList.add('tribuna-layout--solo');
      }
      band.hidden = false;
    }

    // ——— Veus de CIVICAi (12.10.2026): banda pròpia amb les peces de la sèrie ———
    // tribuna-arxiu.js (≈100 KB) i peces.js es baixen DESPRÉS de pintar la portada,
    // per no endarrerir-la. Des del 14.10.2026 (decisió d'en Rafael) les veus de
    // CIVICAi ja no ocupen mai la tribuna: es publiquen directament a tribuna-arxiu.js i
    // surten només en aquesta banda i a /veus-de-civicai.
    // 15.10.2026 (decisió d'en Rafael): DUES places alhora, perquè la columna setmanal
    // d'en Manel Sanromà (cada dijous) no tapi les peces de la resta de membres:
    //   1) la columna: la peça més recent d'en Sanromà;
    //   2) la peça més recent de qualsevol altre membre de CIVICAi (si té menys de
    //      VEUS_DIES_MAX dies; si no, la banda mostra només la columna).
    // Les dues targetes s'ordenen per data (la més nova primer). Si només n'hi ha una,
    // es pinta gran, com abans.
    // 16.10.2026 (decisió d'en Rafael): «Veus de CIVICAi» recull TOTES les col·laboracions
    // dels membres de CIVICAi, sigui quin sigui el format. Els estudis de membres de
    // CIVICAi es publiquen directament a estudis-arxiu.js (mai a estudis.js) amb el camp
    // serie, i entren a la banda igual que les peces d'opinió de tribuna-arxiu.js.
    const serieVeus = window.IA_SERIES && window.IA_SERIES['veus-de-civicai'];
    const VEUS_DIES_MAX = 30;
    if (serieVeus) {
      Promise.all([loadScript('./tribuna-arxiu.js'), loadScript('./estudis-arxiu.js'), loadScript('./peces.js')]).then(() => {
        const llista = [window.IA_TRIBUNA].concat(window.IA_TRIBUNA_ARXIU || []);
        const llistaEstudis = [window.IA_ESTUDI].concat(window.IA_ESTUDIS_ARXIU || []);
        // Cada veu sap de quina llista surt, per calcular-ne l'adreça fixa
        // (/tribuna/<id> o /estudis/<id>).
        const origen = new Map();
        llista.forEach((t, i) => { if (i > 0 && t) origen.set(t, { tipus: 'tribuna', llista }); });
        llistaEstudis.forEach((t, i) => { if (i > 0 && t) origen.set(t, { tipus: 'estudis', llista: llistaEstudis }); });
        const clauData = (d) => String(d || '').split('.').reverse().join('');
        const diesDes = (d) => {
          const [dd, mm, aa] = String(d || '').split('.').map(Number);
          if (!dd || !mm || !aa) return Infinity;
          return (Date.now() - new Date(aa, mm - 1, dd).getTime()) / 864e5;
        };
        const veus = [...origen.keys()]
          .filter((t) => t && t.title && t.serie === 'veus-de-civicai')
          .sort((a, b) => clauData(b.date).localeCompare(clauData(a.date)));
        const esColumna = (t) => /sanrom/i.test(String(t.author || ''));
        const columna = veus.find(esColumna);
        const altra = veus.find((t) => !esColumna(t) && diesDes(t.date) <= VEUS_DIES_MAX);
        const peces = [columna, altra].filter(Boolean)
          .sort((a, b) => clauData(b.date).localeCompare(clauData(a.date)));
        if (!peces.length) {
          const unica = veus[0];
          if (!unica) return;
          peces.push(unica);
        }
        const banda = document.querySelector('#veus-civicai');
        const graella = document.querySelector('#veus-peces');
        if (!banda || !graella) return;
        document.querySelector('#veus-desc').textContent = serieVeus.descripcio || '';
        if (serieVeus.crida && serieVeus.crida.href) document.querySelector('#veus-crida').href = serieVeus.crida.href;
        const el = (tag, classe, text) => {
          const n = document.createElement(tag);
          if (classe) n.className = classe;
          if (text) n.textContent = text;
          return n;
        };
        graella.textContent = '';
        graella.classList.toggle('veus-peces--una', peces.length === 1);
        peces.forEach((peca, index) => {
          const lloc = origen.get(peca) || { tipus: 'tribuna', llista };
          const cami = (window.IAPeces && window.IAPeces.cami(lloc.tipus, peca, lloc.llista)) || serieVeus.cami;
          const targeta = el('article', 'veus-peca');
          if (peca.photo) {
            const figura = el('figure', 'veus-photo');
            const img = el('img');
            img.src = peca.photo;
            img.alt = peca.photoAlt || `Retrat de ${peca.author || ''}`.trim();
            img.loading = 'lazy';
            figura.appendChild(img);
            targeta.appendChild(figura);
          } else {
            targeta.classList.add('veus-peca--sense-foto');
          }
          const text = el('div', 'veus-copy');
          const etiqueta = esColumna(peca) ? 'Columna setmanal' : 'Veus de CIVICAi';
          text.appendChild(el('p', 'eyebrow', `${etiqueta}${peca.read ? ' · ' + peca.read.toLowerCase() : ''}${peca.date ? ' · ' + peca.date : ''}`));
          const titol = el('h2');
          if (index === 0) titol.id = 'veus-titol';
          const enllac = el('a', '', peca.title);
          enllac.href = cami;
          titol.appendChild(enllac);
          text.appendChild(titol);
          const entradeta = peca.excerpt || peca.abstract;
          if (entradeta) text.appendChild(el('p', 'veus-entradeta', entradeta));
          const qui = el('p', 'veus-byline', peca.author || '');
          if (peca.role) {
            if (peca.author) qui.appendChild(document.createTextNode(' · '));
            if (window.IAPeces && window.IAPeces.rolAmbEnllac) {
              const rol = el('span');
              window.IAPeces.rolAmbEnllac(rol, peca);
              qui.appendChild(rol);
            } else {
              qui.appendChild(document.createTextNode(peca.role));
            }
          }
          text.appendChild(qui);
          const accions = el('p', 'veus-accions');
          const boto = el('a', 'veus-boto', 'Llegir la peça ');
          boto.href = cami;
          boto.appendChild(el('span', '', '↗'));
          accions.appendChild(boto);
          text.appendChild(accions);
          targeta.appendChild(text);
          graella.appendChild(targeta);
        });
        banda.hidden = false;
      });
    }

    // ——— Veus d'empresa (15.10.2026): la peça més recent d'empresa.js ———
    // empresa.js es baixa després de pintar la portada. Es mostra la peça més recent
    // si té menys d'EMPRESA_DIES_MAX dies; si no, la banda queda amagada.
    const EMPRESA_DIES_MAX = 30;
    Promise.all([loadScript('./empresa.js'), loadScript('./peces.js')]).then(() => {
      const llista = [null].concat(window.IA_EMPRESA || []);
      const peca = llista[1];
      const banda = document.querySelector('#veus-empresa');
      const graella = document.querySelector('#empresa-peces');
      if (!peca || !peca.title || !banda || !graella) return;
      const [dd, mm, aa] = String(peca.date || '').split('.').map(Number);
      if (!dd || !mm || !aa || (Date.now() - new Date(aa, mm - 1, dd).getTime()) / 864e5 > EMPRESA_DIES_MAX) return;
      const el = (tag, classe, text) => {
        const n = document.createElement(tag);
        if (classe) n.className = classe;
        if (text) n.textContent = text;
        return n;
      };
      const cami = (window.IAPeces && window.IAPeces.cami('empresa', peca, llista)) || './veus-d-empresa';
      const targeta = el('article', 'veus-peca');
      if (peca.photo) {
        const figura = el('figure', 'veus-photo');
        const img = el('img');
        img.src = peca.photo;
        img.alt = peca.photoAlt || `Retrat de ${peca.author || ''}`.trim();
        img.loading = 'lazy';
        figura.appendChild(img);
        targeta.appendChild(figura);
      } else {
        targeta.classList.add('veus-peca--sense-foto');
      }
      const text = el('div', 'veus-copy');
      const tipus = peca.category ? peca.category.charAt(0) + peca.category.slice(1).toLowerCase() : 'Veus d’empresa';
      text.appendChild(el('p', 'eyebrow', `${tipus}${peca.read ? ' · ' + peca.read.toLowerCase() : ''}${peca.date ? ' · ' + peca.date : ''}`));
      const titol = el('h2');
      titol.id = 'empresa-titol';
      const enllac = el('a', '', peca.title);
      enllac.href = cami;
      titol.appendChild(enllac);
      text.appendChild(titol);
      if (peca.excerpt) text.appendChild(el('p', 'veus-entradeta', peca.excerpt));
      const qui = el('p', 'veus-byline', peca.author || '');
      if (peca.role) {
        if (peca.author) qui.appendChild(document.createTextNode(' · '));
        const rol = el('span');
        if (window.IAPeces && window.IAPeces.rolAmbEnllac) window.IAPeces.rolAmbEnllac(rol, peca);
        else rol.textContent = peca.role;
        qui.appendChild(rol);
      }
      text.appendChild(qui);
      const accions = el('p', 'veus-accions');
      const boto = el('a', 'veus-boto', peca.category === 'ENTREVISTA' ? 'Llegir l’entrevista ' : 'Llegir la peça ');
      boto.href = cami;
      boto.appendChild(el('span', '', '↗'));
      accions.appendChild(boto);
      text.appendChild(accions);
      targeta.appendChild(text);
      graella.textContent = '';
      graella.appendChild(targeta);
      banda.hidden = false;
    });

    // ——— Veus de l'administració (22.10.2026, decisió d'en Rafael) ———
    // Secció equiparable a Veus de CIVICAi i Veus d'empresa: la peça més recent amb
    // "serie": "veus-de-l-administracio" (de tribuna-arxiu.js, estudis-arxiu.js o, per a
    // les peces d'abans del 22.10, la vigent), si té menys d'ADMIN_DIES_MAX dies.
    const ADMIN_DIES_MAX = 30;
    Promise.all([loadScript('./tribuna-arxiu.js'), loadScript('./estudis-arxiu.js'), loadScript('./peces.js')]).then(() => {
      const llistaT = [window.IA_TRIBUNA].concat(window.IA_TRIBUNA_ARXIU || []);
      const llistaE = [window.IA_ESTUDI].concat(window.IA_ESTUDIS_ARXIU || []);
      const origen = new Map();
      llistaT.forEach((t) => { if (t) origen.set(t, { tipus: 'tribuna', llista: llistaT }); });
      llistaE.forEach((t) => { if (t) origen.set(t, { tipus: 'estudis', llista: llistaE }); });
      const clauData = (d) => String(d || '').split('.').reverse().join('');
      const peca = [...origen.keys()]
        .filter((t) => t && t.title && esAdministracio(t))
        .sort((a, b) => clauData(b.date).localeCompare(clauData(a.date)))[0];
      const banda = document.querySelector('#veus-administracio');
      const graella = document.querySelector('#administracio-peces');
      if (!peca || !banda || !graella) return;
      const [dd, mm, aa] = String(peca.date || '').split('.').map(Number);
      if (!dd || !mm || !aa || (Date.now() - new Date(aa, mm - 1, dd).getTime()) / 864e5 > ADMIN_DIES_MAX) return;
      const el = (tag, classe, text) => {
        const n = document.createElement(tag);
        if (classe) n.className = classe;
        if (text) n.textContent = text;
        return n;
      };
      const lloc = origen.get(peca);
      const cami = (window.IAPeces && window.IAPeces.cami(lloc.tipus, peca, lloc.llista)) || './veus-de-l-administracio';
      const targeta = el('article', 'veus-peca');
      if (peca.photo) {
        const figura = el('figure', 'veus-photo');
        const img = el('img');
        img.src = peca.photo;
        img.alt = peca.photoAlt || `Retrat de ${peca.author || ''}`.trim();
        img.loading = 'lazy';
        figura.appendChild(img);
        targeta.appendChild(figura);
      } else {
        targeta.classList.add('veus-peca--sense-foto');
      }
      const text = el('div', 'veus-copy');
      const tipus = lloc.tipus === 'estudis' ? 'Estudi a fons' : (peca.category === 'ENTREVISTA' ? 'Entrevista' : 'Opinió');
      text.appendChild(el('p', 'eyebrow', `${tipus}${peca.read ? ' · ' + peca.read.toLowerCase() : ''}${peca.date ? ' · ' + peca.date : ''}`));
      const titol = el('h2');
      titol.id = 'administracio-titol';
      const enllac = el('a', '', peca.title);
      enllac.href = cami;
      titol.appendChild(enllac);
      text.appendChild(titol);
      const entradeta = peca.excerpt || peca.abstract;
      if (entradeta) text.appendChild(el('p', 'veus-entradeta', entradeta));
      const qui = el('p', 'veus-byline', peca.author || '');
      if (peca.role) {
        if (peca.author) qui.appendChild(document.createTextNode(' · '));
        const rol = el('span');
        if (window.IAPeces && window.IAPeces.rolAmbEnllac) window.IAPeces.rolAmbEnllac(rol, peca);
        else rol.textContent = peca.role;
        qui.appendChild(rol);
      }
      text.appendChild(qui);
      const accions = el('p', 'veus-accions');
      const boto = el('a', 'veus-boto', peca.category === 'ENTREVISTA' ? 'Llegir l’entrevista ' : 'Llegir la peça ');
      boto.href = cami;
      boto.appendChild(el('span', '', '↗'));
      accions.appendChild(boto);
      text.appendChild(accions);
      targeta.appendChild(text);
      graella.textContent = '';
      graella.appendChild(targeta);
      banda.hidden = false;
    });

    // ——— Estudis: des del 22.10.2026 l'estudi vigent entra a la rotació de «La tribuna» (a dalt);
    // la banda «Estudi a fons» (#estudis) ja no existeix. ———

    // ——— Peces editorials ———
    if (window.IA_ANALYSIS) {
      document.querySelector('#analysis-title').textContent = window.IA_ANALYSIS.title || '';
      document.querySelector('#analysis-excerpt').textContent = window.IA_ANALYSIS.excerpt || '';
      if (window.IA_ANALYSIS.read) document.querySelector('#analysis-eyebrow').textContent = `Anàlisi de la setmana · ${window.IA_ANALYSIS.read.toLowerCase()}`;
    }
    if (window.IA_REFLECTION) {
      document.querySelector('#reflection-title').textContent = window.IA_REFLECTION.title || '';
      document.querySelector('#reflection-dek').textContent = window.IA_REFLECTION.dek || '';
      const reflectionMeta = document.querySelector('#reflection-meta');
      if (reflectionMeta) {
        reflectionMeta.textContent = window.IA_REFLECTION.date
          ? `Per Redacció IA.cat · ${window.IA_REFLECTION.date}`
          : 'Per Redacció IA.cat';
      }
    }

    // ——— Cerca dins l'edició (depèn de renderNews) ———
    document.querySelector('#site-search').addEventListener('input', event => {
      const query = event.target.value.trim().toLocaleLowerCase('ca');
      // La cerca busca en totes les notícies del dia; amb el camp buit torna la graella normal.
      const filtered = query ? news.filter(story => `${story.title} ${story.excerpt} ${story.category}`.toLocaleLowerCase('ca').includes(query)) : gridNews;
      if (newsSection) newsSection.hidden = !query && !gridNews.length;
      renderNews(filtered);
      document.querySelector('#empty-search').hidden = filtered.length > 0;
      if (query) document.querySelector('#totes').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  function setupChrome() {
    const menuButton = document.querySelector('.menu-button');
    const primaryNav = document.querySelector('#primary-nav');
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      primaryNav.classList.toggle('open', open);
    });

    const searchButton = document.querySelector('.search-button');
    const searchPanel = document.querySelector('#search-panel');
    searchButton.addEventListener('click', () => {
      const open = searchPanel.hidden;
      searchPanel.hidden = !open;
      searchButton.setAttribute('aria-expanded', String(open));
      if (open) document.querySelector('#site-search').focus();
    });
    document.querySelector('.search-form').addEventListener('submit', event => event.preventDefault());

    // ——— Subscripció al butlletí (sistema actual, api.php) ———
    const formButlleti = document.querySelector('#newsletter-form');
    // Parany antibots (17.10.2026): camp invisible «web» i temps des de la càrrega («t»). Vegeu api.php.
    if (formButlleti && !formButlleti.querySelector('input[name="web"]')) {
      const camp = document.createElement('input');
      camp.type = 'text'; camp.name = 'web'; camp.tabIndex = -1; camp.autocomplete = 'off';
      camp.setAttribute('aria-hidden', 'true');
      camp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
      formButlleti.appendChild(camp);
    }
    formButlleti.addEventListener('submit', async event => {
      event.preventDefault();
      const email = document.querySelector('#email');
      const message = document.querySelector('#form-message');
      if (!email.validity.valid) {
        message.textContent = 'Escriu una adreça de correu vàlida.';
        email.focus();
        return;
      }
      message.textContent = 'Un moment…';
      try {
        const body = new URLSearchParams({
          email: email.value.trim(),
          web: (formButlleti.querySelector('input[name="web"]') || {}).value || '',
          t: String(Math.round(performance.now()))
        });
        const response = await fetch('./api.php?action=subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        const payload = await response.json().catch(() => null);
        message.textContent = payload?.message || (response.ok
          ? 'Gràcies! Ja formes part de l’edició de dissabte.'
          : 'Ara mateix no s’ha pogut completar la subscripció. Torna-ho a provar més tard.');
        if (payload?.ok) email.value = '';
      } catch {
        message.textContent = 'Ara mateix no s’ha pogut completar la subscripció. Torna-ho a provar més tard.';
      }
    });

    // ——— Mode focus ———
    const focusButton = document.querySelector('#focus-mode');
    focusButton.addEventListener('click', () => {
      const active = document.body.classList.toggle('focus-mode');
      focusButton.setAttribute('aria-pressed', String(active));
    });
  }

  const start = async () => {
    await dataReady;
    const status = await statusReady;
    const news = Array.isArray(window.IA_NEWS) && window.IA_NEWS.length ? window.IA_NEWS : [];
    const radar = Array.isArray(window.IA_RADAR) && window.IA_RADAR.length ? window.IA_RADAR : [];
    init(news, radar, status);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
