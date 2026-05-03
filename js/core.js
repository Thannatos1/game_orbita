const C = document.getElementById('c');
const X = C.getContext('2d');
let dpr = Math.min(window.devicePixelRatio || 1, 3);
let W, H;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth; H = window.innerHeight;
  C.width = W*dpr; C.height = H*dpr;
  C.style.width = W+'px'; C.style.height = H+'px';
  X.setTransform(dpr,0,0,dpr,0,0);
}
resize();
window.addEventListener('resize', resize);
document.addEventListener('touchstart', e=>e.preventDefault(), {passive:false});
document.addEventListener('touchmove', e=>e.preventDefault(), {passive:false});
document.addEventListener('gesturestart', e=>e.preventDefault());

// ============ AUDIO ============
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const MUSIC_BASE_GAIN = 0.88;
const SFX_BASE_GAIN = 0.74;
let actx = null;
let musicSceneLevel = 0.40;  // era 0.90; baixado pra evitar pico alto na primeira inicializacao
let musicDuckGain = null;
let musicGain = null;
let musicMasterGain = null;
let musicCompressor = null;
let sfxGain = null;
let sfxCompressor = null;
let sfxOutputGain = null;
let masterLimiter = null;  // brick-wall limiter no destination final pra evitar clipping
let musicStarted = false;
let musicNodes = [];

function getCurrentMusicUserVolume() {
  const isGameplayContext = state === ST.PLAY || state === ST.PAUSE;
  return clamp(isGameplayContext ? gameMusicVol : menuMusicVol, 0, 1);
}

function getMusicTargetGain(sceneLevel = musicSceneLevel) {
  if (muted) return 0;
  // Garante volume audivel no menu/dead mesmo se uma transicao anterior tiver
  // engolido o sceneLevel pra valor muito baixo (ex: setMusicVolume(0.05) no die()).
  // Sem isso, voltar pro menu apos morrer ficava praticamente mudo.
  let effective = clamp(sceneLevel, 0, 1);
  try {
    if (typeof state !== 'undefined' && typeof ST !== 'undefined'
        && (state === ST.MENU || state === ST.DEAD)) {
      // Garante audivel no menu mas nao no rosto. 0.45 = ~18% volume final.
      effective = Math.max(effective, 0.45);
    }
  } catch(e) {}
  return MUSIC_BASE_GAIN * effective * getCurrentMusicUserVolume();
}

function refreshMusicGain(rampSeconds = 0.25) {
  if (musicGain && actx) {
    musicGain.gain.cancelScheduledValues(actx.currentTime);
    musicGain.gain.linearRampToValueAtTime(getMusicTargetGain(), actx.currentTime + rampSeconds);
  }
}

function makeStereoNode(pan = 0) {
  if (!actx) return null;
  if (typeof actx.createStereoPanner === 'function') {
    const p = actx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    return p;
  }
  const g = actx.createGain();
  g.gain.value = 1;
  return g;
}

function duckMusicTo(mult = 0.88, holdMs = 140, rampDown = 0.012, rampUp = 0.18) {
  if (!musicDuckGain || !actx) return;
  const now = actx.currentTime;
  const holdSec = Math.max(0.04, holdMs / 1000);
  const safeMult = clamp(mult, 0.55, 1);
  musicDuckGain.gain.cancelScheduledValues(now);
  musicDuckGain.gain.setValueAtTime(musicDuckGain.gain.value, now);
  musicDuckGain.gain.linearRampToValueAtTime(safeMult, now + rampDown);
  musicDuckGain.gain.setValueAtTime(safeMult, now + rampDown + holdSec);
  musicDuckGain.gain.linearRampToValueAtTime(1, now + rampDown + holdSec + rampUp);
}

function initMasterLimiter() {
  if (masterLimiter || !actx) return;
  // Brick-wall limiter: protege contra clipping quando musica + SFX tocam juntos
  // em volumes altos no celular. Threshold -3dBFS, hard knee, ratio 20:1, attack 1ms.
  masterLimiter = actx.createDynamicsCompressor();
  masterLimiter.threshold.value = -3;
  masterLimiter.knee.value = 0;       // hard knee = age como limiter
  masterLimiter.ratio.value = 20;     // razao alta = limiter brutal
  masterLimiter.attack.value = 0.001; // 1ms pra pegar transientes
  masterLimiter.release.value = 0.05; // 50ms volta rapido
  masterLimiter.connect(actx.destination);
}

function audioOut() {
  // Helper: tudo conecta aqui em vez de actx.destination (passa pelo limiter)
  return masterLimiter || actx.destination;
}

