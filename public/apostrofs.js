/* apostrofs.js — apòstrof tipogràfic (’) en lloc del recte (') — 26.11.2026
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

  function arregla(arrel) {
    if (!arrel) return;
    if (arrel.nodeType === 3) {
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
    while ((n = w.nextNode())) if (n.nodeValue.indexOf("'") > -1) pendents.push(n);
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
