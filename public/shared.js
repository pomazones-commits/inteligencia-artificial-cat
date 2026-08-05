(() => {
  // ───────────────────────────────────────────────────────────────────────
  // Comptes de xarxes socials — ÚNIC LLOC on es toquen.
  // Deixa la cadena buida per amagar una xarxa; si totes són buides, la fila
  // no apareix enlloc. Els mateixos enllaços són estàtics al peu d'index.html
  // (allà cal marcatge de debò perquè el verificador de Mastodon llegeix
  // l'HTML i no executa JavaScript): si canvies res aquí, canvia-ho també allà.
  // ───────────────────────────────────────────────────────────────────────
  const XARXES = {
    mastodon: 'https://mastodont.cat/@iacat',
    x: '',
    linkedin: '',
    telegram: '',
    whatsapp: '',
    rss: './feed.xml'
  };

  const ICONES = {
    mastodon: { nom: 'Mastodon', d: 'M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.007C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.306C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.257 5.611.117 1.24.322 2.47.616 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.61.527-.135.786-.22.585-.19 1.27-.4 1.774-.766a.055.055 0 0 0 .022-.043v-1.84a.05.05 0 0 0-.02-.04.053.053 0 0 0-.044-.01 20.968 20.968 0 0 1-4.877.565c-2.826 0-3.584-1.34-3.802-1.898a5.83 5.83 0 0 1-.33-1.484.053.053 0 0 1 .066-.054c1.579.38 3.198.571 4.823.57.39 0 .78 0 1.17-.01 1.633-.046 3.355-.13 4.962-.443.04-.008.08-.015.115-.025 2.535-.487 4.947-2.01 5.192-5.878.01-.152.033-1.593.033-1.75.001-.535.174-3.799-.025-5.8zm-3.748 9.612h-2.561V8.706c0-1.317-.55-1.988-1.669-1.988-1.23 0-1.846.795-1.846 2.365v3.425h-2.546V9.083c0-1.57-.617-2.365-1.848-2.365-1.112 0-1.668.671-1.668 1.988v6.219H4.822V8.517c0-1.317.336-2.363 1.011-3.138.696-.773 1.608-1.17 2.74-1.17 1.311 0 2.302.504 2.962 1.508l.638 1.07.638-1.07c.66-1.004 1.65-1.508 2.96-1.508 1.13 0 2.043.397 2.74 1.17.675.775 1.01 1.821 1.01 3.138z' },
    x: { nom: 'X', d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    linkedin: { nom: 'LinkedIn', d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
    telegram: { nom: 'Telegram', d: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' },
    whatsapp: { nom: 'WhatsApp', d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.465 3.49' },
    rss: { nom: 'RSS', d: 'M4.5 15a4.5 4.5 0 0 1 4.5 4.5H6a3 3 0 0 0-3-3v-3zM3 9a10.5 10.5 0 0 1 10.5 10.5h-3A7.5 7.5 0 0 0 3 12V9zm0-6c9.113 0 16.5 7.387 16.5 16.5h-3C16.5 12.044 10.456 6 3 6V3z' }
  };

  // Fila d'icones al peu. La portada la porta estàtica al seu HTML.
  (() => {
    const peu = document.querySelector('footer');
    if (!peu || peu.querySelector('.xarxes-peu')) return;
    const actives = Object.keys(ICONES).filter(k => XARXES[k]);
    if (!actives.length) return;

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = './xarxes-peu.css?v=2026080501';
    document.head.appendChild(css);

    const fila = document.createElement('div');
    fila.className = 'xarxes-peu';
    fila.innerHTML = '<span class="xarxes-peu__etiqueta">Segueix-nos</span>' + actives.map(k => {
      const i = ICONES[k];
      const rel = k === 'mastodon' ? 'me noopener' : 'noopener';
      return '<a href="' + XARXES[k] + '" rel="' + rel + '" target="_blank" title="' + i.nom +
        '" aria-label="' + i.nom + '"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' +
        i.d + '"></path></svg></a>';
    }).join('');

    const caixa = peu.querySelector('.editorial-footer__inner > div') || peu.firstElementChild || peu;
    caixa.appendChild(fila);
  })();

  // Banda de subscripció al butlletí, injectada a totes les pàgines interiors
  // just abans del footer. La portada (que té #newsletter-form propi) i
  // qualsevol pàgina que ja porti un formulari .js-subscribe-form al seu HTML
  // en queden excloses. L'estil viu a subscriu.css (full autònom).
  (() => {
    if (document.querySelector('#newsletter-form, .js-subscribe-form')) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = './subscriu.css?v=2026080401';
    document.head.appendChild(css);
    const banda = document.createElement('section');
    banda.className = 'subscriu-banda';
    banda.setAttribute('aria-label', 'Subscripció al butlletí');
    banda.innerHTML = [
      '<div class="subscriu-inner">',
      '  <p class="subscriu-kicker"><i></i>El butlletí</p>',
      '  <h2 class="subscriu-titol">La setmana d’IA, en cinc minuts</h2>',
      '  <p class="subscriu-text">Cada dissabte, el millor del briefing al teu correu. Gratuït i en català.</p>',
      '  <form class="js-subscribe-form subscriu-form" action="./api.php?action=subscribe" method="post" novalidate>',
      '    <label for="subscriu-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Correu electrònic</label>',
      '    <input id="subscriu-email" name="email" type="email" autocomplete="email" placeholder="el.teu@correu.cat" required>',
      '    <button type="submit">Subscriu-m’hi →</button>',
      '  </form>',
      '  <p class="js-form-message subscriu-missatge" role="status" aria-live="polite"></p>',
      '  <p class="subscriu-peu">Sense soroll: un correu per setmana, i prou.</p>',
      '</div>'
    ].join('\n');
    const footer = document.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(banda, footer);
    else document.body.appendChild(banda);
  })();

  document.querySelectorAll('.js-subscribe-form').forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const message = form.querySelector('.js-form-message');
      const button = form.querySelector('button[type="submit"]');
      if (message) message.textContent = '';
      if (button) button.disabled = true;
      try {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form) });
        const payload = await response.json();
        if (message) message.textContent = payload.message || (response.ok ? 'Subscripció confirmada.' : 'No s’ha pogut completar la subscripció.');
        if (response.ok) form.reset();
      } catch (_) {
        if (message) message.textContent = 'No s’ha pogut connectar. Torna-ho a provar d’aquí a un moment.';
      } finally {
        if (button) button.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-copy-url]').forEach(button => {
    button.addEventListener('click', async () => {
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(button.dataset.copyUrl || location.href);
        button.textContent = 'Enllaç copiat ✓';
      } catch (_) {
        window.prompt('Copia aquest enllaç:', button.dataset.copyUrl || location.href);
      }
      window.setTimeout(() => { button.textContent = original; }, 1800);
    });
  });

  document.querySelectorAll('[data-copy-target]').forEach(button => {
    button.addEventListener('click', async () => {
      const target = document.querySelector(button.dataset.copyTarget || '');
      if (!target) return;
      const original = button.textContent;
      const value = target.textContent || '';
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = 'Copiat ✓';
      } catch (_) {
        window.prompt('Copia aquest text:', value);
      }
      window.setTimeout(() => { button.textContent = original; }, 1800);
    });
  });
})();
