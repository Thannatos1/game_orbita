// ============ DIFFICULTY ============
function getPhase(){
  if(zenMode)return 1;
  if(score<10)return 1;if(score<25)return 2;if(score<40)return 3;if(score<60)return 4;if(score<100)return 5;return 6;
}

const orbitaGameplayHooks = window.__orbitaGameplayHooks || (window.__orbitaGameplayHooks = {
  adjustCaptureRadius: [],
  adjustOrbitSpeed: [],
  adjustGravityStrength: [],
  adjustComboWindow: [],
  adjustPlaceBranchConfig: [],
  buildSpawnBranches: []
});

function registerOrbitaGameplayHook(name, fn){
  if (!orbitaGameplayHooks[name] || typeof fn !== 'function') return false;
  if (!orbitaGameplayHooks[name].includes(fn)) {
    orbitaGameplayHooks[name].push(fn);
  }
  return true;
}

function applyOrbitaGameplayHooks(name, payload){
  if (!orbitaGameplayHooks[name]) return payload;
  let next = payload;
  for (const hook of orbitaGameplayHooks[name]) {
    try {
      const result = hook(next);
      if (result && typeof result === 'object') next = result;
    } catch(e) {}
  }
  return next;
}

window.registerOrbitaGameplayHook = registerOrbitaGameplayHook;

function getSafeCurrentNode(){
  const safeIdx = getSafeCurrentNodeIndex();
  return safeIdx >= 0 ? nodes[safeIdx] : null;
}

function getSafeCurrentNodeIndex(){
  if (Array.isArray(nodes) && Number.isInteger(ball.currentNode) && nodes[ball.currentNode]) return ball.currentNode;
  if (Array.isArray(nodes)) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i] && nodes[i].captured) return i;
    }
    return nodes.length ? 0 : -1;
  }
  return -1;
}
function getCaptureR(tier){
  const base = {easy:62,medium:50,hard:38,gold:34};
  let r = base[tier]||50;
  if(zenMode)r+=15; // Bigger capture zones in zen
  const ev = (typeof getActiveEvent==='function') ? getActiveEvent() : null;
  if(ev && ev.id==='calm_orbit' && (tier==='easy' || tier==='medium')) r += 6;
  const shrink = zenMode?0:Math.min(score*0.15, 12);
  const baseValue = Math.max(r - shrink, 28);
  const payload = applyOrbitaGameplayHooks('adjustCaptureRadius', { tier, value: baseValue });
  return payload && Number.isFinite(Number(payload.value)) ? Number(payload.value) : baseValue;
}
function getOrbitSpeed(){
  const baseValue = zenMode ? 2.2 : 3.0+score*0.05;
  const payload = applyOrbitaGameplayHooks('adjustOrbitSpeed', { value: baseValue });
  return payload && Number.isFinite(Number(payload.value)) ? Number(payload.value) : baseValue;
}
function getGravityStrength(){
  let baseValue = 30; // Always a gentle pull
  if(!zenMode){
    if(score<25) baseValue = 0;
    else baseValue = Math.min((score-25)*1.5,60);
  }
  const payload = applyOrbitaGameplayHooks('adjustGravityStrength', { value: baseValue });
  return payload && Number.isFinite(Number(payload.value)) ? Number(payload.value) : baseValue;
}

const PHASE_NAMES={2:'DISTÂNCIA',3:'VELOCIDADE',4:'ASTEROIDES',5:'NÓS VIVOS',6:'⚠ CAOS ⚠'};

// ============ BG COLORS PER PHASE ============
const BG_COLORS = [
  {top:'#05050f',mid:'#08082a',bot:'#05050f'},    // phase 1
  {top:'#05051a',mid:'#0a1040',bot:'#06061f'},    // phase 2
  {top:'#0a0520',mid:'#180845',bot:'#0d0525'},    // phase 3
  {top:'#120520',mid:'#2a0840',bot:'#150528'},    // phase 4
  {top:'#1a0515',mid:'#350830',bot:'#1f0520'},    // phase 5
  {top:'#250508',mid:'#4a0810',bot:'#2a0508'},    // phase 6 - chaos red
];
function getBgColors(){
  const p=clamp(getPhase(),1,6)-1;
  const np=Math.min(p+1,5);
  const progress=(score%15)/15;
  return {
    top: lerpColor(BG_COLORS[p].top, BG_COLORS[np].top, progress),
    mid: lerpColor(BG_COLORS[p].mid, BG_COLORS[np].mid, progress),
    bot: lerpColor(BG_COLORS[p].bot, BG_COLORS[np].bot, progress),
  };
}

// ============ CAMERA ============
let cam={x:0,y:0,tx:0,ty:0,zoom:1,tz:1};

// ============ BALL ============
const BALL_R=10;
let ball={x:0,y:0,vx:0,vy:0,angle:0,orbiting:true,currentNode:0,
  orbitRadius:0,orbitDir:1,trail:[],glow:0,squash:1,speed:0};

// ============ NODES ============
let nodes=[];
const NODE_R=12;
const ORBIT_R_MIN=36,ORBIT_R_MAX=52;

// Node tiers
const TIERS={
  easy:  {color:{main:'#2ed573',glow:'#20bf55',light:'#7bed9f'},pts:1,label:'+1',distMul:1.0,sizeMul:1.0},
  medium:{color:{main:'#70a1ff',glow:'#1e90ff',light:'#90b8ff'},pts:2,label:'+2',distMul:1.1,sizeMul:1.0},
  hard:  {color:{main:'#ff4757',glow:'#e03050',light:'#ff6b7a'},pts:3,label:'+3',distMul:1.55,sizeMul:0.8},
  gold:  {color:{main:'#ffd32a',glow:'#f0c000',light:'#ffe066'},pts:5,label:'+5',distMul:1.75,sizeMul:0.7},
};

// ============ OBSTACLES ============
let asteroids=[];

// ============ PARTICLES & STARS ============
let particles=[];
let stars=[];
let ringParticles=[];
let scorePopups=[];

function initStars(){
  stars=[];
  for(let i=0;i<120;i++){
    stars.push({x:rand(-W,W*2),y:rand(-H,H*2),size:rand(0.5,2),
      alpha:rand(0.1,0.5),twinkle:rand(1,4),phase:rand(0,Math.PI*2)});
  }
}
initStars();

