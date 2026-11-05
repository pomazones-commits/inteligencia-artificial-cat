/*
 * Comptador de visites sense galetes (05.11.2026, decisió d'en Rafael).
 *
 * Per què: el panell de Hostinger només guarda 7 dies i barreja persones i
 * robots; amb això no es poden saber les visites reals per dia ni per mes.
 *
 * Com: en carregar la pàgina, el navegador fa UNA petició a GoatCounter
 * (servei de codi obert, servidors a Alemanya i Finlàndia) amb només tres
 * coses: el camí de la pàgina, el títol i la web d'on ve el lector (si és
 * de fora). GoatCounter no desa l'adreça IP i només hi guarda xifres
 * agregades.
 *
 * Què NO fa, a propòsit (vegeu §6 d'avis-legal.html):
 *   - no posa cap galeta ni fa servir localStorage, sessionStorage ni res
 *     del dispositiu (per això no carreguem el count.js oficial, que llegeix
 *     localStorage);
 *   - no envia la mida de la pantalla ni cap altra dada del dispositiu;
 *   - no compta qui té activat «No em segueixis» (DNT) o el Global Privacy
 *     Control, ni els navegadors automatitzats;
 *   - no compta res fora del domini públic (proves locals, previsualitzacions).
 *
 * Les xifres només les veu en Rafael al tauler privat de GoatCounter
 * (https://pomazona.goatcounter.com). A la web no es mostra cap comptador.
 * Si mai es canvia de compte, és la constant ENDPOINT.
 */
(function () {
  'use strict';
  var ENDPOINT = 'https://pomazona.goatcounter.com/count';
  try {
    var host = location.hostname;
    if (host !== 'inteligencia-artificial.cat' && host !== 'www.inteligencia-artificial.cat') return;
    var nav = window.navigator || {};
    if (nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.msDoNotTrack === '1') return;
    if (nav.globalPrivacyControl === true) return;
    if (nav.webdriver) return;
    if (/bot|crawl|spider|headless|lighthouse|preview/i.test(nav.userAgent || '')) return;

    // El camí de la pàgina. Les notícies que s'obren amb article.php?slug=…
    // es compten amb el seu slug; qualsevol altre paràmetre es descarta.
    var cami = location.pathname || '/';
    var slug = /[?&]slug=([^&#]+)/.exec(location.search || '');
    if (slug) cami += '?slug=' + slug[1];

    // D'on ve: només si és una altra web, i només el domini i el camí.
    var origen = '';
    try {
      if (document.referrer) {
        var r = new URL(document.referrer);
        if (r.hostname !== host && r.hostname !== 'www.' + host && 'www.' + r.hostname !== host) {
          origen = r.origin + r.pathname;
        }
      }
    } catch (e) { origen = ''; }

    var envia = function () {
      var url = ENDPOINT
        + '?p=' + encodeURIComponent(cami)
        + '&t=' + encodeURIComponent((document.title || '').slice(0, 200))
        + (origen ? '&r=' + encodeURIComponent(origen) : '')
        + '&rnd=' + Math.random().toString(36).slice(2);
      // El navegador només hi afegeix l'origen (https://inteligencia-artificial.cat),
      // per la política per defecte de les peticions a un altre domini.
      var img = new Image(1, 1);
      img.src = url;
    };

    if (document.visibilityState === 'prerender') {
      document.addEventListener('visibilitychange', function un() {
        if (document.visibilityState !== 'prerender') {
          document.removeEventListener('visibilitychange', un);
          envia();
        }
      });
    } else if (document.readyState === 'complete') {
      envia();
    } else {
      window.addEventListener('load', envia, { once: true });
    }
  } catch (e) { /* el comptador no ha de trencar mai la pàgina */ }
})();