function initSfxBus() {
  if (!actx || sfxGain) return;

  sfxGain = actx.createGain();
  sfxGain.gain.value = SFX_BASE_GAIN;

  sfxCompressor = actx.createDynamicsCompressor();
  sfxCompressor.threshold.value = -24;
  sfxCompressor.knee.value = 16;
  sfxCompressor.ratio.value = 3.8;
  sfxCompressor.attack.value = 0.004;
  sfxCompressor.release.value = 0.18;

  sfxOutputGain = actx.createGain();
  sfxOutputGain.gain.value = 0.96;

  sfxGain.connect(sfxCompressor);
  sfxCompressor.connect(sfxOutputGain);
  sfxOutputGain.connect(audioOut());
}

function initAudio() {
  if (!actx) {
    actx = new AudioCtx();
    initMasterLimiter();  // CRITICO: tem que vir antes de music/sfx pra audioOut() funcionar
    initMusic();
    initSfxBus();
  }
  if (actx && actx.state === 'suspended') {
    actx.resume().catch(()=>{});
  }
}

// Inicializa AudioContext na primeira interacao do user em QUALQUER lugar
// (toque/click/tecla). Browsers exigem user gesture pra criar audio context.
// Sem isso, a musica do menu nunca tocava ate o jogador morrer ou iniciar partida.
function _ensureAudio() {
  try { if (typeof initAudio === 'function') initAudio(); } catch(e) {}
}
['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach(function(ev){
  window.addEventListener(ev, _ensureAudio, { once: false, passive: true, capture: true });
});