function emit(x,y,n,colors,spd){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;
    const v=(30+Math.random()*120)*(spd||1);
    particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,
      life:1,decay:1.2+Math.random()*2,size:1.5+Math.random()*3,
      color:colors[Math.floor(Math.random()*colors.length)]});
  }
}
function emitRing(x,y,color){
  ringParticles.push({x,y,r:0,maxR:60,life:1,color});
}
function addScorePopup(x,y,text,color){
  scorePopups.push({x,y,text,color,life:1.5,vy:-60});
}

// ============ NODE GENERATION ============
function isTooClose(x,y,minDist){
  for(let i=Math.max(0,nodes.length-8);i<nodes.length;i++){
    if(dist(x,y,nodes[i].x,nodes[i].y)<minDist)return true;
  }
  return false;
}

function placeBranch(fromNode, tier, angleOffset) {
  const t = TIERS[tier];
  const phase = getPhase();
  let config = {
    fromNode,
    tier,
    angleOffset,
    phase,
    t,
    baseDist: 220 + Math.min(score*2, 100),
    baseAngle: -Math.PI/2 + angleOffset,
    distJitterMin: -40,
    distJitterMax: 40,
    angleJitter: 0.25,
    minSpacing: 150,
    maxAttempts: 25,
    hardMoveChance: (!zenMode && phase>=5 && tier!=='easy') ? 0.28 : 0,
    hardDisappearChance: (!zenMode && phase>=5 && tier==='hard') ? 0.18 : 0,
    hardTeleportChance: (!zenMode && phase>=6 && tier!=='easy') ? 0.22 : 0,
    mediumMoveChance: 0,
    movingSpeedMin: 1.2,
    movingSpeedMax: 2.5,
    movingRadiusMin: 15,
    movingRadiusMax: 30,
    disappearTimerMin: 2.5,
    disappearTimerMax: 4,
    teleportTimerMin: 2,
    teleportTimerMax: 4,
    isPositionValid: null,
    clampPosition: null
  };
  config = applyOrbitaGameplayHooks('adjustPlaceBranchConfig', config);

  let nx = fromNode.x;
  let ny = fromNode.y;
  let attempts = 0;
  let distance;
  while (attempts < config.maxAttempts) {
    distance = config.baseDist * t.distMul + rand(config.distJitterMin, config.distJitterMax);
    const angle = config.baseAngle + rand(-config.angleJitter, config.angleJitter);
    let candidateX = fromNode.x + Math.cos(angle) * distance;
    let candidateY = fromNode.y + Math.sin(angle) * distance;
    if (typeof config.clampPosition === 'function') {
      const adjusted = config.clampPosition(candidateX, candidateY);
      if (adjusted && Number.isFinite(adjusted.x) && Number.isFinite(adjusted.y)) {
        candidateX = adjusted.x;
        candidateY = adjusted.y;
      }
    }
    nx = candidateX;
    ny = candidateY;
    attempts++;
    const blocked =
      isTooClose(nx, ny, config.minSpacing) ||
      (typeof config.isPositionValid === 'function' && !config.isPositionValid(nx, ny));
    if (!blocked) break;
  }

  let isMoving = false;
  let isDisappearing = false;
  let isTeleporting = false;

  if (!zenMode && tier === 'hard') {
    if (phase >= 5 && Math.random() < config.hardMoveChance) isMoving = true;
    if (phase >= 5 && !isMoving && Math.random() < config.hardDisappearChance) isDisappearing = true;
    if (phase >= 6 && !isMoving && !isDisappearing && Math.random() < config.hardTeleportChance) isTeleporting = true;
  } else if (!zenMode && tier === 'medium' && phase >= 6) {
    if (Math.random() < config.mediumMoveChance) isMoving = true;
  }

  return {
    x:nx, y:ny, baseX:nx, baseY:ny,
    tier, pts:t.pts, label:t.label,
    colorIdx: tier,
    nodeR: NODE_R * t.sizeMul,
    captureR: getCaptureR(tier),
    pulse: rand(0,Math.PI*2),
    captured:false, passed:false,
    moving:isMoving,
    mSpeed:isMoving?rand(config.movingSpeedMin, config.movingSpeedMax):0,
    mAngle:rand(0,Math.PI*2),
    mRadius:isMoving?rand(config.movingRadiusMin, config.movingRadiusMax):0,
    disappearing:isDisappearing,
    disappearTimer:isDisappearing?rand(config.disappearTimerMin, config.disappearTimerMax):0,
    visible:true,
    teleporting:isTeleporting,
    teleportTimer:isTeleporting?rand(config.teleportTimerMin, config.teleportTimerMax):0,
    teleportFlash:0,
    branchGroup:-1,
  };
}

function spawnBranches(fromNode, groupId) {
  const phase = getPhase();
  let branches = [];
  const payload = applyOrbitaGameplayHooks('buildSpawnBranches', {
    fromNode,
    groupId,
    phase,
    score,
    branches,
    handled: false
  });

  if (payload && payload.handled && Array.isArray(payload.branches)) {
    branches = payload.branches.slice();
  } else {
    if (phase <= 1) {
      // Phase 1: 2 nodes well separated
      branches.push(placeBranch(fromNode, 'easy', rand(-0.9,-0.5)));
      branches.push(placeBranch(fromNode, 'medium', rand(0.5,0.9)));
    } else if (phase <= 2) {
      // Phase 2: 2-3 choices
      branches.push(placeBranch(fromNode, 'easy', rand(-1.0,-0.5)));
      branches.push(placeBranch(fromNode, 'medium', rand(0.5,1.0)));
      if (Math.random()<0.3) branches.push(placeBranch(fromNode, 'hard', rand(-0.25,0.25)));
    } else if (phase <= 3) {
      // Phase 3: 3 choices in distinct directions
      branches.push(placeBranch(fromNode, 'easy', rand(-1.1,-0.6)));
      branches.push(placeBranch(fromNode, 'medium', rand(-0.25,0.25)));
      branches.push(placeBranch(fromNode, 'hard', rand(0.6,1.1)));
    } else {
      // Phase 4-5: 3 choices with possible gold
      branches.push(placeBranch(fromNode, 'easy', rand(-1.1,-0.6)));
      branches.push(placeBranch(fromNode, 'hard', rand(0.6,1.1)));
      if (Math.random()<0.25) {
        branches.push(placeBranch(fromNode, 'gold', rand(-0.25,0.25)));
      } else {
        branches.push(placeBranch(fromNode, 'medium', rand(-0.25,0.25)));
      }
    }

    // Spawn asteroids for phase 4+ (not in zen)
    if (phase >= 4 && !zenMode) {
      for (const b of branches) {
        if (b.tier !== 'easy' && Math.random() < ((b.moving || b.disappearing || b.teleporting) ? 0.2 : 0.4)) {
          const mx = (fromNode.x+b.x)/2, my = (fromNode.y+b.y)/2;
          const na = Math.random() < 0.7 ? 1 : 2;
          for(let i=0;i<na;i++){
            asteroids.push({
              x:mx+rand(-50,50), y:my+rand(-50,50),
              r:rand(8,16), rot:rand(0,Math.PI*2), rotSpd:rand(-2,2),
              vertices:genAsteroidShape()
            });
          }
        }
      }
    }
  }

  branches.forEach(b=>{ b.branchGroup=groupId; nodes.push(b); });
}

