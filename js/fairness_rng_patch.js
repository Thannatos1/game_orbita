
(function(){
  const fairnessState = {
    branchSetsSinceGold: 0,
    capturesSincePowerup: 0,
    firstPowerupGranted: false
  };

  function resetFairnessState(){
    fairnessState.branchSetsSinceGold = 0;
    fairnessState.capturesSincePowerup = 0;
    fairnessState.firstPowerupGranted = false;
  }

  function isHazardNode(n){
    return !!(n && (n.moving || n.disappearing || n.teleporting));
  }

  function clearHazardFlags(branch){
    if (!branch) return;
    branch.moving = false;
    branch.disappearing = false;
    branch.teleporting = false;
    branch.mSpeed = 0;
    branch.mRadius = 0;
    branch.disappearTimer = 0;
    branch.teleportTimer = 0;
    branch.visible = true;
  }

  function getHazardPriority(branch){
    if (!branch) return 0;
    switch (branch.tier) {
      case 'gold': return 3;
      case 'hard': return 2;
      case 'medium': return 1;
      default: return 0;
    }
  }

  function applyGoldRiskBehavior(branches, phase){
    if (zenMode || !Array.isArray(branches) || phase < 4) return;

    const gold = branches.find(branch => branch && branch.tier === 'gold');
    if (!gold) return;

    const mlBias = getMlDifficultyBias();
    const hazardChance = clampValue((phase >= 6 ? 0.9 : (phase === 5 ? 0.78 : 0.62)) * mlBias.hazardChanceMul, 0.22, 0.96);
    if (Math.random() >= hazardChance) return;

    clearHazardFlags(gold);

    if (Math.random() < 0.58) {
      gold.moving = true;
      gold.mSpeed = rand(1.0, phase >= 6 ? 1.7 : 1.45);
      gold.mRadius = rand(18, phase >= 6 ? 30 : 24);
      gold.mAngle = rand(0, Math.PI * 2);
    } else {
      gold.disappearing = true;
      gold.visible = true;
      gold.disappearTimer = rand(1.6, 2.8);
    }
  }

  function limitBranchHazards(branches, phase){
    const maxHazards = phase >= 6 ? 2 : 1;
    for(const b of branches){
      if (b.tier === 'easy') {
        clearHazardFlags(b);
      }
      if (b.tier === 'medium' && phase < 6) {
        clearHazardFlags(b);
      }
    }

    const hazardBranches = branches
      .filter(isHazardNode)
      .sort((a, b) => getHazardPriority(b) - getHazardPriority(a));

    hazardBranches.forEach((branch, index) => {
      if (index >= maxHazards) {
        clearHazardFlags(branch);
        return;
      }
      branch.captureR += 4;
    });
  }


  function isMobilePortraitGameplay(){
    try {
      return H > W && Math.min(W, H) <= 900;
    } catch (e) {
      return false;
    }
  }

  function getSpawnCameraAnchor(){
    try {
      if (typeof getGameplayCameraAnchor === 'function') {
        return getGameplayCameraAnchor(false) || { x:0.5, y:0.5 };
      }
    } catch (e) {}
    return { x:0.5, y:0.5 };
  }

  function clampValue(value, min, max){
    return Math.min(Math.max(value, min), max);
  }

  let mlBiasCache = null;
  let mlBiasCacheAt = 0;

  function getCachedPlayerMlProfileSummary(){
    try {
      const registry = window.App && window.App.services;
      const getter = registry && typeof registry.get === 'function'
        ? registry.get('getCachedPlayerMlProfile')
        : null;
      const profile = typeof getter === 'function' ? getter() : (window.__orbitaPlayerMlProfile || null);
      return profile && profile.summary && typeof profile.summary === 'object' ? profile.summary : null;
    } catch (e) {
      return null;
    }
  }

  function getMlDifficultyBias(){
    const now = Date.now();
    if (mlBiasCache && (now - mlBiasCacheAt) < 4000) return mlBiasCache;

    const summary = getCachedPlayerMlProfileSummary();
    const baseBias = {
      ready: false,
      captureMul: 1,
      distanceMul: 1,
      spacingMul: 1,
      hazardChanceMul: 1,
      asteroidChanceMul: 1,
      goldChanceAdd: 0
    };

    if (
      zenMode ||
      (typeof testMode !== 'undefined' && testMode) ||
      !summary ||
      (Number(summary.runs || 0) || 0) < 4
    ) {
      mlBiasCache = baseBias;
      mlBiasCacheAt = now;
      return mlBiasCache;
    }

    const runs = Number(summary.runs || 0) || 0;
    const veryEarlyFailRate = clampValue(Number(summary.very_early_fail_rate || 0) || 0, 0, 1);
    const asteroidDeathRate = clampValue(Number(summary.asteroid_death_rate || 0) || 0, 0, 1);
    const riskyChoiceRate = clampValue(Number(summary.avg_highest_risk_choice_rate || 0) || 0, 0, 1);
    const bestPhase = Number(summary.best_phase || 0) || 0;
    const riskProfile = String(summary.risk_profile || 'balanced');
    const stabilityProfile = String(summary.stability_profile || 'stable');
    const bias = Object.assign({}, baseBias, { ready: true });

    if (stabilityProfile === 'fragile' || veryEarlyFailRate >= 0.34) {
      bias.captureMul *= 1.08;
      bias.distanceMul *= 0.96;
      bias.spacingMul *= 1.04;
      bias.hazardChanceMul *= 0.82;
      bias.asteroidChanceMul *= 0.74;
      bias.goldChanceAdd -= 0.04;
    } else if (riskProfile === 'aggressive' && bestPhase >= 4) {
      bias.captureMul *= 0.96;
      bias.distanceMul *= 1.05;
      bias.spacingMul *= 1.03;
      bias.hazardChanceMul *= 1.10;
      bias.asteroidChanceMul *= 1.12;
      bias.goldChanceAdd += 0.03;
    } else if (stabilityProfile === 'improving' || riskyChoiceRate >= 0.26) {
      bias.captureMul *= 0.985;
      bias.distanceMul *= 1.02;
      bias.spacingMul *= 1.02;
      bias.hazardChanceMul *= 1.05;
      bias.asteroidChanceMul *= 1.06;
      bias.goldChanceAdd += 0.01;
    }

    if (asteroidDeathRate >= 0.28) {
      bias.hazardChanceMul *= 0.90;
      bias.asteroidChanceMul *= 0.78;
    }

    if (bestPhase <= 2 && runs >= 6) {
      bias.captureMul *= 1.05;
      bias.distanceMul *= 0.97;
      bias.spacingMul *= 1.03;
    }

    bias.captureMul = clampValue(bias.captureMul, 0.92, 1.12);
    bias.distanceMul = clampValue(bias.distanceMul, 0.94, 1.08);
    bias.spacingMul = clampValue(bias.spacingMul, 1.00, 1.08);
    bias.hazardChanceMul = clampValue(bias.hazardChanceMul, 0.72, 1.16);
    bias.asteroidChanceMul = clampValue(bias.asteroidChanceMul, 0.68, 1.18);
    bias.goldChanceAdd = clampValue(bias.goldChanceAdd, -0.05, 0.04);

    mlBiasCache = bias;
    mlBiasCacheAt = now;
    return bias;
  }

  window.__orbitaGetMlDifficultyBias = getMlDifficultyBias;

  function getTierSpawnEdgePadding(tier, phase){
    const capturePad = typeof getCaptureR === 'function' ? getCaptureR(tier) : 48;
    const tierConfig = (typeof TIERS !== 'undefined' && TIERS && TIERS[tier]) ? TIERS[tier] : null;
    const nodePad = (typeof NODE_R === 'number' ? NODE_R : 12) * (tierConfig ? tierConfig.sizeMul : 1);
    const phasePad = phase >= 5 ? 8 : (phase >= 3 ? 4 : 0);
    return Math.max(capturePad + 12, nodePad + 20, 48) + phasePad;
  }

  function getMobileSpawnSafeBounds(fromNode, phase, tier){
    if (!isMobilePortraitGameplay() || !fromNode) return null;

    const anchor = getSpawnCameraAnchor();
    const edgePad = getTierSpawnEdgePadding(tier, phase);
    const sideInset = edgePad + Math.max(16, W * 0.02);
    const topHudInset =
      (phase <= 2 ? Math.max(68, H * 0.078) : Math.max(88, H * 0.10)) +
      ((typeof getCurrentRunMutator === 'function' && getCurrentRunMutator()) ? (phase <= 2 ? 34 : 46) : 0) +
      (((typeof testMode !== 'undefined' && testMode) || zenMode || phase > 1) ? (phase <= 2 ? 10 : 16) : 0);
    const bottomInset = edgePad + Math.max(18, H * 0.03);
    const centerBias = phase >= 2 ? Math.max(12, W * 0.02) : 0;
    const topEdgeFactor = phase <= 2 ? 0.48 : 1;

    return {
      left: fromNode.x - W * anchor.x + sideInset + centerBias,
      right: fromNode.x + W * (1 - anchor.x) - sideInset - centerBias,
      top: fromNode.y - H * anchor.y + topHudInset + edgePad * topEdgeFactor,
      bottom: fromNode.y + H * (1 - anchor.y) - bottomInset
    };
  }

  function isSpawnInsideMobileSafeZone(x, y, fromNode, phase, tier){
    const bounds = getMobileSpawnSafeBounds(fromNode, phase, tier);
    if (!bounds) return true;
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  function clampSpawnToMobileSafeZone(x, y, fromNode, phase, tier){
    const bounds = getMobileSpawnSafeBounds(fromNode, phase, tier);
    if (!bounds) return { x, y };
    return {
      x: clampValue(x, bounds.left, bounds.right),
      y: clampValue(y, bounds.top, bounds.bottom)
    };
  }

  function getTierRiskRank(tier, phase){
    if (tier === 'easy' && phase >= 3) return 1;
    switch (tier) {
      case 'easy': return 0;
      case 'medium': return 1;
      case 'hard': return 2;
      case 'gold': return 3;
      default: return 10;
    }
  }

  function getCanonicalBranchOffsets(orderedBranches, phase){
    const mobilePortrait = isMobilePortraitGameplay();
    const count = Array.isArray(orderedBranches) ? orderedBranches.length : Number(orderedBranches) || 0;
    const tiers = Array.isArray(orderedBranches) ? orderedBranches.map(branch => branch && branch.tier) : [];

    if (count === 3 && tiers[0] === 'easy' && tiers[1] === 'medium' && tiers[2] === 'hard') {
      return mobilePortrait ? [-1.12, 0.92, 0.10] : [-1.00, 0.82, 0.06];
    }
    if (phase < 3 && count === 3 && tiers[0] === 'easy' && tiers[1] === 'easy' && tiers[2] === 'medium') {
      return mobilePortrait ? [-1.12, 1.04, 0.04] : [-1.00, 0.94, 0.02];
    }
    if (count === 3 && tiers[0] === 'easy' && tiers[1] === 'hard' && tiers[2] === 'gold') {
      return mobilePortrait ? [-1.14, -0.36, 0.38] : [-1.02, -0.32, 0.32];
    }
    if (count === 3 && tiers[2] === 'gold') {
      return mobilePortrait ? [-1.16, -0.18, 0.34] : [-1.04, -0.14, 0.28];
    }
    if (count === 4 && tiers[0] === 'easy' && tiers[1] === 'medium' && tiers[2] === 'hard' && tiers[3] === 'gold') {
      return mobilePortrait ? [-1.12, 0.56, -0.34, 0.98] : [-1.02, 0.50, -0.30, 0.88];
    }
    if (phase < 3 && count === 4 && tiers[0] === 'easy' && tiers[1] === 'medium' && tiers[2] === 'medium' && tiers[3] === 'hard') {
      return mobilePortrait ? [-1.10, -0.46, 0.92, 0.02] : [-1.00, -0.40, 0.82, 0];
    }

    if (count >= 4) {
      return mobilePortrait ? [-1.12, 0.82, -0.34, 0.26] : [-1.02, 0.74, -0.30, 0.22];
    }
    if (count === 3) {
      return mobilePortrait ? [-1.16, 0, 1.16] : [-1.04, 0, 1.04];
    }
    return mobilePortrait ? [-1.08, 1.08] : [-0.94, 0.94];
  }

  function getCanonicalBaseDistance(phase){
    const mobilePortrait = isMobilePortraitGameplay();
    const scoreValue = Number(score || 0) || 0;
    const scorePressure = clampValue((scoreValue - 12) / 80, 0, 1);
    return (mobilePortrait ? 214 : 224) + (Math.max(0, phase - 1) * (mobilePortrait ? 12 : 10)) + scorePressure * (mobilePortrait ? 42 : 30);
  }

  function getCanonicalDistancePlan(orderedBranches, phase){
    const mobilePortrait = isMobilePortraitGameplay();
    const count = Array.isArray(orderedBranches) ? orderedBranches.length : Number(orderedBranches) || 0;
    const tiers = Array.isArray(orderedBranches) ? orderedBranches.map(branch => branch && branch.tier) : [];

    if (count === 3 && tiers[0] === 'easy' && tiers[1] === 'medium' && tiers[2] === 'hard') {
      return mobilePortrait ? [0.98, 1.20, 1.46] : [0.98, 1.16, 1.36];
    }
    if (count === 3 && tiers[0] === 'easy' && tiers[1] === 'hard' && tiers[2] === 'gold') {
      return mobilePortrait ? [1.00, 1.32, 1.64] : [0.98, 1.24, 1.52];
    }
    if (count === 3 && tiers[2] === 'gold') {
      return mobilePortrait ? [1.00, 1.24, 1.62] : [0.98, 1.18, 1.48];
    }
    if (count === 4 && tiers[0] === 'easy' && tiers[1] === 'medium' && tiers[2] === 'hard' && tiers[3] === 'gold') {
      return mobilePortrait ? [0.98, 1.18, 1.34, 1.82] : [0.96, 1.14, 1.26, 1.64];
    }
    if (count >= 4 && tiers[tiers.length - 1] === 'gold') {
      return mobilePortrait ? [0.98, 1.14, 1.32, 1.72] : [0.96, 1.10, 1.26, 1.58];
    }
    if (count >= 4) {
      return mobilePortrait ? [0.98, 1.12, 1.28, 1.46] : [0.96, 1.08, 1.22, 1.36];
    }
    if (count === 3) {
      return mobilePortrait ? [0.98, 1.18, 1.40] : [0.98, 1.14, 1.30];
    }
    return mobilePortrait ? [0.98, 1.18] : [0.98, 1.12];
  }

  function getTierDistanceLayoutMul(tier, phase){
    const mobilePortrait = isMobilePortraitGameplay();
    const phasePressure = clampValue((phase - 1) / 5, 0, 1);
    const effectiveTier = (tier === 'easy' && phase >= 3) ? 'medium' : tier;
    const map = {
      easy: mobilePortrait ? (1.03 + phasePressure * 0.02) : (1.02 + phasePressure * 0.02),
      medium: mobilePortrait ? (1.09 + phasePressure * 0.04) : (1.06 + phasePressure * 0.03),
      hard: mobilePortrait ? (1.28 + phasePressure * 0.08) : (1.20 + phasePressure * 0.06),
      gold: mobilePortrait ? (1.42 + phasePressure * 0.12) : (1.32 + phasePressure * 0.10)
    };
    return map[effectiveTier] || 1;
  }

  function repositionCanonicalBranch(fromNode, branch, phase, targetOffset, targetDistance){
    if (!fromNode || !branch) return branch;

    const currentDistance = dist(fromNode.x, fromNode.y, branch.x, branch.y) || 220;
    const distanceTarget = Number.isFinite(Number(targetDistance))
      ? Number(targetDistance)
      : currentDistance * getTierDistanceLayoutMul(branch.tier, phase);
    const angle = -Math.PI/2 + targetOffset;
    let nx = fromNode.x + Math.cos(angle) * distanceTarget;
    let ny = fromNode.y + Math.sin(angle) * distanceTarget;

    const adjusted = clampSpawnToMobileSafeZone(nx, ny, fromNode, phase, branch.tier);
    nx = adjusted.x;
    ny = adjusted.y;

    branch.x = nx;
    branch.y = ny;
    branch.baseX = nx;
    branch.baseY = ny;
    return branch;
  }

  function getBranchVisualRadius(branch){
    if (!branch) return 24;
    const nodeRadius = Number(branch.nodeR) || (typeof NODE_R === 'number' ? NODE_R : 12);
    const captureRadius = Number(branch.captureR) || 0;
    return Math.max(nodeRadius * 2.1, captureRadius * 0.62, 22);
  }

  function getBranchSeparationGap(a, b){
    const mobilePortrait = isMobilePortraitGameplay();
    const hasGold = (a && a.tier === 'gold') || (b && b.tier === 'gold');
    const hasHard = (a && a.tier === 'hard') || (b && b.tier === 'hard');
    const riskPad = hasGold
      ? (mobilePortrait ? 24 : 18)
      : hasHard
        ? (mobilePortrait ? 12 : 8)
        : (mobilePortrait ? 8 : 6);
    return getBranchVisualRadius(a) + getBranchVisualRadius(b) + riskPad;
  }

  function getRiskDistanceStep(tier, phase){
    const mobilePortrait = isMobilePortraitGameplay();
    const effectiveTier = (tier === 'easy' && phase >= 3) ? 'medium' : tier;
    const baseStep = {
      easy: mobilePortrait ? 12 : 10,
      medium: mobilePortrait ? 18 : 14,
      hard: mobilePortrait ? 34 : 26,
      gold: mobilePortrait ? 72 : 56
    };
    return baseStep[effectiveTier] || (mobilePortrait ? 18 : 14);
  }

  function enforceCanonicalRiskDistances(fromNode, ordered, phase){
    if (!fromNode || !Array.isArray(ordered) || ordered.length < 2) return ordered;

    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1];
      const branch = ordered[i];
      if (!prev || !branch) continue;

      const prevDist = dist(fromNode.x, fromNode.y, prev.x, prev.y);
      const branchDist = dist(fromNode.x, fromNode.y, branch.x, branch.y);
      const minDist = prevDist + getRiskDistanceStep(branch.tier, phase);
      if (branchDist >= minDist) continue;

      const radialAngle = Math.atan2(branch.y - fromNode.y, branch.x - fromNode.x);
      const nx = fromNode.x + Math.cos(radialAngle) * minDist;
      const ny = fromNode.y + Math.sin(radialAngle) * minDist;
      const adjusted = clampSpawnToMobileSafeZone(nx, ny, fromNode, phase, branch.tier);
      let finalX = adjusted.x;
      let finalY = adjusted.y;
      let finalDist = dist(fromNode.x, fromNode.y, finalX, finalY);

      if (finalDist < minDist) {
        const bounds = getMobileSpawnSafeBounds(fromNode, phase, branch.tier);
        const side = branch.x >= fromNode.x ? 1 : -1;
        const dy = finalY - fromNode.y;
        const neededDx = Math.sqrt(Math.max((minDist * minDist) - (dy * dy), 0));

        if (neededDx > 0) {
          const candidateX = fromNode.x + neededDx * side;
          const candidateClampedX = bounds ? clampValue(candidateX, bounds.left, bounds.right) : candidateX;
          const candidateDist = dist(fromNode.x, fromNode.y, candidateClampedX, finalY);

          if (candidateDist > finalDist) {
            finalX = candidateClampedX;
            finalDist = candidateDist;
          }
        }

        if (finalDist < minDist && bounds) {
          const edgeX = side > 0 ? bounds.right : bounds.left;
          const edgeDist = dist(fromNode.x, fromNode.y, edgeX, finalY);
          if (edgeDist > finalDist) {
            finalX = edgeX;
            finalDist = edgeDist;
          }
        }
      }

      branch.x = finalX;
      branch.y = finalY;
      branch.baseX = finalX;
      branch.baseY = finalY;
    }

    return ordered;
  }

  function separateCanonicalBranches(fromNode, ordered, phase){
    if (!fromNode || !Array.isArray(ordered) || ordered.length < 2) return ordered;

    for (let pass = 0; pass < 3; pass++) {
      let changed = false;

      for (let i = 0; i < ordered.length - 1; i++) {
        for (let j = i + 1; j < ordered.length; j++) {
          const anchor = ordered[i];
          const mover = ordered[j];
          if (!anchor || !mover) continue;

          const dx = mover.x - anchor.x;
          const dy = mover.y - anchor.y;
          const currentGap = Math.hypot(dx, dy) || 0.001;
          const minGap = getBranchSeparationGap(anchor, mover);
          if (currentGap >= minGap) continue;

          const shortage = minGap - currentGap;
          const radialAngle = Math.atan2(mover.y - fromNode.y, mover.x - fromNode.x);
          const lateralSign = mover.x >= anchor.x ? 1 : -1;
          let nx = mover.x + Math.cos(radialAngle) * shortage * 0.82;
          let ny = mover.y + Math.sin(radialAngle) * shortage * 0.82;
          nx += Math.cos(radialAngle + Math.PI / 2) * shortage * 0.26 * lateralSign;
          ny += Math.sin(radialAngle + Math.PI / 2) * shortage * 0.26 * lateralSign;

          const adjusted = clampSpawnToMobileSafeZone(nx, ny, fromNode, phase, mover.tier);
          mover.x = adjusted.x;
          mover.y = adjusted.y;
          mover.baseX = adjusted.x;
          mover.baseY = adjusted.y;
          changed = true;
        }
      }

      if (!changed) break;
    }

    return ordered;
  }

  function applyCanonicalPhaseLayout(fromNode, branches, phase){
    if (!fromNode || !Array.isArray(branches) || branches.length < 2) return branches;

    const ordered = branches
      .slice()
      .sort((a, b) => {
        const riskDiff = getTierRiskRank(a && a.tier, phase) - getTierRiskRank(b && b.tier, phase);
        if (riskDiff !== 0) return riskDiff;
        return (a && a.pts || 0) - (b && b.pts || 0);
      });
    const offsets = getCanonicalBranchOffsets(ordered, phase);
    const baseDistance = getCanonicalBaseDistance(phase);
    const distancePlan = getCanonicalDistancePlan(ordered, phase);

    ordered.forEach((branch, idx) => {
      const distanceTarget = baseDistance * (distancePlan[idx] ?? getTierDistanceLayoutMul(branch.tier, phase));
      repositionCanonicalBranch(fromNode, branch, phase, offsets[idx] ?? 0, distanceTarget);
    });

    enforceCanonicalRiskDistances(fromNode, ordered, phase);
    separateCanonicalBranches(fromNode, ordered, phase);
    enforceCanonicalRiskDistances(fromNode, ordered, phase);

    return branches;
  }

  window.__orbitaApplyCanonicalPhaseLayout = applyCanonicalPhaseLayout;

  function canPlaceAsteroid(ax, ay, fromNode, targetNode){
    if (!fromNode || !targetNode) return false;
    if (dist(ax, ay, fromNode.x, fromNode.y) < 42) return false;
    if (dist(ax, ay, targetNode.x, targetNode.y) < 42) return false;
    for (const a of asteroids) {
      if (dist(ax, ay, a.x, a.y) < 34) return false;
    }
    return true;
  }

  function fairnessAdjustCaptureRadius(payload){
    const tier = payload && payload.tier;
    const base = {easy:64, medium:54, hard:44, gold:40};
    const floor = {easy:38, medium:36, hard:34, gold:32};
    const phase = typeof getPhase === 'function' ? getPhase() : 1;
    const effectiveTier = (!zenMode && tier === 'easy' && phase >= 3) ? 'medium' : tier;
    let r = base[effectiveTier] || 52;
    if (zenMode) r += 15;

    const ev = (typeof getActiveEvent === 'function') ? getActiveEvent() : null;
    if (ev && ev.id === 'calm_orbit' && (effectiveTier === 'easy' || effectiveTier === 'medium')) r += 6;

    if (!zenMode && tier === 'easy') {
      if (phase >= 3) {
        r += 0;
      } else if (phase >= 2) {
        r -= isMobilePortraitGameplay() ? 7 : 5;
      }
    }
    if (!zenMode && tier === 'medium') {
      if (phase === 2) r -= isMobilePortraitGameplay() ? 8 : 6;
      else if (phase === 3) r -= 3;
    }
    if (!zenMode && phase >= 5 && (tier === 'hard' || tier === 'gold')) r += 2;

    const shrink = zenMode ? 0 : Math.min(score * 0.10, 8);
    const mlBias = getMlDifficultyBias();
    payload.value = Math.max((r - shrink) * mlBias.captureMul, floor[effectiveTier] || 34);
    return payload;
  }

  function fairnessAdjustOrbitSpeed(payload){
    payload.value = zenMode ? 2.2 : Math.min(3.0 + score * 0.042, 6.8);
    return payload;
  }

  function fairnessAdjustGravityStrength(payload){
    if (zenMode) payload.value = 30;
    else if (score < 30) payload.value = 0;
    else payload.value = Math.min((score - 30) * 1.2, 45);
    return payload;
  }

  function fairnessAdjustComboWindow(payload){
    const ev = (typeof getActiveEvent === 'function') ? getActiveEvent() : null;
    if (ev && ev.id === 'combo_fever') payload.value = 3.2;
    else if (score < 25) payload.value = 2.8;
    else if (score < 60) payload.value = 2.65;
    else payload.value = 2.5;
    return payload;
  }

  if (typeof registerOrbitaGameplayHook === 'function') {
    registerOrbitaGameplayHook('adjustCaptureRadius', fairnessAdjustCaptureRadius);
    registerOrbitaGameplayHook('adjustOrbitSpeed', fairnessAdjustOrbitSpeed);
    registerOrbitaGameplayHook('adjustGravityStrength', fairnessAdjustGravityStrength);
    registerOrbitaGameplayHook('adjustComboWindow', fairnessAdjustComboWindow);
  }

  function fairnessAdjustPlaceBranchConfig(config){
    const phase = getPhase();
    const mobilePortrait = isMobilePortraitGameplay();
    const mlBias = getMlDifficultyBias();
    const phaseNeedsMobileTightening = mobilePortrait && phase >= 2;
    const crowdRelief = mobilePortrait ? clampValue((score - 22) / 42, 0, 1) : 0;
    const phaseTwoSpreadBoost = mobilePortrait && phase === 2 ? 1.08 : 1;
    const phaseSpreadBoost = mobilePortrait ? Math.max(0, phase - 1) * 0.05 : 0;
    const scoreSpreadBoost = mobilePortrait ? clampValue((score - 14) / 60, 0, 1) * 0.12 : 0;
    const difficultySpreadBoost = 1 + phaseSpreadBoost + scoreSpreadBoost;

    config.baseDist = (220 + Math.min(score * 1.6, 80)) * (phaseNeedsMobileTightening ? (0.93 + crowdRelief * 0.07) : 1) * phaseTwoSpreadBoost * difficultySpreadBoost * mlBias.distanceMul;
    config.baseAngle = -Math.PI/2 + (config.angleOffset * (phaseNeedsMobileTightening ? 0.94 : 1));
    config.distJitterMin = -24;
    config.distJitterMax = 24;
    config.angleJitter = 0.16 * (phaseNeedsMobileTightening ? (0.94 - crowdRelief * 0.10) : 1);
    config.minSpacing = (mobilePortrait ? (168 + crowdRelief * 18 + Math.max(0, phase - 1) * 8 + (phase === 2 ? 12 : 0)) : 158) * mlBias.spacingMul;
    config.maxAttempts = mobilePortrait ? 34 : 24;
    config.movingSpeedMin = 1.1;
    config.movingSpeedMax = 1.9;
    config.movingRadiusMin = 12;
    config.movingRadiusMax = 22;
    config.disappearTimerMin = 3.0;
    config.disappearTimerMax = 4.4;
    config.teleportTimerMin = 2.8;
    config.teleportTimerMax = 4.2;

    config.hardMoveChance = (!zenMode && phase >= 5 && config.tier === 'hard') ? 0.16 * mlBias.hazardChanceMul : 0;
    config.hardDisappearChance = (!zenMode && phase >= 5 && config.tier === 'hard') ? 0.10 * mlBias.hazardChanceMul : 0;
    config.hardTeleportChance = (!zenMode && phase >= 6 && config.tier === 'hard') ? 0.12 * mlBias.hazardChanceMul : 0;
    config.mediumMoveChance = (!zenMode && phase >= 6 && config.tier === 'medium') ? 0.08 * mlBias.hazardChanceMul : 0;

    if (phaseNeedsMobileTightening && config.fromNode) {
      config.isPositionValid = (x, y) => isSpawnInsideMobileSafeZone(x, y, config.fromNode, phase, config.tier);
      config.clampPosition = (x, y) => clampSpawnToMobileSafeZone(x, y, config.fromNode, phase, config.tier);
    } else {
      config.isPositionValid = null;
      config.clampPosition = null;
    }

    return config;
  }

  if (typeof registerOrbitaGameplayHook === 'function') {
    registerOrbitaGameplayHook('adjustPlaceBranchConfig', fairnessAdjustPlaceBranchConfig);
  }

  const _origSpawnBranches = typeof spawnBranches === 'function' ? spawnBranches : null;
    function fairnessBuildSpawnBranches(payload){
    const fromNode = payload.fromNode;
    const groupId = payload.groupId;
    const phase = payload.phase;
    const mlBias = getMlDifficultyBias();
    const branches = [];

    if (phase <= 1) {
      branches.push(placeBranch(fromNode, 'easy', rand(-0.88,-0.52)));
      branches.push(placeBranch(fromNode, 'medium', rand(0.52,0.88)));
    } else if (phase <= 2) {
      branches.push(placeBranch(fromNode, 'easy', rand(-1.10,-0.70)));
      branches.push(placeBranch(fromNode, 'medium', rand(0.70,1.10)));
      if (score >= 14 && Math.random() < 0.14) {
        branches.push(placeBranch(fromNode, 'hard', rand(-0.08, 0.08)));
      }
    } else if (phase <= 3) {
      branches.push(placeBranch(fromNode, 'easy', rand(-1.08,-0.70)));
      branches.push(placeBranch(fromNode, 'medium', rand(-0.16,0.16)));
      branches.push(placeBranch(fromNode, 'hard', rand(0.70,1.08)));
    } else {
      const goldChance = clampValue((phase >= 6 ? 0.26 : (phase === 5 ? 0.22 : 0.16)) + mlBias.goldChanceAdd, 0.10, 0.34);
      const forceGold = fairnessState.branchSetsSinceGold >= 3;

      branches.push(placeBranch(fromNode, 'easy', rand(-1.08,-0.70)));
      branches.push(placeBranch(fromNode, 'hard', rand(0.70,1.08)));

      if (forceGold || Math.random() < goldChance) {
        branches.push(placeBranch(fromNode, 'gold', rand(-0.14, 0.14)));
        fairnessState.branchSetsSinceGold = 0;
      } else {
        branches.push(placeBranch(fromNode, 'medium', rand(-0.14, 0.14)));
        fairnessState.branchSetsSinceGold += 1;
      }
    }

    applyGoldRiskBehavior(branches, phase);
    limitBranchHazards(branches, phase);
    applyCanonicalPhaseLayout(fromNode, branches, phase);

    if (phase >= 4 && !zenMode && score >= 35) {
      let asteroidsAdded = 0;
      const maxAsteroids = phase >= 6 ? 2 : 1;

      for (const b of branches) {
        if (asteroidsAdded >= maxAsteroids) break;
        if (b.tier === 'easy' || b.tier === 'gold') continue;
        if (phase < 6 && b.tier === 'medium') continue;

        const chance = clampValue((phase === 4 ? 0.12 : (phase === 5 ? 0.18 : 0.24)) * mlBias.asteroidChanceMul, 0.06, 0.30);
        if (Math.random() >= chance) continue;

        const dx = b.x - fromNode.x;
        const dy = b.y - fromNode.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const mx = (fromNode.x + b.x) / 2;
        const my = (fromNode.y + b.y) / 2;
        const nx = -dy / len;
        const ny = dx / len;
        const side = Math.random() < 0.5 ? -1 : 1;
        const lateral = rand(28, 52) * side;
        const along = rand(-18, 18);

        const ax = mx + nx * lateral + (dx / len) * along;
        const ay = my + ny * lateral + (dy / len) * along;

        if (!canPlaceAsteroid(ax, ay, fromNode, b)) continue;

        asteroids.push({
          x: ax,
          y: ay,
          r: rand(9, 13),
          rot: rand(0, Math.PI * 2),
          rotSpd: rand(-1.2, 1.2),
          vertices: genAsteroidShape()
        });
        asteroidsAdded += 1;
      }
    }

    payload.branches = branches;
    payload.handled = true;
    return payload;
  }

  if (typeof registerOrbitaGameplayHook === 'function') {
    registerOrbitaGameplayHook('buildSpawnBranches', fairnessBuildSpawnBranches);
  }

  const _origChoosePowerupType = typeof choosePowerupType === 'function' ? choosePowerupType : null;
  choosePowerupType = function(){
    const phase = getPhase();

    if (!fairnessState.firstPowerupGranted) {
      return 'shield';
    }

    if (fairnessState.capturesSincePowerup >= 7) {
      return 'shield';
    }

    const r = Math.random();
    if (phase <= 3) {
      if (r < 0.48) return 'shield';
      if (r < 0.80) return 'slowmo';
      return 'magnet';
    }
    if (phase <= 5) {
      if (r < 0.40) return 'shield';
      if (r < 0.72) return 'slowmo';
      return 'magnet';
    }
    if (r < 0.34) return 'shield';
    if (r < 0.62) return 'slowmo';
    return 'magnet';
  };

  const _origSpawnPowerup = typeof spawnPowerup === 'function' ? spawnPowerup : null;
  spawnPowerup = function(){
    const cn = (typeof getSafeCurrentNode === 'function') ? getSafeCurrentNode() : nodes[ball.currentNode];
    if (!cn) return;

    let target = null;
    for (let i = ball.currentNode + 1; i < nodes.length; i++) {
      if (!nodes[i].captured && nodes[i].visible) {
        target = nodes[i];
        break;
      }
    }
    if (!target) return;

    const dx = target.x - cn.x;
    const dy = target.y - cn.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const t = fairnessState.capturesSincePowerup >= 7 ? 0.58 : 0.52;
    const mx = cn.x + dx * t + nx * rand(-22, 22);
    const my = cn.y + dy * t + ny * rand(-22, 22);

    const type = choosePowerupType();

    powerups.push({
      x: mx, y: my, type, life: 14,
      pulse: rand(0, Math.PI * 2), bobY: 0,
      spawnT: 0,
    });
  };

  const _origCollectPowerup = typeof collectPowerup === 'function' ? collectPowerup : null;
  if (_origCollectPowerup) {
    collectPowerup = function(p){
      fairnessState.capturesSincePowerup = 0;
      fairnessState.firstPowerupGranted = true;
      return _origCollectPowerup.apply(this, arguments);
    };
  } else {
    console.warn('[Orbita] fairness_rng_patch: collectPowerup missing at load');
  }

  const _origCapture = typeof capture === 'function' ? capture : null;
  if (_origCapture) {
    capture = function(nodeIdx){
      const result = _origCapture.apply(this, arguments);
      fairnessState.capturesSincePowerup += 1;
      return result;
    };
  } else {
    console.warn('[Orbita] fairness_rng_patch: capture missing at load');
  }

  const _origReset = typeof reset === 'function' ? reset : null;
  if (_origReset) {
    reset = function(){
      resetFairnessState();
      return _origReset.apply(this, arguments);
    };
  } else {
    console.warn('[Orbita] fairness_rng_patch: reset missing at load');
  }

  console.log('[Orbita] fairness_rng_patch loaded');
})();
