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

  const loadScript = src => new Promise(resolve => {
    const script = document.createElement('script');
    script.src = `${src}?v=${stamp}`;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.append(script);
  });

  const dataReady = Promise.all([
    loadScript('./news.js'),
    loadScript('./radar.js'),
    loadScript('./analysis.js'),
    loadScript('./tribuna.js'),
    loadScript('./reflection.js'),
    loadScript('./daily-image.js')
  ]);

  const statusReady = fetch(`./content-status.json?v=${stamp}`)
    .then(response => (response.ok ? response.json() : null))
    .catch(() => null);

  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  const storyHref = story => story.slug ? `./article.php?slug=${encodeURIComponent(story.slug)}` : (story.url || '#');
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
    document.querySelector('#news-count').textContent = news.length >= 6
      ? `${news.length} històries · ${Math.min(5, news.length)} imprescindibles`
      : `L'edició del dia`;

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
    if (window.IA_DAILY_IMAGE) {
      const dailyImage = window.IA_DAILY_IMAGE;
      dailyImageEl.src = dailyImage.image || dailyImageEl.src;
      dailyImageEl.alt = dailyImage.alt || dailyImageEl.alt;
      document.querySelector('#daily-visual-kicker').textContent = dailyImage.kicker || 'IA × Societat';
      document.querySelector('#daily-visual-title').textContent = dailyImage.title || '';
      document.querySelector('#daily-visual-caption').textContent = dailyImage.caption || '';
      document.querySelector('#daily-visual-credit').textContent = dailyImage.credit || 'Imatge editorial generada amb IA';
      if (dailyImage.date) {
        const [year, month, day] = dailyImage.date.split('-');
        document.querySelector('#daily-image-date').textContent = `Imatge del dia · ${day}.${month}.${year}`;
      }
    }
    dailyImageEl.addEventListener('error', () => {
      dailyFigure.hidden = true;
      document.querySelector('#portada').classList.add('no-visual');
    });

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
    const dailyStories = news.slice(0, Math.min(8, news.length));

    function renderCarousel() {
      const story = dailyStories[activeIndex];
      const indexLabel = String(activeIndex + 1).padStart(2, '0');
      const totalLabel = String(dailyStories.length).padStart(2, '0');
      stage.innerHTML = `
        <article class="hero-story" aria-label="Notícia ${activeIndex + 1} de ${dailyStories.length}">
          <a class="hero-story__image" href="${escapeHTML(storyHref(story))}">
            ${story.image ? `<img src="${escapeHTML(story.image)}" alt="" fetchpriority="high">` : ''}
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
      if (!reduceMotion) carouselTimer = window.setInterval(() => nextStory(1), 6000);
    }
    document.querySelector('#carousel-prev').addEventListener('click', () => { nextStory(-1); restartCarousel(); });
    document.querySelector('#carousel-next').addEventListener('click', () => { nextStory(1); restartCarousel(); });
    document.querySelector('.daily-carousel').addEventListener('mouseenter', () => window.clearInterval(carouselTimer));
    document.querySelector('.daily-carousel').addEventListener('mouseleave', restartCarousel);
    renderCarousel();
    restartCarousel();

    // ——— Llista «En moviment» ———
    document.querySelector('#latest-list').innerHTML = news.slice(0, 5).map(story => `
      <li><div><time>${escapeHTML(story.category)}</time><a href="${escapeHTML(storyHref(story))}">${escapeHTML(story.title)}</a></div></li>
    `).join('');

    // ——— Graella de notícies del dia ———
    const newsGrid = document.querySelector('#news-grid');
    function renderNews(items) {
      newsGrid.innerHTML = items.map(story => `
        <article class="news-card">
          <a href="${escapeHTML(storyHref(story))}">
            ${story.image ? `<div class="news-card__image"><img src="${escapeHTML(story.image)}" alt="" loading="lazy"></div>` : ''}
            <p class="story-meta"><i></i>${escapeHTML(story.category)} · ${escapeHTML(story.read || '5 MIN')}</p>
            <h3>${escapeHTML(story.title)}</h3>
            <p>${escapeHTML(story.excerpt || '')}</p>
          </a>
        </article>`).join('');
    }
    renderNews(news);

    // ——— Radar català ———
    document.querySelector('#radar-grid').innerHTML = radar.slice(0, 8).map(item => `
      <a class="radar-card" href="${escapeHTML(item.url || '#')}" ${item.url ? 'target="_blank" rel="noreferrer"' : ''}>
        <p class="radar-card__place"><span>${escapeHTML(item.place)} · ${escapeHTML(item.category)}</span><span>${escapeHTML(item.date)}</span></p>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.summary || '')}</p>
      </a>`).join('');

    // ——— La tribuna (article d'autor, fitxer manual tribuna.js) ———
    if (window.IA_TRIBUNA && window.IA_TRIBUNA.title) {
      const tribuna = window.IA_TRIBUNA;
      const band = document.querySelector('#tribuna');
      document.querySelector('#tribuna-title').textContent = tribuna.title;
      document.querySelector('#tribuna-excerpt').textContent = tribuna.excerpt || '';
      document.querySelector('#tribuna-eyebrow').textContent = tribuna.read ? `La tribuna · ${tribuna.read.toLowerCase()}` : 'La tribuna';
      document.querySelector('#tribuna-byline').textContent = [tribuna.author, tribuna.role].filter(Boolean).join(' · ');
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

    // ——— Peces editorials ———
    if (window.IA_ANALYSIS) {
      document.querySelector('#analysis-title').textContent = window.IA_ANALYSIS.title || '';
      document.querySelector('#analysis-excerpt').textContent = window.IA_ANALYSIS.excerpt || '';
      if (window.IA_ANALYSIS.read) document.querySelector('#analysis-eyebrow').textContent = `Anàlisi de la setmana · ${window.IA_ANALYSIS.read.toLowerCase()}`;
    }
    if (window.IA_REFLECTION) {
      document.querySelector('#reflection-title').textContent = window.IA_REFLECTION.title || '';
      document.querySelector('#reflection-dek').textContent = window.IA_REFLECTION.dek || '';
      const body = Array.isArray(window.IA_REFLECTION.body)
        ? window.IA_REFLECTION.body
        : String(window.IA_REFLECTION.body || '').split(/\n\n+/).filter(Boolean);
      document.querySelector('#reflection-body').innerHTML = body.map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join('');
    }

    const reflectionToggle = document.querySelector('[data-reflection-toggle]');
    reflectionToggle.addEventListener('click', () => {
      const body = document.querySelector('#reflection-body');
      const open = body.hidden;
      body.hidden = !open;
      reflectionToggle.setAttribute('aria-expanded', String(open));
      reflectionToggle.querySelector('span').textContent = open ? '↑' : '↓';
    });

    // ——— Cerca dins l'edició (depèn de renderNews) ———
    document.querySelector('#site-search').addEventListener('input', event => {
      const query = event.target.value.trim().toLocaleLowerCase('ca');
      const filtered = news.filter(story => `${story.title} ${story.excerpt} ${story.category}`.toLocaleLowerCase('ca').includes(query));
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
    document.querySelector('#newsletter-form').addEventListener('submit', async event => {
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
        const body = new URLSearchParams({ email: email.value.trim() });
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