function genAsteroidShape(){
  const pts=[];const n=6+Math.floor(Math.random()*4);
  for(let i=0;i<n;i++){pts.push({a:(i/n)*Math.PI*2,r:0.6+Math.random()*0.4})}
  return pts;
}


function getGameplayCameraAnchor(isFlying){
  const mobilePortrait = H > W && Math.min(W, H) <= 900;
  if (mobilePortrait) {
    const scorePressure = clamp((score - 18) / 70, 0, 1);
    const phasePressure = clamp((getPhase() - 1) / 5, 0, 1);
    const pressure = Math.max(scorePressure * 0.7, phasePressure);
    return {
      x: 0.5,
      y: isFlying ? (0.72 + pressure * 0.06) : (0.70 + pressure * 0.08)
    };
  }
  return { x: 0.5, y: 0.5 };
}

function getGameplayViewportSafeBounds(){
  const mutatorInset = (typeof getCurrentRunMutator === 'function' && getCurrentRunMutator()) ? 48 : 0;
  const statusInset = ((typeof testMode !== 'undefined' && testMode) || zenMode || getPhase() > 1) ? 18 : 0;
  return {
    left: 24,
    right: W - 24,
    top: 102 + statusInset + mutatorInset,
    bottom: H - 30
  };
}

function getGameplayAutoZoomTarget(isFlying){
  const mobilePortrait = H > W && Math.min(W, H) <= 900;
  const defaultZoom = isFlying ? 0.85 : 1;
  if (!mobilePortrait) return defaultZoom;

  const anchor = getGameplayCameraAnchor(isFlying);
  const focusNode = getSafeCurrentNode();
  const focusX = isFlying ? ball.x : ((focusNode && Number.isFinite(focusNode.x)) ? focusNode.x : ball.x);
  const focusY = isFlying ? ball.y : ((focusNode && Number.isFinite(focusNode.y)) ? focusNode.y : ball.y);
  const camX = focusX - W * anchor.x;
  const camY = focusY - H * anchor.y;
  const safe = getGameplayViewportSafeBounds();
  const cx = W / 2;
  const cy = H / 2;
  let targetZoom = 1;

  function fitAxis(minCoord, maxCoord, safeMin, safeMax, center){
    let limit = 1;
    if (minCoord < center) {
      const delta = center - minCoord;
      if (delta > 0) limit = Math.min(limit, (center - safeMin) / delta);
    }
    if (maxCoord > center) {
      const delta = maxCoord - center;
      if (delta > 0) limit = Math.min(limit, (safeMax - center) / delta);
    }
    return limit;
  }

  function consumeCandidate(x, y, pad){
    const sx = x - camX;
    const sy = y - camY;
    targetZoom = Math.min(targetZoom, fitAxis(sx - pad, sx + pad, safe.left, safe.right, cx));
    targetZoom = Math.min(targetZoom, fitAxis(sy - pad, sy + pad, safe.top, safe.bottom, cy));
  }

  if (focusNode) {
    consumeCandidate(focusNode.x, focusNode.y, Math.max(focusNode.captureR + 10, focusNode.nodeR + 18));
  } else {
    consumeCandidate(ball.x, ball.y, BALL_R + 18);
  }

  if (isFlying) {
    consumeCandidate(ball.x, ball.y, BALL_R + 18);
  }

  const recentCaptured = [];
  for (const n of nodes) {
    if (!n || !n.visible || n === focusNode || !n.captured) continue;
    const d = dist(focusX, focusY, n.x, n.y);
    if (d <= Math.max(W * 0.92, H * 0.58)) {
      recentCaptured.push({ node: n, distance: d });
    }
  }
  recentCaptured.sort((a, b) => a.distance - b.distance);
  for (const item of recentCaptured.slice(0, 2)) {
    const n = item.node;
    consumeCandidate(n.x, n.y, Math.max(n.captureR + 10, n.nodeR + 18));
  }

  for (const n of nodes) {
    if (!n || !n.visible || n === focusNode) continue;
    if (n.captured) continue;
    consumeCandidate(n.x, n.y, Math.max(n.captureR + 10, n.nodeR + 18));
  }

  const scorePressure = clamp((score - 18) / 55, 0, 1);
  const phasePressure = clamp((getPhase() - 1) / 5, 0, 1);
  const difficultyPressure = Math.max(scorePressure, phasePressure * 0.95);
  const baselineZoom = isFlying
    ? (0.90 - difficultyPressure * 0.16)
    : (0.98 - difficultyPressure * 0.15);
  const minZoom = isFlying ? 0.70 : 0.74;
  const maxZoom = isFlying ? 0.92 : 1;

  targetZoom = Math.min(targetZoom, baselineZoom);
  return clamp(targetZoom, minZoom, maxZoom);
}

function getGameplayStartNodePos(){
  const anchor = getGameplayCameraAnchor(false);
  return { x: W * anchor.x, y: H * anchor.y };
}

function initNodes(){
  nodes=[]; asteroids=[];
  const start = getGameplayStartNodePos();
  // Starting node
  nodes.push({
    x:start.x,y:start.y,baseX:start.x,baseY:start.y,tier:'medium',pts:0,label:'',
    colorIdx:'medium',nodeR:NODE_R,captureR:55,pulse:0,
    captured:true,passed:true,moving:false,mSpeed:0,mAngle:0,mRadius:0,
    disappearing:false,disappearTimer:0,visible:true,branchGroup:-1
  });
  spawnBranches(nodes[0], 0);
}

