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
    pt: { title:'SOM', music:'Música (Menu)', gamemusic:'Música (Jogo)', sfx:'Efeitos', mute:'Sem som', close:'OK', saved:'✓ Salvo' },
    en: { title:'SOUND', music:'Music (Menu)', gamemusic:'Music (Game)', sfx:'Effects', mute:'Mute', close:'OK', saved:'✓ Saved' },
    es: { title:'SONIDO', music:'Música (Menú)', gamemusic:'Música (Juego)', sfx:'Efectos', mute:'Silenciar', close:'OK', saved:'✓ Guardado' }
  };

  let _isOpen = false;
  let _previewTimer = null;

  function _applyLang(){
    const T = LANGS[_detectLang()] || LANGS.pt;
    const $ = function(id){ return document.getElementById(id); };
    if ($('audio-title')) $('audio-title').textContent = T.title;
    if ($('audio-music-label')) $('audio-music-label').textContent = T.music;
    if ($('audio-gamemusic-label')) $('audio-gamemusic-label').textContent = T.gamemusic;
    if ($('audio-sfx-label')) $('audio-sfx-label').textContent = T.sfx;
    if ($('audio-mute-label')) $('audio-mute-label').textContent = T.mute;
    if ($('audio-close-btn')) $('audio-close-btn').textContent = T.close;
  }

  function _refreshUI(){
    const A = window.OrbitaAudio;
    const menuVal  = A ? (A.getMenuMusic ? A.getMenuMusic() : A.getMusic()) : 0.5;
    const gameVal  = A ? (A.getGameMusic ? A.getGameMusic() : A.getMusic()) : 0.5;
    const sfxVal   = A ? A.getSfx()   : 0.5;
    const muteVal  = A ? A.isMuted()  : false;

    const ms = document.getElementById('audio-music-slider');
    const gs = document.getElementById('audio-gamemusic-slider');
    const ss = document.getElementById('audio-sfx-slider');
    const mv = document.getElementById('audio-music-val');
    const gv = document.getElementById('audio-gamemusic-val');
    const sv = document.getElementById('audio-sfx-val');
    const sw = document.getElementById('audio-mute-switch');

    if (ms) ms.value = String(Math.round(menuVal * 100));
    if (gs) gs.value = String(Math.round(gameVal * 100));
    if (ss) ss.value = String(Math.round(sfxVal * 100));
    if (mv) mv.textContent = String(Math.round(menuVal * 100));
    if (gv) gv.textContent = String(Math.round(gameVal * 100));
    if (sv) sv.textContent = String(Math.round(sfxVal * 100));
    if (sw) {
      sw.classList.toggle('on', muteVal);
      sw.setAttribute('aria-checked', muteVal ? 'true' : 'false');
    }
  }

  function _onMusicSlider(e){
    const v = (+e.target.value) / 100;
    if (window.OrbitaAudio && window.OrbitaAudio.setMenuMusic) window.OrbitaAudio.setMenuMusic(v);
    else if (window.OrbitaAudio) window.OrbitaAudio.setMusic(v);
    const mv = document.getElementById('audio-music-val');
    if (mv) mv.textContent = String(Math.round(v * 100));
    _debouncedSave();
  }

  function _onGameMusicSlider(e){
    const v = (+e.target.value) / 100;
    if (window.OrbitaAudio && window.OrbitaAudio.setGameMusic) window.OrbitaAudio.setGameMusic(v);
    const gv = document.getElementById('audio-gamemusic-val');
    if (gv) gv.textContent = String(Math.round(v * 100));
    _debouncedSave();
  }

  function _onSfxSlider(e){
    const v = (+e.target.value) / 100;
    if (window.OrbitaAudio) window.OrbitaAudio.setSfx(v);
    const sv = document.getElementById('audio-sfx-val');
    if (sv) sv.textContent = String(Math.round(v * 100));
    // Preview: toca SFX leve quando para de mexer (debounced 250ms)
    if (_previewTimer) clearTimeout(_previewTimer);
    _previewTimer = setTimeout(function(){
      try {
        if (typeof playTone === 'function' && !(window.OrbitaAudio && window.OrbitaAudio.isMuted())) {
          playTone(620, 0.08, 'sine', 0.06, 0, { lowpass:2400, noJitter:true });
        }
      } catch(_){}
    }, 250);
    _debouncedSave();
  }

  function _onMuteToggle(){
    if (window.OrbitaAudio) window.OrbitaAudio.toggleMute();
    _debouncedSave();
    _refreshUI();
  }

  let _saveT = null;
  function _debouncedSave(){
    if (_saveT) clearTimeout(_saveT);
    _saveT = setTimeout(function(){
      try { if (typeof saveData === 'function') saveData(); } catch(_){}
      _flashSaved();
    }, 350);
  }

  // Mostra "✓ Salvo" por ~1.2s pra confirmar visualmente que mudanca foi aplicada.
  let _toastT = null;
  function _flashSaved(){
    const toast = document.getElementById('audio-saved-toast');
    if (!toast) return;
    const T = LANGS[_detectLang()] || LANGS.pt;
    toast.textContent = T.saved || '✓ Salvo';
    toast.classList.add('visible');
    if (_toastT) clearTimeout(_toastT);
    _toastT = setTimeout(function(){
      toast.classList.remove('visible');
    }, 1200);
  }

  // Em PAUSE, sceneLevel cai pra 0.05 (musica abafada). Sliders ficam imperceptiveis.
  // Salvamos e elevamos pra nivel audivel enquanto painel aberto, restauramos ao fechar.
  let _savedSceneLevel = null;

  function open(){
    if (_isOpen) return;
    _isOpen = true;
    _applyLang();
    _refreshUI();
    const panel = document.getElementById('orbita-audio-panel');
    if (panel) panel.classList.add('open');
    // Eleva musica pra audivel se estiver muito abafada (pause/dead).
    try {
      if (typeof musicSceneLevel !== 'undefined' && musicSceneLevel < 0.7
          && typeof setMusicVolume === 'function') {
        _savedSceneLevel = musicSceneLevel;
        setMusicVolume(0.9);
      }
    } catch(_){}
  }

  function close(){
    if (!_isOpen) return;
    _isOpen = false;
    const panel = document.getElementById('orbita-audio-panel');
    if (panel) panel.classList.remove('open');
    if (_saveT) { clearTimeout(_saveT); _saveT = null; try { if (typeof saveData === 'function') saveData(); } catch(_){} }
    // Restaura sceneLevel previo se foi elevado no open.
    try {
      if (_savedSceneLevel !== null && typeof setMusicVolume === 'function') {
        setMusicVolume(_savedSceneLevel);
        _savedSceneLevel = null;
      }
    } catch(_){}
  }

  function isOpen(){ return _isOpen; }

  // Wire up listeners (depois do DOM pronto)
  function _wire(){
    const ms = document.getElementById('audio-music-slider');
    const gs = document.getElementById('audio-gamemusic-slider');
    const ss = document.getElementById('audio-sfx-slider');
    const sw = document.getElementById('audio-mute-switch');
    const cb = document.getElementById('audio-close-btn');
    const panel = document.getElementById('orbita-audio-panel');

    if (ms) ms.addEventListener('input', _onMusicSlider);
    if (gs) gs.addEventListener('input', _onGameMusicSlider);
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
