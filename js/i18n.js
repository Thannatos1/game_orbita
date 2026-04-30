// ============================================================
// ORBITA I18N - Internationalization
// PT-BR (default) / EN / ES
// ============================================================
// Detecta o idioma do navegador no primeiro load e persiste em
// localStorage. Usuario pode alternar via botao no menu (cycleLang).
// API publica em window.OrbitaI18n.
// ============================================================
(function(){
  'use strict';

  const SUPPORTED = ['pt', 'en', 'es'];

  // ---------- UI strings ----------
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
      training_match_singular: '🌱 PARTIDA DE TREINO ({n} restante)',
      training_match_plural: '🌱 PARTIDA DE TREINO ({n} restantes)',
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
      training_match_singular: '🌱 PRACTICE GAME ({n} left)',
      training_match_plural: '🌱 PRACTICE GAME ({n} left)',
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
      training_match_singular: '🌱 PARTIDA DE PRUEBA ({n} restante)',
      training_match_plural: '🌱 PARTIDA DE PRUEBA ({n} restantes)',
      tap_to_release: 'TOCA PARA SOLTAR',
      release_hint_1: 'la bolita sale de la órbita y vuela',
      release_hint_2: 'toca para entrar en órbita en el próximo nodo',
      morreu: 'MURIÓ',
      record_pct: '{n}% del récord',
      new_record_banner: '⭐ ¡NUEVO RÉCORD! ⭐',
      tap_to_retry: 'TOCA PARA JUGAR DE NUEVO',
      mega_bonus_text: '⭐ ¡MEGA BONO! +{n}',
      bonus_x2_text: '✦ BONO x2 ✦',
      near_miss_text: '¡CASI!',
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
      shield_saved: 'ESCUDO TE SALVÓ',
      mission_popup: '¡MISIÓN!',
      lang_label: 'ES',
    }
  };

  // ---------- Phrase buckets contextuais ----------
  // Mantemos a estrutura: cada idioma tem 9 buckets (8 contextuais + generic)
  const PHRASES = {
    pt: {
      new_record: [
        'ISSO! VAI!','NOVO RECORDE!','Você é fera.','Tá voando hoje!',
        'Próximo objetivo: dobrar isso.','Se gabar é justo agora.',
        'Hoje o dedo tá afiado.','Tu não para mais não, né?',
        'Print disso.','GG.',
      ],
      near_record: [
        'POR ESSA?!','FALTOU NADA!','AAAAAAA!','Tava ali.',
        'Por 1 ponto??','Cruel.','Quase tive um treco.','Tava do lado.',
        'Você sabe que ia.','De novo. Vai sair.',
      ],
      near_miss: [
        'Era pra ter pegado.','O dedo veio errado.','Tava na mão.',
        'O dourado tava lá.','Calculou errado.','Encostou e voltou.',
        'Pertinho!','Soltou cedo demais.','Atrasou um frame.','Tava na unha.',
      ],
      first_death: [
        'Caiu no primeiro? Sério?','Já?','Nem chegou a esquentar.',
        'Calma, respira.','Foi só pra testar, né?','Vai com mais calma.',
        'Não esquenta, todo mundo erra o 1º.','Esse foi de presente.',
      ],
      early_death: [
        'Mole demais.','Concentra.','Acordou agora?','Esquentando ainda.',
        'Foco!','Cê tá lento hoje.','De novo, vai.','Sem distração.',
      ],
      combo_end: [
        'Tava no flow!','Combo perdido. DOEU.','Sequência quebrada.',
        'Mantém o ritmo!','Tava lindo. E aí?','Bora retomar.','O combo cobra.',
      ],
      long_run: [
        'Boa run.','Fez bonito.','Resistente.','Aguentou pancada.',
        'Tá evoluindo.','Próxima vai mais longe.',
      ],
      short_run: [
        'Apressado.','Calma!','Tem que pensar.','Não é speedrun.',
        'Respira fundo.','Devagar e sempre.',
      ],
      generic: [
        'Mais uma...','Você consegue.','Vai dessa vez.','Não chora.',
        'Reflexo lento.','Tá perto.','Respira e tenta.','De novo.',
        'Bora.','Tá ruim, hein?','Sem desculpa.','Tu sabe.',
        'Tem mais nessa.','Nem foi tão ruim.','A culpa é sua.',
        'Não foi o jogo.','Tenta o ouro dessa vez.','Sem chorar.',
        'Quero ver.','Mais foco.',
      ],
    },
    en: {
      new_record: [
        'YES! GO!','NEW RECORD!','You\'re on fire.','Flying today!',
        'Next goal: double it.','Time to brag.',
        'Sharp finger today.','You\'re unstoppable.',
        'Screenshot this.','GG.',
      ],
      near_record: [
        'THIS CLOSE?!','SO CLOSE!','AAAAAAA!','Right there.',
        'By 1 point??','Cruel.','My heart.','Right next to it.',
        'You knew it.','Again. You got this.',
      ],
      near_miss: [
        'Should have gotten it.','Wrong tap.','Had it in the bag.',
        'The gold was right there.','Miscalculated.','Touched and bounced.',
        'So close!','Released too early.','One frame late.','By a hair.',
      ],
      first_death: [
        'Died on the first one? Really?','Already?','Didn\'t even warm up.',
        'Take a breath.','Just testing, right?','Slow down a bit.',
        'Everyone misses the first.','That one was a gift.',
      ],
      early_death: [
        'Too easy on yourself.','Focus.','Just woke up?','Still warming up.',
        'Focus!','Slow today.','Again, go.','No distractions.',
      ],
      combo_end: [
        'You were in flow!','Combo lost. OUCH.','Streak broken.',
        'Keep the rhythm!','You were killing it. Now what?','Pick it back up.',
        'Combo takes its toll.',
      ],
      long_run: [
        'Good run.','Nicely done.','Resilient.','Took a beating.',
        'Improving.','Next one goes further.',
      ],
      short_run: [
        'Rushed.','Easy!','Think first.','Not a speedrun.',
        'Take a breath.','Slow and steady.',
      ],
      generic: [
        'One more...','You got this.','This time for sure.','Don\'t cry.',
        'Slow reflex.','So close.','Breathe and try.','Again.',
        'Let\'s go.','Bad day, huh?','No excuses.','You know it.',
        'There\'s more.','Wasn\'t that bad.','Your fault.',
        'Not the game.','Try the gold this time.','No tears.',
        'Show me.','More focus.',
      ],
    },
    es: {
      new_record: [
        '¡SÍ! ¡VAMOS!','¡NUEVO RÉCORD!','Eres una bestia.','¡Hoy estás volando!',
        'Próxima meta: duplicar.','Toca presumir.',
        'Dedo afilado hoy.','No paras más.',
        'Captura eso.','GG.',
      ],
      near_record: [
        '¿¡POR ESO?!','¡NADA!','¡AAAAAAA!','Estaba ahí.',
        '¿Por 1 punto??','Cruel.','Casi me da algo.','Al lado.',
        'Sabías que ibas.','Otra. Lo vas a sacar.',
      ],
      near_miss: [
        'Tenías que pegarlo.','Dedo equivocado.','Lo tenías.',
        'El dorado estaba ahí.','Mal calculado.','Tocó y volvió.',
        '¡Cerquita!','Soltaste muy temprano.','Un frame tarde.','Por un pelo.',
      ],
      first_death: [
        '¿Caíste en el primero? ¿En serio?','¿Ya?','Ni te calentaste.',
        'Tranquilo, respira.','Solo probaste, ¿no?','Más calma.',
        'Todos fallan el primero.','Ese fue regalo.',
      ],
      early_death: [
        'Muy fácil.','Concentra.','¿Recién despertaste?','Calentando aún.',
        '¡Foco!','Lento hoy.','Otra, dale.','Sin distracciones.',
      ],
      combo_end: [
        '¡Estabas en flow!','Combo perdido. DOLIÓ.','Racha rota.',
        '¡Mantén el ritmo!','Ibas lindo. ¿Y ahora?','A retomar.',
        'El combo cobra.',
      ],
      long_run: [
        'Buena run.','Bien hecho.','Resistente.','Aguantaste golpes.',
        'Progresando.','La próxima va más lejos.',
      ],
      short_run: [
        'Apurado.','¡Calma!','Hay que pensar.','No es speedrun.',
        'Respira hondo.','Lento pero seguro.',
      ],
      generic: [
        'Una más...','Tú puedes.','Esta vez sí.','No llores.',
        'Reflejo lento.','Cerquita.','Respira e intenta.','Otra vez.',
        'Vamos.','Mal día, ¿eh?','Sin excusas.','Tú sabes.',
        'Hay más.','No fue tan malo.','Tu culpa.',
        'No fue el juego.','Prueba con el dorado.','Sin lágrimas.',
        'Quiero ver.','Más foco.',
      ],
    }
  };

  // ---------- Frases extras motivacionais (carregadas pelo
  //            jogador num arquivo separado pra cada idioma) ----------
  // Estas vao todas pro bucket "generic" do respectivo idioma.
  // Dedup automatico contra os 9 buckets contextuais.

  const EXTRA_PT = [
    // ja existe no flappy_radical_patch _EXTRA_PHRASES original (PT)
    // Aqui a lista compacta - sao as mesmas 500.
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
  ];

  // EN extras (do arquivo 500_game_phrases_english.txt)
  const EXTRA_EN = [
    'Take your time.','Take your time, no rush.','Take your time, with focus.',
    'Take your time, with calm.','Take your time, with control.','Take your time, with attention.',
    'Take your time, with strategy.','Take your time, at the right timing.','Take your time, without panic.',
    'Take your time, without quitting.','Take your time, until the checkpoint.','Take your time, until it works.',
    'Take your time, one more time.',
    'Keep playing.','Keep playing, no rush.','Keep playing, with focus.',
    'Keep playing, with calm.','Keep playing, with control.','Keep playing, with attention.',
    'Keep playing, with strategy.','Keep playing, at the right timing.','Keep playing, without panic.',
    'Keep playing, without quitting.','Keep playing, until the checkpoint.','Keep playing, until it works.',
    'Keep playing, one more time.',
    'Try again.','Try again, no rush.','Try again, with focus.',
    'Try again, with calm.','Try again, with control.','Try again, with attention.',
    'Try again, with strategy.','Try again, at the right timing.','Try again, without panic.',
    'Try again, without quitting.','Try again, until the checkpoint.','Try again, until it works.',
    'Try again, one more time.',
    'Stay focused.','Stay focused, no rush.','Stay focused, with focus.',
    'Stay focused, with calm.','Stay focused, with control.','Stay focused, with attention.',
    'Stay focused, with strategy.','Stay focused, at the right timing.','Stay focused, without panic.',
    'Stay focused, without quitting.','Stay focused, until the checkpoint.','Stay focused, until it works.',
    'Stay focused, one more time.',
    'Read the pattern.','Read the pattern, no rush.','Read the pattern, with focus.',
    'Read the pattern, with calm.','Read the pattern, with control.','Read the pattern, with attention.',
    'Read the pattern, with strategy.','Read the pattern, at the right timing.','Read the pattern, without panic.',
    'Read the pattern, without quitting.','Read the pattern, until the checkpoint.','Read the pattern, until it works.',
    'Read the pattern, one more time.',
    'Watch the timing.','Watch the timing, no rush.','Watch the timing, with focus.',
    'Watch the timing, with calm.','Watch the timing, with control.','Watch the timing, with attention.',
    'Watch the timing, with strategy.','Watch the timing, at the right timing.','Watch the timing, without panic.',
    'Watch the timing, without quitting.','Watch the timing, until the checkpoint.','Watch the timing, until it works.',
    'Watch the timing, one more time.',
    'Control the move.','Control the move, no rush.','Control the move, with focus.',
    'Control the move, with calm.','Control the move, with control.','Control the move, with attention.',
    'Control the move, with strategy.','Control the move, at the right timing.','Control the move, without panic.',
    'Control the move, without quitting.','Control the move, until the checkpoint.','Control the move, until it works.',
    'Control the move, one more time.',
    'Use the strategy.','Use the strategy, no rush.','Use the strategy, with focus.',
    'Use the strategy, with calm.','Use the strategy, with control.','Use the strategy, with attention.',
    'Use the strategy, with strategy.','Use the strategy, at the right timing.','Use the strategy, without panic.',
    'Use the strategy, without quitting.','Use the strategy, until the checkpoint.','Use the strategy, until it works.',
    'Use the strategy, one more time.',
    'Save your energy.','Save your energy, no rush.','Save your energy, with focus.',
    'Save your energy, with calm.','Save your energy, with control.','Save your energy, with attention.',
    'Save your energy, with strategy.','Save your energy, at the right timing.','Save your energy, without panic.',
    'Save your energy, without quitting.','Save your energy, until the checkpoint.','Save your energy, until it works.',
    'Save your energy, one more time.',
    'Wait for the opening.','Wait for the opening, no rush.','Wait for the opening, with focus.',
    'Wait for the opening, with calm.','Wait for the opening, with control.','Wait for the opening, with attention.',
    'Wait for the opening, with strategy.','Wait for the opening, at the right timing.','Wait for the opening, without panic.',
    'Wait for the opening, without quitting.','Wait for the opening, until the checkpoint.','Wait for the opening, until it works.',
    'Wait for the opening, one more time.',
    'Aim better.','Aim better, no rush.','Aim better, with focus.',
    'Aim better, with calm.','Aim better, with control.','Aim better, with attention.',
    'Aim better, with strategy.','Aim better, at the right timing.','Aim better, without panic.',
    'Aim better, without quitting.','Aim better, until the checkpoint.','Aim better, until it works.',
    'Aim better, one more time.',
    'Move smarter.','Move smarter, no rush.','Move smarter, with focus.',
    'Move smarter, with calm.','Move smarter, with control.','Move smarter, with attention.',
    'Move smarter, with strategy.','Move smarter, at the right timing.','Move smarter, without panic.',
    'Move smarter, without quitting.','Move smarter, until the checkpoint.','Move smarter, until it works.',
    'Move smarter, one more time.',
    'Defend first.','Defend first, no rush.','Defend first, with focus.',
    'Defend first, with calm.','Defend first, with control.','Defend first, with attention.',
    'Defend first, with strategy.','Defend first, at the right timing.','Defend first, without panic.',
    'Defend first, without quitting.','Defend first, until the checkpoint.','Defend first, until it works.',
    'Defend first, one more time.',
    'Attack at the right time.','Attack at the right time, no rush.','Attack at the right time, with focus.',
    'Attack at the right time, with calm.','Attack at the right time, with control.','Attack at the right time, with attention.',
    'Attack at the right time, with strategy.','Attack at the right time, at the right timing.','Attack at the right time, without panic.',
    'Attack at the right time, without quitting.','Attack at the right time, until the checkpoint.','Attack at the right time, until it works.',
    'Attack at the right time, one more time.',
    'Learn the level.','Learn the level, no rush.','Learn the level, with focus.',
    'Learn the level, with calm.','Learn the level, with control.','Learn the level, with attention.',
    'Learn the level, with strategy.','Learn the level, at the right timing.','Learn the level, without panic.',
    'Learn the level, without quitting.','Learn the level, until the checkpoint.','Learn the level, until it works.',
    'Learn the level, one more time.',
    'Trust the process.','Trust the process, no rush.','Trust the process, with focus.',
    'Trust the process, with calm.','Trust the process, with control.','Trust the process, with attention.',
    'Trust the process, with strategy.','Trust the process, at the right timing.','Trust the process, without panic.',
    'Trust the process, without quitting.','Trust the process, until the checkpoint.','Trust the process, until it works.',
    'Trust the process, one more time.',
    'Follow the map.','Follow the map, no rush.','Follow the map, with focus.',
    'Follow the map, with calm.','Follow the map, with control.','Follow the map, with attention.',
    'Follow the map, with strategy.','Follow the map, at the right timing.','Follow the map, without panic.',
    'Follow the map, without quitting.','Follow the map, until the checkpoint.','Follow the map, until it works.',
    'Follow the map, one more time.',
    'Return to the mission.','Return to the mission, no rush.','Return to the mission, with focus.',
    'Return to the mission, with calm.','Return to the mission, with control.','Return to the mission, with attention.',
    'Return to the mission, with strategy.','Return to the mission, at the right timing.','Return to the mission, without panic.',
    'Return to the mission, without quitting.','Return to the mission, until the checkpoint.','Return to the mission, until it works.',
    'Return to the mission, one more time.',
    'Finish the level.','Finish the level, no rush.','Finish the level, with focus.',
    'Finish the level, with calm.','Finish the level, with control.','Finish the level, with attention.',
    'Finish the level, with strategy.','Finish the level, at the right timing.','Finish the level, without panic.',
    'Finish the level, without quitting.','Finish the level, until the checkpoint.','Finish the level, until it works.',
    'Finish the level, one more time.',
    'Reach the checkpoint.','Reach the checkpoint, no rush.','Reach the checkpoint, with focus.',
    'Reach the checkpoint, with calm.','Reach the checkpoint, with control.','Reach the checkpoint, with attention.',
    'Reach the checkpoint, with strategy.','Reach the checkpoint, at the right timing.','Reach the checkpoint, without panic.',
    'Reach the checkpoint, without quitting.','Reach the checkpoint, until the checkpoint.','Reach the checkpoint, until it works.',
    'Reach the checkpoint, one more time.',
    'Play with calm.','Play with calm, no rush.','Play with calm, with focus.',
    'Play with calm, with calm.','Play with calm, with control.','Play with calm, with attention.',
    'Play with calm, with strategy.','Play with calm, at the right timing.','Play with calm, without panic.',
    'Play with calm, without quitting.','Play with calm, until the checkpoint.','Play with calm, until it works.',
    'Play with calm, one more time.',
    'Play with focus.','Play with focus, no rush.','Play with focus, with focus.',
    'Play with focus, with calm.','Play with focus, with control.','Play with focus, with attention.',
    'Play with focus, with strategy.','Play with focus, at the right timing.','Play with focus, without panic.',
    'Play with focus, without quitting.','Play with focus, until the checkpoint.','Play with focus, until it works.',
    'Play with focus, one more time.',
    'Play with control.','Play with control, no rush.','Play with control, with focus.',
    'Play with control, with calm.','Play with control, with control.','Play with control, with attention.',
    'Play with control, with strategy.','Play with control, at the right timing.','Play with control, without panic.',
    'Play with control, without quitting.','Play with control, until the checkpoint.','Play with control, until it works.',
    'Play with control, one more time.',
    'Change the route.','Change the route, no rush.','Change the route, with focus.',
    'Change the route, with calm.','Change the route, with control.','Change the route, with attention.',
    'Change the route, with strategy.','Change the route, at the right timing.','Change the route, without panic.',
    'Change the route, without quitting.','Change the route, until the checkpoint.','Change the route, until it works.',
    'Change the route, one more time.',
    'Fix the mistake.','Fix the mistake, no rush.','Fix the mistake, with focus.',
    'Fix the mistake, with calm.','Fix the mistake, with control.','Fix the mistake, with attention.',
    'Fix the mistake, with strategy.','Fix the mistake, at the right timing.','Fix the mistake, without panic.',
    'Fix the mistake, without quitting.','Fix the mistake, until the checkpoint.','Fix the mistake, until it works.',
    'Fix the mistake, one more time.',
    'Use what you learned.','Use what you learned, no rush.','Use what you learned, with focus.',
    'Use what you learned, with calm.','Use what you learned, with control.','Use what you learned, with attention.',
    'Use what you learned, with strategy.','Use what you learned, at the right timing.','Use what you learned, without panic.',
    'Use what you learned, without quitting.','Use what you learned, until the checkpoint.','Use what you learned, until it works.',
    'Use what you learned, one more time.',
    'Keep the rhythm.','Keep the rhythm, no rush.','Keep the rhythm, with focus.',
    'Keep the rhythm, with calm.','Keep the rhythm, with control.','Keep the rhythm, with attention.',
    'Keep the rhythm, with strategy.','Keep the rhythm, at the right timing.','Keep the rhythm, without panic.',
    'Keep the rhythm, without quitting.','Keep the rhythm, until the checkpoint.','Keep the rhythm, until it works.',
    'Keep the rhythm, one more time.',
    'Do not rush.','Do not rush, no rush.','Do not rush, with focus.',
    'Do not rush, with calm.','Do not rush, with control.','Do not rush, with attention.',
    'Do not rush, with strategy.','Do not rush, at the right timing.','Do not rush, without panic.',
    'Do not rush, without quitting.','Do not rush, until the checkpoint.','Do not rush, until it works.',
    'Do not rush, one more time.',
    'Do not panic.','Do not panic, no rush.','Do not panic, with focus.',
    'Do not panic, with calm.','Do not panic, with control.','Do not panic, with attention.',
    'Do not panic, with strategy.','Do not panic, at the right timing.','Do not panic, without panic.',
    'Do not panic, without quitting.','Do not panic, until the checkpoint.','Do not panic, until it works.',
    'Do not panic, one more time.',
    'Do not quit.','Do not quit, no rush.','Do not quit, with focus.',
    'Do not quit, with calm.','Do not quit, with control.','Do not quit, with attention.',
    'Do not quit, with strategy.','Do not quit, at the right timing.','Do not quit, without panic.',
    'Do not quit, without quitting.','Do not quit, until the checkpoint.','Do not quit, until it works.',
    'Do not quit, one more time.',
    'One more run.','One more run, no rush.','One more run, with focus.',
    'One more run, with calm.','One more run, with control.','One more run, with attention.',
    'One more run, with strategy.','One more run, at the right timing.','One more run, without panic.',
    'One more run, without quitting.','One more run, until the checkpoint.','One more run, until it works.',
    'One more run, one more time.',
    'One more chance.','One more chance, no rush.','One more chance, with focus.',
    'One more chance, with calm.','One more chance, with control.','One more chance, with attention.',
    'One more chance, with strategy.','One more chance, at the right timing.','One more chance, without panic.',
    'One more chance, without quitting.','One more chance, until the checkpoint.','One more chance, until it works.',
    'One more chance, one more time.',
    'One more step.','One more step, no rush.','One more step, with focus.',
    'One more step, with calm.','One more step, with control.','One more step, with attention.',
    'One more step, with strategy.','One more step, at the right timing.','One more step, without panic.',
    'One more step, without quitting.','One more step, until the checkpoint.','One more step, until it works.',
    'One more step, one more time.',
    'The game continues.','The game continues, no rush.','The game continues, with focus.',
    'The game continues, with calm.','The game continues, with control.','The game continues, with attention.',
    'The game continues, with strategy.','The game continues, at the right timing.','The game continues, without panic.',
    'The game continues, without quitting.','The game continues, until the checkpoint.','The game continues, until it works.',
    'The game continues, one more time.',
    'The boss has a pattern.','The boss has a pattern, no rush.','The boss has a pattern, with focus.',
    'The boss has a pattern, with calm.','The boss has a pattern, with control.','The boss has a pattern, with attention.',
    'The boss has a pattern, with strategy.','The boss has a pattern, at the right timing.','The boss has a pattern, without panic.',
    'The boss has a pattern, without quitting.','The boss has a pattern, until the checkpoint.','The boss has a pattern, until it works.',
    'The boss has a pattern, one more time.',
    'The level can be learned.','The level can be learned, no rush.','The level can be learned, with focus.',
    'The level can be learned, with calm.','The level can be learned, with control.','The level can be learned, with attention.',
    'The level can be learned, with strategy.','The level can be learned, at the right timing.','The level can be learned, without panic.',
    'The level can be learned, without quitting.','The level can be learned, until the checkpoint.','The level can be learned, until it works.',
    'The level can be learned, one more time.',
    'Every mistake teaches.','Every mistake teaches, no rush.','Every mistake teaches, with focus.',
    'Every mistake teaches, with calm.','Every mistake teaches, with control.','Every mistake teaches, with attention.',
    'Every mistake teaches, with strategy.','Every mistake teaches, at the right timing.','Every mistake teaches, without panic.',
    'Every mistake teaches, without quitting.','Every mistake teaches, until the checkpoint.','Every mistake teaches, until it works.',
    'Every mistake teaches, one more time.',
    'Practice changes everything.','Practice changes everything, no rush.','Practice changes everything, with focus.',
    'Practice changes everything, with calm.','Practice changes everything, with control.','Practice changes everything, with attention.',
    'Practice changes everything, with strategy.','Practice changes everything, at the right timing.','Practice changes everything, without panic.',
    'Practice changes everything, without quitting.','Practice changes everything, until the checkpoint.','Practice changes everything, until it works.',
    'Practice changes everything, one more time.',
    'The basics win.','The basics win, no rush.','The basics win, with focus.',
    'The basics win, with calm.','The basics win, with control.','The basics win, with attention.',
  ];

  // ES extras (do arquivo 500_frases_juego_espanol.txt)
  const EXTRA_ES = [
    'Ve a tu ritmo.','Ve a tu ritmo, sin prisa.','Ve a tu ritmo, con foco.',
    'Ve a tu ritmo, con calma.','Ve a tu ritmo, con control.','Ve a tu ritmo, con atencion.',
    'Ve a tu ritmo, con estrategia.','Ve a tu ritmo, con el timing correcto.','Ve a tu ritmo, sin panico.',
    'Ve a tu ritmo, sin rendirte.','Ve a tu ritmo, hasta el checkpoint.','Ve a tu ritmo, hasta que funcione.',
    'Ve a tu ritmo, una vez mas.',
    'Sigue jugando.','Sigue jugando, sin prisa.','Sigue jugando, con foco.',
    'Sigue jugando, con calma.','Sigue jugando, con control.','Sigue jugando, con atencion.',
    'Sigue jugando, con estrategia.','Sigue jugando, con el timing correcto.','Sigue jugando, sin panico.',
    'Sigue jugando, sin rendirte.','Sigue jugando, hasta el checkpoint.','Sigue jugando, hasta que funcione.',
    'Sigue jugando, una vez mas.',
    'Intentalo de nuevo.','Intentalo de nuevo, sin prisa.','Intentalo de nuevo, con foco.',
    'Intentalo de nuevo, con calma.','Intentalo de nuevo, con control.','Intentalo de nuevo, con atencion.',
    'Intentalo de nuevo, con estrategia.','Intentalo de nuevo, con el timing correcto.','Intentalo de nuevo, sin panico.',
    'Intentalo de nuevo, sin rendirte.','Intentalo de nuevo, hasta el checkpoint.','Intentalo de nuevo, hasta que funcione.',
    'Intentalo de nuevo, una vez mas.',
    'Manten el foco.','Manten el foco, sin prisa.','Manten el foco, con foco.',
    'Manten el foco, con calma.','Manten el foco, con control.','Manten el foco, con atencion.',
    'Manten el foco, con estrategia.','Manten el foco, con el timing correcto.','Manten el foco, sin panico.',
    'Manten el foco, sin rendirte.','Manten el foco, hasta el checkpoint.','Manten el foco, hasta que funcione.',
    'Manten el foco, una vez mas.',
    'Lee el patron.','Lee el patron, sin prisa.','Lee el patron, con foco.',
    'Lee el patron, con calma.','Lee el patron, con control.','Lee el patron, con atencion.',
    'Lee el patron, con estrategia.','Lee el patron, con el timing correcto.','Lee el patron, sin panico.',
    'Lee el patron, sin rendirte.','Lee el patron, hasta el checkpoint.','Lee el patron, hasta que funcione.',
    'Lee el patron, una vez mas.',
    'Mira el timing.','Mira el timing, sin prisa.','Mira el timing, con foco.',
    'Mira el timing, con calma.','Mira el timing, con control.','Mira el timing, con atencion.',
    'Mira el timing, con estrategia.','Mira el timing, con el timing correcto.','Mira el timing, sin panico.',
    'Mira el timing, sin rendirte.','Mira el timing, hasta el checkpoint.','Mira el timing, hasta que funcione.',
    'Mira el timing, una vez mas.',
    'Controla el movimiento.','Controla el movimiento, sin prisa.','Controla el movimiento, con foco.',
    'Controla el movimiento, con calma.','Controla el movimiento, con control.','Controla el movimiento, con atencion.',
    'Controla el movimiento, con estrategia.','Controla el movimiento, con el timing correcto.','Controla el movimiento, sin panico.',
    'Controla el movimiento, sin rendirte.','Controla el movimiento, hasta el checkpoint.','Controla el movimiento, hasta que funcione.',
    'Controla el movimiento, una vez mas.',
    'Usa la estrategia.','Usa la estrategia, sin prisa.','Usa la estrategia, con foco.',
    'Usa la estrategia, con calma.','Usa la estrategia, con control.','Usa la estrategia, con atencion.',
    'Usa la estrategia, con estrategia.','Usa la estrategia, con el timing correcto.','Usa la estrategia, sin panico.',
    'Usa la estrategia, sin rendirte.','Usa la estrategia, hasta el checkpoint.','Usa la estrategia, hasta que funcione.',
    'Usa la estrategia, una vez mas.',
    'Guarda tu energia.','Guarda tu energia, sin prisa.','Guarda tu energia, con foco.',
    'Guarda tu energia, con calma.','Guarda tu energia, con control.','Guarda tu energia, con atencion.',
    'Guarda tu energia, con estrategia.','Guarda tu energia, con el timing correcto.','Guarda tu energia, sin panico.',
    'Guarda tu energia, sin rendirte.','Guarda tu energia, hasta el checkpoint.','Guarda tu energia, hasta que funcione.',
    'Guarda tu energia, una vez mas.',
    'Espera la apertura.','Espera la apertura, sin prisa.','Espera la apertura, con foco.',
    'Espera la apertura, con calma.','Espera la apertura, con control.','Espera la apertura, con atencion.',
    'Espera la apertura, con estrategia.','Espera la apertura, con el timing correcto.','Espera la apertura, sin panico.',
    'Espera la apertura, sin rendirte.','Espera la apertura, hasta el checkpoint.','Espera la apertura, hasta que funcione.',
    'Espera la apertura, una vez mas.',
    'Apunta mejor.','Apunta mejor, sin prisa.','Apunta mejor, con foco.',
    'Apunta mejor, con calma.','Apunta mejor, con control.','Apunta mejor, con atencion.',
    'Apunta mejor, con estrategia.','Apunta mejor, con el timing correcto.','Apunta mejor, sin panico.',
    'Apunta mejor, sin rendirte.','Apunta mejor, hasta el checkpoint.','Apunta mejor, hasta que funcione.',
    'Apunta mejor, una vez mas.',
    'Muevete mejor.','Muevete mejor, sin prisa.','Muevete mejor, con foco.',
    'Muevete mejor, con calma.','Muevete mejor, con control.','Muevete mejor, con atencion.',
    'Muevete mejor, con estrategia.','Muevete mejor, con el timing correcto.','Muevete mejor, sin panico.',
    'Muevete mejor, sin rendirte.','Muevete mejor, hasta el checkpoint.','Muevete mejor, hasta que funcione.',
    'Muevete mejor, una vez mas.',
    'Defiende primero.','Defiende primero, sin prisa.','Defiende primero, con foco.',
    'Defiende primero, con calma.','Defiende primero, con control.','Defiende primero, con atencion.',
    'Defiende primero, con estrategia.','Defiende primero, con el timing correcto.','Defiende primero, sin panico.',
    'Defiende primero, sin rendirte.','Defiende primero, hasta el checkpoint.','Defiende primero, hasta que funcione.',
    'Defiende primero, una vez mas.',
    'Ataca en el momento correcto.','Ataca en el momento correcto, sin prisa.','Ataca en el momento correcto, con foco.',
    'Ataca en el momento correcto, con calma.','Ataca en el momento correcto, con control.','Ataca en el momento correcto, con atencion.',
    'Ataca en el momento correcto, con estrategia.','Ataca en el momento correcto, con el timing correcto.','Ataca en el momento correcto, sin panico.',
    'Ataca en el momento correcto, sin rendirte.','Ataca en el momento correcto, hasta el checkpoint.','Ataca en el momento correcto, hasta que funcione.',
    'Ataca en el momento correcto, una vez mas.',
    'Aprende el nivel.','Aprende el nivel, sin prisa.','Aprende el nivel, con foco.',
    'Aprende el nivel, con calma.','Aprende el nivel, con control.','Aprende el nivel, con atencion.',
    'Aprende el nivel, con estrategia.','Aprende el nivel, con el timing correcto.','Aprende el nivel, sin panico.',
    'Aprende el nivel, sin rendirte.','Aprende el nivel, hasta el checkpoint.','Aprende el nivel, hasta que funcione.',
    'Aprende el nivel, una vez mas.',
    'Confia en el proceso.','Confia en el proceso, sin prisa.','Confia en el proceso, con foco.',
    'Confia en el proceso, con calma.','Confia en el proceso, con control.','Confia en el proceso, con atencion.',
    'Confia en el proceso, con estrategia.','Confia en el proceso, con el timing correcto.','Confia en el proceso, sin panico.',
    'Confia en el proceso, sin rendirte.','Confia en el proceso, hasta el checkpoint.','Confia en el proceso, hasta que funcione.',
    'Confia en el proceso, una vez mas.',
    'Sigue el mapa.','Sigue el mapa, sin prisa.','Sigue el mapa, con foco.',
    'Sigue el mapa, con calma.','Sigue el mapa, con control.','Sigue el mapa, con atencion.',
    'Sigue el mapa, con estrategia.','Sigue el mapa, con el timing correcto.','Sigue el mapa, sin panico.',
    'Sigue el mapa, sin rendirte.','Sigue el mapa, hasta el checkpoint.','Sigue el mapa, hasta que funcione.',
    'Sigue el mapa, una vez mas.',
    'Vuelve a la mision.','Vuelve a la mision, sin prisa.','Vuelve a la mision, con foco.',
    'Vuelve a la mision, con calma.','Vuelve a la mision, con control.','Vuelve a la mision, con atencion.',
    'Vuelve a la mision, con estrategia.','Vuelve a la mision, con el timing correcto.','Vuelve a la mision, sin panico.',
    'Vuelve a la mision, sin rendirte.','Vuelve a la mision, hasta el checkpoint.','Vuelve a la mision, hasta que funcione.',
    'Vuelve a la mision, una vez mas.',
    'Termina el nivel.','Termina el nivel, sin prisa.','Termina el nivel, con foco.',
    'Termina el nivel, con calma.','Termina el nivel, con control.','Termina el nivel, con atencion.',
    'Termina el nivel, con estrategia.','Termina el nivel, con el timing correcto.','Termina el nivel, sin panico.',
    'Termina el nivel, sin rendirte.','Termina el nivel, hasta el checkpoint.','Termina el nivel, hasta que funcione.',
    'Termina el nivel, una vez mas.',
    'Llega al checkpoint.','Llega al checkpoint, sin prisa.','Llega al checkpoint, con foco.',
    'Llega al checkpoint, con calma.','Llega al checkpoint, con control.','Llega al checkpoint, con atencion.',
    'Llega al checkpoint, con estrategia.','Llega al checkpoint, con el timing correcto.','Llega al checkpoint, sin panico.',
    'Llega al checkpoint, sin rendirte.','Llega al checkpoint, hasta el checkpoint.','Llega al checkpoint, hasta que funcione.',
    'Llega al checkpoint, una vez mas.',
    'Juega con calma.','Juega con calma, sin prisa.','Juega con calma, con foco.',
    'Juega con calma, con calma.','Juega con calma, con control.','Juega con calma, con atencion.',
    'Juega con calma, con estrategia.','Juega con calma, con el timing correcto.','Juega con calma, sin panico.',
    'Juega con calma, sin rendirte.','Juega con calma, hasta el checkpoint.','Juega con calma, hasta que funcione.',
    'Juega con calma, una vez mas.',
    'Juega con foco.','Juega con foco, sin prisa.','Juega con foco, con foco.',
    'Juega con foco, con calma.','Juega con foco, con control.','Juega con foco, con atencion.',
    'Juega con foco, con estrategia.','Juega con foco, con el timing correcto.','Juega con foco, sin panico.',
    'Juega con foco, sin rendirte.','Juega con foco, hasta el checkpoint.','Juega con foco, hasta que funcione.',
    'Juega con foco, una vez mas.',
    'Juega con control.','Juega con control, sin prisa.','Juega con control, con foco.',
    'Juega con control, con calma.','Juega con control, con control.','Juega con control, con atencion.',
    'Juega con control, con estrategia.','Juega con control, con el timing correcto.','Juega con control, sin panico.',
    'Juega con control, sin rendirte.','Juega con control, hasta el checkpoint.','Juega con control, hasta que funcione.',
    'Juega con control, una vez mas.',
    'Cambia la ruta.','Cambia la ruta, sin prisa.','Cambia la ruta, con foco.',
    'Cambia la ruta, con calma.','Cambia la ruta, con control.','Cambia la ruta, con atencion.',
    'Cambia la ruta, con estrategia.','Cambia la ruta, con el timing correcto.','Cambia la ruta, sin panico.',
    'Cambia la ruta, sin rendirte.','Cambia la ruta, hasta el checkpoint.','Cambia la ruta, hasta que funcione.',
    'Cambia la ruta, una vez mas.',
    'Corrige el error.','Corrige el error, sin prisa.','Corrige el error, con foco.',
    'Corrige el error, con calma.','Corrige el error, con control.','Corrige el error, con atencion.',
    'Corrige el error, con estrategia.','Corrige el error, con el timing correcto.','Corrige el error, sin panico.',
    'Corrige el error, sin rendirte.','Corrige el error, hasta el checkpoint.','Corrige el error, hasta que funcione.',
    'Corrige el error, una vez mas.',
    'Usa lo que aprendiste.','Usa lo que aprendiste, sin prisa.','Usa lo que aprendiste, con foco.',
    'Usa lo que aprendiste, con calma.','Usa lo que aprendiste, con control.','Usa lo que aprendiste, con atencion.',
    'Usa lo que aprendiste, con estrategia.','Usa lo que aprendiste, con el timing correcto.','Usa lo que aprendiste, sin panico.',
    'Usa lo que aprendiste, sin rendirte.','Usa lo que aprendiste, hasta el checkpoint.','Usa lo que aprendiste, hasta que funcione.',
    'Usa lo que aprendiste, una vez mas.',
    'Manten el ritmo.','Manten el ritmo, sin prisa.','Manten el ritmo, con foco.',
    'Manten el ritmo, con calma.','Manten el ritmo, con control.','Manten el ritmo, con atencion.',
    'Manten el ritmo, con estrategia.','Manten el ritmo, con el timing correcto.','Manten el ritmo, sin panico.',
    'Manten el ritmo, sin rendirte.','Manten el ritmo, hasta el checkpoint.','Manten el ritmo, hasta que funcione.',
    'Manten el ritmo, una vez mas.',
    'No corras.','No corras, sin prisa.','No corras, con foco.',
    'No corras, con calma.','No corras, con control.','No corras, con atencion.',
    'No corras, con estrategia.','No corras, con el timing correcto.','No corras, sin panico.',
    'No corras, sin rendirte.','No corras, hasta el checkpoint.','No corras, hasta que funcione.',
    'No corras, una vez mas.',
    'No entres en panico.','No entres en panico, sin prisa.','No entres en panico, con foco.',
    'No entres en panico, con calma.','No entres en panico, con control.','No entres en panico, con atencion.',
    'No entres en panico, con estrategia.','No entres en panico, con el timing correcto.','No entres en panico, sin panico.',
    'No entres en panico, sin rendirte.','No entres en panico, hasta el checkpoint.','No entres en panico, hasta que funcione.',
    'No entres en panico, una vez mas.',
    'No te rindas.','No te rindas, sin prisa.','No te rindas, con foco.',
    'No te rindas, con calma.','No te rindas, con control.','No te rindas, con atencion.',
    'No te rindas, con estrategia.','No te rindas, con el timing correcto.','No te rindas, sin panico.',
    'No te rindas, sin rendirte.','No te rindas, hasta el checkpoint.','No te rindas, hasta que funcione.',
    'No te rindas, una vez mas.',
    'Una run mas.','Una run mas, sin prisa.','Una run mas, con foco.',
    'Una run mas, con calma.','Una run mas, con control.','Una run mas, con atencion.',
    'Una run mas, con estrategia.','Una run mas, con el timing correcto.','Una run mas, sin panico.',
    'Una run mas, sin rendirte.','Una run mas, hasta el checkpoint.','Una run mas, hasta que funcione.',
    'Una run mas, una vez mas.',
    'Una oportunidad mas.','Una oportunidad mas, sin prisa.','Una oportunidad mas, con foco.',
    'Una oportunidad mas, con calma.','Una oportunidad mas, con control.','Una oportunidad mas, con atencion.',
    'Una oportunidad mas, con estrategia.','Una oportunidad mas, con el timing correcto.','Una oportunidad mas, sin panico.',
    'Una oportunidad mas, sin rendirte.','Una oportunidad mas, hasta el checkpoint.','Una oportunidad mas, hasta que funcione.',
    'Una oportunidad mas, una vez mas.',
    'Un paso mas.','Un paso mas, sin prisa.','Un paso mas, con foco.',
    'Un paso mas, con calma.','Un paso mas, con control.','Un paso mas, con atencion.',
    'Un paso mas, con estrategia.','Un paso mas, con el timing correcto.','Un paso mas, sin panico.',
    'Un paso mas, sin rendirte.','Un paso mas, hasta el checkpoint.','Un paso mas, hasta que funcione.',
    'Un paso mas, una vez mas.',
    'El juego continua.','El juego continua, sin prisa.','El juego continua, con foco.',
    'El juego continua, con calma.','El juego continua, con control.','El juego continua, con atencion.',
    'El juego continua, con estrategia.','El juego continua, con el timing correcto.','El juego continua, sin panico.',
    'El juego continua, sin rendirte.','El juego continua, hasta el checkpoint.','El juego continua, hasta que funcione.',
    'El juego continua, una vez mas.',
    'El jefe tiene patron.','El jefe tiene patron, sin prisa.','El jefe tiene patron, con foco.',
    'El jefe tiene patron, con calma.','El jefe tiene patron, con control.','El jefe tiene patron, con atencion.',
    'El jefe tiene patron, con estrategia.','El jefe tiene patron, con el timing correcto.','El jefe tiene patron, sin panico.',
    'El jefe tiene patron, sin rendirte.','El jefe tiene patron, hasta el checkpoint.','El jefe tiene patron, hasta que funcione.',
    'El jefe tiene patron, una vez mas.',
    'El nivel se puede aprender.','El nivel se puede aprender, sin prisa.','El nivel se puede aprender, con foco.',
    'El nivel se puede aprender, con calma.','El nivel se puede aprender, con control.','El nivel se puede aprender, con atencion.',
    'El nivel se puede aprender, con estrategia.','El nivel se puede aprender, con el timing correcto.','El nivel se puede aprender, sin panico.',
    'El nivel se puede aprender, sin rendirte.','El nivel se puede aprender, hasta el checkpoint.','El nivel se puede aprender, hasta que funcione.',
    'El nivel se puede aprender, una vez mas.',
    'Cada error ensena.','Cada error ensena, sin prisa.','Cada error ensena, con foco.',
    'Cada error ensena, con calma.','Cada error ensena, con control.','Cada error ensena, con atencion.',
    'Cada error ensena, con estrategia.','Cada error ensena, con el timing correcto.','Cada error ensena, sin panico.',
    'Cada error ensena, sin rendirte.','Cada error ensena, hasta el checkpoint.','Cada error ensena, hasta que funcione.',
    'Cada error ensena, una vez mas.',
    'La practica lo cambia todo.','La practica lo cambia todo, sin prisa.','La practica lo cambia todo, con foco.',
    'La practica lo cambia todo, con calma.','La practica lo cambia todo, con control.','La practica lo cambia todo, con atencion.',
    'La practica lo cambia todo, con estrategia.','La practica lo cambia todo, con el timing correcto.','La practica lo cambia todo, sin panico.',
    'La practica lo cambia todo, sin rendirte.','La practica lo cambia todo, hasta el checkpoint.','La practica lo cambia todo, hasta que funcione.',
    'La practica lo cambia todo, una vez mas.',
    'Lo basico gana.','Lo basico gana, sin prisa.','Lo basico gana, con foco.',
    'Lo basico gana, con calma.','Lo basico gana, con control.','Lo basico gana, con atencion.',
  ];

  // ---------- Merge das extras no bucket "generic" do idioma, com dedup ----------
  function mergeExtras(lang, extras){
    const seen = new Set();
    for (const k in PHRASES[lang]) {
      for (const p of PHRASES[lang][k]) seen.add(p);
    }
    for (const p of extras) {
      if (!seen.has(p)) {
        PHRASES[lang].generic.push(p);
        seen.add(p);
      }
    }
  }
  mergeExtras('pt', EXTRA_PT);
  mergeExtras('en', EXTRA_EN);
  mergeExtras('es', EXTRA_ES);

  // ---------- Detect lang ----------
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

  // ---------- Public API ----------
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

  // Resolve o bucket apropriado baseado no contexto da morte
  function pickContextualPhrase(ctx){
    ctx = ctx || {};
    const sc = ctx.score || 0;
    const bs = ctx.best || 0;
    const isNewRec = !!ctx.newRec;
    const gap = bs - sc;
    const hadNearMiss = !!ctx.nearMiss;
    const dur = ctx.duration || 0;
    const combo = ctx.combo || 0;

    let bucket = 'generic';
    if (isNewRec)                                 bucket = 'new_record';
    else if (bs > 0 && gap >= 1 && gap <= 3)      bucket = 'near_record';
    else if (hadNearMiss)                         bucket = 'near_miss';
    else if (sc === 0)                            bucket = 'first_death';
    else if (sc <= 4)                             bucket = 'early_death';
    else if (combo >= 5)                          bucket = 'combo_end';
    else if (dur >= 30)                           bucket = 'long_run';
    else if (dur > 0 && dur < 5)                  bucket = 'short_run';
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