// ============ AMBIENT MUSIC ============
function initMusic() {
  if (!actx || musicStarted) return;
  musicStarted = true;

  musicGain = actx.createGain();
  musicGain.gain.value = getMusicTargetGain(0.90);

  musicDuckGain = actx.createGain();
  musicDuckGain.gain.value = 1;

  const toneFilter = actx.createBiquadFilter();
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = 3200;  // era 1800; abrir pra 3200 da brilho/cosmico sem ficar agudo
  toneFilter.Q.value = 0.7;

  musicCompressor = actx.createDynamicsCompressor();
  musicCompressor.threshold.value = -26;
  musicCompressor.knee.value = 20;
  musicCompressor.ratio.value = 2.6;
  musicCompressor.attack.value = 0.02;
  musicCompressor.release.value = 0.25;

  musicMasterGain = actx.createGain();
  // Fade-in 3.5s no startup: comeca em 0 e sobe gradual pro target.
  // 3.5s eh tempo suficiente pra qualquer setMusicVolume() do gameplay (em startRun)
  // ja ter efeito antes de ouvir audio em volume cheio. Evita pico alto no boot.
  musicMasterGain.gain.value = 0;
  musicMasterGain.gain.linearRampToValueAtTime(0.92, actx.currentTime + 3.5);

  musicGain.connect(musicDuckGain);
  musicDuckGain.connect(toneFilter);
  toneFilter.connect(musicCompressor);
  musicCompressor.connect(musicMasterGain);
  musicMasterGain.connect(audioOut());

  // Wide stereo ambience
  const delayL = actx.createDelay(1.5);
  delayL.delayTime.value = 0.19;
  const delayLGain = actx.createGain();
  delayLGain.gain.value = 0.09;
  const delayLPan = makeStereoNode(-0.62);

  const delayR = actx.createDelay(1.5);
  delayR.delayTime.value = 0.27;
  const delayRGain = actx.createGain();
  delayRGain.gain.value = 0.08;
  const delayRPan = makeStereoNode(0.62);

  const shimmerDelayL = actx.createDelay(0.08);
  shimmerDelayL.delayTime.value = 0.014;
  const shimmerGainL = actx.createGain();
  shimmerGainL.gain.value = 0.035;
  const shimmerPanL = makeStereoNode(-0.35);

  const shimmerDelayR = actx.createDelay(0.08);
  shimmerDelayR.delayTime.value = 0.021;
  const shimmerGainR = actx.createGain();
  shimmerGainR.gain.value = 0.03;
  const shimmerPanR = makeStereoNode(0.35);

  musicMasterGain.connect(delayL);
  delayL.connect(delayLGain);
  delayLGain.connect(delayLPan);
  delayLPan.connect(audioOut());

  musicMasterGain.connect(delayR);
  delayR.connect(delayRGain);
  delayRGain.connect(delayRPan);
  delayRPan.connect(audioOut());

  musicMasterGain.connect(shimmerDelayL);
  shimmerDelayL.connect(shimmerGainL);
  shimmerGainL.connect(shimmerPanL);
  shimmerPanL.connect(audioOut());

  musicMasterGain.connect(shimmerDelayR);
  shimmerDelayR.connect(shimmerGainR);
  shimmerGainR.connect(shimmerPanR);
  shimmerPanR.connect(audioOut());

  // Duas progressoes distintas pra criar atmosfera diferente entre menu e gameplay.
  // Menu: chill, lento, modal (Am - Em - F - C) - sensacao etérea/contemplativa
  // Play: tenso, ritmado, dramatico (Am - F - C - G) - sensacao de urgencia
  const chordsMenu = [
    [220.00, 261.63, 329.63], // A minor (Am)
    [164.81, 196.00, 246.94], // E minor (Em) - mais grave, modal
    [174.61, 220.00, 261.63], // F major
    [261.63, 329.63, 392.00], // C major
  ];
  const chordsPlay = [
    [220.00, 261.63, 329.63], // A minor (Am)
    [174.61, 220.00, 261.63], // F major
    [261.63, 329.63, 392.00], // C major
    [196.00, 246.94, 293.66], // G major (G)
  ];

  // Escolhe set de acordes baseado no state atual do jogo.
  // playChord() roda em loop, entao a transicao acontece naturalmente em ~5-8s.
  function getActiveChords() {
    try {
      if (typeof state !== 'undefined' && typeof ST !== 'undefined' && state === ST.PLAY) {
        return chordsPlay;
      }
    } catch(e) {}
    return chordsMenu;
  }
  function getActiveDur() {
    try {
      if (typeof state !== 'undefined' && typeof ST !== 'undefined' && state === ST.PLAY) {
        return 5;  // mais rapido em gameplay (mais urgencia)
      }
    } catch(e) {}
    return 8;  // mais lento em menu (mais chill/etereo)
  }

  // Perfis de timbre por modo. Diferenciam menu vs gameplay nao soh em
  // acordes/duracao mas tambem em filtros, volume das camadas e detune.
  // Menu = etereo/brilhante (lowpass aberto, sub sutil, shimmer alto)
  // Play = denso/grave (lowpass fechado, sub forte, layers detunes maior)
  const profileMenu = {
    subVol: 0.025,        // sub bass sutil
    padPeakLow: 0.075,    // sine layer principal (mais leve)
    padPeakHigh: 0.07,    // triangle layers (mais leve)
    shimmerVol: 0.055,    // shimmer alto e proeminente (estrelado)
    detuneSpread: 4,      // detune sutil entre layers
    lowpassLow: 2400,     // pad principal: brilhante
    lowpassHigh: 4500,    // pad agudo: muito brilhante
    shimmerMul: 4,        // shimmer 4 oitavas acima
  };
  const profilePlay = {
    subVol: 0.085,        // sub bass forte (peso)
    padPeakLow: 0.13,     // sine layer principal (denso)
    padPeakHigh: 0.10,    // triangle layers (denso)
    shimmerVol: 0.018,    // shimmer sutil, sai de foco
    detuneSpread: 14,     // detune maior = mais textura cremosa
    lowpassLow: 1400,     // pad principal: grave/quente
    lowpassHigh: 2200,    // pad agudo: ainda contido
    shimmerMul: 3,        // shimmer 3 oitavas (mais conectado)
  };
  function getActiveProfile(){
    try {
      if (typeof state !== 'undefined' && typeof ST !== 'undefined' && state === ST.PLAY) {
        return profilePlay;
      }
    } catch(e) {}
    return profileMenu;
  }

  let chordIdx = 0;

  function playChord() {
    if (!actx) return;
    const activeChords = getActiveChords();
    const chord = activeChords[chordIdx % activeChords.length];
    const profile = getActiveProfile();
    const now = actx.currentTime;
    const dur = getActiveDur();
    const notePans = [-0.32, 0, 0.32];

    // Sub bass layer (sutil em menu, forte em play)
    const sub = actx.createOscillator();
    const subGain = actx.createGain();
    const subPan = makeStereoNode(0);
    sub.type = 'sine';
    sub.frequency.value = chord[0] * 0.5;
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(profile.subVol, now + 1.6);
    subGain.gain.setValueAtTime(profile.subVol, now + dur - 1.2);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    sub.connect(subGain);
    subGain.connect(subPan);
    subPan.connect(musicGain);
    sub.start(now);
    sub.stop(now + dur);

    // Pads principais (3 notas, cada uma com 2 layers detuned pra textura)
    chord.forEach((freq, i) => {
      [0, profile.detuneSpread].forEach((detune, j) => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        const p = makeStereoNode(notePans[i] + (j === 0 ? -0.08 : 0.08));
        const noteFilter = actx.createBiquadFilter();

        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        noteFilter.type = 'lowpass';
        noteFilter.frequency.value = i === 0 ? profile.lowpassLow : profile.lowpassHigh;
        noteFilter.Q.value = 0.6;

        const peak = i === 0 ? profile.padPeakLow : profile.padPeakHigh;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(peak, now + 1.4);
        g.gain.setValueAtTime(peak, now + dur - 1.3);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(noteFilter);
        noteFilter.connect(g);
        g.connect(p);
        p.connect(musicGain);
        osc.start(now);
        osc.stop(now + dur);
      });
    });

    // Shimmer alto (proeminente em menu, sutil em play)
    const shimmer = actx.createOscillator();
    const sg = actx.createGain();
    const sp = makeStereoNode(chordIdx % 2 === 0 ? 0.42 : -0.42);
    shimmer.type = 'sine';
    shimmer.frequency.value = chord[0] * profile.shimmerMul;
    shimmer.detune.value = chordIdx % 2 === 0 ? 4 : -4;
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.linearRampToValueAtTime(profile.shimmerVol, now + 1.8);
    sg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    shimmer.connect(sg);
    sg.connect(sp);
    sp.connect(musicGain);
    shimmer.start(now);
    shimmer.stop(now + dur);

    chordIdx = (chordIdx + 1) % activeChords.length;
    setTimeout(playChord, (dur - 0.5) * 1000);
  }

  playChord();
}

