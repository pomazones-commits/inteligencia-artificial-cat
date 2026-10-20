/* Banda «Les seccions» de la portada (20.10.2026, decisió d'en Rafael).
   Substitueix la banda de «La tribuna»: una targeta per a cadascuna de les sis
   seccions temàtiques, amb la darrera peça signada. Dades: /seccions-portada.php.
   Estils: seccions-portada.css. Si les dades no arriben, la banda es queda amagada. */
(function () {
  'use strict';
  function el(tag, classe, text) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (text) n.textContent = text;
    return n;
  }
  function pinta(dades) {
    var banda = document.getElementById('seccions');
    var graella = document.getElementById('seccions-graella');
    if (!banda || !graella || !dades || !Array.isArray(dades.seccions)) return;
    var files = dades.seccions.filter(function (s) { return s && s.peca && s.peca.titol; });
    if (!files.length) return;
    graella.textContent = '';
    files.forEach(function (s) {
      var p = s.peca;
      var targeta = el('article', 'seccio-targeta' + (p.foto ? '' : ' seccio-targeta--sense-foto'));
      var nom = el('a', 'seccio-targeta__seccio', s.nom);
      nom.href = s.url;
      targeta.appendChild(nom);
      var cos = el('div', 'seccio-targeta__cos');
      if (p.foto) {
        var img = el('img', 'seccio-targeta__foto');
        img.src = p.foto;
        img.alt = p.fotoAlt || ('Retrat de ' + p.autor);
        img.loading = 'lazy';
        img.width = 64;
        img.height = 64;
        cos.appendChild(img);
      }
      var text = el('div', 'seccio-targeta__text');
      text.appendChild(el('p', 'seccio-targeta__format', p.format + (p.data ? ' · ' + p.data : '')));
      var h3 = el('h3');
      var a = el('a', '', p.titol);
      a.href = p.url;
      h3.appendChild(a);
      text.appendChild(h3);
      text.appendChild(el('p', 'seccio-targeta__autor', p.autor));
      cos.appendChild(text);
      targeta.appendChild(cos);
      graella.appendChild(targeta);
    });
    banda.hidden = false;
  }
  function carrega() {
    fetch('/seccions-portada.php', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(pinta)
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', carrega);
  else carrega();
})();
