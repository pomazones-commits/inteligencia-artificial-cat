(() => {
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
