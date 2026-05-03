// =====================================================================
// AUDIO PANEL
// Modal HTML com sliders de musica/SFX e toggle de mute. Acesso pelo
// icone de speaker no canto superior direito do menu (interceptado abaixo).
//
// Interage com globais ja existentes em core.js / data.js:
//   - menuMusicVol (0-1) | gameMusicVol (0-1) | sfxVol (0-1) | muted (bool)
//   - saveData() persiste em localStorage
//   - refreshMusicGain() recalcula volume da musica em runtime
//   - playTone() / sndCapture() pra preview de SFX ao soltar slider
// =====================================================================
(function(){
  'use strict';

  // i18n ad-hoc - segue idioma detectado pelo navegador
  function _detectLang(){
    try {
      const l = (navigator.language || 'pt').toLowerCase();
      if (l.indexOf('pt') === 0) return 'pt';
      if (l.indexOf('es') === 0) return 'es';
      return 'en';
    } catch(e) { return 'pt'; }
  }
  const LANGS = {
    pt: { title:'SOM', music:'Música', sfx:'Efeitos', mute:'Sem som', close:'FECHAR' },
    en: { title:'SOUND', music:'Music', sfx:'Effects', mute:'Mute', close:'CLOSE' },
    es: { title:'SONIDO', music:'Música', sfx:'Efectos', mute:'Silenciar', close:'CERRAR' }
  };

  let _isOpen = false;
  let _previewTimer = null;

  function _applyLang(){
    const T = LANGS[_detectLang()] || LANGS.pt;
    const $ = function(id){ return document.getElementById(id); };
    if ($('audio-title')) $('audio-title').textContent = T.title;
    if ($('audio-music-label')) $('audio-music-label').textContent = T.music;
    if ($('audio-sfx-label')) $('audio-sfx-label').textContent = T.sfx;
    if ($('audio-mute-label')) $('audio-mute-label').textContent = T.mute;
    if ($('audio-close-btn')) $('audio-close-btn').textContent = T.close;
  }

  function _refreshUI(){
    // Le globais e atualiza UI. menuMusicVol e gameMusicVol sao geridos
    // separadamente mas mostramos UM slider unico (mais simples pro user).
    // Internamente sincronizamos os 2 ao slider.
    const musicVal = (typeof menuMusicVol !== 'undefined') ? menuMusicVol : 0.5;
    const sfxVal = (typeof sfxVol !== 'undefined') ? sfxVol : 0.5;
    const muteVal = (typeof muted !== 'undefined') ? !!muted : false;

    const ms = document.getElementById('audio-music-slider');
    const ss = document.getElementById('audio-sfx-slider');
    const mv = document.getElementById('audio-music-val');
    const sv = document.getElementById('audio-sfx-val');
    const sw = document.getElementById('audio-mute-switch');

    if (ms) ms.value = String(Math.round(musicVal * 100));
    if (ss) ss.value = String(Math.round(sfxVal * 100));
    if (mv) mv.textContent = String(Math.round(musicVal * 100));
    if (sv) sv.textContent = String(Math.round(sfxVal * 100));
    if (sw) {
      sw.classList.toggle('on', muteVal);
      sw.setAttribute('aria-checked', muteVal ? 'true' : 'false');
    }
  }

  function _onMusicSlider(e){
    const v = (+e.target.value) / 100;
    try { if (typeof menuMusicVol !== 'undefined') window.menuMusicVol = v; } catch(_){}
    try { if (typeof gameMusicVol !== 'undefined') window.gameMusicVol = v; } catch(_){}
    document.getElementById('audio-music-val').textContent = String(Math.round(v * 100));
    if (typeof refreshMusicGain === 'function') refreshMusicGain(0.1);
    _debouncedSave();
  }

  function _onSfxSlider(e){
    const v = (+e.target.value) / 100;
    try { if (typeof sfxVol !== 'undefined') window.sfxVol = v; } catch(_){}
    document.getElementById('audio-sfx-val').textContent = String(Math.round(v * 100));
    // Preview: toca SFX leve quando para de mexer (debounced 250ms)
    if (_previewTimer) clearTimeout(_previewTimer);
    _previewTimer = setTimeout(function(){
      try { if (typeof playTone === 'function' && !muted) {
        playTone(620, 0.08, 'sine', 0.06, 0, { lowpass:2400, noJitter:true });
      } } catch(_){}
    }, 250);
    _debouncedSave();
  }

  function _onMuteToggle(){
    if (typeof toggleMute === 'function') {
      toggleMute();
    } else if (typeof muted !== 'undefined') {
      window.muted = !muted;
      if (typeof refreshMusicGain === 'function') refreshMusicGain(0.18);
      _debouncedSave();
    }
    _refreshUI();
  }

  let _saveT = null;
  function _debouncedSave(){
    if (_saveT) clearTimeout(_saveT);
    _saveT = setTimeout(function(){
      try { if (typeof saveData === 'function') saveData(); } catch(_){}
    }, 350);
  }

  function open(){
    if (_isOpen) return;
    _isOpen = true;
    _applyLang();
    _refreshUI();
    const panel = document.getElementById('orbita-audio-panel');
    if (panel) panel.classList.add('open');
  }

  function close(){
    if (!_isOpen) return;
    _isOpen = false;
    const panel = document.getElementById('orbita-audio-panel');
    if (panel) panel.classList.remove('open');
    if (_saveT) { clearTimeout(_saveT); _saveT = null; try { if (typeof saveData === 'function') saveData(); } catch(_){} }
  }

  function isOpen(){ return _isOpen; }

  // Wire up listeners (depois do DOM pronto)
  function _wire(){
    const ms = document.getElementById('audio-music-slider');
    const ss = document.getElementById('audio-sfx-slider');
    const sw = document.getElementById('audio-mute-switch');
    const cb = document.getElementById('audio-close-btn');
    const panel = document.getElementById('orbita-audio-panel');

    if (ms) ms.addEventListener('input', _onMusicSlider);
    if (ss) ss.addEventListener('input', _onSfxSlider);
    if (sw) sw.addEventListener('click', _onMuteToggle);
    if (cb) cb.addEventListener('click', close);
    // Tap fora do card fecha
    if (panel) panel.addEventListener('click', function(e){
      if (e.target === panel) close();
    });
    // ESC fecha
    window.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && _isOpen) close();
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    _wire();
  } else {
    window.addEventListener('DOMContentLoaded', _wire, { once: true });
  }

  // API publica usada pelo flappy_radical_patch pra interceptar tap no speaker
  window.OrbitaAudioPanel = { open: open, close: close, isOpen: isOpen };
})();
