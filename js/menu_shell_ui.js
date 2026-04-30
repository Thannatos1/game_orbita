(function(){
function orbitaMenuShell_isMenuScreenScrollable(){
  return menuScreen==='skins' || menuScreen==='backgrounds' || menuScreen==='debug';
}

function orbitaMenuShell_syncMenuScrollState(){
  if(!orbitaMenuShell_isMenuScreenScrollable()){
    menuScrollScreen='';
    menuScrollY=0;
    menuScrollTargetY=0;
    menuScrollMinY=0;
    menuScrollMaxY=0;
    return;
  }
  if(menuScrollScreen!==menuScreen){
    menuScrollScreen=menuScreen;
    menuScrollY=0;
    menuScrollTargetY=0;
    menuScrollMinY=0;
    menuScrollMaxY=0;
  }
}

function orbitaMenuShell_updateMenuScrollAnimation(){
  if(!orbitaMenuShell_isMenuScreenScrollable()) return;
  menuScrollTargetY = clamp(menuScrollTargetY, menuScrollMinY, menuScrollMaxY);
  menuScrollY += (menuScrollTargetY - menuScrollY) * 0.22;
  if(Math.abs(menuScrollTargetY - menuScrollY) < 0.4){
    menuScrollY = menuScrollTargetY;
  }
}

function orbitaMenuShell_getMenuScrollViewport(){
  if(menuScreen==='skins') return { top:H*0.12, bottom:H-18 };
  if(menuScreen==='backgrounds') return { top:H*0.12, bottom:H-18 };
  if(menuScreen==='debug') return { top:H*0.12, bottom:H-18 };
  return null;
}

function orbitaMenuShell_beginMenuScrollClip(){
  const vp = orbitaMenuShell_getMenuScrollViewport();
  if(!vp) return null;
  const left = typeof vp.left === 'number' ? vp.left : 0;
  const right = typeof vp.right === 'number' ? vp.right : W;
  X.save();
  X.beginPath();
  X.rect(left, vp.top, right - left, vp.bottom - vp.top);
  X.clip();
  X.translate(0, menuScrollY);
  return vp;
}

function orbitaMenuShell_endMenuScrollClip(){
  X.restore();
}

function orbitaMenuShell_setMenuScrollBounds(contentStartY, contentEndY, viewport){
  if(!viewport) return;
  const viewportH = Math.max(0, viewport.bottom - viewport.top);
  const contentH = Math.max(0, contentEndY - contentStartY);
  menuScrollMaxY = 0;
  menuScrollMinY = Math.min(0, viewportH - contentH - 10);
  menuScrollTargetY = clamp(menuScrollTargetY, menuScrollMinY, menuScrollMaxY);
  menuScrollY = clamp(menuScrollY, menuScrollMinY, menuScrollMaxY);
}

function orbitaMenuShell_canStartMenuScroll(x,y){
  if(!orbitaMenuShell_isMenuScreenScrollable()) return false;
  const vp = orbitaMenuShell_getMenuScrollViewport();
  if(!vp) return false;
  const left = typeof vp.left === 'number' ? vp.left : 0;
  const right = typeof vp.right === 'number' ? vp.right : W;
  return x >= left && x <= right && y >= vp.top && y <= vp.bottom;
}

function orbitaMenuShell_applyMenuScrollGesture(deltaY){
  if(!orbitaMenuShell_isMenuScreenScrollable()) return;
  menuScrollTargetY = clamp(menuScrollTargetY + deltaY, menuScrollMinY, menuScrollMaxY);
  menuScrollY = menuScrollTargetY;
}

function orbitaMenuShell_wheelMenuScroll(deltaY){
  if(!orbitaMenuShell_isMenuScreenScrollable()) return;
  menuScrollTargetY = clamp(menuScrollTargetY - deltaY * 0.55, menuScrollMinY, menuScrollMaxY);
}

function orbitaMenuShell_drawMenuScrollBar(viewport){
  if(!viewport || menuScrollMinY >= -2) return;
  const right = typeof viewport.right === 'number' ? viewport.right : W;
  const trackX = right - 10;
  const trackY = viewport.top + 8;
  const trackH = viewport.bottom - viewport.top - 16;
  const viewportH = viewport.bottom - viewport.top;
  const contentH = viewportH - menuScrollMinY;
  const thumbH = Math.max(34, trackH * (viewportH / contentH));
  const progress = (-menuScrollY) / Math.max(1, -menuScrollMinY);
  const thumbY = trackY + (trackH - thumbH) * progress;

  X.globalAlpha = 0.18;
  X.fillStyle = '#ffffff';
  roundRect(trackX, trackY, 4, trackH, 2);
  X.fill();

  X.globalAlpha = 0.65;
  X.fillStyle = '#7aa8ff';
  roundRect(trackX, thumbY, 4, thumbH, 2);
  X.fill();
  X.globalAlpha = 1;
}

function orbitaMenuShell_drawMenuScrollFades(viewport){
  if(!viewport || menuScrollMinY >= -2) return;
  const fadeH = 24;
  const left = typeof viewport.left === 'number' ? viewport.left : 0;
  const right = typeof viewport.right === 'number' ? viewport.right : W;
  const width = right - left;
  if(menuScrollY < -1){
    const tg = X.createLinearGradient(0, viewport.top, 0, viewport.top + fadeH);
    tg.addColorStop(0, 'rgba(3,4,20,0.92)');
    tg.addColorStop(1, 'rgba(3,4,20,0)');
    X.fillStyle = tg;
    X.fillRect(left, viewport.top, width, fadeH);
  }
  if(menuScrollY > menuScrollMinY + 1){
    const bg = X.createLinearGradient(0, viewport.bottom - fadeH, 0, viewport.bottom);
    bg.addColorStop(0, 'rgba(3,4,20,0)');
    bg.addColorStop(1, 'rgba(3,4,20,0.92)');
    X.fillStyle = bg;
    X.fillRect(left, viewport.bottom - fadeH, width, fadeH);
  }
}

function orbitaMenuShell_drawMenuUI(){
  menuBtnAreas = [];
  orbitaMenuShell_syncMenuScrollState();
  orbitaMenuShell_updateMenuScrollAnimation();
  if(menuScreen==='loading')drawLoadingScreen();
  else if(menuScreen==='main')orbitaMenuShell_drawMainMenu();
  else if(menuScreen==='skins')orbitaMenuShell_drawSkinsMenu();
  else if(menuScreen==='backgrounds')orbitaMenuShell_drawBackgroundsMenu();
  else if(menuScreen==='stats')drawStatsMenu();
  else if(menuScreen==='ranking')drawRankingMenu();
  else if(menuScreen==='login')drawLoginScreen();
  else if(menuScreen==='nickname')drawNicknameScreen();
  else if(menuScreen==='settings')drawSettingsMenu();
  else if(menuScreen==='changeNickname')drawChangeNicknameScreen();
  else if(menuScreen==='confirmDelete')drawConfirmDeleteScreen();
  else if(menuScreen==='installHelp')drawInstallHelpScreen();
  else if(menuScreen==='debug')drawDebugMenu();
}

function orbitaMenuShell_drawMainMenu(){
  drawTopStatusBadges();
  X.textAlign='center';X.textBaseline='middle';

  // Title
  X.shadowColor='#b0b0ff';X.shadowBlur=30;
  X.fillStyle='#e0e0ff';X.font='bold 56px -apple-system, system-ui, sans-serif';
  X.fillText('ÓRBITA',W/2,H*0.18);X.shadowBlur=0;

  X.fillStyle='rgba(255,255,255,0.45)';X.font='13px -apple-system, system-ui, sans-serif';
  X.fillText('Salte de órbita em órbita',W/2,H*0.18+38);

  // Preview ball with current skin
  const py=H*0.31+Math.sin(menuT*2)*8;
  X.save();
  drawBallAt(W/2,py,1,false,selectedSkin);
  X.restore();

  // Skin name
  const skin=SKINS[selectedSkin];
  X.fillStyle=getRarityColor(skin.rarity);
  X.font='bold 12px -apple-system, system-ui, sans-serif';
  X.fillText(skin.name.toUpperCase(),W/2,H*0.31+30);

  // Buttons
  const btnW=Math.min(W*0.7,260);
  const isFirstSession = totalGames===0 && best===0;
  const metaUnlocked = totalGames>=3 || best>=10;
  const btnH=isFirstSession?46:(zenUnlocked?34:38);
  const btnX=(W-btnW)/2;
  let btnY=isFirstSession?H*0.44:(zenUnlocked?H*0.37:H*0.40);

  // PLAY button (highlighted)
  drawMenuButton(btnX,btnY,btnW,btnH,'JOGAR','#00f5d4',true,()=>{
    startRun(false,'menu_play');
  });
  if(!isFirstSession){
    X.fillStyle='rgba(255,255,255,0.36)';
    X.font='11px -apple-system, system-ui, sans-serif';
    X.textAlign='center';
    X.fillText('Ou toque em qualquer area livre para entrar direto na run.',W/2,btnY+btnH+18);
  }

  if(isFirstSession){
    X.fillStyle='rgba(255,255,255,0.55)';
    X.font='13px -apple-system, system-ui, sans-serif';
    X.textAlign='center';
    X.fillText('Primeira partida: toque em JOGAR e entre no ritmo.',W/2,btnY+btnH+22);
    X.fillStyle='rgba(255,255,255,0.35)';
    X.font='11px -apple-system, system-ui, sans-serif';
    X.fillText('Skins, ranking e estatísticas aparecem depois da 1ª partida.',W/2,btnY+btnH+40);

    drawMenuButton(btnX,H*0.74,btnW,34,'⚙ CONFIGURAÇÕES','#a0a0c0',false,()=>{
      menuScreen='settings';
    });

    return;
  }

  btnY+=btnH+8;

  if(!metaUnlocked){
    X.fillStyle='rgba(255,255,255,0.45)';
    X.font='12px -apple-system, system-ui, sans-serif';
    X.textAlign='center';
    X.fillText('Continue jogando para abrir ranking, skins e fundos.',W/2,btnY+8);
    X.fillStyle='rgba(255,255,255,0.3)';
    X.font='10px -apple-system, system-ui, sans-serif';
    X.fillText('Libera com 3 partidas ou recorde 10.',W/2,btnY+24);

    btnY+=36;
    drawMenuButton(btnX,btnY,btnW,btnH,'ESTATÍSTICAS','#ffd32a',false,()=>{
      menuScreen='stats';
    });

    btnY+=btnH+8;
    drawMenuButton(btnX,btnY,btnW,btnH,'⚙ CONFIGURAÇÕES','#a0a0c0',false,()=>{
      menuScreen='settings';
    });

    if(currentUser) drawMissionInfoCard((W-Math.min(W*0.82,320))/2, H*0.80, Math.min(W*0.82,320), true);
    if(best>0){
      X.fillStyle='rgba(255,255,255,0.4)';
      X.font='14px -apple-system, system-ui, sans-serif';
      X.textAlign='center';X.textBaseline='middle';
      X.fillText('RECORDE: '+best,W/2,((W <= 560 && H >= W * 1.25) ? H*0.885 : H*0.93));
    }
    return;
  }

  drawMenuButton(btnX,btnY,btnW,btnH,'🌍 RANKING GLOBAL','#ff6b9d',false,()=>{
    if(needsNickname){
      menuScreen='nickname';
      nicknameBuffer='';
      nicknameError='';
    } else {
      menuScreen='ranking';
      loadRankings();
    }
  });

  btnY+=btnH+8;
  drawMenuButton(btnX,btnY,btnW,btnH,'SKINS','#c084fc',false,()=>{
    menuScreen='skins';
  });

  btnY+=btnH+8;
  drawMenuButton(btnX,btnY,btnW,btnH,'FUNDOS','#70a1ff',false,()=>{
    menuScreen='backgrounds';
  });

  btnY+=btnH+8;
  drawMenuButton(btnX,btnY,btnW,btnH,'ESTATÍSTICAS','#ffd32a',false,()=>{
    menuScreen='stats';
  });

  btnY+=btnH+8;
  drawMenuButton(btnX,btnY,btnW,btnH,'⚙ CONFIGURAÇÕES','#a0a0c0',false,()=>{
    menuScreen='settings';
  });

  // ZEN MODE button (kept secondary even when unlocked)
  if(zenUnlocked){
    btnY+=btnH+8;
    drawMenuButton(btnX,btnY,btnW,btnH,'☯ MODO ZEN','#7bed9f',false,()=>{
      startRun(true,'menu_zen');
    });
  }

  if(currentUser) drawMissionInfoCard((W-Math.min(W*0.82,320))/2, Math.min(H*0.80, btnY+52), Math.min(W*0.82,320), true);

  // Best score
  if(best>0){
    X.fillStyle='rgba(255,255,255,0.4)';
    X.font='14px -apple-system, system-ui, sans-serif';
    X.textAlign='center';X.textBaseline='middle';
    X.fillText('RECORDE: '+best,W/2,((W <= 560 && H >= W * 1.25) ? H*0.885 : H*0.92));
  }
}

function orbitaMenuShell_drawSkinsMenu(){
  X.textAlign='center';X.textBaseline='middle';

  // Title
  X.fillStyle='#e0e0ff';X.font='bold 30px -apple-system, system-ui, sans-serif';
  X.shadowColor='#b0b0ff';X.shadowBlur=15;
  X.fillText('SKINS',W/2,H*0.06);
  X.shadowBlur=0;

  drawBackBtn();

  const rarities=['common','rare','legendary','stellar'];
  const skinsByRarity={common:[],rare:[],legendary:[],stellar:[]};
  for(const k in SKINS){
    skinsByRarity[SKINS[k].rarity].push(k);
  }

  const itemSize=70;
  const gap=12;
  const cols=Math.max(1, Math.floor((W-40)/(itemSize+gap)));
  const contentStartY=H*0.13;
  let curY=contentStartY;
  const viewport = orbitaMenuShell_beginMenuScrollClip();

  for(const rarity of rarities){
    const skins=skinsByRarity[rarity];
    if(skins.length===0)continue;

    X.fillStyle=getRarityColor(rarity);
    X.font='bold 13px -apple-system, system-ui, sans-serif';
    X.textAlign='left';
    X.shadowColor=getRarityColor(rarity);
    X.shadowBlur=8;
    X.fillText(getRarityName(rarity),20,curY);
    X.shadowBlur=0;
    curY+=22;

    let col=0;
    const startX=(W-(cols*(itemSize+gap)-gap))/2;
    for(const skinKey of skins){
      const skin=SKINS[skinKey];
      const ix=startX+col*(itemSize+gap);
      const iy=curY;
      const screenY=iy+menuScrollY;
      const isUnlocked=unlockedSkins.includes(skinKey);
      const isSelected=selectedSkin===skinKey;

      X.globalAlpha=isUnlocked?0.6:0.3;
      X.fillStyle='#000';
      roundRect(ix,iy,itemSize,itemSize,10);
      X.fill();

      X.globalAlpha=1;
      X.strokeStyle=isSelected?'#ffd32a':getRarityColor(rarity);
      X.lineWidth=isSelected?3:1.5;
      if(isSelected){
        X.shadowColor='#ffd32a';X.shadowBlur=12;
      }
      roundRect(ix,iy,itemSize,itemSize,10);
      X.stroke();
      X.shadowBlur=0;

      if(isUnlocked){
        X.save();
        const cx=ix+itemSize/2,cy=iy+itemSize/2-4;
        drawBallAt(cx,cy,1,false,skinKey);
        X.restore();

        X.fillStyle='#fff';
        X.font='bold 9px -apple-system, system-ui, sans-serif';
        X.textAlign='center';
        X.fillText(skin.name,ix+itemSize/2,iy+itemSize-8);

        menuBtnAreas.push({
          x:ix,y:screenY,w:itemSize,h:itemSize,
          action:()=>{selectedSkin=skinKey;saveData();}
        });
      } else {
        X.fillStyle='rgba(255,255,255,0.3)';
        X.font='24px sans-serif';
        X.textAlign='center';
        X.fillText('🔒',ix+itemSize/2,iy+itemSize/2-4);

        X.fillStyle='rgba(255,255,255,0.5)';
        X.font='9px -apple-system, system-ui, sans-serif';
        X.fillText(skin.unlock+' pts',ix+itemSize/2,iy+itemSize-8);
      }

      col++;
      if(col>=cols){col=0;curY+=itemSize+gap;}
    }
    if(col>0)curY+=itemSize+gap;
    curY+=8;
  }

  orbitaMenuShell_endMenuScrollClip();
  orbitaMenuShell_setMenuScrollBounds(contentStartY, curY, viewport);
  orbitaMenuShell_drawMenuScrollBar(viewport);
  orbitaMenuShell_drawMenuScrollFades(viewport);
}

function orbitaMenuShell_drawBackgroundsMenu(){
  X.textAlign='center';X.textBaseline='middle';

  X.fillStyle='#e0e0ff';X.font='bold 30px -apple-system, system-ui, sans-serif';
  X.shadowColor='#b0b0ff';X.shadowBlur=15;
  X.fillText('FUNDOS',W/2,H*0.06);
  X.shadowBlur=0;

  drawBackBtn();

  const itemW=Math.min(W*0.8,280);
  const itemH=80;
  const gap=12;
  const startX=(W-itemW)/2;
  const viewport = orbitaMenuShell_beginMenuScrollClip();
  const contentStartY=Math.max(H*0.14, (viewport ? viewport.top + 10 : H*0.14));
  let curY=contentStartY;

  for(const bgKey in BACKGROUNDS){
    const bg=BACKGROUNDS[bgKey];
    const isUnlocked=unlockedBgs.includes(bgKey);
    const isSelected=selectedBg===bgKey;
    const screenY=curY+menuScrollY;

    X.save();
    X.beginPath();
    roundRect(startX,curY,itemW,itemH,10);
    X.clip();

    if(isUnlocked){
      drawMiniBg(bg.type,startX,curY,itemW,itemH);
    } else {
      X.fillStyle='#0a0a18';
      X.fillRect(startX,curY,itemW,itemH);
    }
    X.restore();

    X.strokeStyle=isSelected?'#ffd32a':(isUnlocked?'#70a1ff':'#444');
    X.lineWidth=isSelected?3:1.5;
    if(isSelected){X.shadowColor='#ffd32a';X.shadowBlur=12;}
    roundRect(startX,curY,itemW,itemH,10);
    X.stroke();
    X.shadowBlur=0;

    X.fillStyle='rgba(0,0,0,0.6)';
    X.fillRect(startX,curY+itemH-22,itemW,22);
    X.fillStyle=isUnlocked?'#fff':'rgba(255,255,255,0.4)';
    X.font='bold 13px -apple-system, system-ui, sans-serif';
    X.textAlign='center';
    X.textBaseline='middle';
    X.fillText(bg.name.toUpperCase(),startX+itemW/2,curY+itemH-11);

    if(bg.masterpiece){
      X.fillStyle='rgba(255,215,120,0.92)';
      X.font='bold 10px -apple-system, system-ui, sans-serif';
      X.textAlign='left';
      X.textBaseline='middle';
      X.fillText('✦ OBRA-PRIMA',startX+10,curY+12);
      X.textAlign='center';
      X.textBaseline='middle';
    }

    if(!isUnlocked){
      X.fillStyle='rgba(255,255,255,0.6)';
      X.font='28px sans-serif';
      X.fillText('🔒',startX+itemW/2,curY+itemH/2-14);
      X.fillStyle=bg.masterpiece?'rgba(255,220,140,0.76)':'rgba(255,255,255,0.5)';
      X.font=bg.masterpiece?'bold 9px -apple-system, system-ui, sans-serif':'11px -apple-system, system-ui, sans-serif';
      const unlockLabel=(typeof getBackgroundUnlockLabel==='function') ? getBackgroundUnlockLabel(bgKey) : (bg.unlock+' pts');
      X.fillText(unlockLabel,startX+itemW/2,curY+itemH/2+13);
    } else {
      menuBtnAreas.push({
        x:startX,y:screenY,w:itemW,h:itemH,
        action:()=>{selectedBg=bgKey;saveData();}
      });
    }

    curY+=itemH+gap;
  }

  orbitaMenuShell_endMenuScrollClip();
  orbitaMenuShell_setMenuScrollBounds(contentStartY, curY, viewport);
  orbitaMenuShell_drawMenuScrollBar(viewport);
  orbitaMenuShell_drawMenuScrollFades(viewport);
}

window.orbitaMenuShell_isMenuScreenScrollable = orbitaMenuShell_isMenuScreenScrollable;
window.orbitaMenuShell_syncMenuScrollState = orbitaMenuShell_syncMenuScrollState;
window.orbitaMenuShell_updateMenuScrollAnimation = orbitaMenuShell_updateMenuScrollAnimation;
window.orbitaMenuShell_getMenuScrollViewport = orbitaMenuShell_getMenuScrollViewport;
window.orbitaMenuShell_beginMenuScrollClip = orbitaMenuShell_beginMenuScrollClip;
window.orbitaMenuShell_endMenuScrollClip = orbitaMenuShell_endMenuScrollClip;
window.orbitaMenuShell_setMenuScrollBounds = orbitaMenuShell_setMenuScrollBounds;
window.orbitaMenuShell_canStartMenuScroll = orbitaMenuShell_canStartMenuScroll;
window.orbitaMenuShell_applyMenuScrollGesture = orbitaMenuShell_applyMenuScrollGesture;
window.orbitaMenuShell_wheelMenuScroll = orbitaMenuShell_wheelMenuScroll;
window.orbitaMenuShell_drawMenuScrollBar = orbitaMenuShell_drawMenuScrollBar;
window.orbitaMenuShell_drawMenuScrollFades = orbitaMenuShell_drawMenuScrollFades;
window.orbitaMenuShell_drawMenuUI = orbitaMenuShell_drawMenuUI;
window.orbitaMenuShell_drawMainMenu = orbitaMenuShell_drawMainMenu;
window.orbitaMenuShell_drawSkinsMenu = orbitaMenuShell_drawSkinsMenu;
window.orbitaMenuShell_drawBackgroundsMenu = orbitaMenuShell_drawBackgroundsMenu;
})();