// ============ RESET ============
function reset(){
  if(typeof resetBackgroundAnchors === 'function') resetBackgroundAnchors();
  score=0;newRec=false;deathT=0;shakeT=0;flashA=0;
  phaseMsg='';phaseMsgT=0;combo=0;maxCombo=0;comboTimer=0;lastCaptureTime=0;
  deadRetryQueued=false;
  deadRetrySource='death_tap';
  particles=[];ringParticles=[];scorePopups=[];
  // Reset powerups
  powerups=[];
  activeShield=false;
  slowMoTimer=0;
  magnetTimer=0;
  const ev = (typeof getActiveEvent==='function') ? getActiveEvent() : null;
  powerupSpawnTimer=(ev && ev.id==='power_surge') ? 6 : 8; // First powerup after 6-8 seconds
  // Tutorial only for first 3 games
  tutorialStep = totalGames < 3 ? 1 : 0;
  tutorialT = 0;
  initNodes();
  ball.currentNode=0;ball.orbiting=true;ball.angle=0;
  ball.orbitRadius=44;ball.orbitDir=1;
  ball.vx=0;ball.vy=0;ball.trail=[];ball.glow=0;ball.squash=1;ball.speed=0;
  const n=nodes[0];
  const anchor = getGameplayCameraAnchor(false);
  ball.x=n.x+Math.cos(ball.angle)*ball.orbitRadius;
  ball.y=n.y+Math.sin(ball.angle)*ball.orbitRadius;
  cam.x=n.x-W*anchor.x;cam.y=n.y-H*anchor.y;cam.tx=cam.x;cam.ty=cam.y;
  cam.zoom=getGameplayAutoZoomTarget(false);cam.tz=cam.zoom;
}

// ============ GAME LOGIC ============
function release(){
  if(!ball.orbiting)return;
  if(tutorialStep===1)tutorialStep=2;
  const tang=ball.angle+(ball.orbitDir*Math.PI/2);
  const speed=getOrbitSpeed()*ball.orbitRadius*2.2;
  ball.vx=Math.cos(tang)*speed;
  ball.vy=Math.sin(tang)*speed;
  ball.orbiting=false;
  ball.squash=0.8;
  cam.tz=getGameplayAutoZoomTarget(true);
  sndRelease();
  emit(ball.x,ball.y,6,['#ffffff','#aaaaff'],0.6);
}

function capture(nodeIdx){
  const prevPhase=getPhase();
  const n=nodes[nodeIdx];
  ball.currentNode=nodeIdx;
  ball.orbiting=true;
  n.captured=true;
  cam.tz=getGameplayAutoZoomTarget(false);

  // Tutorial progression
  if(tutorialStep===2)tutorialStep=3;
  else if(tutorialStep===3&&score>=2)tutorialStep=4;
  else if(tutorialStep===4&&score>=4)tutorialStep=0;

  ball.angle=Math.atan2(ball.y-n.y,ball.x-n.x);
  ball.orbitRadius=dist(ball.x,ball.y,n.x,n.y);
  ball.orbitRadius=clamp(ball.orbitRadius,ORBIT_R_MIN,ORBIT_R_MAX);
  ball.orbitDir=Math.random()<0.5?1:-1;
  ball.squash=1.3;

  // Combo
  const now=performance.now()/1000;
  if(now-lastCaptureTime<getComboWindow()&&lastCaptureTime>0){
    combo++;
    if(combo>maxCombo)maxCombo=combo;
  } else { combo=1; }
  lastCaptureTime=now;
  comboTimer=2;

  // Score
  const pts=n.pts||1;
  const comboMul=combo>=5?2:(combo>=3?1.5:1);
  const ev = (typeof getActiveEvent==='function') ? getActiveEvent() : null;
  const eventBonus = (ev && ev.id==='gold_rush' && n.tier==='gold') ? 1 : 0;
  const gained=Math.ceil(pts*comboMul)+eventBonus;
  score+=gained;
  handleMissionReward(applyMissionProgress('best_run_score', score));

  // Effects
  const tc=TIERS[n.tier]||TIERS.medium;
  const col=tc.color;
  const intensity=pts>=3?1.2:(pts>=5?1.5:0.8);
  emit(n.x,n.y,8+pts*3,[col.main,col.light,'#ffffff'],intensity);
  emitRing(n.x,n.y,col.main);

  // Score popup
  let popText='+'+gained;
  if(comboMul>1)popText+=' x'+comboMul;
  addScorePopup(n.x,n.y-30,popText,col.light);

  // Combo popup
  if(combo>=3){
    addScorePopup(n.x,n.y-55,'COMBO '+combo+'!',combo>=5?'#ffd32a':'#00f5d4');
  }
  handleMissionReward(applyMissionProgress('best_run_combo', combo));
  if(combo>=5){
    flashA=Math.max(flashA,0.12);
    shakeT=Math.max(shakeT,0.08);
    shakeA=Math.max(shakeA,4);
  }

  sndCapture(pts,combo);
  if(pts>=5)vibrate([60,30,60,30,80]);
  else if(pts>=3)vibrate([30,15,30]);
  else vibrate(10);

  // Epic gold node animation
  if(n.tier==='gold'){
    totalGoldCaptured++;
    handleMissionReward(applyMissionProgress('gold_captures', 1));
    addScorePopup(n.x,n.y-78,'OURO!','#ffd32a');
    goldFlashT=1.0;
    goldZoomT=1.0;
    shakeT=0.4;
    shakeA=8;
    // Burst of extra particles
    for(let i=0;i<3;i++){
      setTimeout(()=>{
        emit(n.x,n.y,15,['#ffd32a','#ffe066','#ffffff','#ffaa00'],1.8);
        emitRing(n.x,n.y,'#ffd32a');
      },i*80);
    }
    // Special chime
    if(actx&&!muted){
      [0,150,300].forEach((d,i)=>{
        setTimeout(()=>{
          playTone(800+i*200,0.4,'sine',0.15);
          playTone(1200+i*300,0.3,'triangle',0.08);
        },d);
      });
    }
  }

  // Track stats
  totalNodesEver++;
  if(combo>bestComboEver)bestComboEver=combo;

  // Remove sibling branches (same group, not captured)
  const grp=n.branchGroup;
  if(grp>=0){
    for(let i=nodes.length-1;i>=0;i--){
      if(nodes[i].branchGroup===grp&&!nodes[i].captured&&i!==nodeIdx){
        // Fade out effect
        emit(nodes[i].x,nodes[i].y,4,['#555','#888'],0.3);
        nodes.splice(i,1);
        if(i<ball.currentNode)ball.currentNode--;
      }
    }
  }

  // Phase check
  const newPhase=getPhase();
  if(newPhase>prevPhase&&PHASE_NAMES[newPhase]){
    phaseMsg=PHASE_NAMES[newPhase];phaseMsgT=2.5;sndPhase();
    vibrate([40,30,40,30,40]);
    handleMissionReward(applyMissionProgress('best_run_phase', newPhase));
  }

  // Spawn new branches
  spawnBranches(n, (grp>=0?grp:0)+1);
  ensureStars(n.x,n.y);
}

