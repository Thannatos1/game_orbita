(function(){
  const RH = {
    captures: 0,
    goldCaptures: 0,
    powerups: 0,
    maxCombo: 0,
    highestPhase: 1,
    progressSentScore: 0,
    progressUpdates: 0,
    lastReason: null,
    retryPending: false
  };

  function resetRankingHardeningMetrics(){
    RH.captures = 0;
    RH.goldCaptures = 0;
    RH.powerups = 0;
    RH.maxCombo = 0;
    RH.highestPhase = 1;
    RH.progressSentScore = 0;
    RH.progressUpdates = 0;
    RH.lastReason = null;
    RH.retryPending = false;
  }

  function currentPhaseSafe(){
    try {
      return typeof getPhase === 'function' ? Number(getPhase()) || 1 : 1;
    } catch (e) {
      return 1;
    }
  }

  function getRankingHardeningMeta(reason){
    return {
      reason: reason || null,
      mode: typeof testMode !== 'undefined' && testMode ? 'test' : (typeof zenMode !== 'undefined' && zenMode ? 'zen' : 'normal'),
      captures: RH.captures,
      gold_captures: RH.goldCaptures,
      powerups: RH.powerups,
      max_combo: Math.max(RH.maxCombo, Number(typeof maxCombo !== 'undefined' ? maxCombo : 0) || 0),
      highest_phase: Math.max(RH.highestPhase, currentPhaseSafe()),
      selected_skin: typeof selectedSkin !== 'undefined' ? selectedSkin : null,
      selected_bg: typeof selectedBg !== 'undefined' ? selectedBg : null,
      source: (typeof activeRunSession !== 'undefined' && activeRunSession && activeRunSession.source) ? activeRunSession.source : null
    };
  }

  async function reportRunProgress(reason, force){
    try {
      if (typeof sb === 'undefined' || !sb) return false;
      if (typeof currentUser === 'undefined' || !currentUser) return false;
      if (typeof networkOnline !== 'undefined' && !networkOnline) return false;
      if (typeof activeRunSession === 'undefined' || !activeRunSession || !activeRunSession.run_id) return false;
      if (typeof zenMode !== 'undefined' && zenMode) return false;
      if (typeof testMode !== 'undefined' && testMode) return false;

      const liveScore = Number(typeof score !== 'undefined' ? score : 0) || 0;
      const livePhase = Math.max(RH.highestPhase, currentPhaseSafe());
      const liveCombo = Math.max(RH.maxCombo, Number(typeof maxCombo !== 'undefined' ? maxCombo : 0) || 0);

      const mustRetry = RH.retryPending === true;
      if (!force && !mustRetry && reason === RH.lastReason && liveScore <= RH.progressSentScore) {
        return false;
      }

      const { data, error } = await sb.rpc('update_run_progress', {
        p_run_id: activeRunSession.run_id,
        p_score: liveScore,
        p_phase: livePhase,
        p_combo: liveCombo,
        p_total_captures: RH.captures,
        p_gold_captures: RH.goldCaptures,
        p_powerups: RH.powerups,
        p_client_meta: getRankingHardeningMeta(reason)
      });
      if (error) throw error;

      RH.progressSentScore = Math.max(RH.progressSentScore, liveScore);
      RH.progressUpdates += 1;
      RH.lastReason = reason || null;
      RH.retryPending = false;

      try {
        if (activeRunSession) {
          activeRunSession.last_progress_score = RH.progressSentScore;
          activeRunSession.progress_updates = RH.progressUpdates;
          if (typeof persistRunSession === 'function') persistRunSession();
        }
      } catch (e) {}

      if (typeof trackEvent === 'function') {
        trackEvent('run_progress_checkpoint', {
          reason: reason || 'unknown',
          score: liveScore,
          phase: livePhase,
          captures: RH.captures,
          gold_captures: RH.goldCaptures,
          powerups: RH.powerups
        });
      }

      return !!data?.ok;
    } catch (e) {
      RH.retryPending = true;
      console.warn('[Orbita] update_run_progress failed (retry queued)', e);
      return false;
    }
  }

  window.reportRunProgress = reportRunProgress;
  window.getRankingHardeningMeta = getRankingHardeningMeta;

  if (typeof getRpcScoreError === 'function') {
    const _origGetRpcScoreError = getRpcScoreError;
    getRpcScoreError = function(e){
      const msg = String(e?.message || e?.details || e || '').toLowerCase();
      if (msg.includes('missing progress checkpoints')) return 'Run sem checkpoints suficientes';
      if (msg.includes('insufficient progress checkpoints')) return 'Run precisa de mais checkpoints';
      if (msg.includes('high score requires more checkpoints')) return 'Score alto demais sem progresso validado';
      if (msg.includes('score jump exceeds progress window')) return 'Salto de score rejeitado pelo servidor';
      if (msg.includes('score does not match capture history')) return 'Score incompatível com a run';
      return _origGetRpcScoreError(e);
    };
  }

  if (typeof submitScore === 'function') {
    const _origSubmitScore = submitScore;
    submitScore = async function(scoreValue, skinValue){
      await reportRunProgress('pre_submit', true);
      if (typeof sb !== 'undefined' && sb && typeof currentUser !== 'undefined' && currentUser &&
          typeof activeRunSession !== 'undefined' && activeRunSession && activeRunSession.run_id &&
          !(typeof zenMode !== 'undefined' && zenMode) &&
          !(typeof testMode !== 'undefined' && testMode)) {
        try {
          if (typeof networkOnline !== 'undefined' && networkOnline) {
            const { data, error } = await sb.rpc('submit_score_secure', {
              p_run_id: activeRunSession.run_id,
              p_score: Number(scoreValue) || 0,
              p_skin: skinValue || null,
              p_client_meta: getRankingHardeningMeta('game_over')
            });
            if (error) throw error;

            if (data?.stored !== undefined && typeof lastSubmittedScore !== 'undefined') {
              lastSubmittedScore = Math.max(lastSubmittedScore, Number(data.stored) || 0);
            }

            if (typeof trackEvent === 'function') {
              trackEvent('score_submitted', {
                submitted: Number(scoreValue) || 0,
                stored: Number(data?.stored || scoreValue || 0),
                new_record: !!data?.new_record,
                skin: skinValue || null,
                run_id: activeRunSession.run_id,
                duration_seconds: Number(data?.duration_seconds || 0),
                progress_updates: Number(data?.progress_updates || RH.progressUpdates || 0)
              });
            }

            if (typeof clearActiveRunSession === 'function') clearActiveRunSession();
            return true;
          }
        } catch (e) {
          console.error('submit_score_secure phase2 failed', e);
          const friendly = typeof getRpcScoreError === 'function' ? getRpcScoreError(e) : 'Erro ao enviar score';
          if (
            friendly === 'Run sem checkpoints suficientes' ||
            friendly === 'Run precisa de mais checkpoints' ||
            friendly === 'Score alto demais sem progresso validado' ||
            friendly === 'Salto de score rejeitado pelo servidor' ||
            friendly === 'Score incompatível com a run'
          ) {
            if (typeof clearActiveRunSession === 'function') clearActiveRunSession();
            return false;
          }
        }
      }
      return _origSubmitScore(scoreValue, skinValue);
    };
  }

  if (typeof reset === 'function') {
    const _origReset = reset;
    reset = function(){
      resetRankingHardeningMetrics();
      return _origReset.apply(this, arguments);
    };
  }

  if (typeof capture === 'function') {
    const _origCapture = capture;
    capture = function(nodeIdx){
      const beforeScore = typeof score !== 'undefined' ? Number(score) || 0 : 0;
      const result = _origCapture.apply(this, arguments);
      RH.captures += 1;
      try {
        const node = typeof nodes !== 'undefined' && nodes ? nodes[nodeIdx] : null;
        if (node && node.tier === 'gold') RH.goldCaptures += 1;
      } catch (e) {}
      RH.maxCombo = Math.max(RH.maxCombo, Number(typeof combo !== 'undefined' ? combo : 0) || 0, Number(typeof maxCombo !== 'undefined' ? maxCombo : 0) || 0);
      RH.highestPhase = Math.max(RH.highestPhase, currentPhaseSafe());
      const afterScore = typeof score !== 'undefined' ? Number(score) || 0 : 0;
      const reason = afterScore > beforeScore ? 'capture' : 'capture_no_score';
      reportRunProgress(reason, false);
      return result;
    };
  }

  if (typeof collectPowerup === 'function') {
    const _origCollectPowerup = collectPowerup;
    collectPowerup = function(p){
      const result = _origCollectPowerup.apply(this, arguments);
      RH.powerups += 1;
      RH.highestPhase = Math.max(RH.highestPhase, currentPhaseSafe());
      reportRunProgress('powerup', false);
      return result;
    };
  }

  if (typeof startRun === 'function') {
    const _origStartRun = startRun;
    startRun = function(useZen, source){
      const result = _origStartRun.apply(this, arguments);
      RH.highestPhase = Math.max(RH.highestPhase, currentPhaseSafe());
      return result;
    };
  }
})();
