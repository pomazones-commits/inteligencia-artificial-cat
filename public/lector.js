/* Lector d'articles compartit (tribuna, anàlisi, quadern, imatge del dia).
   - Si existeix l'MP3 neural (assets/audio/...), mostra un reproductor d'àudio
     amb selector de velocitat (per defecte 1,25×).
   - Si encara no hi és, mostra «Àudio en preparació.» — mai la veu del navegador.
     El workflow d'àudio (i la repesca horària) el pujarà i el missatge desapareixerà sol.
   Ús: IALector.init({ container: element, audioUrl: './assets/audio/x.mp3'|null, parts: [textos] })
   (el camp `parts` es manté per compatibilitat amb les pàgines existents; ja no s'usa) */
(function () {
  'use strict';

  var CSS = '.tts-player{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 30px}' +
    '.tts-player strong{font-size:13px}' +
    '.tts-player button,.tts-speed select{font-family:inherit}' +
    '.tts-player button{padding:9px 13px;border:1px solid #dfe3eb;background:#fff;color:#233a82;cursor:pointer}' +
    '.tts-player [hidden]{display:none}.tts-player audio{width:100%;max-width:430px}' +
    '.tts-note,.tts-speed{font-size:11px;color:#5d6472}';

  var SPEEDS = [['1', '1×'], ['1.25', '1,25×'], ['1.5', '1,5×'], ['1.75', '1,75×'], ['2', '2×']];

  function injectCSS() {
    if (document.getElementById('ia-lector-css')) return;
    var style = document.createElement('style');
    style.id = 'ia-lector-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function speedSelect() {
    var label = document.createElement('label');
    label.className = 'tts-speed';
    label.appendChild(document.createTextNode('Velocitat '));
    var select = document.createElement('select');
    select.setAttribute('aria-label', 'Velocitat de reproducció');
    SPEEDS.forEach(function (s) {
      var option = document.createElement('option');
      option.value = s[0];
      option.textContent = s[1];
      if (s[0] === '1.25') option.selected = true; // per defecte 1,25×
      select.appendChild(option);
    });
    label.appendChild(select);
    return { label: label, select: select };
  }

  function renderAudio(container, url) {
    container.innerHTML = '';
    var title = document.createElement('strong');
    title.textContent = 'Escolta:';
    var audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = url;
    audio.textContent = 'El teu navegador no pot reproduir l’àudio.';
    var speed = speedSelect();
    var apply = function () { audio.playbackRate = parseFloat(speed.select.value) || 1; };
    audio.addEventListener('play', apply);
    speed.select.addEventListener('change', apply);
    apply();
    container.appendChild(title);
    container.appendChild(audio);
    container.appendChild(speed.label);
    container.hidden = false;
  }

  function renderPending(container) {
    container.innerHTML = '';
    var title = document.createElement('strong');
    title.textContent = 'Escolta:';
    var note = document.createElement('span');
    note.className = 'tts-note';
    note.textContent = 'Àudio en preparació.';
    container.appendChild(title);
    container.appendChild(note);
    container.hidden = false;
  }

  function init(opts) {
    var container = opts.container;
    if (!container) return;
    injectCSS();
    container.classList.add('tts-player');
    container.hidden = true;
    var pending = function () { renderPending(container); };
    if (opts.audioUrl) {
      // Comprovem si l'MP3 neural existeix; si encara no, «Àudio en preparació.»
      fetch(opts.audioUrl, { method: 'HEAD' })
        .then(function (r) { r.ok ? renderAudio(container, opts.audioUrl) : pending(); })
        .catch(pending);
    } else {
      pending();
    }
  }

  window.IALector = { init: init };
})();
