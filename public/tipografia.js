/* tipografia.js — retocs tipogràfics en mostrar la pàgina (26.11.2026)
 * (Fins al 26.11.2026 a les 6 h es deia apostrofs.js i només feia el punt 1.)
 *
 * 1. APÒSTROF TIPOGRÀFIC (’) en lloc del recte (').
 *
 * Per què: el contingut automàtic (notícies, radar, anàlisis…) arriba amb
 * l'apòstrof recte de la màquina d'escriure, i els textos fets a mà fan servir
 * el tipogràfic. A la mateixa pàgina es veia «s'encalla» al costat de «l’ús».
 *
 * Com: en mostrar la pàgina, canvia ' per ’ quan va entre una lletra i una
 * lletra o una xifra (d'IA, l'1 de gener, OpenAI's). Les dades NO es toquen
 * (news.js, l'hemeroteca, els fitxers de l'automatització continuen igual):
 * només el text que es veu. També vigila el que les altres peces de JS pinten
 * després (carrusel, radar, seccions…).
 *
 * No toca: camps de formulari, codi, scripts, estils ni res que porti
 * l'atribut data-sense-tipografia (o que en sigui dins).
 *
 * 2. «ACTUALITZACIÓ:» FORA DEL TITULAR. Quan un titular (h1-h4, també dins d'un
 * enllaç) comença per «ACTUALITZACIÓ:», el prefix es treu del text i es posa al
 * davant una etiqueta petita «Actualització» (span.etiq-actualitzacio, estils
 * aquí mateix). Les dades, el <title> i els enllaços no canvien: les sessions
 * editorials continuen escrivint «ACTUALITZACIÓ: …» com fins ara. article.php ja
 * pinta l'etiqueta des del servidor al titular de la notícia.
 *
 * Per desactivar-lo: treure el <script> de la pàgina. No té cap dependència.
 */
(function () {
  'use strict';
  var LLETRA = 'A-Za-zÀ-ÖØ-öø-ɏ·';
  var RE = new RegExp('([' + LLETRA + "])'(?=[" + LLETRA + '0-9])', 'g');
  var SALTA = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };

  function apte(node) {
    for (var e = node.parentNode; e && e.nodeType === 1; e = e.parentNode) {
      if (SALTA[e.tagName] || e.isContentEditable || e.hasAttribute('data-sense-tipografia')) return false;
    }
    return true;
  }

  var FINAL = new RegExp('([' + LLETRA + "])'$");
  var INICI = new RegExp('^[' + LLETRA + '0-9]');
  var INICI_AP = new RegExp("^'(?=[" + LLETRA + '0-9])');
  var FINAL_LL = new RegExp('[' + LLETRA + ']$');

  // Text veí en ordre de document (per a «d'<a>Accenture</a>», on l'apòstrof
  // queda al final d'un tros de text i la paraula comença al següent).
  function vei(node, endavant) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    w.currentNode = node;
    var n;
    while ((n = endavant ? w.nextNode() : w.previousNode())) if (n.nodeValue !== '') return n;
    return null;
  }

  // ── 2. Etiqueta d'actualització ─────────────────────────────────────────
  var PREFIX = /^\s*ACTUALITZACI[ÓO]\s*:\s*/;
  var estilPosat = false;
  function posaEstil() {
    if (estilPosat) return;
    estilPosat = true;
    var st = document.createElement('style');
    st.textContent = '.etiq-actualitzacio{display:inline-block;margin:0 .5em .12em 0;padding:.42em .62em .38em;border-radius:999px;' +
      'background:#ffe4e0;color:#a3271d;font:600 clamp(9px,.26em,12px)/1 "IBM Plex Mono",monospace;letter-spacing:.08em;' +
      'text-transform:uppercase;vertical-align:middle;white-space:nowrap}' +
      '.etiq-actualitzacio--sola{display:block;width:fit-content;margin:0 0 .5em}';
    document.head.appendChild(st);
  }
  function etiqueta(text) {
    if (!PREFIX.test(text.nodeValue)) return;
    var cap = text.parentNode && text.parentNode.closest ? text.parentNode.closest('h1,h2,h3,h4') : null;
    if (!cap || cap.querySelector('.etiq-actualitzacio')) return;
    // Només si és el primer tros de text del titular.
    var w = document.createTreeWalker(cap, NodeFilter.SHOW_TEXT, null), primer;
    while ((primer = w.nextNode()) && !primer.nodeValue.trim()) { /* salta blancs */ }
    if (primer !== text) return;
    posaEstil();
    text.nodeValue = text.nodeValue.replace(PREFIX, '');
    var et = document.createElement('span');
    et.className = 'etiq-actualitzacio' + (cap.tagName === 'H1' ? ' etiq-actualitzacio--sola' : '');
    et.textContent = 'Actualització';
    text.parentNode.insertBefore(et, text);
  }

  function arregla(arrel) {
    if (!arrel) return;
    if (arrel.nodeType === 3) {
      if (arrel.nodeValue.indexOf('ACTUALITZACI') > -1 && apte(arrel)) etiqueta(arrel);
      if (arrel.nodeValue.indexOf("'") > -1 && apte(arrel)) {
        var u = arrel.nodeValue.replace(RE, '$1’');
        if (FINAL.test(u)) { var seg = vei(arrel, true); if (seg && INICI.test(seg.nodeValue)) u = u.replace(FINAL, '$1’'); }
        if (INICI_AP.test(u)) { var ant = vei(arrel, false); if (ant && FINAL_LL.test(ant.nodeValue)) u = u.replace(INICI_AP, '’'); }
        if (u !== arrel.nodeValue) arrel.nodeValue = u;
      }
      return;
    }
    if (arrel.nodeType !== 1 && arrel.nodeType !== 9) return;
    var w = document.createTreeWalker(arrel, NodeFilter.SHOW_TEXT, null);
    var n, pendents = [];
    while ((n = w.nextNode())) if (n.nodeValue.indexOf("'") > -1 || n.nodeValue.indexOf('ACTUALITZACI') > -1) pendents.push(n);
    for (var i = 0; i < pendents.length; i++) arregla(pendents[i]);
  }

  function inicia() {
    arregla(document.body);
    if (!window.MutationObserver) return;
    // El canvi és idempotent (un cop fet, ja no queda cap ' per canviar), així
    // que les mutacions que provoca el mateix script no fan cap bucle.
    new MutationObserver(function (canvis) {
      for (var i = 0; i < canvis.length; i++) {
        var c = canvis[i];
        if (c.type === 'characterData') arregla(c.target);
        else for (var j = 0; j < c.addedNodes.length; j++) arregla(c.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia);
  else inicia();
})();
