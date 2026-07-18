// ============================================================
// ORBITA I18N - PT-BR (default) / EN / ES
// ============================================================
(function(){
  'use strict';

  const SUPPORTED = ['pt', 'en', 'es'];

  const UI = {
    pt: {
      subtitle: 'Um toque. Solte. Não erre.',
      record: 'RECORDE',
      points: 'PONTOS',
      tap_to_play: '▶   TOQUE PARA JOGAR   ◀',
      tap_anywhere: 'toque em qualquer lugar',
      days_streak: '🔥 {n} DIAS SEGUIDOS',
      debug_banner_menu: '🧪 MODO TESTE: SEM MORTE',
      debug_label: 'DEBUG',
      sem_morte_label: '🧪 SEM MORTE',
      test_area_btn: 'ÁREA DE TESTE',
      test_area_sub: 'sem morte / sem recorde',
      training_match_singular: '🌱 PARTIDA DE TREINO ({n} restante)',
      training_match_plural: '🌱 PARTIDA DE TREINO ({n} restantes)',
      training_no_record: '🌱 TREINO - RECORDE NÃO CONTA',
      tap_to_release: 'TOQUE PARA SOLTAR',
      release_hint_1: 'a bolinha sai da órbita e voa',
      release_hint_2: 'toque pra entrar em órbita no próximo nó',
      morreu: 'MORREU',
      record_pct: '{n}% do recorde',
      new_record_banner: '⭐ NOVO RECORDE! ⭐',
      tap_to_retry: 'TOQUE PARA JOGAR DE NOVO',
      mega_bonus_text: '⭐ MEGA BÔNUS! +{n}',
      bonus_x2_text: '✦ BÔNUS x2 ✦',
      near_miss_text: 'QUASE!',
      death_reason_near_miss: 'QUASE',
      death_reason_too_early: 'CEDO DEMAIS',
      death_reason_too_late: 'TARDE DEMAIS',
      death_reason_wrong_target: 'NÓ ERRADO',
      death_reason_no_route: 'SEM ROTA',
      death_reason_missed_timing: 'ERROU O MOMENTO',
      back_to_exit: '⌫  Toque novamente para sair',
      nodes_singular: '{n} nó',
      nodes_plural: '{n} nós',
      seconds_short: '{n}s',
      combo_x: 'x{n}',
      paused: 'PAUSADO',
      current_score: 'PONTUAÇÃO ATUAL',
      continue_btn: 'CONTINUAR',
      main_menu: 'MENU PRINCIPAL',
      gold_popup: 'OURO!',
      combo_popup: 'COMBO {n}!',
      test_no_error_popup: 'SEM ERRO',
      shield_saved: 'ESCUDO SALVOU',
      mission_popup: 'MISSÃO!',
      lang_label: 'PT',
    },
    en: {
      subtitle: 'One tap. Release. Don\'t miss.',
      record: 'BEST',
      points: 'POINTS',
      tap_to_play: '▶   TAP TO PLAY   ◀',
      tap_anywhere: 'tap anywhere',
      days_streak: '🔥 {n} DAY STREAK',
      debug_banner_menu: '🧪 TEST MODE: NO DEATH',
      debug_label: 'DEBUG',
      sem_morte_label: '🧪 NO DEATH',
      test_area_btn: 'TEST AREA',
      test_area_sub: 'no death / no record',
      training_match_singular: '🌱 PRACTICE GAME ({n} left)',
      training_match_plural: '🌱 PRACTICE GAMES ({n} left)',
      training_no_record: '🌱 PRACTICE - BEST DOES NOT COUNT',
      tap_to_release: 'TAP TO RELEASE',
      release_hint_1: 'the ball leaves orbit and flies',
      release_hint_2: 'tap to enter orbit at the next node',
      morreu: 'DIED',
      record_pct: '{n}% of best',
      new_record_banner: '⭐ NEW RECORD! ⭐',
      tap_to_retry: 'TAP TO PLAY AGAIN',
      mega_bonus_text: '⭐ MEGA BONUS! +{n}',
      bonus_x2_text: '✦ BONUS x2 ✦',
      near_miss_text: 'CLOSE!',
      death_reason_near_miss: 'CLOSE',
      death_reason_too_early: 'TOO EARLY',
      death_reason_too_late: 'TOO LATE',
      death_reason_wrong_target: 'WRONG NODE',
      death_reason_no_route: 'NO ROUTE',
      death_reason_missed_timing: 'BAD TIMING',
      back_to_exit: '⌫  Tap again to exit',
      nodes_singular: '{n} node',
      nodes_plural: '{n} nodes',
      seconds_short: '{n}s',
      combo_x: 'x{n}',
      paused: 'PAUSED',
      current_score: 'CURRENT SCORE',
      continue_btn: 'CONTINUE',
      main_menu: 'MAIN MENU',
      gold_popup: 'GOLD!',
      combo_popup: 'COMBO {n}!',
      test_no_error_popup: 'NO ERROR',
      shield_saved: 'SHIELD SAVED YOU',
      mission_popup: 'MISSION!',
      lang_label: 'EN',
    },
    es: {
      subtitle: 'Un toque. Suelta. No falles.',
      record: 'RÉCORD',
      points: 'PUNTOS',
      tap_to_play: '▶   TOCA PARA JUGAR   ◀',
      tap_anywhere: 'toca en cualquier lugar',
      days_streak: '🔥 {n} DÍAS SEGUIDOS',
      debug_banner_menu: '🧪 MODO PRUEBA: SIN MUERTE',
      debug_label: 'DEBUG',
      sem_morte_label: '🧪 SIN MUERTE',
      test_area_btn: 'ÁREA DE PRUEBA',
      test_area_sub: 'sin muerte / sin récord',
      training_match_singular: '🌱 PARTIDA DE PRÁCTICA ({n} restante)',
      training_match_plural: '🌱 PARTIDAS DE PRÁCTICA ({n} restantes)',
      training_no_record: '🌱 PRÁCTICA - EL RÉCORD NO CUENTA',
      tap_to_release: 'TOCA PARA SOLTAR',
      release_hint_1: 'la bolita sale de la órbita y vuela',
      release_hint_2: 'toca para entrar en órbita en el próximo nodo',
      morreu: 'PERDISTE',
      record_pct: '{n}% del récord',
      new_record_banner: '⭐ ¡NUEVO RÉCORD! ⭐',
      tap_to_retry: 'TOCA PARA JUGAR DE NUEVO',
      mega_bonus_text: '⭐ ¡MEGA BONO! +{n}',
      bonus_x2_text: '✦ BONO x2 ✦',
      near_miss_text: '¡CASI!',
      death_reason_near_miss: 'CASI',
      death_reason_too_early: 'MUY PRONTO',
      death_reason_too_late: 'MUY TARDE',
      death_reason_wrong_target: 'NODO EQUIVOCADO',
      death_reason_no_route: 'SIN RUTA',
      death_reason_missed_timing: 'MAL MOMENTO',
      back_to_exit: '⌫  Toca de nuevo para salir',
      nodes_singular: '{n} nodo',
      nodes_plural: '{n} nodos',
      seconds_short: '{n}s',
      combo_x: 'x{n}',
      paused: 'PAUSA',
      current_score: 'PUNTUACIÓN ACTUAL',
      continue_btn: 'CONTINUAR',
      main_menu: 'MENÚ PRINCIPAL',
      gold_popup: '¡ORO!',
      combo_popup: '¡COMBO {n}!',
      test_no_error_popup: 'SIN ERROR',
      shield_saved: 'EL ESCUDO TE SALVÓ',
      mission_popup: '¡MISIÓN!',
      lang_label: 'ES',
    }
  };

  // Frases curtas e específicas. Cada idioma mantém a mesma estrutura
  // para que o texto sempre concorde com o diagnóstico mostrado na tela.
  const PHRASES = {
    pt: {
      new_record: [
        'Seu melhor voo até agora.','Esse recorde é seu.','Ritmo perfeito.',
        'Você elevou a marca.','Guarde esse número.','Uma órbita mais alto.'
      ],
      near_record: [
        'O recorde estava ali.','Faltou quase nada.','Mais uma e sai.',
        'Foi por um detalhe.','Você já consegue alcançar.','Respira. Está perto.'
      ],
      beginner: [
        'Observe a direção da bola.','Encontre o momento certo.',
        'Cada tentativa ensina o ritmo.','Mire no centro do próximo nó.',
        'Use o rastro para ler a direção.','Você está aprendendo o giro.'
      ],
      near_miss: [
        'Passou raspando.','Faltou um toque.','Quase entrou na órbita.',
        'O centro estava muito perto.','Mais precisão no próximo.','Essa foi por um fio.'
      ],
      too_early: [
        'Segure só mais um instante.','Espere alinhar um pouco mais.',
        'A rota ainda não estava alinhada.','Dê mais uma volta na órbita.',
        'Espere a bola apontar para o nó.','Quase. Só precisava esperar.'
      ],
      too_late: [
        'Solte um instante antes.','A janela já tinha passado.',
        'Antecipe um pouco o toque.','Você segurou além do ponto.',
        'O alinhamento passou.','Na próxima, solte mais cedo.'
      ],
      wrong_target: [
        'Mire no nó mais alinhado.','A bola apontava para outro nó.',
        'Escolha a rota antes de soltar.','O nó certo estava do outro lado.',
        'Leia o leque de nós primeiro.','Procure a linha mais limpa.'
      ],
      no_route: [
        'Espere surgir uma rota limpa.','Não havia nó bem alinhado.',
        'Segure a órbita e observe.','A rota fechou. Espere outra.',
        'Nem todo giro pede um toque.','Espere o próximo alinhamento.'
      ],
      missed_timing: [
        'Ajuste o momento do toque.','Olhe a direção da bola.',
        'O ritmo está quase encaixando.','Solte quando a rota alinhar.',
        'Calma e precisão.','Leia o giro antes de soltar.'
      ],
      generic: [
        'Respira e tenta de novo.','A próxima pode encaixar.','Mais uma órbita.',
        'Ajuste pequeno, diferença grande.','Observe. Alinhe. Solte.',
        'Você está pegando o ritmo.','Sem pressa.','De novo, com precisão.'
      ],
    },
    en: {
      new_record: [
        'Your best flight yet.','That record is yours.','Perfect rhythm.',
        'You raised the bar.','Keep that number.','One orbit higher.'
      ],
      near_record: [
        'The record was right there.','Missed it by a breath.','One clean run away.',
        'It came down to one detail.','You can already reach it.','Reset. You are close.'
      ],
      beginner: [
        'Watch the ball\'s direction.','Find the right moment.',
        'Each try teaches the rhythm.','Aim for the center of the next node.',
        'Use the trail to read the direction.','You are learning the turn.'
      ],
      near_miss: [
        'Missed it by a hair.','Just one touch short.','Almost locked into orbit.',
        'The center was right there.','A little more precision.','That one nearly connected.'
      ],
      too_early: [
        'Hold for one more moment.','Wait for a cleaner alignment.',
        'The route was not lined up yet.','Give it a little more orbit.',
        'Release when the ball points at the node.','Almost. Just wait a beat.'
      ],
      too_late: [
        'Release a moment sooner.','The window had already passed.',
        'Anticipate the tap a little.','You held past the opening.',
        'The alignment slipped by.','Next time, release earlier.'
      ],
      wrong_target: [
        'Aim for the best-aligned node.','The ball was pointing elsewhere.',
        'Choose the route before release.','The clean node was on the other side.',
        'Read the node spread first.','Look for the clearest line.'
      ],
      no_route: [
        'Wait for a clean route.','No node was lined up yet.',
        'Stay in orbit and watch.','The route closed. Wait for another.',
        'Not every turn needs a tap.','Wait for the next alignment.'
      ],
      missed_timing: [
        'Adjust the moment of release.','Watch where the ball is pointing.',
        'The rhythm is almost there.','Release when the route lines up.',
        'Calm and precise.','Read the turn before releasing.'
      ],
      generic: [
        'Breathe and try again.','The next one can connect.','One more orbit.',
        'Small adjustment, big difference.','Watch. Align. Release.',
        'You are finding the rhythm.','No rush.','Again, with precision.'
      ],
    },
    es: {
      new_record: [
        'Tu mejor vuelo hasta ahora.','Ese récord es tuyo.','Ritmo perfecto.',
        'Subiste tu marca.','Guarda ese número.','Una órbita más arriba.'
      ],
      near_record: [
        'El récord estaba ahí.','Faltó un suspiro.','Una buena partida y sale.',
        'Fue cuestión de un detalle.','Ya puedes alcanzarlo.','Respira. Estás cerca.'
      ],
      beginner: [
        'Mira la dirección de la bola.','Encuentra el momento correcto.',
        'Cada intento enseña el ritmo.','Apunta al centro del próximo nodo.',
        'Usa el rastro para leer la dirección.','Estás aprendiendo el giro.'
      ],
      near_miss: [
        'Pasaste rozando.','Faltó un toque.','Casi entraste en órbita.',
        'El centro estaba muy cerca.','Solo faltó un poco de precisión.','Esa casi conectó.'
      ],
      too_early: [
        'Aguanta un instante más.','Espera una alineación más clara.',
        'La ruta aún no estaba alineada.','Dale un poco más de órbita.',
        'Suelta cuando apunte al nodo.','Casi. Solo faltaba esperar.'
      ],
      too_late: [
        'Suelta un instante antes.','La ventana ya había pasado.',
        'Anticipa un poco el toque.','Aguantaste más de la cuenta.',
        'La alineación ya pasó.','La próxima, suelta antes.'
      ],
      wrong_target: [
        'Apunta al nodo mejor alineado.','La bola apuntaba a otro nodo.',
        'Elige la ruta antes de soltar.','El nodo limpio estaba al otro lado.',
        'Mira el abanico de nodos.','Busca la línea más clara.'
      ],
      no_route: [
        'Espera una ruta limpia.','Ningún nodo estaba alineado.',
        'Sigue en órbita y observa.','La ruta se cerró. Espera otra.',
        'No todos los giros piden un toque.','Espera la próxima alineación.'
      ],
      missed_timing: [
        'Ajusta el momento de soltar.','Mira hacia dónde apunta la bola.',
        'El ritmo casi encaja.','Suelta cuando la ruta se alinee.',
        'Calma y precisión.','Lee el giro antes de soltar.'
      ],
      generic: [
        'Respira e inténtalo de nuevo.','La próxima puede conectar.','Una órbita más.',
        'Un ajuste pequeño cambia todo.','Mira. Alinea. Suelta.',
        'Estás encontrando el ritmo.','Sin prisa.','Otra vez, con precisión.'
      ],
    }
  };

  function detectLang(){
    try {
      const stored = localStorage.getItem('orbita_lang');
      if (stored && SUPPORTED.indexOf(stored) >= 0) return stored;
    } catch(e) {}
    try {
      const browser = (navigator.language || navigator.userLanguage || 'pt').toLowerCase();
      if (browser.indexOf('en') === 0) return 'en';
      if (browser.indexOf('es') === 0) return 'es';
      if (browser.indexOf('pt') === 0) return 'pt';
    } catch(e) {}
    return 'pt';
  }

  let _currentLang = detectLang();

  function t(key, params){
    const pack = UI[_currentLang] || UI.pt;
    let s = pack[key];
    if (s == null) s = (UI.pt[key] != null) ? UI.pt[key] : key;
    if (params) {
      for (const k in params) {
        s = s.split('{' + k + '}').join(String(params[k]));
      }
    }
    return s;
  }

  function setLang(lang){
    if (SUPPORTED.indexOf(lang) < 0) return false;
    _currentLang = lang;
    try { localStorage.setItem('orbita_lang', lang); } catch(e) {}
    return true;
  }

  function cycleLang(){
    const i = SUPPORTED.indexOf(_currentLang);
    const next = SUPPORTED[(i + 1) % SUPPORTED.length];
    setLang(next);
    return next;
  }

  function currentLang(){ return _currentLang; }

  function pickFromBucket(bucket){
    const lang = PHRASES[_currentLang] || PHRASES.pt;
    const list = lang[bucket] || lang.generic || [];
    if (!list.length) return '';
    return list[Math.floor(Math.random() * list.length)];
  }

  function pickContextualPhrase(ctx){
    ctx = ctx || {};
    const sc = Number(ctx.score) || 0;
    const bs = Number(ctx.best) || 0;
    const gap = bs - sc;
    const reason = String(ctx.deathReason || '');
    const languagePhrases = PHRASES[_currentLang] || PHRASES.pt;

    let bucket = 'generic';
    if (ctx.newRec) {
      bucket = 'new_record';
    } else if (bs > 0 && gap >= 1 && gap <= 3) {
      bucket = 'near_record';
    } else if (ctx.beginner) {
      bucket = 'beginner';
    } else if (reason && Array.isArray(languagePhrases[reason])) {
      bucket = reason;
    } else if (ctx.nearMiss) {
      bucket = 'near_miss';
    }
    return pickFromBucket(bucket);
  }

  window.OrbitaI18n = {
    t: t,
    setLang: setLang,
    cycleLang: cycleLang,
    currentLang: currentLang,
    pickContextualPhrase: pickContextualPhrase,
    SUPPORTED: SUPPORTED.slice(),
  };
})();