function setMusicVolume(v) {
  musicSceneLevel = clamp(v, 0, 1);
  refreshMusicGain(0.25);
}

function toggleMute() {
  muted = !muted;
  saveData();
  refreshMusicGain(0.18);
}

function vibrate(pattern) {
  if (!vibrationOn || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

function playTone(freq, dur, type, vol, detune, opts) {
  if (!actx || muted || sfxVol <= 0) return;
  initSfxBus();
  const now = actx.currentTime;
  const cfg = opts || {};
  const attack = Math.max(0.004, Math.min(cfg.attack ?? 0.012, dur * 0.45));
  const releaseLead = Math.min(cfg.releaseLead ?? 0.030, dur * 0.55);
  const peak = clamp((vol || 0.15) * sfxVol * (cfg.trim ?? 1), 0, 0.32);
  const basePan = clamp((cfg.pan !== undefined ? cfg.pan : (Math.random() * 0.18 - 0.09)), -1, 1);
  const stereoWidth = clamp(cfg.stereoWidth ?? 0.0, 0, 0.7);
  // Random pitch jitter +-50 cents (~+-3% freq) pra evitar fadiga auditiva quando
  // o mesmo SFX toca dezenas de vezes (capture loop). Consistente entre as 3 layers
  // do mesmo som. Opt-out via cfg.noJitter pra SFX que precisam de tom exato.
  const jitterRange = cfg.jitterCents ?? 50;
  const baseJitter = cfg.noJitter ? 0 : (Math.random() * 2 - 1) * jitterRange;

  function emitLayer(freqMul, detuneOffset, panOffset, gainMul, layerType) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    const f = actx.createBiquadFilter();
    const p = makeStereoNode(basePan + panOffset);

    o.type = layerType || type || 'sine';
    o.frequency.value = freq * freqMul;
    o.detune.value = (detune || 0) + detuneOffset + baseJitter;

    if (cfg.highpass) {
      f.type = 'highpass';
      f.frequency.value = cfg.highpass;
    } else if (cfg.lowpass) {
      f.type = 'lowpass';
      f.frequency.value = cfg.lowpass;
    } else {
      f.type = 'lowpass';
      f.frequency.value = 4200;
    }
    f.Q.value = cfg.q ?? 0.7;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak * gainMul, now + attack);
    g.gain.setValueAtTime(peak * gainMul, now + Math.max(attack, dur - releaseLead));
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    o.connect(f);
    f.connect(g);
    g.connect(p);
    p.connect(sfxGain);

    o.start(now);
    o.stop(now + dur + 0.03);
  }

  emitLayer(1, 0, 0, 1, type);
  if (stereoWidth > 0.01) {
    emitLayer(1.003, 4, stereoWidth, 0.42, cfg.layerType || type || 'sine');
    emitLayer(0.997, -4, -stereoWidth, 0.35, cfg.layerType || type || 'sine');
  }

  if (cfg.duck && musicDuckGain) {
    duckMusicTo(cfg.duck, cfg.duckMs || Math.max(120, dur * 1000 * 1.1), cfg.duckAttack || 0.012, cfg.duckRelease || 0.18);
  }
}

