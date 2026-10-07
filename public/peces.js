/* Adreces fixes de les peces editorials (24.09.2026).
   Contracte públic: window.IAPeces = { slug, ids, cami, url, canonica, posicio, rolAmbEnllac }.

   Cada peça de «La tribuna», «Estudis», l'anàlisi, el Quadern IA i la
   reflexió del dia té una adreça que no canvia mai: /tribuna/<id>,
   /estudis/<id>, /analisi/<id>, /quadern/<id> i /reflexio/<AAAA-MM-DD>.
   Les serveix peca.php.

   ⚠️ L'algorisme ha de ser IDÈNTIC al d'inc/peces.php. Si en canvies un,
   canvia l'altre i passa `node automation/tests/peces-paritat.test.mjs`. */
(function () {
  var BASE = 'https://inteligencia-artificial.cat';
  var CAMINS = { tribuna: 'tribuna', estudis: 'estudis', analisi: 'analisi', quadern: 'quadern', reflexio: 'reflexio' };
  var MAPA = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n', '·': '', 'ŀ': 'l'
  };

  function slug(text) {
    var t = String(text || '').toLowerCase().replace(/[àáâäãåèéêëìíîïòóôöõùúûüçñ·ŀ]/g, function (c) { return MAPA[c]; });
    t = t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    // Màxim 80 caràcters, tallant en un guionet (mai a mig mot) si n'hi ha un prou avançat.
    if (t.length > 80) {
      var tall = t.slice(0, 81);
      var guio = tall.lastIndexOf('-');
      t = (guio > 40 ? tall.slice(0, guio) : t.slice(0, 80)).replace(/-+$/, '');
    }
    return t || 'peca';
  }

  function iso(data) {
    var d = String(data || '');
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d);
    if (m) return m[3] + '-' + m[2] + '-' + m[1];
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
  }

  // llista: la vigent primer (pot ser null) i després l'arxiu, com al web.
  // Retorna un vector d'identificadors alineat amb la llista (null on no hi ha peça).
  function ids(tipus, llista) {
    var sortida = [];
    var usats = {};
    var perClau = {};
    for (var k = llista.length - 1; k >= 0; k--) {
      var item = llista[k];
      if (!item || !item.title) { sortida[k] = null; continue; }
      var data = String(item.date || '');
      var d = iso(data);
      var clau = item.title + '|' + data;
      if (Object.prototype.hasOwnProperty.call(perClau, clau)) { sortida[k] = perClau[clau]; continue; }
      // Camp opcional «id»: fixa l'adreça a mà (si mai es corregeix el títol d'una peça
      // ja publicada, s'hi posa l'identificador antic i l'enllaç no es trenca).
      var id = (typeof item.id === 'string' && item.id) ? slug(item.id)
        : (tipus === 'reflexio' ? (d || slug(item.title)) : slug(item.title));
      if (usats[id]) {
        var base = id + (d ? '-' + d.replace(/-/g, '') : '');
        id = base;
        var n = 2;
        while (usats[id]) id = base + '-' + (n++);
      }
      usats[id] = true;
      perClau[clau] = id;
      sortida[k] = id;
    }
    return sortida;
  }

  // Camí fix d'una peça (item) dins de la seva llista: /tribuna/<id>.
  function cami(tipus, item, llista) {
    var i = llista.indexOf(item);
    if (i < 0) return null;
    var id = ids(tipus, llista)[i];
    return id ? '/' + CAMINS[tipus] + '/' + id : null;
  }

  // Adreça fixa completa (per compartir i per a la canònica).
  function url(tipus, item, llista) {
    var c = cami(tipus, item, llista);
    return c ? BASE + c : null;
  }

  // Peça que demana peca.php (07.10.2026). Es busca per IDENTIFICADOR dins de la
  // llista carregada (la vigent primer i després l'arxiu) i es retorna la posició
  // amb el conveni de sempre: -1 = la vigent, N = arxiu[N]. Només si no es troba
  // es fa servir l'idx que va calcular el servidor.
  // Per què: l'HTML (amb l'idx) i les dades (.js) es poden obtenir en moments
  // diferents (Googlebot renderitza hores o dies després de rastrejar, i amb
  // memòria cau pròpia). Quan entra una peça nova, l'arxiu es desplaça una
  // posició i l'idx apuntava a la peça VEÏNA: la pàgina mostrava una altra peça i
  // en declarava la canònica. Search Console ho va marcar com a «Pàgina
  // alternativa amb l'etiqueta canònica correcta» i «URL duplicat».
  function posicio(tipus, llista) {
    var p = window.IA_PECA;
    if (!p || p.tipus !== tipus) return null;
    var id = String(p.id || (p.url ? String(p.url).split('/').pop() : '') || '');
    if (id && llista) {
      var i = ids(tipus, llista).indexOf(id);
      if (i >= 0) return i - 1;
    }
    return typeof p.idx === 'number' ? p.idx : null;
  }

  // Posa la URL fixa a l'etiqueta <link rel="canonical"> i a og:url.
  // A /tribuna/<id>, /analisi/<id>… (peca.php) mana sempre l'adreça que ha
  // posat el servidor: la canònica no ha de dependre de les dades del navegador.
  function canonica(adreca) {
    if (window.IA_PECA && window.IA_PECA.url) adreca = window.IA_PECA.url;
    if (!adreca) return;
    var link = document.querySelector('link[rel="canonical"]');
    if (link) link.href = adreca;
    var og = document.querySelector('meta[property="og:url"]');
    if (og) og.content = adreca;
  }

  // Càrrec de l'autor amb l'entitat enllaçada (01.10.2026). Camps opcionals de
  // cada peça: "org" (el nom de l'entitat tal com surt dins de "role") i "orgUrl"
  // (la seva web). Si "org" no apareix dins del càrrec, s'enllaça el càrrec sencer.
  // Sense "orgUrl" vàlida, el càrrec surt com a text, com sempre. Es construeix amb
  // el DOM, mai amb innerHTML. Sense noreferrer: que l'entitat vegi d'on li arriben.
  function rolAmbEnllac(el, item) {
    if (!el) return;
    el.textContent = '';
    var rol = String((item && item.role) || '');
    var org = String((item && item.org) || '');
    var href = String((item && item.orgUrl) || '');
    if (!rol) return;
    if (!/^https?:\/\//i.test(href)) { el.textContent = rol; return; }
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'rol-org';
    var i = org ? rol.indexOf(org) : -1;
    if (i < 0) { a.textContent = rol; el.appendChild(a); return; }
    el.appendChild(document.createTextNode(rol.slice(0, i)));
    a.textContent = org;
    el.appendChild(a);
    el.appendChild(document.createTextNode(rol.slice(i + org.length)));
  }

  window.IAPeces = { slug: slug, ids: ids, cami: cami, url: url, canonica: canonica, posicio: posicio, rolAmbEnllac: rolAmbEnllac };
})();