function ensureStars(cx,cy){
  for(let i=stars.length-1;i>=0;i--){
    if(dist(stars[i].x,stars[i].y,cx,cy)>W*2.5)stars.splice(i,1);
  }
  while(stars.length<120){
    stars.push({x:cx+rand(-W*1.5,W*1.5),y:cy+rand(-H*1.5,H*1.5),
      size:rand(0.5,2),alpha:rand(0.1,0.5),twinkle:rand(1,4),phase:rand(0,Math.PI*2)});
  }
}

function restoreBallToOrbit(node, nodeIdx){
  if(!node) return false;
  const safeIdx = Number.isInteger(nodeIdx) && nodeIdx >= 0 ? nodeIdx : Math.max(0, nodes.indexOf(node));
  ball.currentNode = safeIdx;
  ball.orbiting = true;
  ball.vx = 0;
  ball.vy = 0;
  ball.angle = Math.atan2(ball.y-node.y, ball.x-node.x);
  if(!Number.isFinite(ball.angle)) ball.angle = 0;
  ball.orbitRadius = clamp(dist(ball.x,ball.y,node.x,node.y), ORBIT_R_MIN, ORBIT_R_MAX);
  if(!Number.isFinite(ball.orbitRadius) || ball.orbitRadius <= 0) ball.orbitRadius = 44;
  ball.orbitDir = ball.orbitDir || 1;
  ball.x = node.x + Math.cos(ball.angle) * ball.orbitRadius;
  ball.y = node.y + Math.sin(ball.angle) * ball.orbitRadius;
  cam.tz = getGameplayAutoZoomTarget(false);
  return true;
}

function die(){
  if(state!==ST.PLAY)return;

  if(testMode){
    const safeNode = typeof getSafeCurrentNode === 'function' ? getSafeCurrentNode() : (nodes[ball.currentNode] || nodes[0] || null);
    flashA = Math.max(flashA, 0.3);
    shakeT = Math.max(shakeT, 0.15);
    shakeA = Math.max(shakeA, 7);
    phaseMsg = 'MODO TESTE';
    phaseMsgT = Math.max(phaseMsgT, 1.2);
    emit(ball.x,ball.y,18,['#00f5d4','#80ffff','#ffffff'],1.1);
    addScorePopup(ball.x,ball.y-46,'SEM ERRO','#00f5d4');
    vibrate([15,10,15]);

    if(safeNode){
      const safeIdx = Math.max(0, nodes.indexOf(safeNode));
      restoreBallToOrbit(safeNode, safeIdx);
      cam.tz = 1;
    }
    return;
  }

  // Shield protects from death
  if(activeShield){
    activeShield=false;
    flashA=0.5;
    shakeT=0.2;
    shakeA=8;
    emit(ball.x,ball.y,20,['#00ffff','#ffffff','#80ffff'],1.2);
    vibrate([30,20,30]);
    if(actx&&!muted){
      playTone(800,0.2,'sine',0.15);
      setTimeout(()=>playTone(1000,0.2,'sine',0.1),100);
    }
    phaseMsg='ESCUDO SALVOU';
    phaseMsgT=Math.max(phaseMsgT,1.1);
    const safeIdx = getSafeCurrentNodeIndex();
    const cn = safeIdx >= 0 ? nodes[safeIdx] : null;
    if(cn){
      restoreBallToOrbit(cn, safeIdx);
    }
    return;
  }

  clearDeadRetryQueue();
  state=ST.DEAD;deathT=0;flashA=0.4;shakeT=0.35;shakeA=12;
  if(score>best){
    best=score;newRec=true;sndRecord();
    // Submit to global ranking if logged in
    if (!zenMode && currentUser && score >= 5 && score > lastSubmittedScore) {
      lastSubmittedScore = score;
      submitScore(score, selectedSkin);
    }
  }
  else sndDie();
  // Track stats
  totalScoreEver+=score;
  const finalPhase=getPhase();
  if(finalPhase>highestPhase)highestPhase=finalPhase;
  emit(ball.x,ball.y,30,['#ff6b6b','#ffa502','#e056fd','#70a1ff','#ffffff'],1.5);
  vibrate(newRec?[80,40,80]:50);
  totalGames++;
  handleMissionReward(applyMissionProgress('games_finished', 1));
  const missionPending = pendingUnlocks.slice();
  const newUnlocks = checkUnlocks();
  pendingAchievements = checkAchievements();
  pendingUnlocks = missionPending.concat(newUnlocks, pendingAchievements);
  saveData();
  setMusicVolume(0.05);
}

function choosePowerupType(){
  const phase=getPhase();
  const r=Math.random();
  if(phase<=3){
    if(r<0.55)return 'shield';
    if(r<0.85)return 'slowmo';
    return 'magnet';
  }
  if(phase<=5){
    if(r<0.35)return 'shield';
    if(r<0.70)return 'slowmo';
    return 'magnet';
  }
  if(r<0.25)return 'shield';
  if(r<0.55)return 'slowmo';
  return 'magnet';
}

function spawnPowerup(){
  // Pick a position ahead of the current node
  const cn=nodes[ball.currentNode];
  if(!cn)return;
  // Find next uncaptured node to spawn between
  let target=null;
  for(let i=ball.currentNode+1;i<nodes.length;i++){
    if(!nodes[i].captured){target=nodes[i];break;}
  }
  if(!target)return;

  const mx=(cn.x+target.x)/2+rand(-50,50);
  const my=(cn.y+target.y)/2+rand(-50,50);

  const type=choosePowerupType();

  powerups.push({
    x:mx, y:my, type, life:12,
    pulse:rand(0,Math.PI*2), bobY:0,
    spawnT:0,
  });
}

