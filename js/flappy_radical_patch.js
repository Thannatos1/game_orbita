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

  // ---------- TUNING ----------
  // Multiplicador da velocidade de orbita. Afeta a velocidade do
  // salto (orbitSpeed * raio * 2.2). Valores recomendados:
  //   1.30 = Dificil
  //   1.50 = Muito dificil  <- atual
  //   1.75 = Brutal
  //   1.85+ = praticamente impossivel
  const SPEED_MULTIPLIER = 1.50;

  // Probabilidade de bonus aleatorio em cada captura (variable ratio).
  const JACKPOT_CHANCE = 0.04;  // 4% = 5x pontos
  const LUCKY_CHANCE   = 0.11;  // 11% = 2x pontos (somado ao jackpot da bottom-up = total 15%)

  // Limite do near-miss: distancia da bola ao centro do no nao
  // capturado em fracao do captureR. <= 0.7x = era pra ter pegado.
  const NEAR_MISS_MAX_OVERSHOOT = 0.7;

  // Estado psicologico da run atual (resetado em cada startRun).
  let _nearMissData = null;       // {nodeX, nodeY, captureR, ballX, ballY, tier, distance}
  let _captureFlashT = 0;          // 0..1 - flash branco curto em capturas
  let _lastBonusType = null;       // 'jackpot' | 'lucky' | null - ultimo bonus pra som ascendente

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

  // ---------- ANTI-CHEAT ----------
  // 3 camadas: (1) assinatura no save vs localStorage editor,
  // (2) score esperado em runtime vs console "score=9999",
  // (3) assinatura no game_end event pra validacao server-side.
  // Limitacoes: nao protege contra edicao do source JS. Atinge ~95%
  // dos cheaters (aqueles que usam DevTools).
  const _AC_SALT = 'orb1ta_p4tch_2026_kY9_xL4z';
  let _expectedScore = 0;
  let _cheatFlagged = false;

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

  function _pickContextualPhrase(){
    const sc = (typeof score === 'number') ? score : 0;
    const bs = (typeof best === 'number') ? best : 0;
    const isNewRec = (typeof newRec !== 'undefined' && !!newRec);
    const gap = bs - sc;
    const hadNearMiss = !!_nearMissData;
    const dur = _runDurationS || 0;
    const combo = _runMaxCombo || 0;

    // Ordem de prioridade
    let bucket = 'generic';
    if (isNewRec)                                 bucket = 'new_record';
    else if (bs > 0 && gap >= 1 && gap <= 3)      bucket = 'near_record';
    else if (hadNearMiss)                         bucket = 'near_miss';
    else if (sc === 0)                            bucket = 'first_death';
    else if (sc <= 4)                             bucket = 'early_death';
    else if (combo >= 5)                          bucket = 'combo_end';
    else if (dur >= 30)                           bucket = 'long_run';
    else if (dur > 0 && dur < 5)                  bucket = 'short_run';

    const list = _PHRASE_BUCKETS[bucket] || _PHRASE_BUCKETS.generic;
    return list[Math.floor(Math.random() * list.length)];
  }

  // ---------- 1. DIFICULDADE BRUTAL: fase 6 desde o cano 1 ----------
  // Sobrescreve getPhase global preservando comportamento do zen.
  if (typeof window.getPhase === 'function') {
    window.getPhase = function(){
      if (typeof zenMode !== 'undefined' && zenMode) return 1;
      return 6;
    };
  }

  // Aplica o multiplicador de velocidade via hook oficial.
  if (typeof registerOrbitaGameplayHook === 'function') {
    registerOrbitaGameplayHook('adjustOrbitSpeed', function(payload){
      if (!payload) return payload;
      if (typeof zenMode !== 'undefined' && zenMode) return payload;
      const v = Number(payload.value);
      if (!Number.isFinite(v)) return payload;
      return { value: v * SPEED_MULTIPLIER };
    });
  }

  // ---------- BACKGROUND: Espaco Profundo ----------
  // Sobrescreve o gradiente do bg pra um navy/black bem escuro
  // que (a) nao conflita com o no vermelho, (b) faz as 4 cores dos
  // nos pular da tela, (c) deixa os meteoros (cinza #5a5a6e) bem
  // visiveis como silhuetas claras.
  if (typeof window.getBgColors === 'function') {
    window.getBgColors = function(){
      return {
        top: '#04060e',
        mid: '#0c1a36',
        bot: '#04060e'
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
  // momentos de flash branco (recorde, jackpot).
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
      // Pequenas variacoes em cada angulo pra cada partida nao ser igual
      out.push(window.placeBranch(fromNode, 'easy',   -1.85 + (Math.random()-0.5)*0.30));  // verde
      out.push(window.placeBranch(fromNode, 'hard',   -0.55 + (Math.random()-0.5)*0.30));  // vermelho
      // Dourado: angulo quase reto pra cima (era 0.20 -> agora 0.08)
      const goldBranch = window.placeBranch(fromNode, 'gold', 0.08 + (Math.random()-0.5)*0.18);
      // Boost vertical pra subir mais ainda na tela
      const upBoost = Math.min(90, H * 0.09);
      const minY = fromNode.y - H * 0.45;  // limite superior do retangulo seguro
      goldBranch.y = Math.max(minY, goldBranch.y - upBoost);
      goldBranch.baseY = goldBranch.y;
      out.push(goldBranch);
      out.push(window.placeBranch(fromNode, 'medium',  1.40 + (Math.random()-0.5)*0.30));  // azul

      // Repor logica de asteroides (skipada pelo handled=true).
      // Reduzida pra 22% pra nao poluir o leque.
      const phase = payload.phase || 6;
      if (phase >= 4 && typeof asteroids !== 'undefined' && Array.isArray(asteroids)) {
        for (const b of out) {
          if (!b || b.tier === 'easy') continue;
          const baseChance = (b.moving || b.disappearing || b.teleporting) ? 0.10 : 0.22;
          if (Math.random() < baseChance) {
            const mx = (fromNode.x + b.x) / 2;
            const my = (fromNode.y + b.y) / 2;
            const na = Math.random() < 0.8 ? 1 : 2;
            for (let i = 0; i < na; i++) {
              asteroids.push({
                x: mx + (Math.random()-0.5)*80,
                y: my + (Math.random()-0.5)*80,
                r: 8 + Math.random()*8,
                rot: Math.random()*Math.PI*2,
                rotSpd: (Math.random()-0.5)*4,
                vertices: (typeof genAsteroidShape === 'function') ? genAsteroidShape() : []
              });
            }
          }
        }
      }

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
    hard:   { move: 0.40, disappear: 0.25 },
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

      // Aplica mecanicas dinamicas randomicas (ignora zen)
      if (typeof zenMode !== 'undefined' && zenMode) return branch;

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

    // ---------- 3. TITULO "ÓRBITA" com gradiente + letter-spacing ----------
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    const titleY = H * 0.36;
    const titlePulse = 1 + Math.sin(t * 2.2) * 0.025;

    X.save();
    X.translate(W/2, titleY);
    X.scale(titlePulse, titlePulse);

    // Gradiente vertical no titulo
    const titleGrad = X.createLinearGradient(0, -titleSize/2, 0, titleSize/2);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.5, '#80f5e8');
    titleGrad.addColorStop(1, '#00f5d4');

    // Sombra de glow ciano
    X.shadowColor = '#00f5d4';
    X.shadowBlur = 24;
    X.fillStyle = titleGrad;
    X.font = 'bold ' + titleSize + 'px -apple-system, system-ui, sans-serif';

    // Letter-spacing manual: desenha letra por letra
    const letters = 'ÓRBITA'.split('');
    const spacing = titleSize * 0.08;  // pequeno espaco extra
    let totalW = 0;
    const widths = letters.map(l => X.measureText(l).width);
    totalW = widths.reduce((a, b) => a + b, 0) + spacing * (letters.length - 1);
    let cx = -totalW / 2;
    for (let i = 0; i < letters.length; i++) {
      X.fillText(letters[i], cx + widths[i]/2, 0);
      cx += widths[i] + spacing;
    }
    X.shadowBlur = 0;
    X.restore();

    // Linha decorativa abaixo do titulo
    const lineY = titleY + titleSize * 0.55;
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
    X.fillText('Um toque. Solte. Não erre.', W/2, lineY + subtitleSize * 1.2 + 4);

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
      X.fillText('RECORDE', textCx, innerY - recordSize * 0.45);
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
      X.fillText('RECORDE', W/2, innerY - recordSize * 0.45);
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
      X.fillText('🔥 ' + _menuDayStreak + ' DIAS SEGUIDOS', W/2, cursorY);
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
    X.fillText('▶   TOQUE PARA JOGAR   ◀', W/2, ctaY);
    X.shadowBlur = 0;
    X.restore();

    // Hint sutil de "toque em qualquer lugar"
    X.globalAlpha = 0.35;
    X.fillStyle = '#ffffff';
    X.font = (subtitleSize - 1) + 'px -apple-system, system-ui, sans-serif';
    X.fillText('toque em qualquer lugar', W/2, ctaY + tapSize + 8);
    X.globalAlpha = 1;

    // ---------- Mute btn (canto superior direito) ----------
    X.globalAlpha = 0.55;
    X.fillStyle = '#fff';
    X.font = '20px sans-serif';
    X.textAlign = 'right';
    X.fillText((typeof muted !== 'undefined' && muted) ? '🔇' : '🔊', W - 16, 26);
    X.globalAlpha = 1;

    // ---------- Hit areas ----------
    if (typeof menuBtnAreas !== 'undefined') {
      menuBtnAreas.push({
        x: W - 50, y: 4, w: 50, h: 44,
        action: function(){
          if (typeof toggleMute === 'function') toggleMute();
        }
      });
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

  // ---------- 5. PLAY UI MINIMAL: so score grande, sem fase/combo/missao ----------
  window.drawPlayUIModule = function(){
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

    // ---------- NEAR-MISS VISUAL (cassino: "voce era pra ter pego") ----------
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
      X.fillText('QUASE!', nx, ny - nm.captureR - 18 - pulse * 4);
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
    X.fillText('MORREU', W/2, H*0.13);
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
    X.fillText('PONTOS', W/2, cursorY);
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
    X.fillText('RECORDE', W/2, cursorY);
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
      X.fillText(Math.round(progressPct * 100) + '% do recorde', W/2, barY + barH + labelSize - 1);
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
      X.fillText('⭐ NOVO RECORDE! ⭐', W/2, bannerY);
      X.shadowBlur = 0;
      X.globalAlpha = f;
    }

    // ---------- STATS ROW (3 mini items) ----------
    const statsY = bannerY + (newRec ? bannerSize + 18 : 8);
    const statSlotW = cardW / 3;
    const statsItems = [
      { icon: '⏱', value: durationS.toFixed(1) + 's' },
      { icon: '⚡', value: captures + (captures === 1 ? ' nó' : ' nós') },
      { icon: '🔥', value: 'x' + maxComboVal }
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
      X.fillText('🔥 ' + _currentDayStreak + ' DIAS SEGUIDOS', W/2, streakY);
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
      X.fillText('TOQUE PARA JOGAR DE NOVO', W/2, H - 32);
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
            cheat_flagged: _cheatFlagged
          };
          // Assinatura HMAC-like pra validacao server-side futura
          eventPayload._sig = _signEvent(eventPayload);
          trackEvent('game_end', eventPayload);
        }
      } catch(e) {}

      return r;
    };
  }

  // ---------- VARIABLE RATIO: bonus aleatorio em capturas (cassino) ----------
  // 4% jackpot (5x), 11% lucky (2x). Reforço de razao variavel = a
  // mesma compulsao das maquinas caca-niqueis.
  if (typeof window.capture === 'function') {
    const _origCapture = window.capture;
    window.capture = function(nodeIdx){
      const result = _origCapture.apply(this, arguments);

      // Flash branco curto em TODA captura (operant conditioning)
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
        if (roll < JACKPOT_CHANCE) { bonusType = 'jackpot'; mult = 5; }
        else if (roll < JACKPOT_CHANCE + LUCKY_CHANCE) { bonusType = 'lucky'; mult = 2; }

        if (!bonusType) { _lastBonusType = null; return result; }

        const bonusPts = basePts * (mult - 1); // soma SOBRE o que ja foi dado
        if (typeof score === 'number') score += bonusPts;
        _lastBonusType = bonusType;

        const text = bonusType === 'jackpot'
          ? '🎰 JACKPOT! +' + (basePts * mult)
          : '✦ BÔNUS x2 ✦';
        const color = bonusType === 'jackpot' ? '#ffd700' : '#ff80ff';

        if (typeof addScorePopup === 'function') {
          addScorePopup(n.x, n.y - 78, text, color);
        }
        if (typeof emit === 'function') {
          const palette = bonusType === 'jackpot'
            ? ['#ffd700','#fff080','#ffffff','#ffaa00','#ff8800']
            : ['#ff80ff','#ffd0ff','#ffffff','#ff60ff'];
          emit(n.x, n.y, bonusType === 'jackpot' ? 28 : 16, palette,
               bonusType === 'jackpot' ? 1.9 : 1.3);
        }
        if (typeof flashA !== 'undefined') {
          flashA = Math.max(flashA, bonusType === 'jackpot' ? 0.30 : 0.18);
        }
        if (typeof shakeT !== 'undefined') {
          shakeT = Math.max(shakeT, bonusType === 'jackpot' ? 0.20 : 0.10);
          shakeA = Math.max(shakeA, bonusType === 'jackpot' ? 9 : 5);
        }
        if (typeof actx !== 'undefined' && actx && !muted && typeof playTone === 'function') {
          if (bonusType === 'jackpot') {
            // 4 notas ascendentes - euforia
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
          vibrate(bonusType === 'jackpot' ? [40, 20, 40, 20, 80] : [20, 12, 25]);
        }
      } catch(e) {}

      return result;
    };
  }

  // Reset do estado psicologico + tracking de duracao da run.
  if (typeof window.startRun === 'function') {
    const _origStartRun = window.startRun;
    window.startRun = function(){
      _nearMissData = null;
      _captureFlashT = 0;
      _lastBonusType = null;
      _runStartT = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      _captureCount = 0;
      _expectedScore = 0;       // anti-cheat reset
      _cheatFlagged = false;
      return _origStartRun.apply(this, arguments);
    };
  }

  // Conta capturas + rastreia _expectedScore (anti-cheat).
  // Esta wrap roda por ultimo, entao ve o score depois de TODOS
  // os ganhos legitimos (origCapture + bonus jackpot/lucky).
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
