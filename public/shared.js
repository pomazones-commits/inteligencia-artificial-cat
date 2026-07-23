(() => {
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
