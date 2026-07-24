/* Lector d'articles compartit (tribuna, anàlisi, imatge del dia).
   - Si existeix l'MP3 neural (assets/audio/...), mostra un reproductor d'àudio.
   - Si no, fa servir la veu del navegador (speechSynthesis) com a xarxa de seguretat.
   - Sempre amb selector de velocitat, per defecte 1,25×.
   Ús: IALector.init({ container: element, audioUrl: './assets/audio/x.mp3'|null, parts: [textos] }) */
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

  function renderSpeech(container, parts) {
    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance || !parts.length) return;
    var synth = window.speechSynthesis;
    container.innerHTML = '';
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', 'false');
    var label = document.createElement('span');
    label.textContent = 'Escolta l’article';
    toggle.appendChild(label);
    var stop = document.createElement('button');
    stop.type = 'button';
    stop.textContent = 'Atura';
    stop.hidden = true;
    var note = document.createElement('span');
    note.className = 'tts-note';
    var speed = speedSelect();
    var rate = parseFloat(speed.select.value) || 1.25;
    var state = 'idle';

    var catVoice = function () {
      return synth.getVoices().find(function (v) { return /^ca([-_]|$)/i.test(v.lang); }) || null;
    };
    var ui = function () {
      stop.hidden = state === 'idle';
      label.textContent = state === 'playing' ? 'Pausa' : state === 'paused' ? 'Continua' : 'Escolta l’article';
      toggle.setAttribute('aria-pressed', String(state === 'playing'));
    };
    var reset = function () { state = 'idle'; ui(); };
    var speak = function () {
      synth.cancel();
      var voice = catVoice();
      note.textContent = voice ? '' : 'Es farà servir la veu disponible al dispositiu.';
      parts.forEach(function (text, i) {
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'ca-ES';
        if (voice) u.voice = voice;
        u.rate = rate;
        if (i === parts.length - 1) u.onend = reset;
        synth.speak(u);
      });
      state = 'playing';
      ui();
    };
    toggle.addEventListener('click', function () {
      if (state === 'idle') speak();
      else if (state === 'playing') { synth.pause(); state = 'paused'; ui(); }
      else { synth.resume(); state = 'playing'; ui(); }
    });
    stop.addEventListener('click', function () { synth.cancel(); reset(); });
    speed.select.addEventListener('change', function () {
      rate = parseFloat(speed.select.value) || 1;
      if (state === 'playing') speak();
    });
    window.addEventListener('pagehide', function () { synth.cancel(); });

    container.appendChild(toggle);
    container.appendChild(stop);
    container.appendChild(note);
    container.appendChild(speed.label);
    container.hidden = false;
  }

  function init(opts) {
    var container = opts.container;
    if (!container) return;
    injectCSS();
    container.classList.add('tts-player');
    container.hidden = true;
    var fallback = function () { renderSpeech(container, opts.parts || []); };
    if (opts.audioUrl) {
      // Comprovem si l'MP3 neural existeix; si no, veu del navegador.
      fetch(opts.audioUrl, { method: 'HEAD' })
        .then(function (r) { r.ok ? renderAudio(container, opts.audioUrl) : fallback(); })
        .catch(fallback);
    } else {
      fallback();
    }
  }

  window.IALector = { init: init };
})();