function collectPowerup(p){
  if(p.type==='shield'){
    activeShield=true;
    emit(p.x,p.y,15,['#00ffff','#80ffff','#ffffff'],1);
  } else if(p.type==='slowmo'){
    slowMoTimer=3;
    emit(p.x,p.y,15,['#c084fc','#ff80ff','#ffffff'],1);
  } else if(p.type==='magnet'){
    magnetTimer=4;
    emit(p.x,p.y,15,['#ffd32a','#ffaa00','#ffffff'],1);
  }
  handleMissionReward(applyMissionProgress('powerups_collected', 1));
  if(actx&&!muted){
    playTone(600,0.15,'sine',0.15);
    setTimeout(()=>playTone(900,0.15,'triangle',0.1),80);
    setTimeout(()=>playTone(1200,0.2,'sine',0.08),160);
  }
  vibrate([20,15,20]);
}

// Pause button area (top right corner)
const PAUSE_BTN = { size: 44, margin: 16 };
const MUTE_BTN = { size: 44, margin: 16 };
const DEAD_QUICK_RESTART_DELAY = 0.16;
let deadRetryQueued = false;
let deadRetrySource = 'death_tap';

function canUseInstantDeadRetry(){
  return state===ST.DEAD && pendingUnlocks.length===0;
}

function canTriggerDeadRetryNow(){
  return canUseInstantDeadRetry() && deathT >= DEAD_QUICK_RESTART_DELAY;
}

function queueDeadRetry(source='death_tap'){
  if(!canUseInstantDeadRetry()) return false;
  deadRetryQueued = true;
  deadRetrySource = source;
  return true;
}

function clearDeadRetryQueue(){
  deadRetryQueued = false;
  deadRetrySource = 'death_tap';
}

function maybeTriggerQueuedDeadRetry(){
  if(!deadRetryQueued || !canTriggerDeadRetryNow()) return false;
  const source = deadRetrySource || 'death_tap';
  clearDeadRetryQueue();
  quickRestartGame(source);
  return true;
}

function isPauseBtnTap(x, y) {
  const bx = W - PAUSE_BTN.margin - PAUSE_BTN.size;
  const by = PAUSE_BTN.margin;
  return x >= bx && x <= bx + PAUSE_BTN.size && y >= by && y <= by + PAUSE_BTN.size;
}

function isMuteBtnTap(x, y) {
  const bx = W - MUTE_BTN.margin - PAUSE_BTN.size - 8 - MUTE_BTN.size;
  const by = MUTE_BTN.margin;
  return x >= bx && x <= bx + MUTE_BTN.size && y >= by && y <= by + MUTE_BTN.size;
}

// Menu button areas
let menuBtnAreas = [];
let menuTouchTracking = false;
let menuTouchDidScroll = false;
let menuTouchStartX = 0;
let menuTouchStartY = 0;
let menuTouchLastY = 0;

function getComboWindow(){
  const ev = (typeof getActiveEvent==='function') ? getActiveEvent() : null;
  const baseValue = (ev && ev.id==='combo_fever') ? 3.0 : 2.5;
  const payload = applyOrbitaGameplayHooks('adjustComboWindow', { value: baseValue });
  return payload && Number.isFinite(Number(payload.value)) ? Number(payload.value) : baseValue;
}

function handleMissionReward(reward){
  if(!reward) return;
  pendingUnlocks.push(reward);
  phaseMsg='MISSÃO CONCLUÍDA';
  phaseMsgT=2.2;
  flashA=Math.max(flashA,0.18);
  shakeT=Math.max(shakeT,0.12);
  shakeA=Math.max(shakeA,5);
  emit(ball.x,ball.y,18,['#7bed9f','#00f5d4','#ffffff'],1.0);
  addScorePopup(ball.x,ball.y-60,'MISSÃO!', '#7bed9f');
  if(actx&&!muted){
    playTone(720,0.16,'sine',0.12);
    setTimeout(()=>playTone(980,0.18,'triangle',0.10),90);
  }
  vibrate([20,15,20,15,30]);
}

function shouldShowAssistGuides(){
  return tutorialStep>0 || totalGames<1;
}

function startRun(useZen, source='unknown', opts) {
  const startOpts = (opts && typeof opts === 'object') ? opts : {};
  testMode = !!startOpts.testMode;
  zenMode = testMode ? false : !!useZen;
  pendingUnlocks = [];
  reset();
  tutorialStep = 0;
  tutorialT = 0;
  clearDeadRetryQueue();
  state = ST.PLAY;
  setMusicVolume(zenMode ? 0.10 : 0.12);

  if (typeof trackEvent === 'function') {
    trackEvent('game_start', {
      mode: testMode ? 'test' : (zenMode ? 'zen' : 'normal'),
      source,
      best,
      unlocked_skins: unlockedSkins.length,
      unlocked_bgs: unlockedBgs.length
    });
  }

  if (typeof clearActiveRunSession === 'function') {
    clearActiveRunSession();
  }
  if (!zenMode && !testMode && typeof startServerRunSession === 'function') {
    startServerRunSession('normal', source);
  }
}

function startTestRun(source='debug_test'){
  startRun(false, source, { testMode:true });
}

function quickRestartGame(source='retry'){
  startRun(zenMode, source, { testMode });
}

function handleTap(x, y){
  initAudio();

  // Mute button works in any state
  if((state===ST.PLAY||state===ST.PAUSE||state===ST.MENU||state===ST.DEAD) && isMuteBtnTap(x, y)){
    toggleMute();
    return;
  }

  // Check pause button tap during play
  if(state===ST.PLAY && isPauseBtnTap(x, y)){
    state=ST.PAUSE;
    try { window._prePauseSceneLevel = (typeof musicSceneLevel === 'number') ? musicSceneLevel : 0.12; } catch(e) {}
    setMusicVolume(0.05);
    return;
  }

  // Pause screen uses buttons
  if(state===ST.PAUSE){
    for(const b of menuBtnAreas){
      if(x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h){
        b.action();
        return;
      }
    }
    return;
  }

  // Dead screen: buttons first, otherwise tap anywhere to retry
  if(state===ST.DEAD){
    for(const b of menuBtnAreas){
      if(x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h){
        clearDeadRetryQueue();
        b.action();
        return;
      }
    }
    if(canTriggerDeadRetryNow()) quickRestartGame('death_tap');
    else queueDeadRetry('death_tap');
    return;
  }

  // Menu screens
  if(state===ST.MENU){
    for(const b of menuBtnAreas){
      if(x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h){
        b.action(x,y);
        return;
      }
    }
    if(menuScreen==='main'){
      startRun(false,'menu_tap_anywhere');
    }
    return;
  }

  // Playing - tap anywhere releases
  if(state===ST.PLAY){release();}
}

