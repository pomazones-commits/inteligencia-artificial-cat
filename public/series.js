/* Sèries de «La tribuna» i «Estudis» (12.10.2026). Fitxer MANUAL.
   Contracte públic: window.IA_SERIES (dades) i window.IASeries = { troba, marca }.

   Una peça forma part d'una sèrie si porta el camp opcional "serie" amb la clau
   de la sèrie (p. ex. "serie": "veus-de-civicai") a tribuna.js, tribuna-arxiu.js,
   estudis.js o estudis-arxiu.js. Llavors:
     - tribuna.html i estudi.html hi pinten el distintiu (etiqueta sobre el títol i
       targeta al final del text, amb el logo, la descripció i la crida);
     - la pàgina de la sèrie (/veus-de-civicai, veus-de-civicai.php) la llista sola.

   ⚠️ inc/peces.php llegeix AQUESTES MATEIXES DADES (iacat_series()), per això
   l'assignació de window.IA_SERIES ha de ser l'ÚLTIMA instrucció del fitxer, a
   la columna 0, i en JSON pur (cometes dobles, sense comes finals ni comentaris).
   Si hi toques res, passa `node scripts/valida-series.mjs`. */
(function () {
  function troba(item) {
    var clau = item && typeof item.serie === 'string' ? item.serie : '';
    var s = clau && window.IA_SERIES ? window.IA_SERIES[clau] : null;
    return s ? Object.assign({ clau: clau }, s) : null;
  }

  function el(tag, classe, text) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (text) e.textContent = text;
    return e;
  }

  function enllac(href, classe, text, extern) {
    var a = el('a', classe, text);
    a.href = href;
    if (extern) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  function logo(s, classe) {
    var a = enllac(s.web, classe, '', true);
    a.title = s.entitat;
    var img = document.createElement('img');
    img.src = s.logo;
    img.alt = s.entitat;
    img.decoding = 'async';
    a.appendChild(img);
    return a;
  }

  // Pinta el distintiu d'una peça. llocs.etiqueta: element davant del qual va
  // l'etiqueta (el kicker); llocs.peu: element després del qual va la targeta.
  // Si la peça no és de cap sèrie, no fa res. Tot amb el DOM, mai innerHTML.
  function marca(item, llocs) {
    var s = troba(item);
    if (!s || !llocs) return null;
    document.documentElement.classList.add('te-serie');

    if (llocs.etiqueta && llocs.etiqueta.parentNode) {
      var etiqueta = enllac(s.cami, 'serie-etiqueta', '');
      var marc = el('span', 'serie-etiqueta__logo');
      var img = document.createElement('img');
      img.src = s.logo;
      img.alt = '';
      marc.appendChild(img);
      etiqueta.appendChild(marc);
      etiqueta.appendChild(el('span', 'serie-etiqueta__nom', s.nom));
      llocs.etiqueta.parentNode.insertBefore(etiqueta, llocs.etiqueta);
    }

    if (llocs.peu && llocs.peu.parentNode) {
      var peu = el('aside', 'serie-peu');
      peu.setAttribute('aria-label', s.nom);
      peu.appendChild(logo(s, 'serie-peu__logo'));
      var cos = el('div', 'serie-peu__cos');
      cos.appendChild(el('p', 'serie-peu__kicker', 'Una peça de la sèrie'));
      var h = el('h2', 'serie-peu__nom');
      h.appendChild(enllac(s.cami, '', s.nom));
      cos.appendChild(h);
      cos.appendChild(el('p', 'serie-peu__desc', s.descripcio));
      var accions = el('p', 'serie-peu__accions');
      if (s.crida && s.crida.href) accions.appendChild(enllac(s.crida.href, 'serie-boto', s.crida.text + ' →', true));
      accions.appendChild(enllac(s.cami, 'serie-mes', 'Totes les veus de la sèrie →'));
      cos.appendChild(accions);
      peu.appendChild(cos);
      llocs.peu.parentNode.insertBefore(peu, llocs.peu.nextSibling);
    }
    return s;
  }

  window.IASeries = { troba: troba, marca: marca };
})();
window.IA_SERIES = {
  "veus-de-civicai": {
    "nom": "Veus de CIVICAi",
    "cami": "/veus-de-civicai",
    "entitat": "CIVICAi",
    "web": "https://civicai.cat/",
    "logo": "/assets/entitats/civicai.png",
    "descripcio": "La sèrie de «La tribuna» on escriuen sòcies i socis, fundadores i fundadors i directores i directors de CIVICAi, l’associació que treballa per una intel·ligència artificial responsable, de tothom i per a tothom.",
    "crida": { "text": "Associa’t a CIVICAi", "href": "https://civicai.cat/participa/" },
    "columna": {
      "titol": "La columna del president",
      "autor": "Manel Sanromà",
      "intro": "Manel Sanromà, president de CIVICAi, publica cada setmana la seva tribuna a inteligencia-artificial.cat."
    }
  }
};
