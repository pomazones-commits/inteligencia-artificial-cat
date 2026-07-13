const fallbackNews = [
  { category: 'MÓN', read: '4 MIN', title: 'Els grans laboratoris reordenen la cursa pels models multimodals', excerpt: 'Què mirar més enllà dels anuncis i les demostracions.' },
  { category: 'SOCIETAT', read: '6 MIN', title: 'Dret a saber: com hauria de transparència una decisió algorítmica?', excerpt: 'Una guia clara per entendre el debat que ve.' },
  { category: 'EINES', read: '3 MIN', title: 'Cinc maneres de fer servir la IA sense cedir-hi el teu criteri', excerpt: 'Propostes pràctiques per a la feina del dia a dia.' },
];

const fallbackRadar = [
  { place: 'Barcelona', category: 'RECERCA', date: 'Actualitat', title: 'El radar editorial s’està actualitzant', summary: 'Torna-ho a provar en uns instants.', detail: 'No s’ha pogut carregar el radar en aquest moment.', source: 'IA.cat', url: '#' },
];

const fallbackReflection = {
  date: '10.07.2026',
  title: 'La velocitat no és una brúixola',
  dek: 'Una reflexió editorial sobre el lloc que hauria d’ocupar la intel·ligència artificial en les nostres decisions.',
  body: ['La tecnologia pot accelerar processos, però no decideix per nosaltres què mereix ser accelerat.'],
};

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const initialNews = Array.isArray(window.IA_NEWS) && window.IA_NEWS.length ? window.IA_NEWS : fallbackNews;

const card = story => {
  const href = story.url || (story.slug ? `./article.php?slug=${encodeURIComponent(story.slug)}` : '#');
  const external = Boolean(story.url);
  const image = story.image ? `<img src="${escapeHTML(story.image)}" alt="Il·lustració generada amb IA per a: ${escapeHTML(story.title)}" loading="lazy" />` : '';
  return `<article class="news-card ${story.image ? 'with-image' : ''} reveal"><a href="${escapeHTML(href)}" ${external ? 'target="_blank" rel="noreferrer"' : ''}>${image}<div><p class="story-meta"><span class="tag">${escapeHTML(story.category)}</span> <span>·</span> ${escapeHTML(story.read || '5 MIN')}</p><h3>${escapeHTML(story.title)}</h3><p>${escapeHTML(story.excerpt)}</p></div></a></article>`;
};

async function loadNews() {
  try {
    const res = await fetch(`./news.js?ts=${Date.now()}`, { cache: 'no-store' });
    new Function(await res.text())();
    return Array.isArray(window.IA_NEWS) && window.IA_NEWS.length ? window.IA_NEWS : initialNews;
  } catch {
    return initialNews;
  }
}

async function loadScriptData(path, globalName, fallback) {
  try {
    const res = await fetch(`${path}?ts=${Date.now()}`, { cache: 'no-store' });
    new Function(await res.text())();
    return window[globalName] || fallback;
  } catch {
    return window[globalName] || fallback;
  }
}

function renderRadar(items) {
  const feed = document.querySelector('#radar-feed');
  const detail = document.querySelector('#radar-detail');
  if (!feed || !detail) return;

  feed.innerHTML = items.map((item, index) => `<button class="radar-item" type="button" data-radar-index="${index}" aria-controls="radar-detail" aria-expanded="false"><span>${escapeHTML(item.place)} · ${escapeHTML(item.category)}</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.date)} · Prem per ampliar</small></button>`).join('');

  feed.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-radar-index]') : null;
    if (!target) return;
    const index = Number(target.dataset.radarIndex);
    const item = items[index];
    if (!item) return;
    const wasOpen = target.getAttribute('aria-expanded') === 'true';
    feed.querySelectorAll('[data-radar-index]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (wasOpen) {
      detail.hidden = true;
      return;
    }
    target.setAttribute('aria-expanded', 'true');
    detail.innerHTML = `<p class="eyebrow">${escapeHTML(item.source)} · ${escapeHTML(item.date)}</p><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p><a class="source-link" href="${escapeHTML(item.url)}" target="_blank" rel="noreferrer">Llegeix la font original <b>↗</b></a>`;
    detail.hidden = false;
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function renderReflection(reflection) {
  const panel = document.querySelector('#reflection-detail');
  if (!panel) return;
  const paragraphs = Array.isArray(reflection.body) ? reflection.body.map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join('') : '';
  panel.innerHTML = `<p class="eyebrow">REFLEXIÓ · ${escapeHTML(reflection.date || '')}</p><h3>${escapeHTML(reflection.title)}</h3><p class="reflection-dek">${escapeHTML(reflection.dek || '')}</p>${paragraphs}`;
}

function bindExpandablePanels() {
  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-expand]') : null;
    if (!trigger) return;
    const panel = document.getElementById(trigger.dataset.expand);
    if (!panel) return;
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    trigger.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

const [news, radar, reflection, analysis] = await Promise.all([
  loadNews(),
  loadScriptData('./radar.js', 'IA_RADAR', fallbackRadar),
  loadScriptData('./reflection.js', 'IA_REFLECTION', fallbackReflection),
  loadScriptData('./analysis.js', 'IA_ANALYSIS', null),
]);

const featured = document.querySelector('#featured-analysis');
if (featured && analysis && analysis.title) {
  featured.innerHTML = `<p class="story-meta">${escapeHTML(analysis.category || 'ANÀLISI')} <span>·</span> ${escapeHTML(analysis.read || '7 MIN')}</p><h3>${escapeHTML(analysis.title)}</h3><p class="story-excerpt">${escapeHTML(analysis.excerpt || '')}</p><span class="read-link">Llegeix l'anàlisi <b>↗</b></span>`;
}

const newsGrid = document.querySelector('#news-grid');
const visibleNews = news.slice(0, 6);
newsGrid.innerHTML = visibleNews.map(card).join('');
newsGrid.dataset.count = String(visibleNews.length);
renderRadar(Array.isArray(radar) && radar.length ? radar : fallbackRadar);
renderReflection(reflection || fallbackReflection);
bindExpandablePanels();

document.addEventListener('pointermove', event => {
  document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
  document.documentElement.style.setProperty('--my', `${event.clientY}px`);
});

document.querySelector('#newsletter-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#form-message');
  message.textContent = 'Un moment…';
  try {
    const res = await fetch('./api.php?action=subscribe', { method: 'POST', body: new FormData(event.target) });
    const data = await res.json();
    message.textContent = data.message;
    event.target.reset();
  } catch {
    message.textContent = 'No hem pogut desar la subscripció. Torna-ho a provar.';
  }
});