function handleInput(){
  // Backwards compat for keyboard - only works during play
  if(state===ST.PLAY)release();
  else if(state===ST.MENU&&menuScreen==='main'){startRun(false,'keyboard_menu');}
  else if(state===ST.DEAD){
    if(canTriggerDeadRetryNow()) quickRestartGame('keyboard_retry');
    else queueDeadRetry('keyboard_retry');
  }
}

C.addEventListener('touchstart',e=>{
  const t=e.touches[0];
  const rect=C.getBoundingClientRect();
  const x=t.clientX-rect.left;
  const y=t.clientY-rect.top;

  if(state===ST.MENU && typeof canStartMenuScroll==='function' && canStartMenuScroll(x,y)){
    menuTouchTracking = true;
    menuTouchDidScroll = false;
    menuTouchStartX = x;
    menuTouchStartY = y;
    menuTouchLastY = y;
    return;
  }

  handleTap(x, y);
});
C.addEventListener('touchmove',e=>{
  const t=e.touches[0];
  const rect=C.getBoundingClientRect();
  const x = t.clientX-rect.left;
  const y = t.clientY-rect.top;

  if(menuTouchTracking && state===ST.MENU && typeof applyMenuScrollGesture==='function'){
    const dx = x - menuTouchStartX;
    const dy = y - menuTouchStartY;
    if(Math.abs(dy) > 6 || Math.abs(dx) > 6){
      menuTouchDidScroll = true;
    }
    if(menuTouchDidScroll){
      applyMenuScrollGesture(y - menuTouchLastY);
      menuTouchLastY = y;
      return;
    }
  }

  // Handle slider dragging during settings
  if(state===ST.MENU && menuScreen==='settings'){
    for(const b of menuBtnAreas){
      if(x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h && b.action.length>0){
        b.action(x,y);
        return;
      }
    }
  }
});
C.addEventListener('touchend',e=>{
  if(!menuTouchTracking) return;
  const t=(e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
  const rect=C.getBoundingClientRect();
  const x=t ? (t.clientX-rect.left) : menuTouchStartX;
  const y=t ? (t.clientY-rect.top) : menuTouchStartY;
  const shouldTap = !menuTouchDidScroll;
  menuTouchTracking = false;
  menuTouchDidScroll = false;
  if(shouldTap){
    handleTap(x, y);
  }
});
C.addEventListener('mousedown',e=>{
  const rect=C.getBoundingClientRect();
  handleTap(e.clientX-rect.left, e.clientY-rect.top);
});
C.addEventListener('wheel',e=>{
  if(!(state===ST.MENU && typeof canStartMenuScroll==='function')) return;
  const rect=C.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;
  if(canStartMenuScroll(x,y) && typeof wheelMenuScroll==='function'){
    e.preventDefault();
    wheelMenuScroll(e.deltaY);
  }
}, { passive:false });
document.addEventListener('keydown',e=>{
  if((menuScreen==='nickname'||menuScreen==='changeNickname') && state===ST.MENU){
    e.preventDefault();
    nicknameError='';
    if(e.key==='Backspace'){
      nicknameBuffer=nicknameBuffer.slice(0,-1);
    } else if(e.key==='Escape'){
      menuScreen=menuScreen==='changeNickname'?'settings':'main';
    } else if(e.key.length===1 && nicknameBuffer.length<16){
      const ch=e.key.toUpperCase();
      if(/[A-Z0-9]/.test(ch))nicknameBuffer+=ch;
    }
    return;
  }
  if(state===ST.MENU && (e.key==='d' || e.key==='D')){
    e.preventDefault();
    menuScreen = (menuScreen==='debug') ? 'settings' : 'debug';
    return;
  }
  if(e.code==='Space'){e.preventDefault();handleInput();}
});

// Pause on visibility change
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&state===ST.PLAY){
    state=ST.PAUSE;
    setMusicVolume(0.05);
  }
});