function sndRelease() {
  playTone(300, 0.11, 'sine', 0.065, 0, { trim:0.92, lowpass:1800, stereoWidth:0.14, pan:-0.08 });
  playTone(450, 0.08, 'triangle', 0.032, 0, { trim:0.90, lowpass:2400, stereoWidth:0.10, pan:0.08 });
}
function sndCapture(pts, combo) {
  const base = 380 + combo * 34;
  playTone(base, 0.16, 'sine', 0.08, 0, { duck:0.95, duckMs:110, lowpass:2500, stereoWidth:0.18 });
  playTone(base * 1.5, 0.12, 'triangle', 0.04, 0, { trim:0.94, lowpass:3200, stereoWidth:0.14 });
  if (pts >= 3) { setTimeout(()=>playTone(base*2, 0.12, 'sine', 0.045, 0, { trim:0.90, lowpass:2600, stereoWidth:0.18, pan:0.12 }), 50); }
  if (pts >= 5) { setTimeout(()=>playTone(base*2.5, 0.16, 'triangle', 0.055, 0, { trim:0.90, lowpass:3400, duck:0.93, duckMs:120, stereoWidth:0.22, pan:-0.12 }), 105); }
}
function sndDie() {
  playTone(200, 0.32, 'sawtooth', 0.07, 0, { duck:0.84, duckMs:260, lowpass:1400, stereoWidth:0.20, pan:-0.18 });
  playTone(120, 0.50, 'sine', 0.05, 0, { trim:0.88, lowpass:900, stereoWidth:0.12, pan:0.16 });
}
function sndPhase() {
  playTone(600, 0.12, 'sine', 0.065, 0, { duck:0.90, duckMs:150, lowpass:2600, stereoWidth:0.18, pan:-0.14 });
  setTimeout(()=>playTone(800, 0.12, 'sine', 0.06, 0, { trim:0.94, lowpass:3000, stereoWidth:0.18, pan:0.14 }), 95);
  setTimeout(()=>playTone(1000, 0.16, 'triangle', 0.05, 0, { trim:0.92, lowpass:3400, stereoWidth:0.24, pan:0 }), 190);
}
function sndRecord() {
  [0,100,200,300].forEach((d,i)=>setTimeout(()=>playTone(500+i*150, 0.18, 'sine', 0.075, 0, {
    duck:i===0?0.82:0.88,
    duckMs:180,
    lowpass:3200,
    trim:0.92,
    stereoWidth:0.24,
    pan:(i%2===0?-0.16:0.16)
  }), d));
}

// ============ UTILS ============
function dist(x1,y1,x2,y2){return Math.sqrt((x2-x1)**2+(y2-y1)**2)}
function rand(a,b){return a+Math.random()*(b-a)}
function clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v))}
function lerpColor(a,b,t){
  const ah=parseInt(a.slice(1),16),bh=parseInt(b.slice(1),16);
  const ar=(ah>>16)&255,ag=(ah>>8)&255,ab=ah&255;
  const br=(bh>>16)&255,bg=(bh>>8)&255,bb=bh&255;
  const r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab+(bb-ab)*t);
  return `rgb(${r},${g},${bl})`;
}

// ============ STATE ============
const ST={MENU:0,PLAY:1,DEAD:2,PAUSE:3};
let state=ST.MENU;
let score=0, best=0, newRec=false;
let menuT=0, deathT=0, shakeT=0, shakeA=0, flashA=0;
let phaseMsg='', phaseMsgT=0;
let combo=0, maxCombo=0, comboTimer=0;
let totalGames=0;
let lastCaptureTime=0;
let tutorialStep=0;
let tutorialT=0;
let muted=false;
let musicVol=0.5;      // legado
let menuMusicVol=0.45; // 0-1
let gameMusicVol=0.80; // 0-1
let sfxVol=0.8;        // 0-1
let vibrationOn=true;
let goldFlashT=0;
let goldZoomT=0;
let selectedSkin='default';
let selectedBg='space';
let unlockedSkins=['default'];
let unlockedBgs=['space'];
let totalGoldCaptured=0;
let menuScreen='loading'; // starts loading, then login or main
let zenMode=false;
let testMode=false;
let zenUnlocked=false;
// Stats
let totalScoreEver=0;
let totalNodesEver=0;
let bestComboEver=0;
let highestPhase=1;
// Achievements
let achievements=[];
let pendingAchievements=[];
// Power-ups
let powerups=[]; // floating powerups in world
let activeShield=false;
let slowMoTimer=0;
let magnetTimer=0;
let powerupSpawnTimer=0;
