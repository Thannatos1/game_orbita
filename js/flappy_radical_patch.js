// ============================================================
// FLAPPY RADICAL PATCH
// Estilo Flappy Bird: simplicidade absoluta, dificuldade brutal
// desde o cano 1, reinicio instantaneo, "quase consegui",
// print como trofeu. Sem ranking, sem skins, sem fundos,
// sem carreira, sem missoes.
// Carregado por ultimo, sobrescreve hooks dos outros patches.
// ============================================================
(function(){
  'use strict';

  // ---------- ANDROID BACK BUTTON ----------
  // Em PWA wrapped (Android), o botao back default sai do app.
  // Interceptamos pra fazer fluxo natural:
  //   PLAY  -> pausa
  //   PAUSE -> menu
  //   DEAD  -> menu
  //   MENU  -> toast "toque novamente pra sair" (2s) -> sai
  // Implementado via history.pushState + popstate listener.
  let _backArmed = false;
  let _backArmedT = 0;
  const BACK_EXIT_WINDOW_MS = 2000;

  function _pushHistoryGuard(){
    try {
      history.pushState({ orbita: 'guard', t: Date.now() }, '');
    } catch(e) {}
  }

  function _setupBackHandler(){
    if (typeof window === 'undefined' || !window.addEventListener) return;
    if (typeof history === 'undefined' || !history.pushState) return;

    // Guarda inicial pra primeira back nao sair imediatamente
    _pushHistoryGuard();

    window.addEventListener('popstate', function(){
      // popstate disparou = usuario pressionou back
      try {
        if (typeof state === 'undefined' || typeof ST === 'undefined') {
          _pushHistoryGuard();
          return;
        }

        if (state === ST.PLAY) {
          // Pausa o jogo
          state = ST.PAUSE;
          // Guarda sceneLevel atual pra restaurar no despause (evita spike de volume)
          try { window._prePauseSceneLevel = (typeof musicSceneLevel === 'number') ? musicSceneLevel : 0.12; } catch(e) {}
          if (typeof setMusicVolume === 'function') setMusicVolume(0.05);
          _backArmed = false;
          if (typeof _crumb === 'function') _crumb('navigation', 'back: play -> pause');
          _pushHistoryGuard();
          return;
        }

        if (state === ST.PAUSE) {
          // Pause -> menu
          state = ST.MENU;
          if (typeof menuScreen !== 'undefined') menuScreen = 'main';
          if (typeof zenMode !== 'undefined') zenMode = false;
          if (typeof testMode !== 'undefined') testMode = false;
          if (typeof setMusicVolume === 'function') setMusicVolume(0.45);
          _backArmed = false;
          if (typeof _crumb === 'function') _crumb('navigation', 'back: pause -> menu');
          _pushHistoryGuard();
          return;
        }

        if (state === ST.DEAD) {
          // Dead -> menu
          state = ST.MENU;
          if (typeof menuScreen !== 'undefined') menuScreen = 'main';
          if (typeof zenMode !== 'undefined') zenMode = false;
          if (typeof testMode !== 'undefined') testMode = false;
          if (typeof pendingUnlocks !== 'undefined') pendingUnlocks = [];
          if (typeof setMusicVolume === 'function') setMusicVolume(0.45);
          _backArmed = false;
          if (typeof _crumb === 'function') _crumb('navigation', 'back: dead -> menu');
          _pushHistoryGuard();
          return;
        }

        if (state === ST.MENU) {
          const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
          if (_backArmed && (now - _backArmedT) < BACK_EXIT_WINDOW_MS) {
            // 2a back dentro da janela = confirma saida
            _backArmed = false;
            if (typeof _crumb === 'function') _crumb('navigation', 'back: exit confirmed');
            // Tenta voltar mais um na historia. Em PWA Android, isso fecha o app.
            // Em browser puro, fica no [page] inicial sem efeito (aceitavel).
            try { history.back(); } catch(e) {}
            return;
          }
          // 1a back: arma o estado de "tap-to-exit" + toast visual
          _backArmed = true;
          _backArmedT = now;
          if (typeof _crumb === 'function') _crumb('navigation', 'back: armed exit');
          _pushHistoryGuard();
          return;
        }

        // Fallback: garante que nao sai sem querer
        _pushHistoryGuard();
      } catch(e) {
        try { _pushHistoryGuard(); } catch(_) {}
      }
    });
  }

  // Roda quando o DOM ja estiver pronto pra evitar race com main.js
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    _setupBackHandler();
  } else {
    window.addEventListener('DOMContentLoaded', _setupBackHandler, { once: true });
  }

  // ---------- SENTRY BREADCRUMBS ----------
  // Helper que cai em no-op se Sentry nao estiver carregado.
  // Adiciona contexto temporal pra debugar crashes.
  function _crumb(category, message, data){
    try {
      if (typeof Sentry === 'undefined' || !Sentry.addBreadcrumb) return;
      Sentry.addBreadcrumb({
        category: category || 'orbita',
        message: message || '',
        level: 'info',
        data: data || undefined,
        timestamp: Date.now() / 1000
      });
    } catch(e) {}
  }

  // ---------- OVERRIDE drawPauseScreenModule com i18n ----------
  // Substitui a tela de pause original pra traduzir labels.
  if (typeof window !== 'undefined') {
    window.drawPauseScreenModule = function(){
      if (typeof menuBtnAreas !== 'undefined') menuBtnAreas = [];
      // Dim overlay
      X.globalAlpha = 0.65;
      X.fillStyle = '#000';
      X.fillRect(-10, -10, W + 20, H + 20);
      X.globalAlpha = 1;

      X.textAlign = 'center';
      X.textBaseline = 'middle';

      // Tamanhos responsivos
      const titleSize  = Math.max(34, Math.min(48, W * 0.12));
      const labelSize  = Math.max(12, Math.min(14, W * 0.036));
      const scoreSize  = Math.max(32, Math.min(42, W * 0.105));

      // Title
      X.shadowColor = '#b0b0ff';
      X.shadowBlur = 20;
      X.fillStyle = '#e0e0ff';
      X.font = 'bold ' + titleSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('paused'), W/2, H * 0.30);
      X.shadowBlur = 0;

      // Current score label + value
      X.fillStyle = 'rgba(255,255,255,0.5)';
      X.font = labelSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('current_score'), W/2, H * 0.40);
      X.fillStyle = '#fff';
      X.font = 'bold ' + scoreSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(String(typeof score === 'number' ? score : 0), W/2, H * 0.46);

      // Botoes
      const btnW = Math.min(W * 0.7, 260);
      const btnH = 48;
      const btnX = (W - btnW) / 2;

      if (typeof drawActionBtn === 'function') {
        drawActionBtn(btnX, H * 0.58, btnW, btnH, _t('continue_btn'), '#00f5d4', true, function(){
          state = ST.PLAY;
          // Restaura ao sceneLevel pre-pause (default 0.12 do startRun) - NAO 0.95
          // que era loud demais e causava spike de volume no despause.
          const restoreLevel = (typeof window._prePauseSceneLevel === 'number')
            ? window._prePauseSceneLevel : 0.12;
          if (typeof setMusicVolume === 'function') setMusicVolume(restoreLevel);
        });

        drawActionBtn(btnX, H * 0.58 + btnH + 12, btnW, btnH, _t('main_menu'), '#ff6b9d', false, function(){
          if (typeof zenMode !== 'undefined') zenMode = false;
          if (typeof testMode !== 'undefined') testMode = false;
          state = ST.MENU;
          if (typeof menuScreen !== 'undefined') menuScreen = 'main';
          if (typeof setMusicVolume === 'function') setMusicVolume(0.80);
        });
      }
    };
  }

  // ---------- WRAP addScorePopup pra traduzir strings PT do game.js ----------
  // game.js emite "OURO!", "COMBO N!", "MISSÃO!", "SEM ERRO" hardcoded.
  // Interceptamos pra traduzir conforme o idioma atual.
  // (precisa rodar antes do helper _t mas referencia OrbitaI18n direto)
  if (typeof window !== 'undefined' && typeof window.addScorePopup === 'function') {
    const _origAddScorePopup = window.addScorePopup;
    window.addScorePopup = function(x, y, text, color){
      try {
        if (typeof text === 'string' && window.OrbitaI18n) {
          const T = window.OrbitaI18n.t;
          if (text === 'OURO!') {
            text = T('gold_popup');
          } else if (text === 'SEM ERRO') {
            text = T('test_no_error_popup');
          } else if (text === 'MISSÃO!') {
            text = T('mission_popup');
          } else if (text.indexOf('COMBO ') === 0 && text.endsWith('!')) {
            const m = text.match(/^COMBO (\d+)!$/);
            if (m) text = T('combo_popup', { n: parseInt(m[1], 10) });
          }
        }
      } catch(e) {}
      return _origAddScorePopup.call(this, x, y, text, color);
    };
  }

  // ---------- I18N HELPERS ----------
  // Atalhos pra OrbitaI18n carregado em js/i18n.js. Cai em fallback
  // PT-BR hardcoded se i18n.js nao tiver carregado por algum motivo.
  function _t(key, params){
    if (window.OrbitaI18n && typeof window.OrbitaI18n.t === 'function') {
      return window.OrbitaI18n.t(key, params);
    }
    return key;
  }
  function _lang(){
    if (window.OrbitaI18n && typeof window.OrbitaI18n.currentLang === 'function') {
      return window.OrbitaI18n.currentLang();
    }
    return 'pt';
  }
  function _cycleLang(){
    if (window.OrbitaI18n && typeof window.OrbitaI18n.cycleLang === 'function') {
      return window.OrbitaI18n.cycleLang();
    }
    return 'pt';
  }

  // ---------- HIDE SPLASH ----------
  // O splash em index.html cobre a tela enquanto Supabase SDK + scripts
  // carregam. Quando este patch executa, tudo critico ja foi parseado.
  // Splash com tap-to-start: necessario pra audio inicializar (browsers
  // exigem user gesture). Splash atualiza texto de "carregando..." pra
  // "TOQUE PARA INICIAR" quando o JS termina de carregar, depois espera o tap.
  let _splashAlive = true;
  function _hideSplash(){
    _splashAlive = false;  // marca imediatamente pra bloquear handleTap
    const el = document.getElementById('orbita-splash');
    if (!el) return;
    el.classList.add('hidden');
    setTimeout(function(){
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 600);
  }
  // Bloqueia eventos no proprio canvas em capture phase (fires antes do
  // listener original do canvas). Solucao mais robusta porque nao depende
  // de stopImmediatePropagation cross-element nem de override do handleTap
  // (que falha porque bare references resolvem via lexical scope, nao window).
  function _splashBlockOnCanvas(e){
    if (_splashAlive || document.getElementById('orbita-splash')) {
      try { e.preventDefault(); e.stopImmediatePropagation(); } catch(_){}
    }
  }
  try {
    const _C = document.getElementById('c');
    if (_C) {
      ['pointerdown','touchstart','touchend','click','mousedown'].forEach(function(ev){
        _C.addEventListener(ev, _splashBlockOnCanvas, { capture: true, passive: false });
      });
    }
  } catch(_){}
  function _armSplashTapToStart(){
    const el = document.getElementById('orbita-splash');
    if (!el) return;
    // Atualiza texto pra idioma do navegador (HTML default eh pt-br).
    const ctaEl = document.getElementById('splash-cta-text');
    if (ctaEl) {
      const lang = (navigator.language || 'pt').toLowerCase();
      ctaEl.textContent = lang.indexOf('pt') === 0 ? 'TOQUE PARA INICIAR'
                        : lang.indexOf('es') === 0 ? 'TOCA PARA EMPEZAR'
                        : 'TAP TO START';
    }
    // CAPTURE-PHASE listener no document: pega o tap ANTES de qualquer
    // listener de canvas. Garante que canvas nao receba o evento e
    // dispare startRun. Bloqueia ate splash sair do DOM (~1s).
    let _splashDone = false;
    function _capture(e){
      const splash = document.getElementById('orbita-splash');
      if (!splash) {
        // Splash saiu do DOM, podemos liberar os listeners
        document.removeEventListener('pointerdown', _capture, true);
        document.removeEventListener('touchstart',  _capture, true);
        document.removeEventListener('touchend',    _capture, true);
        document.removeEventListener('click',       _capture, true);
        document.removeEventListener('mousedown',   _capture, true);
        return;
      }
      // Enquanto splash esta no DOM, BLOQUEIA TUDO (mesmo apos handle)
      // pra absorver o click sintetico do Android WebView (~250-350ms depois).
      try { e.preventDefault(); e.stopImmediatePropagation(); } catch(_){}
      // Primeira interacao real: inicia hide do splash.
      if (!_splashDone && (e.type === 'pointerdown' || e.type === 'touchstart' || e.type === 'mousedown')) {
        _splashDone = true;
        try { if (typeof initAudio === 'function') initAudio(); } catch(_){}
        setTimeout(_hideSplash, 50);
      }
    }
    document.addEventListener('pointerdown', _capture, true);
    document.addEventListener('touchstart',  _capture, true);
    document.addEventListener('touchend',    _capture, true);
    document.addEventListener('click',       _capture, true);
    document.addEventListener('mousedown',   _capture, true);
    // Failsafe 30s
    setTimeout(function(){
      if (!_splashDone && document.getElementById('orbita-splash')) {
        _splashDone = true;
        try { if (typeof initAudio === 'function') initAudio(); } catch(_){}
        _hideSplash();
      }
    }, 30000);
  }
  // Espera ao menos 2 frames de render + 150ms pro canvas ja ter desenhado algo
  function _scheduleSplashTapReady(){
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        setTimeout(_armSplashTapToStart, 150);
      });
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    _scheduleSplashTapReady();
  } else {
    window.addEventListener('load', _scheduleSplashTapReady, { once: true });
  }

  // ---------- TUNING ----------
  // Multiplicador da velocidade de orbita. Afeta a velocidade do
  // salto (orbitSpeed * raio * 2.2). Valores recomendados:
  //   1.30 = Dificil
  //   1.50 = Muito dificil  <- atual
  //   1.75 = Brutal
  //   1.85+ = praticamente impossivel
  const SPEED_MULTIPLIER = 1.50;

  // Probabilidade de bonus aleatorio em cada captura (recompensa imprevisivel).
  const MEGA_BONUS_CHANCE = 0.04;  // 4% = 5x pontos
  const LUCKY_CHANCE      = 0.11;  // 11% = 2x pontos (total 15% de eventos com bonus)

  // Limite do near-miss: distancia da bola ao centro do no nao
  // capturado em fracao do captureR. <= 0.7x = era pra ter pegado.
  const NEAR_MISS_MAX_OVERSHOOT = 0.7;

  // Estado psicologico da run atual (resetado em cada startRun).
  let _nearMissData = null;       // {nodeX, nodeY, captureR, ballX, ballY, tier, distance}
  let _captureFlashT = 0;          // 0..1 - flash branco curto em capturas
  let _lastBonusType = null;       // 'mega' | 'lucky' | null - ultimo bonus pra som ascendente

  // Analytics (retencao). Persistido em localStorage.
  let _runStartT = 0;
  let _captureCount = 0;

  // Snapshot do estado da run pra exibir na tela de morte
  let _currentDeathPhrase = '';
  let _currentDayStreak = 1;
  let _runDurationS = 0;
  let _runMaxCombo = 0;

  // Estado pro menu inicial
  let _menuStars = null;          // gerado uma vez, persiste
  let _menuDayStreak = 1;

  // Detecta producao (qualquer host que nao seja localhost/127.0.0.1).
  // Em prod: botao 🧪 nao renderiza, nao responde a tap, _debugMode forcado false.
  // Mantem o codigo de debug intacto pra dev local continuar funcionando.
  const _IS_PROD = (function(){
    try {
      const h = (location && location.hostname) || '';
      return h !== 'localhost' && h !== '127.0.0.1' && h !== '';
    } catch(e) { return true; }
  })();

  // Modo debug (sem morte). Persistido em localStorage pra sobreviver reload.
  // Em prod: SEMPRE false, ignora valor persistido (impede tester com flag antiga
  // ativada de continuar invencivel apos publicacao).
  let _debugMode = false;
  if (!_IS_PROD) {
    try {
      _debugMode = localStorage.getItem('orbita_debug_mode') === '1';
    } catch(e) {}
  } else {
    // Limpa valor persistido em prod pra blindar contra usuarios que rodaram
    // o jogo em dev e depois acessaram a versao live.
    try { localStorage.removeItem('orbita_debug_mode'); } catch(e) {}
  }
  function _toggleDebug(){
    if (_IS_PROD) return;  // no-op em prod
    _debugMode = !_debugMode;
    try { localStorage.setItem('orbita_debug_mode', _debugMode ? '1' : '0'); } catch(e) {}
  }

  // Modo daltonismo: adiciona marcadores de forma sobre cada no
  // pra que jogadores com deficiencia de cor distingam os tiers.
  // Verde=sem marca (default), Azul=triangulo, Vermelho=X, Dourado=estrela.
  let _colorBlindMode = false;
  try {
    _colorBlindMode = localStorage.getItem('orbita_colorblind') === '1';
  } catch(e) {}
  function _toggleColorBlind(){
    _colorBlindMode = !_colorBlindMode;
    try { localStorage.setItem('orbita_colorblind', _colorBlindMode ? '1' : '0'); } catch(e) {}
  }

  // ---------- ONBOARDING ----------
  // Primeiras 3 partidas tem dificuldade gradual e a 1a tem hint
  // visual de "TOQUE PARA SOLTAR" pra novos jogadores nao se assustarem.
  // Sem isso, ~80% dos novos jogadores desinstalam apos morrer
  // em 2 segundos no phase 6 brutal.
  function _isOnboarding(){
    if (typeof zenMode !== 'undefined' && zenMode) return false;
    if (typeof testMode !== 'undefined' && testMode) return false;
    return (typeof totalGames === 'number') && totalGames < 3;
  }
  let _tapHintVisible = false;
  let _hasReleasedThisRun = false;

  // ---------- ANTI-CHEAT ----------
  // 3 camadas: (1) assinatura no save vs localStorage editor,
  // (2) score esperado em runtime vs console "score=9999",
  // (3) assinatura no game_end event pra validacao server-side.
  // Limitacoes: nao protege contra edicao do source JS. Atinge ~95%
  // dos cheaters (aqueles que usam DevTools).
  const _AC_SALT = 'orb1ta_p4tch_2026_kY9_xL4z';
  let _expectedScore = 0;
  let _cheatFlagged = false;

  // ---------- BOT / HEADLESS DETECTION ----------
  // Detecta automacao (Puppeteer, Playwright, Selenium, headless Chrome).
  // Calcula 1x no boot e cacheia. Anexado ao payload de game_end pro
  // server poder filtrar / banir / nao-rankear submissoes de bot.
  // Heuristicas combinadas pra reduzir falso positivo de browsers reais.
  const _botSignals = (function(){
    const sig = { score: 0, reasons: [] };
    try {
      // Sinal forte: WebDriver flag (Selenium, Puppeteer com headless padrao)
      if (navigator.webdriver === true) { sig.score += 4; sig.reasons.push('webdriver'); }
      // UA com marcas de headless/automacao
      const ua = (navigator.userAgent || '').toLowerCase();
      if (/headlesschrome|puppeteer|playwright|phantomjs|selenium|cypress|jsdom|nightmare|electron(?!.*nw\.js)/i.test(ua)) {
        sig.score += 4; sig.reasons.push('ua_automation');
      }
      // Chrome headless tipico tem navigator.languages vazio
      if (!navigator.languages || navigator.languages.length === 0) { sig.score += 2; sig.reasons.push('no_languages'); }
      // Mobile real tem maxTouchPoints > 0; desktop legitimo tambem mostra 0,
      // entao soh penalizamos se UA disser mobile e maxTouchPoints for 0.
      if (/android|iphone|ipad|ipod|mobile/i.test(ua) && (navigator.maxTouchPoints || 0) === 0) {
        sig.score += 3; sig.reasons.push('mobile_ua_no_touch');
      }
      // Headless Chrome antigo: window.outerHeight === 0
      if (typeof window !== 'undefined' && window.outerHeight === 0 && window.outerWidth === 0) {
        sig.score += 2; sig.reasons.push('zero_outer_size');
      }
      // Permissions API quirky em headless
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions.query({ name: 'notifications' }).then(function(p){
          // Em headless Chrome, notification permission retorna 'denied' mesmo sem prompt
          if (p && p.state === 'denied' && Notification && Notification.permission === 'default') {
            sig.score += 1; sig.reasons.push('perm_inconsistency');
          }
        }).catch(function(){});
      }
      // Plugins sempre vazio em headless chromium
      if (navigator.plugins && navigator.plugins.length === 0 && /chrome/i.test(ua) && !/mobile/i.test(ua)) {
        sig.score += 1; sig.reasons.push('chrome_no_plugins');
      }
    } catch(e) { sig.reasons.push('detection_error'); }
    return sig;
  })();
  function _isLikelyBot(){ return _botSignals.score >= 4; }

  // Hash FNV-1a curto pra assinatura
  function _hash(s){
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  // Assina os campos criticos do save
  function _signSave(d){
    if (!d || typeof d !== 'object') return '';
    const fields = ['best', 'totalGames', 'totalScoreEver', 'totalNodesEver',
                    'bestComboEver', 'highestPhase', 'totalGoldCaptured'];
    const parts = fields.map(k => k + ':' + (d[k] != null ? d[k] : ''));
    return _hash(parts.join('|') + '|' + _AC_SALT);
  }

  // Assina um payload de evento (game_end)
  function _signEvent(payload){
    if (!payload) return '';
    const fields = ['anon_id', 'score', 'best', 'duration_s', 'captures', 'max_combo'];
    const parts = fields.map(k => k + ':' + (payload[k] != null ? payload[k] : ''));
    return _hash(parts.join('|') + '|' + _AC_SALT);
  }

  // Validacao do save no carregamento do patch (data.js ja carregou
  // os globais antes - precisamos resetar se for tampered).
  try {
    const SAVE_KEY = 'orbita_save';
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && data._sig) {
        const expected = _signSave(data);
        if (data._sig !== expected) {
          // TAMPERED - reseta campos criticos
          console.warn('[orbita] save integrity check failed - resetting progress');
          data.best = 0;
          data.totalScoreEver = 0;
          data.totalNodesEver = 0;
          data.bestComboEver = 0;
          data.highestPhase = 1;
          data.totalGoldCaptured = 0;
          data._sig = _signSave(data);
          localStorage.setItem(SAVE_KEY, JSON.stringify(data));
          // Atualiza globais ja carregados em data.js
          if (typeof best !== 'undefined') best = 0;
          if (typeof totalScoreEver !== 'undefined') totalScoreEver = 0;
          if (typeof totalNodesEver !== 'undefined') totalNodesEver = 0;
          if (typeof bestComboEver !== 'undefined') bestComboEver = 0;
          if (typeof highestPhase !== 'undefined') highestPhase = 1;
          if (typeof totalGoldCaptured !== 'undefined') totalGoldCaptured = 0;
        }
      }
    }
  } catch(e) {}

  // Wrap saveData pra anexar assinatura em todo save
  if (typeof window.saveData === 'function') {
    const _origSaveData = window.saveData;
    window.saveData = function(){
      const r = _origSaveData.apply(this, arguments);
      try {
        const SAVE_KEY = 'orbita_save';
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data && typeof data === 'object') {
            data._sig = _signSave(data);
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
          }
        }
      } catch(e) {}
      return r;
    };
  }

  // Medalhas estilo Flappy Bird (limites de score)
  function _getFlappyMedal(s){
    if (s >= 200) return { emoji: '👑', name: 'LENDÁRIO', color: '#ff80ff', glow: '#ff60ff' };
    if (s >= 100) return { emoji: '💎', name: 'PLATINA',  color: '#80ffff', glow: '#40d0ff' };
    if (s >= 50)  return { emoji: '🥇', name: 'OURO',     color: '#ffd700', glow: '#ffaa00' };
    if (s >= 25)  return { emoji: '🥈', name: 'PRATA',    color: '#d0d0e8', glow: '#a0a0c8' };
    if (s >= 10)  return { emoji: '🥉', name: 'BRONZE',   color: '#e09060', glow: '#cd7f32' };
    return null;
  }

  // Frases por contexto da morte. O picker escolhe o bucket de
  // maior prioridade que se aplica e sorteia uma frase dele.
  const _PHRASE_BUCKETS = {
    // Bateu recorde - euforia
    new_record: [
      'ISSO! VAI!',
      'NOVO RECORDE!',
      'Você é fera.',
      'Tá voando hoje!',
      'Próximo objetivo: dobrar isso.',
      'Se gabar é justo agora.',
      'Hoje o dedo tá afiado.',
      'Tu não para mais não, né?',
      'Print disso.',
      'GG.',
    ],
    // Quase bateu o recorde (faltou 1-3 pts)
    near_record: [
      'POR ESSA?!',
      'FALTOU NADA!',
      'AAAAAAA!',
      'Tava ali.',
      'Por 1 ponto??',
      'Cruel.',
      'Quase tive um treco.',
      'Tava do lado.',
      'Você sabe que ia.',
      'De novo. Vai sair.',
    ],
    // Bola raspou num nó (near-miss visual disparou)
    near_miss: [
      'Era pra ter pegado.',
      'O dedo veio errado.',
      'Tava na mão.',
      'O dourado tava lá.',
      'Calculou errado.',
      'Encostou e voltou.',
      'Pertinho!',
      'Soltou cedo demais.',
      'Atrasou um frame.',
      'Tava na unha.',
    ],
    // Morreu no primeiro nó (score 0)
    first_death: [
      'Caiu no primeiro? Sério?',
      'Já?',
      'Nem chegou a esquentar.',
      'Calma, respira.',
      'Foi só pra testar, né?',
      'Vai com mais calma.',
      'Não esquenta, todo mundo erra o 1º.',
      'Esse foi de presente.',
    ],
    // Morte muito cedo (score 1-4)
    early_death: [
      'Mole demais.',
      'Concentra.',
      'Acordou agora?',
      'Esquentando ainda.',
      'Foco!',
      'Cê tá lento hoje.',
      'De novo, vai.',
      'Sem distração.',
    ],
    // Combo alto perdido (maxCombo >= 5)
    combo_end: [
      'Tava no flow!',
      'Combo perdido. DOEU.',
      'Sequência quebrada.',
      'Mantém o ritmo!',
      'Tava lindo. E aí?',
      'Bora retomar.',
      'O combo cobra.',
    ],
    // Run longa (>= 30s)
    long_run: [
      'Boa run.',
      'Fez bonito.',
      'Resistente.',
      'Aguentou pancada.',
      'Tá evoluindo.',
      'Próxima vai mais longe.',
    ],
    // Run muito curta (< 5s)
    short_run: [
      'Apressado.',
      'Calma!',
      'Tem que pensar.',
      'Não é speedrun.',
      'Respira fundo.',
      'Devagar e sempre.',
    ],
    // Genericas (fallback)
    generic: [
      'Mais uma...',
      'Você consegue.',
      'Vai dessa vez.',
      'Não chora.',
      'Reflexo lento.',
      'Tá perto.',
      'Respira e tenta.',
      'De novo.',
      'Bora.',
      'Tá ruim, hein?',
      'Sem desculpa.',
      'Tu sabe.',
      'Tem mais nessa.',
      'Nem foi tão ruim.',
      'A culpa é sua.',
      'Não foi o jogo.',
      'Tenta o ouro dessa vez.',
      'Sem chorar.',
      'Quero ver.',
      'Mais foco.',
    ],
  };

  // Pool extra de 500 frases motivacionais/contemplativas. Vai pro
  // bucket "generic" apos dedup contra todos os outros buckets.
  const _EXTRA_PHRASES = [
    'Não é speedrun.','Vai no seu tempo.','O jogo continua.','Mais uma tentativa.',
    'Respira e tenta de novo.','Você consegue passar.','Calma no controle.',
    'Foco na próxima jogada.','Não desiste agora.','Aprende o padrão.',
    'Volta mais esperto.','Cada erro ensina.','Você está evoluindo.','Segue o mapa.',
    'Olha o timing.','Vai com calma.','Confia no progresso.','Não pula etapa.',
    'Treina mais um pouco.','Quase lá.','Você chegou longe.','Continua firme.',
    'Um passo por vez.','Hoje passa.','Não precisa correr.','Joga com cabeça.',
    'Fica atento.','O detalhe decide.','Você já melhorou.','A próxima é sua.',
    'Sem pressa.','Sem pânico.','Só joga.','Recomeçar também conta.',
    'Você aprendeu algo.','Agora ajusta.','Tenta diferente.','Olha melhor.',
    'Mira melhor.','Espera o momento.','Vai no ritmo.','Não força errado.',
    'Escolhe bem.','Usa a estratégia.','Você tem chance.','A fase é treinável.',
    'O chefe tem padrão.','Leia o movimento.','Não entra no desespero.',
    'Você está perto.','Falta pouco.','Mais controle.','Menos impulso.',
    'Joga inteligente.','Avança com calma.','Boa tentativa.','Agora melhora.',
    'Você pode virar.','Não acabou.','Continua jogando.','Experiência também vale.',
    'Cada rodada conta.','Você pegou XP.','Subiu um pouco.','Fica no foco.',
    'Olha o próximo passo.','Não olha só o erro.','Aprende e segue.','Ajusta a rota.',
    'Volta para a missão.','Você sabe o que fazer.','Não complica.',
    'Faz o simples bem feito.','O básico vence.','Capricha no timing.',
    'Capricha na mira.','Capricha na defesa.','Joga leve.','Mas joga sério.',
    'Você está melhorando.','A fase não é impossível.','Só precisa prática.',
    'Prática muda tudo.','Mais uma run.','Mais uma chance.','Mais um avanço.',
    'Continua no controle.','Não entrega fácil.','Vai até o fim.','Termina a fase.',
    'Pega o ritmo.','Não se afoba.','Você consegue adaptar.','Troca a estratégia.',
    'Tenta outro caminho.','Usa o que aprendeu.','Volta mais preparado.',
    'O mapa ajuda quem observa.','Observa antes de agir.','Ataca na hora certa.',
    'Defende na hora certa.','Pula na hora certa.','Espera abrir espaço.',
    'Você tem tempo.','Não precisa provar nada.','Só precisa passar.',
    'A vitória vem com calma.','Foco no objetivo.','Foco no checkpoint.',
    'Foco na missão.','Você desbloqueia tentando.','Nada melhora parado.',
    'Movimento gera progresso.','Aprender também é jogar.','Perder faz parte.',
    'Parar não precisa fazer.','Vai de novo.','Continua aprendendo.',
    'Você está no caminho.','Não troca foco por pressa.','Pressa erra fácil.',
    'Calma acerta mais.','Joga no tempo certo.','O controle é seu.',
    'A decisão é sua.','A próxima jogada importa.','Não desperdiça a chance.',
    'Você consegue acertar.','Você consegue defender.','Você consegue escapar.',
    'Você consegue vencer.','Não ignora o padrão.','O inimigo repete.',
    'Você aprende.','Você supera.','Fase difícil também passa.',
    'Boss difícil também cai.','Checkpoint existe por um motivo.','Use a tentativa.',
    'Use a falha.','Use o treino.','Não foi inútil.','Foi aprendizado.',
    'Agora vai melhor.','Joga com atenção.','Cuida da energia.','Cuida do tempo.',
    'Cuida do movimento.','Não gasta tudo cedo.','Guarda recurso.',
    'Escolhe a hora.','Faz valer.','Não corre sem olhar.','Não ataca sem pensar.',
    'Não pula sem medir.','Timing é tudo.','Leitura é tudo.','Controle é tudo.',
    'Você não precisa ser perfeito.','Precisa continuar.','Continua até encaixar.',
    'Quando encaixa, passa.','O começo é estranho.','Depois vira hábito.',
    'Depois vira domínio.','Treina até ficar natural.','Você aprende rápido.',
    'Mas precisa tentar.','Não fica no menu.','Entra na fase.',
    'A fase ensina jogando.','Você só melhora jogando.','Mais jogo, mais leitura.',
    'Mais leitura, menos erro.','Menos erro, mais vitória.','Simples assim.',
    'Não inventa desculpa.','Inventa estratégia.','Se travou, muda.',
    'Se errou, ajusta.','Se caiu, volta.','Se passou, continua.','Próxima fase.',
    'Próximo desafio.','Próxima melhoria.','Você está construindo habilidade.',
    'Habilidade vem de repetição.','Repetição vira confiança.',
    'Confiança vem depois.','Primeiro vem treino.','Hoje é treino.',
    'Amanhã é domínio.','Não pula o processo.','O processo salva.',
    'Segue treinando.','Segue tentando.','Segue melhorando.',
    'Não precisa ser bonito.','Precisa funcionar.','Funciona melhor com calma.',
    'Calma não é lentidão.','Calma é precisão.','Precisão vence correria.',
    'Você sabe disso.','Então joga melhor.',
    'Não é speedrun, sem pressa.','Não é speedrun, com foco.',
    'Não é speedrun, com calma.','Não é speedrun, com controle.',
    'Não é speedrun, com atenção.','Não é speedrun, com estratégia.',
    'Não é speedrun, no timing certo.','Não é speedrun, sem pânico.',
    'Não é speedrun, sem desistir.','Não é speedrun, até o checkpoint.',
    'Não é speedrun, até passar.','Não é speedrun, mais uma vez.',
    'Não é speedrun, do jeito certo.','Não é speedrun, observando melhor.',
    'Não é speedrun, corrigindo o erro.','Não é speedrun, usando o que aprendeu.',
    'Não é speedrun, sem forçar.','Não é speedrun, com paciência.',
    'Não é speedrun, com leitura.','Não é speedrun, no ritmo da fase.',
    'Vai no seu tempo, sem pressa.','Vai no seu tempo, com foco.',
    'Vai no seu tempo, com calma.','Vai no seu tempo, com controle.',
    'Vai no seu tempo, com atenção.','Vai no seu tempo, com estratégia.',
    'Vai no seu tempo, no timing certo.','Vai no seu tempo, sem pânico.',
    'Vai no seu tempo, sem desistir.','Vai no seu tempo, até o checkpoint.',
    'Vai no seu tempo, até passar.','Vai no seu tempo, mais uma vez.',
    'Vai no seu tempo, do jeito certo.','Vai no seu tempo, observando melhor.',
    'Vai no seu tempo, corrigindo o erro.','Vai no seu tempo, usando o que aprendeu.',
    'Vai no seu tempo, sem forçar.','Vai no seu tempo, com paciência.',
    'Vai no seu tempo, com leitura.','Vai no seu tempo, no ritmo da fase.',
    'O jogo continua, sem pressa.','O jogo continua, com foco.',
    'O jogo continua, com calma.','O jogo continua, com controle.',
    'O jogo continua, com atenção.','O jogo continua, com estratégia.',
    'O jogo continua, no timing certo.','O jogo continua, sem pânico.',
    'O jogo continua, sem desistir.','O jogo continua, até o checkpoint.',
    'O jogo continua, até passar.','O jogo continua, mais uma vez.',
    'O jogo continua, do jeito certo.','O jogo continua, observando melhor.',
    'O jogo continua, corrigindo o erro.','O jogo continua, usando o que aprendeu.',
    'O jogo continua, sem forçar.','O jogo continua, com paciência.',
    'O jogo continua, com leitura.','O jogo continua, no ritmo da fase.',
    'Mais uma tentativa, sem pressa.','Mais uma tentativa, com foco.',
    'Mais uma tentativa, com calma.','Mais uma tentativa, com controle.',
    'Mais uma tentativa, com atenção.','Mais uma tentativa, com estratégia.',
    'Mais uma tentativa, no timing certo.','Mais uma tentativa, sem pânico.',
    'Mais uma tentativa, sem desistir.','Mais uma tentativa, até o checkpoint.',
    'Mais uma tentativa, até passar.','Mais uma tentativa, mais uma vez.',
    'Mais uma tentativa, do jeito certo.','Mais uma tentativa, observando melhor.',
    'Mais uma tentativa, corrigindo o erro.','Mais uma tentativa, usando o que aprendeu.',
    'Mais uma tentativa, sem forçar.','Mais uma tentativa, com paciência.',
    'Mais uma tentativa, com leitura.','Mais uma tentativa, no ritmo da fase.',
    'Respira e tenta de novo, sem pressa.','Respira e tenta de novo, com foco.',
    'Respira e tenta de novo, com calma.','Respira e tenta de novo, com controle.',
    'Respira e tenta de novo, com atenção.','Respira e tenta de novo, com estratégia.',
    'Respira e tenta de novo, no timing certo.','Respira e tenta de novo, sem pânico.',
    'Respira e tenta de novo, sem desistir.','Respira e tenta de novo, até o checkpoint.',
    'Respira e tenta de novo, até passar.','Respira e tenta de novo, mais uma vez.',
    'Respira e tenta de novo, do jeito certo.','Respira e tenta de novo, observando melhor.',
    'Respira e tenta de novo, corrigindo o erro.','Respira e tenta de novo, usando o que aprendeu.',
    'Respira e tenta de novo, sem forçar.','Respira e tenta de novo, com paciência.',
    'Respira e tenta de novo, com leitura.','Respira e tenta de novo, no ritmo da fase.',
    'Você consegue passar, sem pressa.','Você consegue passar, com foco.',
    'Você consegue passar, com calma.','Você consegue passar, com controle.',
    'Você consegue passar, com atenção.','Você consegue passar, com estratégia.',
    'Você consegue passar, no timing certo.','Você consegue passar, sem pânico.',
    'Você consegue passar, sem desistir.','Você consegue passar, até o checkpoint.',
    'Você consegue passar, até passar.','Você consegue passar, mais uma vez.',
    'Você consegue passar, do jeito certo.','Você consegue passar, observando melhor.',
    'Você consegue passar, corrigindo o erro.','Você consegue passar, usando o que aprendeu.',
    'Você consegue passar, sem forçar.','Você consegue passar, com paciência.',
    'Você consegue passar, com leitura.','Você consegue passar, no ritmo da fase.',
    'Calma no controle, sem pressa.','Calma no controle, com foco.',
    'Calma no controle, com calma.','Calma no controle, com controle.',
    'Calma no controle, com atenção.','Calma no controle, com estratégia.',
    'Calma no controle, no timing certo.','Calma no controle, sem pânico.',
    'Calma no controle, sem desistir.','Calma no controle, até o checkpoint.',
    'Calma no controle, até passar.','Calma no controle, mais uma vez.',
    'Calma no controle, do jeito certo.','Calma no controle, observando melhor.',
    'Calma no controle, corrigindo o erro.','Calma no controle, usando o que aprendeu.',
    'Calma no controle, sem forçar.','Calma no controle, com paciência.',
    'Calma no controle, com leitura.','Calma no controle, no ritmo da fase.',
    'Foco na próxima jogada, sem pressa.','Foco na próxima jogada, com foco.',
    'Foco na próxima jogada, com calma.','Foco na próxima jogada, com controle.',
    'Foco na próxima jogada, com atenção.','Foco na próxima jogada, com estratégia.',
    'Foco na próxima jogada, no timing certo.','Foco na próxima jogada, sem pânico.',
    'Foco na próxima jogada, sem desistir.','Foco na próxima jogada, até o checkpoint.',
    'Foco na próxima jogada, até passar.','Foco na próxima jogada, mais uma vez.',
    'Foco na próxima jogada, do jeito certo.','Foco na próxima jogada, observando melhor.',
    'Foco na próxima jogada, corrigindo o erro.','Foco na próxima jogada, usando o que aprendeu.',
    'Foco na próxima jogada, sem forçar.','Foco na próxima jogada, com paciência.',
    'Foco na próxima jogada, com leitura.','Foco na próxima jogada, no ritmo da fase.',
    'Não desiste agora, sem pressa.','Não desiste agora, com foco.',
    'Não desiste agora, com calma.','Não desiste agora, com controle.',
    'Não desiste agora, com atenção.','Não desiste agora, com estratégia.',
    'Não desiste agora, no timing certo.','Não desiste agora, sem pânico.',
    'Não desiste agora, sem desistir.','Não desiste agora, até o checkpoint.',
    'Não desiste agora, até passar.','Não desiste agora, mais uma vez.',
    'Não desiste agora, do jeito certo.','Não desiste agora, observando melhor.',
    'Não desiste agora, corrigindo o erro.','Não desiste agora, usando o que aprendeu.',
    'Não desiste agora, sem forçar.','Não desiste agora, com paciência.',
    'Não desiste agora, com leitura.','Não desiste agora, no ritmo da fase.',
    'Aprende o padrão, sem pressa.','Aprende o padrão, com foco.',
    'Aprende o padrão, com calma.','Aprende o padrão, com controle.',
    'Aprende o padrão, com atenção.','Aprende o padrão, com estratégia.',
    'Aprende o padrão, no timing certo.','Aprende o padrão, sem pânico.',
    'Aprende o padrão, sem desistir.','Aprende o padrão, até o checkpoint.',
    'Aprende o padrão, até passar.','Aprende o padrão, mais uma vez.',
    'Aprende o padrão, do jeito certo.','Aprende o padrão, observando melhor.',
    'Aprende o padrão, corrigindo o erro.','Aprende o padrão, usando o que aprendeu.',
    'Aprende o padrão, sem forçar.','Aprende o padrão, com paciência.',
    'Aprende o padrão, com leitura.','Aprende o padrão, no ritmo da fase.',
    'Volta mais esperto, sem pressa.','Volta mais esperto, com foco.',
    'Volta mais esperto, com calma.','Volta mais esperto, com controle.',
    'Volta mais esperto, com atenção.','Volta mais esperto, com estratégia.',
    'Volta mais esperto, no timing certo.','Volta mais esperto, sem pânico.',
    'Volta mais esperto, sem desistir.','Volta mais esperto, até o checkpoint.',
    'Volta mais esperto, até passar.','Volta mais esperto, mais uma vez.',
    'Volta mais esperto, do jeito certo.','Volta mais esperto, observando melhor.',
    'Volta mais esperto, corrigindo o erro.','Volta mais esperto, usando o que aprendeu.',
    'Volta mais esperto, sem forçar.','Volta mais esperto, com paciência.',
    'Volta mais esperto, com leitura.','Volta mais esperto, no ritmo da fase.',
    'Cada erro ensina, sem pressa.','Cada erro ensina, com foco.',
    'Cada erro ensina, com calma.','Cada erro ensina, com controle.',
    'Cada erro ensina, com atenção.','Cada erro ensina, com estratégia.',
    'Cada erro ensina, no timing certo.','Cada erro ensina, sem pânico.',
    'Cada erro ensina, sem desistir.','Cada erro ensina, até o checkpoint.',
    'Cada erro ensina, até passar.','Cada erro ensina, mais uma vez.',
    'Cada erro ensina, do jeito certo.','Cada erro ensina, observando melhor.',
    'Cada erro ensina, corrigindo o erro.','Cada erro ensina, usando o que aprendeu.',
    'Cada erro ensina, sem forçar.','Cada erro ensina, com paciência.',
    'Cada erro ensina, com leitura.','Cada erro ensina, no ritmo da fase.',
    'Você está evoluindo, sem pressa.','Você está evoluindo, com foco.',
    'Você está evoluindo, com calma.','Você está evoluindo, com controle.',
    'Você está evoluindo, com atenção.','Você está evoluindo, com estratégia.',
    'Você está evoluindo, no timing certo.','Você está evoluindo, sem pânico.',
    'Você está evoluindo, sem desistir.','Você está evoluindo, até o checkpoint.',
    'Você está evoluindo, até passar.','Você está evoluindo, mais uma vez.',
    'Você está evoluindo, do jeito certo.','Você está evoluindo, observando melhor.',
    'Você está evoluindo, corrigindo o erro.','Você está evoluindo, usando o que aprendeu.',
    'Você está evoluindo, sem forçar.','Você está evoluindo, com paciência.',
    'Você está evoluindo, com leitura.','Você está evoluindo, no ritmo da fase.',
    'Segue o mapa, sem pressa.','Segue o mapa, com foco.',
    'Segue o mapa, com calma.','Segue o mapa, com controle.',
    'Segue o mapa, com atenção.','Segue o mapa, com estratégia.',
    'Segue o mapa, no timing certo.','Segue o mapa, sem pânico.',
    'Segue o mapa, sem desistir.','Segue o mapa, até o checkpoint.',
    'Segue o mapa, até passar.','Segue o mapa, mais uma vez.',
    'Segue o mapa, do jeito certo.','Segue o mapa, observando melhor.',
    'Segue o mapa, corrigindo o erro.','Segue o mapa, usando o que aprendeu.',
    'Segue o mapa, sem forçar.','Segue o mapa, com paciência.',
    'Segue o mapa, com leitura.','Segue o mapa, no ritmo da fase.',
    'Olha o timing, sem pressa.','Olha o timing, com foco.',
    'Olha o timing, com calma.','Olha o timing, com controle.',
    'Olha o timing, com atenção.','Olha o timing, com estratégia.',
    'Olha o timing, no timing certo.','Olha o timing, sem pânico.',
    'Olha o timing, sem desistir.','Olha o timing, até o checkpoint.',
    'Olha o timing, até passar.','Olha o timing, mais uma vez.',
    'Olha o timing, do jeito certo.','Olha o timing, observando melhor.',
    'Olha o timing, corrigindo o erro.'
  ];

  // Dedup runtime: junta no generic apenas o que ainda nao existe
  // em NENHUM bucket (inclui o proprio generic).
  (function _mergePhrases(){
    const seen = new Set();
    for (const k in _PHRASE_BUCKETS) {
      for (const p of _PHRASE_BUCKETS[k]) seen.add(p);
    }
    let added = 0;
    for (const p of _EXTRA_PHRASES) {
      if (!seen.has(p)) {
        _PHRASE_BUCKETS.generic.push(p);
        seen.add(p);
        added++;
      }
    }
    // console.log('[orbita] frases extras adicionadas:', added);
  })();

  function _pickContextualPhrase(){
    const ctx = {
      score: (typeof score === 'number') ? score : 0,
      best: (typeof best === 'number') ? best : 0,
      newRec: (typeof newRec !== 'undefined' && !!newRec),
      nearMiss: !!_nearMissData,
      duration: _runDurationS || 0,
      combo: _runMaxCombo || 0,
    };
    // Delega ao i18n se disponivel (multi-idioma)
    if (window.OrbitaI18n && typeof window.OrbitaI18n.pickContextualPhrase === 'function') {
      const p = window.OrbitaI18n.pickContextualPhrase(ctx);
      if (p) return p;
    }
    // Fallback: usa o _PHRASE_BUCKETS local em PT
    const sc = ctx.score, bs = ctx.best, gap = bs - sc;
    let bucket = 'generic';
    if (ctx.newRec)                               bucket = 'new_record';
    else if (bs > 0 && gap >= 1 && gap <= 3)      bucket = 'near_record';
    else if (ctx.nearMiss)                        bucket = 'near_miss';
    else if (sc === 0)                            bucket = 'first_death';
    else if (sc <= 4)                             bucket = 'early_death';
    else if (ctx.combo >= 5)                      bucket = 'combo_end';
    else if (ctx.duration >= 30)                  bucket = 'long_run';
    else if (ctx.duration > 0 && ctx.duration < 5) bucket = 'short_run';
    const list = _PHRASE_BUCKETS[bucket] || _PHRASE_BUCKETS.generic;
    return list[Math.floor(Math.random() * list.length)];
  }

  // ---------- 1. DIFICULDADE: fase 6 brutal apos 3 partidas ----------
  // Onboarding: rampa gradual nas primeiras 3 partidas pra reter
  // novos jogadores. Da partida 4 em diante, phase 6 puro.
  if (typeof window.getPhase === 'function') {
    window.getPhase = function(){
      if (typeof zenMode !== 'undefined' && zenMode) return 1;
      // Rampa pras 3 primeiras partidas (totalGames eh incrementado em die())
      if (typeof totalGames === 'number') {
        if (totalGames === 0) return 1;  // 1a partida: gentil
        if (totalGames === 1) return 3;  // 2a: media
        if (totalGames === 2) return 5;  // 3a: pesada
      }
      return 6;  // 4a+: chaos
    };
  }

  // Aplica multiplicador de velocidade com curva customizada:
  //  - Score 0-99:   crescimento normal (3.0 + sc*0.05) * 1.5
  //  - Score 100+:   reduz a taxa de crescimento pra ~30% (gameplay
  //                  jogavel em scores altos sem virar impossivel)
  //  - Onboarding (3 primeiras partidas): velocidade reduzida pra
  //                  o jogador aprender a mecanica
  if (typeof registerOrbitaGameplayHook === 'function') {
    registerOrbitaGameplayHook('adjustOrbitSpeed', function(payload){
      if (!payload) return payload;
      if (typeof zenMode !== 'undefined' && zenMode) return payload;
      const sc = (typeof score === 'number') ? score : 0;
      let baseValue;
      if (sc <= 100) {
        baseValue = 3.0 + sc * 0.05;            // 3.0 -> 8.0
      } else {
        baseValue = 8.0 + (sc - 100) * 0.015;   // 8.0 -> 11.0 em sc=300
      }
      // Multiplicador reduzido durante onboarding (1a-3a partida)
      let mult = SPEED_MULTIPLIER;
      if (_isOnboarding()) {
        const tg = (typeof totalGames === 'number') ? totalGames : 0;
        if (tg === 0)      mult = 0.85;  // 1a: bem lenta, da pra aprender
        else if (tg === 1) mult = 1.05;  // 2a: media
        else if (tg === 2) mult = 1.25;  // 3a: quase normal
      }
      return { value: baseValue * mult };
    });
  }

  // ---------- BACKGROUND PROGRESSIVO ----------
  // 5 paletas que mudam conforme o score, todas mantidas escuras o
  // bastante pra (a) nao conflitar com nos verde/azul/vermelho/dourado,
  // (b) deixar os meteoros cinza visiveis como silhuetas claras.
  // Lerp suave entre tiers vizinhos pra transicao continua.
  // Top/bot ficam em ~10-25/255 (quase preto), mid pode ir ate ~70/255
  // mas sempre com hue distinta dos nos.
  const _BG_TIERS = [
    // 0-19: Espaço profundo (navy)
    { min:   0, top:'#04060e', mid:'#0c1a36', bot:'#04060e' },
    // 20-49: Nebulosa violeta
    { min:  20, top:'#08041a', mid:'#220844', bot:'#08041a' },
    // 50-99: Aurora teal (azul-esverdeado profundo)
    { min:  50, top:'#04141a', mid:'#0c3838', bot:'#04141a' },
    // 100-199: Indigo/violeta profundo (azul-roxo, NAO magenta - pra
    // nao competir com o no vermelho. Era #480a55 que tinha B=85
    // similar ao vermelho do no #ff4757)
    { min: 100, top:'#0a0420', mid:'#1c1060', bot:'#0a0420' },
    // 200+: Cosmic DOURADO de verdade (amber profundo)
    { min: 200, top:'#100a04', mid:'#3e2c0a', bot:'#100a04' },
  ];

  function _bgTierIndex(s){
    let idx = 0;
    for (let i = _BG_TIERS.length - 1; i >= 0; i--) {
      if (s >= _BG_TIERS[i].min) { idx = i; break; }
    }
    return idx;
  }

  if (typeof window.getBgColors === 'function') {
    window.getBgColors = function(){
      // Zen mantem o navy fixo
      if (typeof zenMode !== 'undefined' && zenMode) {
        return _BG_TIERS[0];
      }
      const sc = (typeof score === 'number') ? score : 0;
      const i = _bgTierIndex(sc);
      const cur = _BG_TIERS[i];
      const next = _BG_TIERS[i + 1] || cur;
      const range = next.min - cur.min;
      const progress = range > 0 ? Math.min(Math.max((sc - cur.min) / range, 0), 1) : 0;
      // lerpColor existe em core.js
      if (typeof lerpColor !== 'function') return cur;
      return {
        top: lerpColor(cur.top, next.top, progress),
        mid: lerpColor(cur.mid, next.mid, progress),
        bot: lerpColor(cur.bot, next.bot, progress),
      };
    };
  }

  // ---------- ANALYTICS MINIMO (RETENCAO) ----------
  // Gera/persiste um ID anonimo por dispositivo e injeta em todos os
  // eventos via wrap do trackEvent (definido em services.js).
  // Eventos disparados: session_start (1x por carga), game_start
  // (ja existe em game.js), game_end (na morte).
  function _getOrCreateAnonId(){
    try {
      const KEY = 'orbita_anon_id';
      let id = localStorage.getItem(KEY);
      if (!id) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          id = crypto.randomUUID();
        } else {
          id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        }
        localStorage.setItem(KEY, id);
      }
      return id;
    } catch(e) { return null; }
  }
  const ANON_ID = _getOrCreateAnonId();

  // Calcula day_streak local (dias consecutivos de uso) e dias desde
  // a primeira sessao - util pra retencao D1/D7.
  function _computeRetentionMeta(){
    const today = new Date();
    const todayKey = today.getFullYear() + '-' +
      String(today.getMonth()+1).padStart(2,'0') + '-' +
      String(today.getDate()).padStart(2,'0');

    let firstSeen = null, lastSeen = null, streak = 1, totalSessions = 0;
    try {
      firstSeen = localStorage.getItem('orbita_first_seen');
      lastSeen = localStorage.getItem('orbita_last_seen');
      streak = parseInt(localStorage.getItem('orbita_day_streak') || '1', 10) || 1;
      totalSessions = parseInt(localStorage.getItem('orbita_session_count') || '0', 10) || 0;
    } catch(e) {}

    if (!firstSeen) {
      firstSeen = todayKey;
      try { localStorage.setItem('orbita_first_seen', firstSeen); } catch(e) {}
    }

    let daysSinceLast = -1;
    if (lastSeen) {
      const last = new Date(lastSeen + 'T12:00:00');
      const diffMs = today.setHours(12,0,0,0) - last.getTime();
      daysSinceLast = Math.round(diffMs / 86400000);
      if (daysSinceLast === 1) streak += 1;
      else if (daysSinceLast > 1) streak = 1;
      // 0 = mesma data, mantem streak
    }

    if (lastSeen !== todayKey) {
      try {
        localStorage.setItem('orbita_last_seen', todayKey);
        localStorage.setItem('orbita_day_streak', String(streak));
      } catch(e) {}
    }
    totalSessions += 1;
    try { localStorage.setItem('orbita_session_count', String(totalSessions)); } catch(e) {}

    const firstDate = new Date(firstSeen + 'T12:00:00');
    const daysSinceFirst = Math.round((today.setHours(12,0,0,0) - firstDate.getTime()) / 86400000);

    return {
      first_seen: firstSeen,
      day_streak: streak,
      days_since_last: daysSinceLast,
      days_since_first: daysSinceFirst,
      session_count: totalSessions,
      today: todayKey
    };
  }

  // Wrap trackEvent pra injetar anon_id em TODOS os eventos.
  if (typeof window.trackEvent === 'function') {
    const _origTrack = window.trackEvent;
    window.trackEvent = function(name, payload, opts){
      const enhanced = Object.assign({ anon_id: ANON_ID }, payload || {});
      try { return _origTrack.call(this, name, enhanced, opts); }
      catch(e) { return null; }
    };
  }

  // Dispara session_start na carga do patch (apos services.js inicializar
  // Supabase). Atrasamos 1s pra garantir conexao pronta.
  setTimeout(function(){
    try {
      if (typeof trackEvent !== 'function') return;
      const meta = _computeRetentionMeta();
      trackEvent('session_start', meta);
    } catch(e) {}
  }, 1000);

  // Carrega o streak pra exibir no menu (atualizado em die())
  try {
    _menuDayStreak = parseInt(localStorage.getItem('orbita_day_streak') || '1', 10) || 1;
  } catch(e) {}

  // Gera campo de estrelas pro menu (uma vez por sessao)
  function _genMenuStars(){
    const stars = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 1.6,
        baseAlpha: 0.15 + Math.random() * 0.45,
        twinkleSpeed: 0.6 + Math.random() * 2.4,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.85 ? '#ffffff' : (Math.random() < 0.5 ? '#a0c8ff' : '#ffd0a0')
      });
    }
    return stars;
  }
  _menuStars = _genMenuStars();

  // Brilho leve nos meteoros pra garantir contraste mesmo em
  // momentos de flash branco (recorde, mega bonus).
  if (typeof window.drawAsteroid === 'function') {
    const _origDrawAst = window.drawAsteroid;
    window.drawAsteroid = function(a, ax, ay){
      _origDrawAst.apply(this, arguments);
      // Stroke extra pra dar contorno visivel
      try {
        X.save();
        X.translate(ax, ay);
        X.rotate(a.rot);
        X.strokeStyle = 'rgba(180, 180, 210, 0.55)';
        X.lineWidth = 1.2;
        X.beginPath();
        const verts = a.vertices || [];
        for (let i = 0; i < verts.length; i++) {
          const v = verts[i];
          const px = Math.cos(v.a) * a.r * v.r;
          const py = Math.sin(v.a) * a.r * v.r;
          if (i === 0) X.moveTo(px, py);
          else X.lineTo(px, py);
        }
        X.closePath();
        X.stroke();
        X.restore();
      } catch(e) {}
    };
  }

  // ---------- 2. SIMPLICIDADE: zera tutorial e desativa hibrido ----------
  // (sem hook proprio - reset() abaixo zera tutorialStep/tutorialT)

  // ---------- 2b. RESPONSIVIDADE: branches dentro da tela ----------
  // Em telas pequenas (mobile portrait), hard/gold nasciam fora do
  // viewport por causa do distMul 1.55/1.75 + baseDist 220-320.
  // Clampamos a distancia base e adicionamos um clampPosition que
  // puxa o candidato pra dentro de uma area visivel ao redor do
  // no de origem.
  // Estado compartilhado para evitar irmaos colados no mesmo spawn.
  // O placeBranch nativo nao enxerga irmaos ainda nao "pushados" no
  // array global de nos, entao mantemos uma lista propria por spawn.
  let _currentSpawnSource = null;
  let _currentSpawnSiblings = [];
  function _siblingMinDist(){
    const minSide = Math.min(W, H);
    return Math.max(140, minSide * 0.34);
  }

  if (typeof registerOrbitaGameplayHook === 'function') {
    registerOrbitaGameplayHook('adjustPlaceBranchConfig', function(cfg){
      if (!cfg) return cfg;
      const minSide = Math.min(W, H);
      // Distancia base ~38% do menor lado. Com distMul, gold ainda
      // fica em torno de 65% do menor lado mas o clampPosition
      // garante que nao saia do retangulo seguro.
      const targetBase = Math.max(170, Math.min(cfg.baseDist, minSide * 0.38));
      const jitter = Math.min(38, targetBase * 0.16);
      cfg.baseDist = targetBase;
      cfg.distJitterMin = -jitter;
      cfg.distJitterMax = jitter;
      // Reduz a variacao angular pra evitar que tiers vizinhos
      // (easy/medium ou medium/hard) caiam no mesmo angulo.
      cfg.angleJitter = Math.min(cfg.angleJitter, 0.14);
      // Espacamento minimo agora MAIOR pra os nos nao colarem.
      cfg.minSpacing = Math.max(cfg.minSpacing, Math.max(155, minSide * 0.36));
      cfg.maxAttempts = Math.max(cfg.maxAttempts, 50);
      // Reduz raio de orbita dos nos moviles pra nao saltarem da tela.
      cfg.movingRadiusMax = Math.min(cfg.movingRadiusMax, 22);
      cfg.movingRadiusMin = Math.min(cfg.movingRadiusMin, 12);

      // Limita o candidato a ficar dentro de um retangulo seguro ao
      // redor do no de origem. Margem de 0.45 do tamanho da tela.
      const fromNode = cfg.fromNode;
      const halfRectW = W * 0.45;
      const halfRectH = H * 0.45;
      cfg.clampPosition = function(x, y){
        if (!fromNode) return { x, y };
        const minX = fromNode.x - halfRectW;
        const maxX = fromNode.x + halfRectW;
        const minY = fromNode.y - halfRectH;
        const maxY = fromNode.y + halfRectH;
        return {
          x: Math.max(minX, Math.min(maxX, x)),
          y: Math.max(minY, Math.min(maxY, y))
        };
      };

      // Reset do estado de irmaos quando muda a origem.
      if (fromNode && fromNode !== _currentSpawnSource) {
        _currentSpawnSource = fromNode;
        _currentSpawnSiblings = [];
      }
      // Validacao adicional: rejeita candidato perto de irmao ja
      // posicionado neste mesmo spawn.
      const minSiblingDist = _siblingMinDist();
      cfg.isPositionValid = function(x, y){
        for (let i = 0; i < _currentSpawnSiblings.length; i++) {
          const s = _currentSpawnSiblings[i];
          const dx = x - s.x, dy = y - s.y;
          if ((dx*dx + dy*dy) < minSiblingDist * minSiblingDist) return false;
        }
        return true;
      };
      return cfg;
    });

    // ---------- Apertar o capture radius do tier "easy" (verde) ----------
    // Verde original tem captureR=62 - muito generoso. Diminuimos pra
    // ~46 pra exigir mais precisao mesmo no "facil".
    registerOrbitaGameplayHook('adjustCaptureRadius', function(payload){
      if (!payload) return payload;
      if (payload.tier === 'easy') {
        const tightened = Math.max(38, payload.value - 16);
        return { tier: payload.tier, value: tightened };
      }
      return payload;
    });

    // ---------- LEQUE FIXO DE 4 NÓS por spawn (estilo do desenho) ----------
    // Verde inferior-esquerda, vermelho superior-esquerda,
    // dourado em cima, azul a direita.
    // Os offsets sao em radianos somados a baseAngle = -π/2.
    registerOrbitaGameplayHook('buildSpawnBranches', function(payload){
      if (!payload || payload.handled) return payload;
      if (typeof zenMode !== 'undefined' && zenMode) return payload;
      if (typeof window.placeBranch !== 'function') return payload;

      const fromNode = payload.fromNode;
      if (!fromNode) return payload;

      // Reset do tracking de irmaos para esta nova rodada
      _currentSpawnSource = fromNode;
      _currentSpawnSiblings = [];

      const out = [];
      const rand = function(a, b){ return a + Math.random() * (b - a); };

      if (_isOnboarding()) {
        // Onboarding: phase ramp gradual mas SEM asteroides.
        // Replicamos a logica de game.js manualmente aqui pra poder
        // setar handled=true e skipar o bloco de asteroides original.
        const tg = (typeof totalGames === 'number') ? totalGames : 0;
        if (tg === 0) {
          // 1a partida: 2 nos (easy + medium) - bem gentil
          out.push(window.placeBranch(fromNode, 'easy',   rand(-0.9, -0.5)));
          out.push(window.placeBranch(fromNode, 'medium', rand( 0.5,  0.9)));
        } else if (tg === 1) {
          // 2a partida: 3 nos (easy + medium + hard)
          out.push(window.placeBranch(fromNode, 'easy',   rand(-1.1, -0.6)));
          out.push(window.placeBranch(fromNode, 'medium', rand(-0.25, 0.25)));
          out.push(window.placeBranch(fromNode, 'hard',   rand( 0.6,  1.1)));
        } else {
          // 3a partida: 3 nos com possibilidade de gold (sem asteroides)
          out.push(window.placeBranch(fromNode, 'easy',   rand(-1.1, -0.6)));
          out.push(window.placeBranch(fromNode, 'hard',   rand( 0.6,  1.1)));
          if (Math.random() < 0.25) {
            out.push(window.placeBranch(fromNode, 'gold',   rand(-0.25, 0.25)));
          } else {
            out.push(window.placeBranch(fromNode, 'medium', rand(-0.25, 0.25)));
          }
        }
      } else {
        // Pos-onboarding: leque fixo de 4 nos
        out.push(window.placeBranch(fromNode, 'easy',   -1.85 + (Math.random()-0.5)*0.30));  // verde
        out.push(window.placeBranch(fromNode, 'hard',   -0.55 + (Math.random()-0.5)*0.30));  // vermelho
        // Dourado: angulo quase reto pra cima
        const goldBranch = window.placeBranch(fromNode, 'gold', 0.08 + (Math.random()-0.5)*0.18);
        // Boost vertical pra subir mais ainda na tela
        const upBoost = Math.min(90, H * 0.09);
        const minY = fromNode.y - H * 0.45;
        goldBranch.y = Math.max(minY, goldBranch.y - upBoost);
        goldBranch.baseY = goldBranch.y;
        out.push(goldBranch);
        out.push(window.placeBranch(fromNode, 'medium',  1.40 + (Math.random()-0.5)*0.30));  // azul
      }

      // ASTEROIDES REMOVIDOS: eram RNG puro caindo na trajetoria.
      // Dificuldade agora vem 100% de skill (timing, escolha de no,
      // velocidade crescente, nos moveis/sumindo/teleportando).
      // O `handled: true` abaixo skipa o spawn original do game.js
      // (que pushaava asteroides em phase >= 4).

      payload.branches = out;
      payload.handled = true;
      return payload;
    });
  }

  // Wrap placeBranch pra (1) registrar a posicao final de cada irmao
  // logo apos a colocacao e (2) aplicar mecanicas randomicas de
  // mover/sumir em TODOS os tiers.
  // Probabilidades por tier:
  const NODE_DYNAMIC_RULES = {
    easy:   { move: 0.25, disappear: 0.15 },
    medium: { move: 0.35, disappear: 0.20 },
    hard:   { move: 0.25, disappear: 0.15 },  // reduzido pra vermelho ser menos imprevisivel
    gold:   { move: 0.30, disappear: 0.25 },
  };

  if (typeof window.placeBranch === 'function') {
    const _origPlaceBranch = window.placeBranch;
    window.placeBranch = function(fromNode, tier, angleOffset){
      const branch = _origPlaceBranch.apply(this, arguments);
      if (!branch) return branch;

      // Tracking de irmaos (igual antes)
      if (Number.isFinite(branch.x) && Number.isFinite(branch.y)) {
        if (fromNode !== _currentSpawnSource) {
          _currentSpawnSource = fromNode;
          _currentSpawnSiblings = [];
        }
        _currentSpawnSiblings.push({ x: branch.x, y: branch.y });
      }

      // Aplica mecanicas dinamicas randomicas (ignora zen e onboarding)
      if (typeof zenMode !== 'undefined' && zenMode) return branch;
      if (_isOnboarding()) return branch;

      const rules = NODE_DYNAMIC_RULES[tier] || NODE_DYNAMIC_RULES.medium;
      const roll = Math.random();
      // Mutuamente exclusivos: move OU disappear, nunca os dois,
      // pra nao ficar caotico demais.
      const wantMove = roll < rules.move;
      const wantDisappear = !wantMove && roll < (rules.move + rules.disappear);

      if (wantMove && !branch.moving) {
        branch.moving = true;
        branch.mSpeed = 1.2 + Math.random() * 1.4;          // 1.2..2.6 rad/s
        branch.mAngle = Math.random() * Math.PI * 2;
        branch.mRadius = 12 + Math.random() * 10;           // 12..22 px (cap do config)
        // baseX/baseY ja foi setado em placeBranch, mantemos
      }
      if (wantDisappear && !branch.disappearing) {
        branch.disappearing = true;
        branch.disappearTimer = 2.0 + Math.random() * 2.0;  // 2..4s
        branch.visible = true;
      }
      return branch;
    };
  }

  // ---------- 2c. CAMERA MAIS AFASTADA pra caber 3+ nos ----------
  // Sobrescreve getGameplayAutoZoomTarget pra reduzir o zoom (mais
  // afastado) sem perder o foco no no atual.
  if (typeof window.getGameplayAutoZoomTarget === 'function') {
    const _origZoom = window.getGameplayAutoZoomTarget;
    window.getGameplayAutoZoomTarget = function(isFlying){
      const baseZoom = _origZoom.apply(this, arguments);
      // Multiplica por 0.85 pra afastar a camera ~15%.
      const pulled = baseZoom * 0.85;
      // Limites mais permissivos pra deixar afastar mais em mobile.
      const minZoom = isFlying ? 0.58 : 0.62;
      const maxZoom = isFlying ? 0.82 : 0.92;
      return Math.max(minZoom, Math.min(maxZoom, pulled));
    };
  }

  // Patch reset() para nunca habilitar tutorial nem assistencia.
  if (typeof window.reset === 'function') {
    const _origReset = window.reset;
    window.reset = function(){
      const r = _origReset.apply(this, arguments);
      if (typeof tutorialStep !== 'undefined') tutorialStep = 0;
      if (typeof tutorialT !== 'undefined') tutorialT = 0;
      // Garante que power-ups fiquem zerados (sem escudo, magnet, slow-mo)
      if (typeof powerups !== 'undefined') powerups = [];
      if (typeof activeShield !== 'undefined') activeShield = false;
      if (typeof slowMoTimer !== 'undefined') slowMoTimer = 0;
      if (typeof magnetTimer !== 'undefined') magnetTimer = 0;
      // Timer de spawn em valor altissimo pra nunca disparar
      if (typeof powerupSpawnTimer !== 'undefined') powerupSpawnTimer = 1e9;
      return r;
    };
  }

  // Desativa o spawn de power-ups (escudo, slow-mo, magnet) por completo.
  if (typeof window.spawnPowerup === 'function') {
    window.spawnPowerup = function(){ /* disabled */ };
  }

  // Cleanup agressivo de nos CAPTURADOS que nao sao o atual.
  // Original limpa em W*2 (~780px) ou offscreen+180. Agente W*0.6
  // (~234px) pra remover capturados rapidamente da area de play.
  // Isso evita confusao visual com nos novos.
  if (typeof window.update === 'function') {
    const _origUpdate = window.update;
    window.update = function(dt){
      const r = _origUpdate.apply(this, arguments);
      try {
        if (Array.isArray(nodes) && typeof ball !== 'undefined' && ball) {
          const cleanupDist = Math.max(W, H) * 0.55;
          for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            if (!n || !n.captured) continue;
            if (i === ball.currentNode) continue;
            const d = Math.hypot(n.x - ball.x, n.y - ball.y);
            if (d > cleanupDist) {
              nodes.splice(i, 1);
              if (i < ball.currentNode) ball.currentNode--;
            }
          }
        }
      } catch(e) {}
      return r;
    };
  }

  // ---------- 3. PULAR LOADING / IR DIRETO PRO MENU MINIMAL ----------
  // Se a tela inicial estiver em loading/login, vai pra main.
  function forceSimpleMenu(){
    if (typeof menuScreen !== 'undefined' && menuScreen !== 'main') {
      menuScreen = 'main';
    }
  }
  // Roda algumas vezes ate carregamentos terminarem.
  let _bootForce = 0;
  const _bootInterval = setInterval(()=>{
    forceSimpleMenu();
    _bootForce++;
    if (_bootForce > 30) clearInterval(_bootInterval);
  }, 100);

  // ---------- 4. MENU MINIMAL: titulo + recorde + "TOQUE PARA JOGAR" ----------
  // Substitui completamente o roteador do shell de menu para nao mostrar
  // skins, fundos, ranking, settings, login, etc.
  window.orbitaMenuShell_drawMenuUI = function(){
    if (typeof menuBtnAreas !== 'undefined') menuBtnAreas = [];

    const t = (typeof menuT === 'number') ? menuT : 0;

    // Tamanhos responsivos
    const titleSize    = Math.max(40, Math.min(72, W * 0.18));
    const subtitleSize = Math.max(11, Math.min(14, W * 0.036));
    const labelSize    = Math.max(10, Math.min(12, W * 0.032));
    const recordSize   = Math.max(34, Math.min(52, W * 0.13));
    const tapSize      = Math.max(15, Math.min(20, W * 0.054));
    const streakSize   = Math.max(11, Math.min(13, W * 0.034));

    // ---------- 1. Campo de estrelas com twinkle ----------
    if (_menuStars) {
      for (let i = 0; i < _menuStars.length; i++) {
        const s = _menuStars[i];
        const tw = 0.5 + Math.sin(t * s.twinkleSpeed + s.phase) * 0.5;
        X.globalAlpha = s.baseAlpha * (0.4 + tw * 0.6);
        X.fillStyle = s.hue;
        X.beginPath();
        X.arc(s.x * W, s.y * H, s.size, 0, Math.PI * 2);
        X.fill();
      }
      X.globalAlpha = 1;
    }

    // ---------- 2. Demo orbit animado (acima do titulo) ----------
    const demoCx = W / 2;
    const demoCy = H * 0.18;
    const demoR = Math.max(30, Math.min(48, W * 0.11));
    const demoAng = t * 2.6;

    // Glow ambiente atras do nó
    const glowGrad = X.createRadialGradient(demoCx, demoCy, 0, demoCx, demoCy, demoR * 2.4);
    glowGrad.addColorStop(0, 'rgba(0,245,212,0.18)');
    glowGrad.addColorStop(1, 'rgba(0,245,212,0)');
    X.fillStyle = glowGrad;
    X.beginPath();
    X.arc(demoCx, demoCy, demoR * 2.4, 0, Math.PI * 2);
    X.fill();

    // Anel orbital (linha tracejada sutil)
    X.save();
    X.globalAlpha = 0.18;
    X.strokeStyle = '#ffffff';
    X.lineWidth = 1;
    X.setLineDash([3, 4]);
    X.beginPath();
    X.arc(demoCx, demoCy, demoR, 0, Math.PI * 2);
    X.stroke();
    X.setLineDash([]);
    X.restore();

    // Nó central
    X.save();
    X.shadowColor = '#00f5d4';
    X.shadowBlur = 14;
    const nodeGrad = X.createRadialGradient(demoCx-1, demoCy-1, 0, demoCx, demoCy, 8);
    nodeGrad.addColorStop(0, '#80ffff');
    nodeGrad.addColorStop(1, '#00b89a');
    X.fillStyle = nodeGrad;
    X.beginPath();
    X.arc(demoCx, demoCy, 7, 0, Math.PI * 2);
    X.fill();
    X.restore();

    // Trail orbitante
    for (let i = 0; i < 10; i++) {
      const ang = demoAng - i * 0.13;
      const al = (10 - i) / 10 * 0.55;
      X.globalAlpha = al;
      X.fillStyle = '#00f5d4';
      X.beginPath();
      X.arc(
        demoCx + Math.cos(ang) * demoR,
        demoCy + Math.sin(ang) * demoR,
        4 - i * 0.3, 0, Math.PI * 2
      );
      X.fill();
    }
    X.globalAlpha = 1;

    // Bola
    const bx = demoCx + Math.cos(demoAng) * demoR;
    const by = demoCy + Math.sin(demoAng) * demoR;
    X.save();
    X.shadowColor = '#ffffff';
    X.shadowBlur = 12;
    X.fillStyle = '#ffffff';
    X.beginPath();
    X.arc(bx, by, 5.5, 0, Math.PI * 2);
    X.fill();
    X.restore();

    // ---------- 3. TITULO "LAST ORBIT" em duas linhas (logotype) ----------
    // Linha 1: "LAST" pequeno, translucido, kerning largo (vibe sci-fi)
    // Linha 2: "ORBIT" gigante, gradiente forte, glow ciano (peso visual principal)
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    const titleY = H * 0.36;
    const titlePulse = 1 + Math.sin(t * 2.2) * 0.025;

    X.save();
    X.translate(W/2, titleY);
    X.scale(titlePulse, titlePulse);

    // ----- Linha 1: "LAST" sobrescrito -----
    const overSize = titleSize * 0.34;
    const overY = -titleSize * 0.55;
    X.save();
    X.globalAlpha = 0.72;
    X.fillStyle = '#80f5e8';
    X.font = '600 ' + overSize + 'px -apple-system, system-ui, sans-serif';
    X.shadowColor = '#00f5d4';
    X.shadowBlur = 10;
    // Letter-spacing largo pra "LAST" (estilo sci-fi)
    const overLetters = 'LAST'.split('');
    const overSpacing = overSize * 0.45;
    const overWidths = overLetters.map(l => X.measureText(l).width);
    const overTotalW = overWidths.reduce((a,b) => a+b, 0) + overSpacing * (overLetters.length - 1);
    let ocx = -overTotalW / 2;
    for (let i = 0; i < overLetters.length; i++) {
      X.fillText(overLetters[i], ocx + overWidths[i]/2, overY);
      ocx += overWidths[i] + overSpacing;
    }
    X.shadowBlur = 0;
    X.restore();

    // ----- Linha 2: "ORBIT" principal -----
    const mainY = titleSize * 0.05;
    const titleGrad = X.createLinearGradient(0, mainY - titleSize/2, 0, mainY + titleSize/2);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.5, '#80f5e8');
    titleGrad.addColorStop(1, '#00f5d4');

    X.shadowColor = '#00f5d4';
    X.shadowBlur = 24;
    X.fillStyle = titleGrad;
    X.font = 'bold ' + titleSize + 'px -apple-system, system-ui, sans-serif';

    const letters = 'ORBIT'.split('');
    const spacing = titleSize * 0.08;
    const widths = letters.map(l => X.measureText(l).width);
    const totalW = widths.reduce((a, b) => a + b, 0) + spacing * (letters.length - 1);
    let cx = -totalW / 2;
    for (let i = 0; i < letters.length; i++) {
      X.fillText(letters[i], cx + widths[i]/2, mainY);
      cx += widths[i] + spacing;
    }
    X.shadowBlur = 0;
    X.restore();

    // Linha decorativa abaixo do titulo (deslocada pra baixo pra acomodar 2 linhas)
    const lineY = titleY + titleSize * 0.72;
    const lineW = Math.min(W * 0.5, 220);
    X.save();
    X.globalAlpha = 0.35;
    const lineGrad = X.createLinearGradient(W/2 - lineW/2, lineY, W/2 + lineW/2, lineY);
    lineGrad.addColorStop(0, 'rgba(0,245,212,0)');
    lineGrad.addColorStop(0.5, 'rgba(0,245,212,1)');
    lineGrad.addColorStop(1, 'rgba(0,245,212,0)');
    X.strokeStyle = lineGrad;
    X.lineWidth = 1;
    X.beginPath();
    X.moveTo(W/2 - lineW/2, lineY);
    X.lineTo(W/2 + lineW/2, lineY);
    X.stroke();
    X.restore();

    // Subtitulo
    X.fillStyle = 'rgba(255,255,255,0.5)';
    X.font = subtitleSize + 'px -apple-system, system-ui, sans-serif';
    X.fillText(_t('subtitle'), W/2, lineY + subtitleSize * 1.2 + 4);

    // ---------- 4. Card de RECORDE com medalha ----------
    const bestVal = (typeof best === 'number') ? best : 0;
    const medal = _getFlappyMedal(bestVal);
    const cardW = Math.min(W * 0.78, 320);
    const cardH = Math.max(80, recordSize + 40);
    const cardX = (W - cardW) / 2;
    const cardY = H * 0.50;

    // Card BG
    X.fillStyle = 'rgba(0,0,0,0.55)';
    if (typeof roundRect === 'function') {
      roundRect(cardX, cardY, cardW, cardH, 12); X.fill();
    } else {
      X.fillRect(cardX, cardY, cardW, cardH);
    }
    // Borda dourada se tem medalha, branca discreta se nao
    X.strokeStyle = medal ? medal.color : 'rgba(255,255,255,0.18)';
    X.lineWidth = medal ? 1.8 : 1.2;
    if (medal) { X.shadowColor = medal.glow; X.shadowBlur = 10; }
    if (typeof roundRect === 'function') {
      roundRect(cardX, cardY, cardW, cardH, 12); X.stroke();
    } else {
      X.strokeRect(cardX, cardY, cardW, cardH);
    }
    X.shadowBlur = 0;

    // Conteudo do card: medalha (esq) + numero (centro/dir)
    const innerY = cardY + cardH / 2;
    if (medal) {
      X.font = (cardH * 0.55) + 'px sans-serif';
      X.textAlign = 'left';
      X.textBaseline = 'middle';
      X.fillText(medal.emoji, cardX + 18, innerY);

      // RECORDE label + value (deslocado pra direita pra dar espaco pra medalha)
      const textCx = cardX + cardW * 0.62;
      X.textAlign = 'center';
      X.fillStyle = 'rgba(255,255,255,0.55)';
      X.font = labelSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('record'), textCx, innerY - recordSize * 0.45);
      X.fillStyle = '#ffd32a';
      X.shadowColor = '#ffaa00';
      X.shadowBlur = 12;
      X.font = 'bold ' + recordSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(String(bestVal), textCx, innerY + recordSize * 0.18);
      X.shadowBlur = 0;
    } else {
      // Sem medalha: layout centralizado
      X.textAlign = 'center';
      X.textBaseline = 'middle';
      X.fillStyle = 'rgba(255,255,255,0.55)';
      X.font = labelSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('record'), W/2, innerY - recordSize * 0.45);
      X.fillStyle = '#ffd32a';
      X.shadowColor = '#ffaa00';
      X.shadowBlur = 12;
      X.font = 'bold ' + recordSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(String(bestVal), W/2, innerY + recordSize * 0.18);
      X.shadowBlur = 0;
    }

    // ---------- 5. Streak badge (apenas se >= 2) ----------
    let cursorY = cardY + cardH + 26;
    if (_menuDayStreak >= 2) {
      X.textAlign = 'center';
      X.textBaseline = 'middle';
      X.fillStyle = 'rgba(255,165,0,0.9)';
      X.shadowColor = '#ff8800';
      X.shadowBlur = 8;
      X.font = 'bold ' + streakSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('days_streak', { n: _menuDayStreak }), W/2, cursorY);
      X.shadowBlur = 0;
      cursorY += streakSize + 18;
    }

    // ---------- 6. CTA "TOQUE PARA JOGAR" ----------
    const blink = 0.55 + Math.sin(t * 3.5) * 0.35;
    const ctaY = H * 0.78;

    // Brackets pulsantes ao lado
    X.save();
    X.globalAlpha = blink;
    X.fillStyle = '#00f5d4';
    X.shadowColor = '#00f5d4';
    X.shadowBlur = 14;
    X.font = 'bold ' + tapSize + 'px -apple-system, system-ui, sans-serif';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText(_t('tap_to_play'), W/2, ctaY);
    X.shadowBlur = 0;
    X.restore();

    // Hint sutil de "toque em qualquer lugar"
    X.globalAlpha = 0.35;
    X.fillStyle = '#ffffff';
    X.font = (subtitleSize - 1) + 'px -apple-system, system-ui, sans-serif';
    X.fillText(_t('tap_anywhere'), W/2, ctaY + tapSize + 8);
    X.globalAlpha = 1;

    // ---------- Mute btn (canto superior direito) ----------
    X.globalAlpha = 0.55;
    X.fillStyle = '#fff';
    X.font = '20px sans-serif';
    X.textAlign = 'right';
    X.fillText((typeof muted !== 'undefined' && muted) ? '🔇' : '🔊', W - 16, 26);
    X.globalAlpha = 1;

    // ---------- Daltonismo btn (canto superior direito, ao lado do mute) ----------
    if (_colorBlindMode) {
      X.save();
      X.globalAlpha = 0.85;
      X.fillStyle = '#7bed9f';
      X.shadowColor = '#7bed9f';
      X.shadowBlur = 8;
      X.font = '18px sans-serif';
      X.textAlign = 'right';
      X.fillText('👁', W - 60, 26);
      X.restore();
    } else {
      X.globalAlpha = 0.30;
      X.fillStyle = '#ffffff';
      X.font = '18px sans-serif';
      X.textAlign = 'right';
      X.fillText('👁', W - 60, 26);
      X.globalAlpha = 1;
    }

    // ---------- Lang toggle btn (top-right, esquerda do daltonismo) ----------
    X.save();
    X.globalAlpha = 0.55;
    X.fillStyle = '#ffffff';
    X.font = 'bold 12px -apple-system, system-ui, sans-serif';
    X.textAlign = 'right';
    X.textBaseline = 'middle';
    X.fillText('🌐 ' + _t('lang_label'), W - 100, 26);
    X.restore();

    // ---------- Toast "Toque novamente pra sair" (back button armado) ----------
    if (_backArmed) {
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const elapsed = now - _backArmedT;
      if (elapsed < BACK_EXIT_WINDOW_MS) {
        const rem = (BACK_EXIT_WINDOW_MS - elapsed) / BACK_EXIT_WINDOW_MS; // 1.0 → 0.0
        const fade = rem < 0.2 ? (rem / 0.2) : 1;  // fade out nos ultimos 400ms
        const toastW = Math.min(W * 0.86, 320);
        const toastH = 52;
        const toastX = (W - toastW) / 2;
        const toastY = H - toastH - 80;

        X.save();
        X.globalAlpha = 0.92 * fade;
        X.fillStyle = 'rgba(20,8,30,0.95)';
        if (typeof roundRect === 'function') { roundRect(toastX, toastY, toastW, toastH, 12); X.fill(); }
        else X.fillRect(toastX, toastY, toastW, toastH);
        X.strokeStyle = '#ff6b9d';
        X.lineWidth = 1.5;
        X.shadowColor = '#ff3377';
        X.shadowBlur = 12;
        if (typeof roundRect === 'function') { roundRect(toastX, toastY, toastW, toastH, 12); X.stroke(); }
        X.shadowBlur = 0;

        X.fillStyle = '#ffffff';
        X.font = 'bold 13px -apple-system, system-ui, sans-serif';
        X.textAlign = 'center';
        X.textBaseline = 'middle';
        X.fillText(_t('back_to_exit'), W/2, toastY + toastH/2 - 2);

        // Barra de tempo restante na base do toast
        X.fillStyle = '#ff6b9d';
        X.fillRect(toastX + 4, toastY + toastH - 4, (toastW - 8) * rem, 2);
        X.restore();
      } else {
        // Janela expirou - desarma silenciosamente
        _backArmed = false;
      }
    }

    // ---------- Debug btn (canto superior esquerdo) ----------
    // Em PROD: completamente oculto. Soh aparece em dev (localhost).
    // Quando OFF: emoji bem fraco (precisa procurar)
    // Quando ON: glow vermelho + label
    if (!_IS_PROD) {
      if (_debugMode) {
        X.save();
        X.globalAlpha = 0.85;
        X.fillStyle = '#ff5577';
        X.shadowColor = '#ff0044';
        X.shadowBlur = 10;
        X.font = '18px sans-serif';
        X.textAlign = 'left';
        X.fillText('🧪', 14, 26);
        X.font = 'bold 11px -apple-system, system-ui, sans-serif';
        X.fillText(_t('debug_label'), 38, 27);
        X.restore();
      } else {
        X.globalAlpha = 0.18;
        X.fillStyle = '#ffffff';
        X.font = '18px sans-serif';
        X.textAlign = 'left';
        X.fillText('🧪', 14, 26);
        X.globalAlpha = 1;
      }
    }

    // Banner central pulsante quando debug ON (avisa que nao morre).
    // Tambem ocultado em prod (mas _debugMode ja e' false em prod, redundancia segura).
    if (_debugMode && !_IS_PROD) {
      const bannerPulse = 0.7 + Math.sin(t * 4) * 0.3;
      X.save();
      X.globalAlpha = bannerPulse;
      X.fillStyle = '#ff5577';
      X.shadowColor = '#ff0044';
      X.shadowBlur = 12;
      X.font = 'bold ' + streakSize + 'px -apple-system, system-ui, sans-serif';
      X.textAlign = 'center';
      X.fillText(_t('debug_banner_menu'), W/2, H * 0.91);
      X.restore();
    }

    // ---------- Hit areas ----------
    if (typeof menuBtnAreas !== 'undefined') {
      // Debug btn (top-left) - PRIMEIRO pra ter prioridade.
      // Em PROD: NAO registra hit area (botao nao existe + tap nada faz).
      if (!_IS_PROD) {
        menuBtnAreas.push({
          x: 0, y: 4, w: 90, h: 44,
          action: function(){
            _toggleDebug();
          }
        });
      }
      // Lang toggle btn (top-right, esquerda do daltonismo)
      menuBtnAreas.push({
        x: W - 140, y: 4, w: 50, h: 44,
        action: function(){
          _cycleLang();
        }
      });
      // Daltonismo btn (top-right, esquerda do mute)
      menuBtnAreas.push({
        x: W - 90, y: 4, w: 40, h: 44,
        action: function(){
          _toggleColorBlind();
        }
      });
      // Speaker btn (top-right): abre painel de volume com sliders.
      // Tap longo (>500ms) faz toggle mute direto. Tap normal abre painel.
      let _speakerDownT = 0;
      menuBtnAreas.push({
        x: W - 50, y: 4, w: 50, h: 44,
        action: function(){
          // Painel de audio (se disponivel) - abertura padrao
          if (window.OrbitaAudioPanel && typeof window.OrbitaAudioPanel.open === 'function') {
            window.OrbitaAudioPanel.open();
          } else if (typeof toggleMute === 'function') {
            // Fallback se painel nao carregou: toggle mute direto
            toggleMute();
          }
        }
      });
      // Tap-anywhere = play
      menuBtnAreas.push({
        x: 0, y: 50, w: W, h: H - 50,
        action: function(){
          if (typeof startRun === 'function') startRun(false, 'tap_anywhere');
        }
      });
    }
  };

  // Bloquear roteamento alternativo caso outros patches restaurem.
  window.orbitaMenuShell_drawMainMenu = window.orbitaMenuShell_drawMenuUI;

  // ---------- DALTONISMO: marcadores de forma sobre os nos ----------
  // Aplicado no espaco do mundo (com cam offset + zoom). Chamado de
  // dentro do drawPlayUIModule, que roda em screen-space, entao
  // restauramos manualmente o zoom/pan.
  function _drawColorBlindMarkers(){
    if (!_colorBlindMode) return;
    if (typeof nodes === 'undefined' || !Array.isArray(nodes)) return;
    if (typeof cam === 'undefined') return;

    X.save();
    const z = cam.zoom || 1;
    if (z !== 1) {
      X.translate(W/2, H/2);
      X.scale(z, z);
      X.translate(-W/2, -H/2);
    }

    for (const n of nodes) {
      if (!n) continue;
      if (n.captured) continue;
      if (n.visible === false) continue;
      if (!n.tier) continue;

      const nx = n.x - cam.x;
      const ny = n.y - cam.y;
      const r = n.nodeR || 12;

      X.save();
      X.translate(nx, ny);
      // Anel branco em volta do no (acessibilidade primaria - todos os tiers)
      X.strokeStyle = 'rgba(255,255,255,0.92)';
      X.lineWidth = 2.4;
      X.shadowColor = 'rgba(0,0,0,0.9)';
      X.shadowBlur = 4;
      X.beginPath();
      X.arc(0, 0, r * 1.45, 0, Math.PI * 2);
      X.stroke();

      // Marcador FILLED (forma diferente por tier) com outline preto pra contraste
      X.fillStyle = '#ffffff';
      X.strokeStyle = 'rgba(0,0,0,0.85)';
      X.lineWidth = 1.5;
      X.lineCap = 'round';
      X.lineJoin = 'round';

      if (n.tier === 'easy') {
        // CIRCULO solido (verde +1)
        const s = r * 0.42;
        X.beginPath();
        X.arc(0, 0, s, 0, Math.PI * 2);
        X.fill();
        X.stroke();
      } else if (n.tier === 'medium') {
        // TRIANGULO solido apontando pra cima (vermelho +3)
        const s = r * 0.62;
        X.beginPath();
        X.moveTo(0, -s);
        X.lineTo(s * 0.866, s * 0.5);
        X.lineTo(-s * 0.866, s * 0.5);
        X.closePath();
        X.fill();
        X.stroke();
      } else if (n.tier === 'hard') {
        // QUADRADO solido (azul +2)
        const s = r * 0.45;
        X.beginPath();
        X.rect(-s, -s, s * 2, s * 2);
        X.fill();
        X.stroke();
      } else if (n.tier === 'gold') {
        // ESTRELA solida 4 pontas (dourado +6)
        const sl = r * 0.72;
        const ss = r * 0.22;
        X.beginPath();
        X.moveTo(0, -sl);
        X.lineTo(ss, -ss);
        X.lineTo(sl, 0);
        X.lineTo(ss, ss);
        X.lineTo(0, sl);
        X.lineTo(-ss, ss);
        X.lineTo(-sl, 0);
        X.lineTo(-ss, -ss);
        X.closePath();
        X.fill();
        X.stroke();
      }
      X.restore();
    }

    X.restore();
  }

  // ---------- 5. PLAY UI MINIMAL: so score grande, sem fase/combo/missao ----------
  window.drawPlayUIModule = function(){
    // Marcadores de daltonismo PRIMEIRO (no espaço do mundo)
    _drawColorBlindMarkers();

    X.textAlign = 'center';
    X.textBaseline = 'top';

    // Score gigante estilo Flappy - escala com largura
    const scoreSize = Math.max(40, Math.min(64, W * 0.14));
    const topY = Math.max(24, H * 0.05);

    X.fillStyle = 'rgba(0,0,0,0.35)';
    X.font = 'bold ' + scoreSize + 'px -apple-system, system-ui, sans-serif';
    X.fillText(String(typeof score==='number'?score:0), W/2 + 3, topY + 2);
    X.fillStyle = '#ffffff';
    X.shadowColor = '#000';
    X.shadowBlur = 8;
    X.fillText(String(typeof score==='number'?score:0), W/2, topY);
    X.shadowBlur = 0;

    // Badge DEBUG (SEM MORTE) - quando testMode ativo
    if (typeof testMode !== 'undefined' && testMode) {
      const t = (typeof menuT === 'number') ? menuT : 0;
      const pulse = 0.65 + Math.sin(t * 5) * 0.35;
      X.save();
      X.globalAlpha = pulse;
      X.fillStyle = '#ff5577';
      X.shadowColor = '#ff0044';
      X.shadowBlur = 10;
      X.font = 'bold 12px -apple-system, system-ui, sans-serif';
      X.textAlign = 'center';
      X.textBaseline = 'top';
      X.fillText(_t('sem_morte_label'), W/2, topY + scoreSize + 4);
      X.restore();
    }

    // ---------- ONBOARDING HINT (1a partida, antes de soltar) ----------
    if (_tapHintVisible && typeof ball !== 'undefined' && ball && ball.orbiting) {
      const t = (typeof menuT === 'number') ? menuT : 0;
      const pulse = 0.55 + Math.sin(t * 3.2) * 0.45;
      const bounceY = Math.sin(t * 4) * 6;
      const hintY = H * 0.42;
      const hintSize = Math.max(20, Math.min(28, W * 0.075));
      const subSize  = Math.max(13, Math.min(16, W * 0.042));

      // BG semitransparente atras pra destacar o hint
      X.save();
      X.globalAlpha = 0.35;
      X.fillStyle = '#000000';
      X.fillRect(0, hintY - hintSize, W, hintSize * 4);
      X.restore();

      // Texto principal
      X.save();
      X.globalAlpha = pulse;
      X.fillStyle = '#00f5d4';
      X.shadowColor = '#00f5d4';
      X.shadowBlur = 16;
      X.font = 'bold ' + hintSize + 'px -apple-system, system-ui, sans-serif';
      X.textAlign = 'center';
      X.textBaseline = 'middle';
      X.fillText(_t('tap_to_release'), W/2, hintY);
      X.shadowBlur = 0;
      X.restore();

      // Emoji de mao animada (bounce vertical)
      X.save();
      X.font = (hintSize * 1.3) + 'px sans-serif';
      X.textAlign = 'center';
      X.textBaseline = 'middle';
      X.fillText('👆', W/2, hintY + hintSize + 14 + bounceY);
      X.restore();

      // Subtexto explicando
      X.save();
      X.globalAlpha = 0.75;
      X.fillStyle = '#ffffff';
      X.font = subSize + 'px -apple-system, system-ui, sans-serif';
      X.textAlign = 'center';
      X.textBaseline = 'middle';
      X.fillText(_t('release_hint_1'), W/2, hintY + hintSize * 2 + 30);
      X.fillText(_t('release_hint_2'), W/2, hintY + hintSize * 2 + 30 + subSize + 4);
      X.restore();
    }

    // Hint pequeno nas partidas 2 e 3 (encorajamento sem bloquear visao)
    if (!_tapHintVisible && _isOnboarding() && typeof totalGames === 'number' && totalGames > 0) {
      const t = (typeof menuT === 'number') ? menuT : 0;
      const fade = 0.55 + Math.sin(t * 2) * 0.20;
      X.save();
      X.globalAlpha = fade;
      X.fillStyle = '#7bed9f';
      X.font = 'bold 11px -apple-system, system-ui, sans-serif';
      X.textAlign = 'center';
      X.textBaseline = 'top';
      const remaining = 3 - totalGames;
      const trainKey = remaining === 1 ? 'training_match_singular' : 'training_match_plural';
      X.fillText(_t(trainKey, { n: remaining }), W/2, topY + scoreSize + 6);
      X.restore();
    }

    // Pause btn
    if (typeof drawPauseBtn === 'function') drawPauseBtn();
  };

  // ---------- 6. DEATH SCREEN MINIMAL + REINICIO INSTANTANEO ----------
  // Tempo minimo antes de aceitar tap pra reiniciar (em segundos).
  const RETRY_DELAY = 0.18;

  window.drawDeadUIModule = function(){
    if (typeof menuBtnAreas !== 'undefined') menuBtnAreas = [];

    const dt = (typeof deathT === 'number') ? deathT : 0;
    const oa = Math.min(dt * 3.0, 0.72);
    X.globalAlpha = oa;
    X.fillStyle = '#000';
    X.fillRect(-10, -10, W + 20, H + 20);
    X.globalAlpha = 1;

    // ---------- NEAR-MISS VISUAL ("voce era pra ter pego") ----------
    // Desenha por cima do dim, abaixo do card de morte. Ring pulsante
    // no no que ficou faltando + linha pontilhada da bola ate o no.
    if (_nearMissData && dt > 0.15 && typeof cam !== 'undefined') {
      const nm = _nearMissData;
      const nx = nm.nodeX - cam.x;
      const ny = nm.nodeY - cam.y;
      const bx = nm.ballX - cam.x;
      const by = nm.ballY - cam.y;
      const tNow = (typeof menuT === 'number') ? menuT : 0;
      const pulse = 0.5 + Math.sin(tNow * 8) * 0.35;
      const fade = Math.min((dt - 0.15) * 3, 1);

      // Linha pontilhada da bola ao no (mostra o "quase")
      X.save();
      X.globalAlpha = fade * 0.55 * pulse;
      X.strokeStyle = '#ff5577';
      X.lineWidth = 2;
      X.setLineDash([6, 5]);
      X.beginPath();
      X.moveTo(bx, by);
      X.lineTo(nx, ny);
      X.stroke();
      X.setLineDash([]);
      X.restore();

      // Ring pulsante no captureR do no
      X.save();
      X.globalAlpha = fade * (0.55 + pulse * 0.4);
      X.strokeStyle = '#ff3366';
      X.shadowColor = '#ff0044';
      X.shadowBlur = 18;
      X.lineWidth = 3;
      X.beginPath();
      X.arc(nx, ny, nm.captureR + 4 + pulse * 5, 0, Math.PI*2);
      X.stroke();
      X.shadowBlur = 0;
      X.restore();

      // Marker da bola (onde voce estava)
      X.save();
      X.globalAlpha = fade * 0.85;
      X.fillStyle = '#ffffff';
      X.shadowColor = '#ff5577';
      X.shadowBlur = 10;
      X.beginPath();
      X.arc(bx, by, 5, 0, Math.PI*2);
      X.fill();
      X.shadowBlur = 0;
      X.restore();

      // Texto "QUASE!" flutuando acima do no
      const labelSize = Math.max(14, Math.min(20, W * 0.05));
      X.save();
      X.globalAlpha = fade * (0.7 + pulse * 0.3);
      X.fillStyle = '#ff5577';
      X.shadowColor = '#ff0044';
      X.shadowBlur = 14;
      X.font = 'bold ' + labelSize + 'px -apple-system, system-ui, sans-serif';
      X.textAlign = 'center';
      X.textBaseline = 'middle';
      X.fillText(_t('near_miss_text'), nx, ny - nm.captureR - 18 - pulse * 4);
      X.shadowBlur = 0;
      X.restore();
    }

    if (dt < 0.10) return;

    const f = Math.min((dt - 0.10) * 4, 1);
    X.globalAlpha = f;
    X.textAlign = 'center';
    X.textBaseline = 'middle';

    // Tamanhos responsivos
    const titleSize  = Math.max(34, Math.min(56, W * 0.14));
    const scoreSize  = Math.max(28, Math.min(42, W * 0.105));
    const recSize    = Math.max(18, Math.min(24, W * 0.062));
    const medalSize  = Math.max(28, Math.min(38, W * 0.10));
    const labelSize  = Math.max(10, Math.min(12, W * 0.032));
    const hintSize   = Math.max(13, Math.min(16, W * 0.042));
    const bannerSize = Math.max(16, Math.min(22, W * 0.058));
    const statSize   = Math.max(12, Math.min(14, W * 0.038));
    const phraseSize = Math.max(13, Math.min(17, W * 0.044));

    // ---------- TITULO "MORREU" ----------
    X.fillStyle = '#ff5a5a';
    X.shadowColor = '#ff0033';
    X.shadowBlur = 18;
    X.font = 'bold ' + titleSize + 'px -apple-system, system-ui, sans-serif';
    X.fillText(_t('morreu'), W/2, H*0.13);
    X.shadowBlur = 0;

    // Snapshot dos valores
    const sc = (typeof score==='number') ? score : 0;
    const bs = (typeof best==='number') ? best : 0;
    const medal = _getFlappyMedal(sc);
    const progressPct = bs > 0 ? Math.min(sc / bs, 1) : 0;
    const captures = _captureCount || 0;
    const durationS = _runDurationS || 0;
    const maxComboVal = _runMaxCombo || 0;

    // ---------- CARD GRANDE: PONTOS / RECORDE / MEDAL / PROGRESS BAR ----------
    const cardW = Math.min(W*0.86, 340);
    const cardYStart = H * 0.19;
    const padTop = 18;
    const ptsBlockH = scoreSize * 1.0 + 18;     // label + value
    const recBlockH = recSize * 1.0 + 16;        // label + value
    const medalBlockH = medal ? (medalSize + 22) : 0;
    const barBlockH = bs > 0 ? 26 : 0;
    const cardH = Math.max(170, padTop + ptsBlockH + recBlockH + medalBlockH + barBlockH + 18);
    const cardX = (W - cardW)/2;
    const cardY = cardYStart;

    X.fillStyle = 'rgba(0,0,0,0.7)';
    if (typeof roundRect === 'function') {
      roundRect(cardX, cardY, cardW, cardH, 14); X.fill();
    } else {
      X.fillRect(cardX, cardY, cardW, cardH);
    }
    X.strokeStyle = newRec ? 'rgba(255,215,42,0.6)' : 'rgba(255,255,255,0.18)';
    X.lineWidth = newRec ? 2.5 : 1.5;
    if (newRec) { X.shadowColor = '#ffd32a'; X.shadowBlur = 14; }
    if (typeof roundRect === 'function') {
      roundRect(cardX, cardY, cardW, cardH, 14); X.stroke();
    } else {
      X.strokeRect(cardX, cardY, cardW, cardH);
    }
    X.shadowBlur = 0;

    // PONTOS
    let cursorY = cardY + padTop + 4;
    X.fillStyle = 'rgba(255,255,255,0.55)';
    X.font = labelSize + 'px -apple-system, system-ui, sans-serif';
    X.fillText(_t('points'), W/2, cursorY);
    cursorY += labelSize + 4;
    X.fillStyle = '#fff';
    X.shadowColor = '#b0b0ff';
    X.shadowBlur = 10;
    X.font = 'bold ' + scoreSize + 'px -apple-system, system-ui, sans-serif';
    X.fillText(String(sc), W/2, cursorY + scoreSize*0.5);
    X.shadowBlur = 0;
    cursorY += scoreSize + 12;

    // RECORDE
    X.fillStyle = 'rgba(255,255,255,0.55)';
    X.font = labelSize + 'px -apple-system, system-ui, sans-serif';
    X.fillText(_t('record'), W/2, cursorY);
    cursorY += labelSize + 4;
    X.fillStyle = '#ffd32a';
    X.shadowColor = '#ffaa00';
    X.shadowBlur = newRec ? 12 : 6;
    X.font = 'bold ' + recSize + 'px -apple-system, system-ui, sans-serif';
    X.fillText(String(bs), W/2, cursorY + recSize*0.5);
    X.shadowBlur = 0;
    cursorY += recSize + 14;

    // MEDALHA (apenas se score >= 10)
    if (medal) {
      const popScale = 1 + Math.sin(Math.min((dt - 0.2) * 3, Math.PI)) * 0.2;
      X.save();
      X.translate(W/2 - 70, cursorY + medalSize*0.5);
      X.scale(popScale, popScale);
      X.font = medalSize + 'px sans-serif';
      X.textAlign = 'center';
      X.textBaseline = 'middle';
      X.fillText(medal.emoji, 0, 0);
      X.restore();

      X.fillStyle = medal.color;
      X.shadowColor = medal.glow;
      X.shadowBlur = 12;
      X.font = 'bold ' + (medalSize*0.55) + 'px -apple-system, system-ui, sans-serif';
      X.textAlign = 'left';
      X.fillText(medal.name, W/2 - 40, cursorY + medalSize*0.5);
      X.textAlign = 'center';
      X.shadowBlur = 0;
      cursorY += medalSize + 14;
    }

    // BARRA DE PROGRESSO score/best
    if (bs > 0) {
      const barW = cardW - 40;
      const barH = 8;
      const barX = cardX + 20;
      const barY = cursorY + 4;
      // fundo
      X.fillStyle = 'rgba(255,255,255,0.10)';
      if (typeof roundRect === 'function') { roundRect(barX, barY, barW, barH, 4); X.fill(); }
      else X.fillRect(barX, barY, barW, barH);
      // preenchido
      const fillW = barW * progressPct;
      const grad = X.createLinearGradient(barX, barY, barX + barW, barY);
      if (newRec || progressPct >= 1) {
        grad.addColorStop(0, '#ffd32a'); grad.addColorStop(1, '#ffaa00');
      } else if (progressPct >= 0.85) {
        grad.addColorStop(0, '#ff6b9d'); grad.addColorStop(1, '#ff3377');
      } else {
        grad.addColorStop(0, '#00f5d4'); grad.addColorStop(1, '#70a1ff');
      }
      X.fillStyle = grad;
      if (typeof roundRect === 'function') { roundRect(barX, barY, fillW, barH, 4); X.fill(); }
      else X.fillRect(barX, barY, fillW, barH);
      // pct text
      X.fillStyle = 'rgba(255,255,255,0.65)';
      X.font = (labelSize-1) + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('record_pct', { n: Math.round(progressPct * 100) }), W/2, barY + barH + labelSize - 1);
    }

    // ---------- BANNER ABAIXO DO CARD ----------
    const bannerY = cardY + cardH + 24;
    if (typeof newRec !== 'undefined' && newRec) {
      const pulse = 0.7 + Math.sin((typeof menuT==='number'?menuT:0) * 5) * 0.3;
      X.globalAlpha = f * pulse;
      X.fillStyle = '#ffd32a';
      X.shadowColor = '#ff0';
      X.shadowBlur = 18;
      X.font = 'bold ' + bannerSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('new_record_banner'), W/2, bannerY);
      X.shadowBlur = 0;
      X.globalAlpha = f;
    }

    // ---------- STATS ROW (3 mini items) ----------
    const statsY = bannerY + (newRec ? bannerSize + 18 : 8);
    const statSlotW = cardW / 3;
    const nodesKey = captures === 1 ? 'nodes_singular' : 'nodes_plural';
    const statsItems = [
      { icon: '⏱', value: _t('seconds_short', { n: durationS.toFixed(1) }) },
      { icon: '⚡', value: _t(nodesKey, { n: captures }) },
      { icon: '🔥', value: _t('combo_x', { n: maxComboVal }) }
    ];
    for (let i = 0; i < statsItems.length; i++) {
      const cx = cardX + statSlotW * i + statSlotW/2;
      X.fillStyle = 'rgba(255,255,255,0.85)';
      X.font = (statSize + 2) + 'px sans-serif';
      X.fillText(statsItems[i].icon, cx, statsY);
      X.fillStyle = 'rgba(255,255,255,0.65)';
      X.font = 'bold ' + statSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(statsItems[i].value, cx, statsY + statSize + 6);
    }

    // ---------- STREAK (apenas se >= 2 dias seguidos) ----------
    const streakY = statsY + statSize + 28;
    if (_currentDayStreak >= 2) {
      X.fillStyle = 'rgba(255,165,0,0.9)';
      X.shadowColor = '#ff8800';
      X.shadowBlur = 8;
      X.font = 'bold ' + (statSize + 1) + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('days_streak', { n: _currentDayStreak }), W/2, streakY);
      X.shadowBlur = 0;
    }

    // ---------- FRASE ALEATORIA ----------
    const phraseY = streakY + (_currentDayStreak >= 2 ? 26 : 0);
    if (_currentDeathPhrase) {
      X.fillStyle = 'rgba(255,255,255,0.55)';
      X.font = 'italic ' + phraseSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText('"' + _currentDeathPhrase + '"', W/2, phraseY);
    }

    // Hint reiniciar - sempre encostado no rodape com margem
    if (dt > RETRY_DELAY) {
      const hintBlink = 0.5 + Math.sin((typeof menuT==='number'?menuT:0) * 4) * 0.35;
      X.globalAlpha = f * hintBlink;
      X.fillStyle = '#00f5d4';
      X.font = 'bold ' + hintSize + 'px -apple-system, system-ui, sans-serif';
      X.fillText(_t('tap_to_retry'), W/2, H - 32);
      X.globalAlpha = f;
    }

    X.globalAlpha = 1;
  };

  // ---------- 7. TAP NA TELA DE MORTE = REINICIA INSTANTANEO ----------
  // Sobrescreve handleTap (definido em game.js) para:
  //  - reiniciar com delay minimo
  //  - tap em qualquer lugar do menu inicial = play
  if (typeof window.handleTap === 'function') {
    const _origHandleTap = window.handleTap;
    window.handleTap = function(x, y){
      if (typeof initAudio === 'function') initAudio();

      // Mute btn comum a todos os estados
      if (typeof isMuteBtnTap === 'function' &&
          (state===ST.PLAY||state===ST.PAUSE||state===ST.MENU||state===ST.DEAD) &&
          isMuteBtnTap(x, y)) {
        if (typeof toggleMute === 'function') toggleMute();
        return;
      }

      // Pause durante play
      if (state===ST.PLAY && typeof isPauseBtnTap === 'function' && isPauseBtnTap(x, y)) {
        state = ST.PAUSE;
        try { window._prePauseSceneLevel = (typeof musicSceneLevel === 'number') ? musicSceneLevel : 0.12; } catch(e) {}
        if (typeof setMusicVolume === 'function') setMusicVolume(0.05);
        return;
      }

      // Pause screen continua usando botoes
      if (state === ST.PAUSE) {
        for (const b of menuBtnAreas) {
          if (x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) { b.action(); return; }
        }
        return;
      }

      // Tela de morte: reinicio instantaneo
      if (state === ST.DEAD) {
        // Botao print primeiro
        for (const b of menuBtnAreas) {
          if (x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) { b.action(); return; }
        }
        const dt = (typeof deathT === 'number') ? deathT : 0;
        if (dt > RETRY_DELAY && typeof quickRestartGame === 'function') {
          quickRestartGame('tap_dead');
        }
        return;
      }

      // Menu: tap em qualquer lugar joga (botoes injetados pelo nosso draw)
      if (state === ST.MENU) {
        // Desarma o exit-prompt do back button - usuario interagiu
        _backArmed = false;
        for (const b of menuBtnAreas) {
          if (x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) { b.action(x,y); return; }
        }
        // Fallback absoluto: se nada bateu, joga.
        if (typeof startRun === 'function') startRun(false, 'fallback_tap');
        return;
      }

      // Play
      if (state === ST.PLAY && typeof release === 'function') release();
    };
  }

  // ---------- 8. NEUTRALIZAR RANKING / UNLOCKS / MISSOES ----------
  // submitScore vira no-op pra remover sincronizacao com servidor.
  if (typeof window.submitScore === 'function') {
    window.submitScore = function(){ return Promise.resolve(null); };
  }

  // Apaga pendingUnlocks/pendingAchievements logo apos die() pra
  // garantir que nenhum banner de skin/missao apareca.
  // Tambem captura o no mais proximo (near-miss) e amplifica o
  // shake/flash pra reforcar a punicao operante.
  if (typeof window.die === 'function') {
    const _origDie = window.die;
    window.die = function(){
      // ---------- ANTI-CHEAT: clampa score se foi manipulado ----------
      // Se o score atual for maior que o esperado (capturas legitimas
      // + bonus tracked), alguem inflou via console. Clampamos pra
      // _expectedScore antes de _origDie atualizar best.
      try {
        if (typeof score === 'number' && score > _expectedScore) {
          const overshoot = score - _expectedScore;
          // Tolerancia de 1 pra arredondamentos
          if (overshoot > 1) {
            console.warn('[orbita] score sanity check failed:', score,
                         '(expected ' + _expectedScore + ')');
            _crumb('anti-cheat', 'score_clamped', {
              actual: score,
              expected: _expectedScore,
              overshoot: overshoot
            });
            score = _expectedScore;
            _cheatFlagged = true;
          }
        }
      } catch(e) {}

      // Calcula near-miss ANTES de morrer (state ainda eh PLAY)
      try {
        _nearMissData = null;
        if (Array.isArray(nodes) && typeof ball !== 'undefined' && ball) {
          let closestD = Infinity;
          let closest = null;
          for (const n of nodes) {
            if (!n || n.captured || n.visible === false) continue;
            const d = Math.hypot(ball.x - n.x, ball.y - n.y);
            if (d < closestD) { closestD = d; closest = n; }
          }
          if (closest) {
            const cr = closest.captureR || 50;
            const overshoot = closestD - cr;
            if (overshoot >= 0 && overshoot < cr * NEAR_MISS_MAX_OVERSHOOT) {
              _nearMissData = {
                nodeX: closest.x,
                nodeY: closest.y,
                captureR: cr,
                ballX: ball.x,
                ballY: ball.y,
                tier: closest.tier,
                distance: closestD
              };
            }
          }
        }
      } catch(e) {}

      const r = _origDie.apply(this, arguments);

      // Punicao mais sharp: shake/flash extra, vibracao mais agressiva
      try {
        if (typeof shakeT !== 'undefined') shakeT = Math.max(shakeT, 0.55);
        if (typeof shakeA !== 'undefined') shakeA = Math.max(shakeA, 16);
        if (typeof flashA !== 'undefined') flashA = Math.max(flashA, 0.55);
        if (typeof vibrate === 'function') {
          // Padrao mais visceral: 3 pulsos curtos + 1 longo
          if (typeof newRec !== 'undefined' && newRec) {
            vibrate([90, 50, 90]); // record - mais positivo
          } else {
            vibrate([55, 25, 35, 25, 110]); // morte normal - mais punitivo
          }
        }
      } catch(e) {}

      try {
        if (typeof pendingUnlocks !== 'undefined') pendingUnlocks = [];
        if (typeof pendingAchievements !== 'undefined') pendingAchievements = [];
      } catch(e) {}

      // ---------- Snapshot pra tela de morte ----------
      try {
        const nowT = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        _runDurationS = _runStartT ? Math.max(0, Math.round((nowT - _runStartT) / 100) / 10) : 0;
        _runMaxCombo = (typeof maxCombo === 'number') ? maxCombo : 0;
        _currentDeathPhrase = _pickContextualPhrase();
        try {
          _currentDayStreak = parseInt(localStorage.getItem('orbita_day_streak') || '1', 10) || 1;
        } catch(e) { _currentDayStreak = 1; }
        _crumb('gameplay', 'die', {
          score: typeof score === 'number' ? score : 0,
          best: typeof best === 'number' ? best : 0,
          newRec: typeof newRec !== 'undefined' && !!newRec,
          duration: _runDurationS,
          captures: _captureCount,
          maxCombo: _runMaxCombo,
          nearMiss: !!_nearMissData
        });
      } catch(e) {}

      // ---------- Analytics: game_end (retencao/engajamento) ----------
      try {
        if (typeof trackEvent === 'function' && state === ST.DEAD) {
          const eventPayload = {
            anon_id: ANON_ID,
            score: typeof score === 'number' ? score : 0,
            best: typeof best === 'number' ? best : 0,
            new_record: typeof newRec !== 'undefined' && !!newRec,
            duration_s: _runDurationS,
            captures: _captureCount,
            max_combo: _runMaxCombo,
            had_near_miss: !!_nearMissData,
            near_miss_tier: _nearMissData ? _nearMissData.tier : null,
            cheat_flagged: _cheatFlagged,
            // Bot detection (server-side rejeita score se score >= 4)
            bot_score: _botSignals.score,
            bot_reasons: _botSignals.reasons,
            is_likely_bot: _isLikelyBot()
          };
          // Assinatura HMAC-like pra validacao server-side futura
          eventPayload._sig = _signEvent(eventPayload);
          trackEvent('game_end', eventPayload);
        }
      } catch(e) {}

      return r;
    };
  }

  // ---------- BÔNUS ALEATORIO em capturas (recompensa variavel) ----------
  // 4% mega bonus (5x), 11% bonus (2x). Reforço positivo intermitente
  // que aumenta engajamento sem mecanicas de aposta.
  if (typeof window.capture === 'function') {
    const _origCapture = window.capture;
    window.capture = function(nodeIdx){
      const result = _origCapture.apply(this, arguments);

      // Flash branco curto em TODA captura (feedback positivo imediato)
      _captureFlashT = 1.0;
      try {
        if (typeof flashA !== 'undefined') flashA = Math.max(flashA, 0.10);
      } catch(e) {}

      try {
        if (typeof nodes === 'undefined' || !nodes[nodeIdx]) return result;
        const n = nodes[nodeIdx];
        const basePts = n.pts || 1;

        const roll = Math.random();
        let bonusType = null;
        let mult = 1;
        if (roll < MEGA_BONUS_CHANCE) { bonusType = 'mega'; mult = 5; }
        else if (roll < MEGA_BONUS_CHANCE + LUCKY_CHANCE) { bonusType = 'lucky'; mult = 2; }

        if (!bonusType) { _lastBonusType = null; return result; }

        const bonusPts = basePts * (mult - 1); // soma SOBRE o que ja foi dado
        if (typeof score === 'number') score += bonusPts;
        _lastBonusType = bonusType;

        const text = bonusType === 'mega'
          ? _t('mega_bonus_text', { n: (basePts * mult) })
          : _t('bonus_x2_text');
        const color = bonusType === 'mega' ? '#ffd700' : '#ff80ff';

        if (typeof addScorePopup === 'function') {
          addScorePopup(n.x, n.y - 78, text, color);
        }
        if (typeof emit === 'function') {
          const palette = bonusType === 'mega'
            ? ['#ffd700','#fff080','#ffffff','#ffaa00','#ff8800']
            : ['#ff80ff','#ffd0ff','#ffffff','#ff60ff'];
          emit(n.x, n.y, bonusType === 'mega' ? 28 : 16, palette,
               bonusType === 'mega' ? 1.9 : 1.3);
        }
        if (typeof flashA !== 'undefined') {
          flashA = Math.max(flashA, bonusType === 'mega' ? 0.30 : 0.18);
        }
        if (typeof shakeT !== 'undefined') {
          shakeT = Math.max(shakeT, bonusType === 'mega' ? 0.20 : 0.10);
          shakeA = Math.max(shakeA, bonusType === 'mega' ? 9 : 5);
        }
        if (typeof actx !== 'undefined' && actx && !muted && typeof playTone === 'function') {
          if (bonusType === 'mega') {
            // 4 notas ascendentes - feedback de conquista
            [0, 70, 140, 210].forEach((d, i) => {
              setTimeout(()=>{
                playTone(700 + i*240, 0.18, 'sine', 0.13);
                playTone(1400 + i*350, 0.14, 'triangle', 0.07);
              }, d);
            });
          } else {
            playTone(1500, 0.16, 'sine', 0.11);
            setTimeout(()=>playTone(2000, 0.14, 'triangle', 0.08), 55);
          }
        }
        if (typeof vibrate === 'function') {
          vibrate(bonusType === 'mega' ? [40, 20, 40, 20, 80] : [20, 12, 25]);
        }
      } catch(e) {}

      return result;
    };
  }

  // Reset do estado psicologico + tracking de duracao da run.
  // Tambem forca testMode quando _debugMode esta ativo.
  if (typeof window.startRun === 'function') {
    const _origStartRun = window.startRun;
    window.startRun = function(useZen, source, opts){
      _nearMissData = null;
      _captureFlashT = 0;
      _lastBonusType = null;
      _runStartT = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      _captureCount = 0;
      _expectedScore = 0;       // anti-cheat reset
      _cheatFlagged = false;
      _hasReleasedThisRun = false;
      // Hint visual de tap aparece apenas na 1a partida ever
      _tapHintVisible = (typeof totalGames === 'number' && totalGames === 0 && !useZen);
      // DEBUG: ativa testMode (sem morte) se _debugMode estiver ligado
      if (_debugMode && !useZen) {
        opts = opts || {};
        opts.testMode = true;
      }
      _crumb('gameplay', 'startRun', {
        zen: !!useZen,
        source: source || '',
        debug: !!_debugMode,
        totalGames: (typeof totalGames === 'number') ? totalGames : 0,
        best: (typeof best === 'number') ? best : 0
      });
      return _origStartRun.call(this, useZen, source, opts);
    };
  }

  // Esconde hint na primeira liberacao da bola
  if (typeof window.release === 'function') {
    const _origRelease = window.release;
    window.release = function(){
      _tapHintVisible = false;
      _hasReleasedThisRun = true;
      return _origRelease.apply(this, arguments);
    };
  }

  // Conta capturas + rastreia _expectedScore (anti-cheat).
  // Esta wrap roda por ultimo, entao ve o score depois de TODOS
  // os ganhos legitimos (origCapture + bonus mega/lucky).
  if (typeof window.capture === 'function') {
    const _capForCount = window.capture;
    window.capture = function(){
      const beforeScore = (typeof score === 'number') ? score : 0;
      _captureCount++;
      const r = _capForCount.apply(this, arguments);
      const afterScore = (typeof score === 'number') ? score : 0;
      const legitGain = afterScore - beforeScore;
      if (legitGain > 0 && legitGain < 1000) {
        _expectedScore += legitGain;
      }
      return r;
    };
  }

  // ---------- 9. KEYBOARD: SPACE no menu/morte tambem reinicia ----------
  document.addEventListener('keydown', function(e){
    if (e.code !== 'Space' && e.key !== ' ') return;
    if (state === ST.MENU) {
      e.preventDefault();
      if (typeof startRun === 'function') startRun(false, 'kb_menu');
    } else if (state === ST.DEAD) {
      const dt = (typeof deathT === 'number') ? deathT : 0;
      if (dt > RETRY_DELAY && typeof quickRestartGame === 'function') {
        e.preventDefault();
        quickRestartGame('kb_retry');
      }
    }
  }, true);

})();