// ============ UPDATE ============
function update(dt){
  menuT+=dt;
  if(tutorialStep>0)tutorialT+=dt;
  if(shakeT>0)shakeT-=dt;
  if(flashA>0)flashA-=dt*2.5;
  if(phaseMsgT>0)phaseMsgT-=dt;
  if(goldFlashT>0)goldFlashT-=dt*1.5;
  if(goldZoomT>0)goldZoomT-=dt*1.2;
  if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0;}

  // Nodes
  for(const n of nodes){
    n.pulse+=dt*2;
    if(n.moving&&!n.captured){
      n.mAngle+=n.mSpeed*dt;
      n.x=n.baseX+Math.cos(n.mAngle)*n.mRadius;
      n.y=n.baseY+Math.sin(n.mAngle)*n.mRadius;
    }
    if(n.disappearing&&!n.captured){
      n.disappearTimer-=dt;
      if(n.disappearTimer<=0){
        n.visible=!n.visible;
        n.disappearTimer=n.visible?rand(2,4):rand(0.8,1.5);
      }
    }
    if(n.teleporting&&!n.captured){
      if(n.teleportFlash>0)n.teleportFlash-=dt*3;
      n.teleportTimer-=dt;
      if(n.teleportTimer<=0){
        // Emit particles at old position
        const tc=TIERS[n.tier]||TIERS.medium;
        emit(n.x,n.y,8,[tc.color.main,'#ffffff'],0.7);
        // Teleport to new random nearby position
        const angle=rand(0,Math.PI*2);
        const teleDist=rand(60,150);
        n.baseX=n.x+Math.cos(angle)*teleDist;
        n.baseY=n.y+Math.sin(angle)*teleDist;
        n.x=n.baseX;
        n.y=n.baseY;
        n.teleportFlash=1;
        n.teleportTimer=rand(2,4);
        emit(n.x,n.y,8,[tc.color.main,'#ffffff'],0.7);
      }
    }
  }

  // Asteroids
  for(const a of asteroids)a.rot+=a.rotSpd*dt;

  // Particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.98;p.vy*=0.98;
    p.life-=p.decay*dt;if(p.life<=0)particles.splice(i,1);
  }
  for(let i=ringParticles.length-1;i>=0;i--){
    const r=ringParticles[i];r.r+=(r.maxR-r.r)*4*dt;r.life-=2*dt;
    if(r.life<=0)ringParticles.splice(i,1);
  }
  for(let i=scorePopups.length-1;i>=0;i--){
    const p=scorePopups[i];p.y+=p.vy*dt;p.vy*=0.95;p.life-=dt;
    if(p.life<=0)scorePopups.splice(i,1);
  }

  if(state===ST.DEAD){
    deathT+=dt;
    if(maybeTriggerQueuedDeadRetry()) return;
    return;
  }
  if(state===ST.PAUSE)return;
  if(state!==ST.PLAY)return;

  ball.glow+=dt*3;
  ball.squash+=(1-ball.squash)*8*dt;

  // Power-up timers
  if(slowMoTimer>0)slowMoTimer-=dt;
  if(magnetTimer>0)magnetTimer-=dt;

  // Power-up spawning - only after score 15, rare
  if(!zenMode && score>=15){
    powerupSpawnTimer-=dt;
    if(powerupSpawnTimer<=0 && powerups.length<2){
      spawnPowerup();
      const ev = (typeof getActiveEvent==='function') ? getActiveEvent() : null;
      powerupSpawnTimer=(ev && ev.id==='power_surge') ? (10+Math.random()*12) : (15+Math.random()*15); // Event can speed this up
    }
  }

  // Update existing powerups
  for(let i=powerups.length-1;i>=0;i--){
    const p=powerups[i];
    p.pulse+=dt*3;
    p.life-=dt;
    p.bobY=Math.sin(menuT*2+p.pulse)*4;

    // Collision with ball
    const d=dist(ball.x,ball.y+p.bobY*0,p.x,p.y);
    if(d<25){
      collectPowerup(p);
      powerups.splice(i,1);
      continue;
    }

    if(p.life<=0)powerups.splice(i,1);
  }

  if(ball.orbiting){
    const safeIdx = getSafeCurrentNodeIndex();
    const n = safeIdx >= 0 ? nodes[safeIdx] : null;
    if(!n){
      ball.orbiting = false;
      return;
    }
    ball.currentNode = safeIdx;
    ball.angle+=ball.orbitDir*getOrbitSpeed()*dt;
    ball.x=n.x+Math.cos(ball.angle)*ball.orbitRadius;
    ball.y=n.y+Math.sin(ball.angle)*ball.orbitRadius;
    ball.speed=0;
    ball.trail.push({x:ball.x,y:ball.y,a:1});
    if(ball.trail.length>20)ball.trail.shift();
  } else {
    // Apply slow-mo to dt for ball physics
    const physDt = slowMoTimer>0 ? dt*0.4 : dt;

    // Gravity (boosted by magnet)
    let grav=getGravityStrength();
    if(magnetTimer>0)grav=Math.max(grav,150);
    if(grav>0){
      let closest=null,closestD=Infinity;
      for(let i=0;i<nodes.length;i++){
        if(nodes[i].captured||!nodes[i].visible)continue;
        const d=dist(ball.x,ball.y,nodes[i].x,nodes[i].y);
        if(d<closestD){closestD=d;closest=nodes[i];}
      }
      if(closest&&closestD>10){
        const dx=closest.x-ball.x,dy=closest.y-ball.y;
        const f=grav/closestD;
        ball.vx+=dx/closestD*f*physDt;
        ball.vy+=dy/closestD*f*physDt;
      }
    }

    ball.x+=ball.vx*physDt;ball.y+=ball.vy*physDt;
    ball.speed=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy);
    ball.trail.push({x:ball.x,y:ball.y,a:1});
    if(ball.trail.length>25)ball.trail.shift();

    // Capture check
    let captured=false;
    for(let i=0;i<nodes.length;i++){
      const n=nodes[i];
      if(n.captured||!n.visible)continue;
      if(dist(ball.x,ball.y,n.x,n.y)<n.captureR){
        capture(i);captured=true;break;
      }
    }

    // Asteroid collision
    if(!captured){
      for(const a of asteroids){
        if(dist(ball.x,ball.y,a.x,a.y)<a.r+BALL_R-3){
          emit(ball.x,ball.y,12,['#888','#aaa','#ff6b6b'],1);die();return;
        }
      }
    }

    // Death: missed all targets
    if(!captured){
      let anyReachable=false;
      for(let i=0;i<nodes.length;i++){
        const n=nodes[i];
        if(n.captured||!n.visible)continue;
        const cn=getSafeCurrentNode();
        if(!cn) continue;
        const dOrigin=dist(cn.x,cn.y,n.x,n.y);
        const dBall=dist(ball.x,ball.y,n.x,n.y);
        if(dBall<dOrigin+(zenMode?500:200)){anyReachable=true;break;}
      }
      if(!anyReachable){die();return;}
    }
  }

  // Trail fade
  for(const t of ball.trail)t.a-=3.5*dt;
  ball.trail=ball.trail.filter(t=>t.a>0);

  // Camera
  if(ball.orbiting){
    const anchor = getGameplayCameraAnchor(false);
    const cn = getSafeCurrentNode();
    if(cn){
      cam.tx=cn.x-W*anchor.x;
      cam.ty=cn.y-H*anchor.y;
    }
  } else {
    const anchor = getGameplayCameraAnchor(true);
    cam.tx=ball.x-W*anchor.x;
    cam.ty=ball.y-H*anchor.y;
  }
  cam.tz = getGameplayAutoZoomTarget(!ball.orbiting);
  cam.x+=(cam.tx-cam.x)*4*dt;
  cam.y+=(cam.ty-cam.y)*4*dt;
  cam.zoom+=(cam.tz-cam.zoom)*5*dt;

  // Cleanup
  for(let i=nodes.length-1;i>=0;i--){
    const n=nodes[i];
    const sx = n.x - cam.x;
    const sy = n.y - cam.y;
    const offscreenCaptured =
      n.captured &&
      i !== ball.currentNode &&
      (
        sx < -180 || sx > W + 180 ||
        sy < -180 || sy > H + 220
      );
    if(i === ball.currentNode) continue;
    if((n.captured&&dist(n.x,n.y,ball.x,ball.y)>W*2) || offscreenCaptured){
      nodes.splice(i,1);
      if(i<ball.currentNode)ball.currentNode--;
    }
  }
  for(let i=asteroids.length-1;i>=0;i--){
    if(dist(asteroids[i].x,asteroids[i].y,ball.x,ball.y)>W*2)asteroids.splice(i,1);
  }
}
