// ============ DRAW ============
let bgDecorLayout = null;

function resetBackgroundAnchors(){
  bgDecorLayout = null;
}

function pickRandom(list){
  return list[Math.floor(Math.random()*list.length)];
}

function isPortraitPhoneCanvas(){
  return W <= 560 && H >= W * 1.25;
}

function buildBackgroundDecorLayout(){
  const mobilePortrait = isPortraitPhoneCanvas();
  const leftX  = () => mobilePortrait ? rand(W*0.04, W*0.14) : rand(W*0.12, W*0.28);
  const rightX = () => mobilePortrait ? rand(W*0.86, W*0.96) : rand(W*0.72, W*0.88);
  const topY   = () => mobilePortrait ? rand(H*0.10, H*0.22) : rand(H*0.14, H*0.30);
  const midY   = () => mobilePortrait ? rand(H*0.26, H*0.48) : rand(H*0.34, H*0.56);
  const lowY   = () => mobilePortrait ? rand(H*0.78, H*0.90) : rand(H*0.72, H*0.86);

  const blackSide = Math.random() < 0.5 ? 'left' : 'right';
  const blackX = blackSide === 'left' ? leftX() : rightX();
  const blackY = lowY();

  const redSide = Math.random() < 0.5 ? 'left' : 'right';
  const redX = mobilePortrait
    ? (redSide === 'left' ? rand(-W*0.06, W*0.04) : rand(W*0.96, W*1.06))
    : (redSide === 'left' ? rand(W*0.18, W*0.34) : rand(W*0.66, W*0.82));
  const redY = mobilePortrait ? rand(H*0.10, H*0.18) : topY();

  const pulsarOptions = mobilePortrait
    ? [
        { x: rand(-W*0.05, W*0.05), y: rand(H*0.10, H*0.20), side:'left' },
        { x: rand(W*0.95, W*1.05), y: rand(H*0.10, H*0.20), side:'right' },
        { x: rand(-W*0.05, W*0.04), y: rand(H*0.30, H*0.40), side:'left' },
        { x: rand(W*0.96, W*1.05), y: rand(H*0.30, H*0.40), side:'right' },
      ]
    : [
        { x: rand(W*0.14, W*0.28), y: rand(H*0.18, H*0.32), side:'left' },
        { x: rand(W*0.72, W*0.86), y: rand(H*0.18, H*0.32), side:'right' },
        { x: rand(W*0.10, W*0.18), y: midY(), side:'left' },
        { x: rand(W*0.82, W*0.90), y: midY(), side:'right' },
      ];
  const pulsar = pickRandom(pulsarOptions);
  const radial = Math.atan2(pulsar.y - H/2, pulsar.x - W/2);

  const saturnOptions = mobilePortrait
    ? [
        { x: rand(-W*0.08, W*0.05), y: rand(H*0.14, H*0.26), side:'left'  },
        { x: rand(W*0.95, W*1.08), y: rand(H*0.14, H*0.26), side:'right' },
      ]
    : [
        { x: rand(W*0.08, W*0.18), y: rand(H*0.22, H*0.36), side:'left'  },
        { x: rand(W*0.82, W*0.92), y: rand(H*0.22, H*0.36), side:'right' },
        { x: rand(W*0.10, W*0.20), y: rand(H*0.48, H*0.62), side:'left'  },
        { x: rand(W*0.80, W*0.90), y: rand(H*0.48, H*0.62), side:'right' },
      ];
  const saturn = pickRandom(saturnOptions);

  bgDecorLayout = {
    _w: W,
    _h: H,
    blackhole: {
      x: blackX,
      y: blackY,
      diskR: rand(26, 34),
      ringTilt: blackSide === 'left' ? rand(-0.34, -0.18) : rand(0.18, 0.34),
    },
    redgiant: {
      x: redX,
      y: redY,
      side: redSide,
      starR: mobilePortrait ? rand(54, 66) : rand(64, 80),
    },
    galaxy: (() => {
      const galaxyOptions = [
        { x: rand(W*0.12, W*0.22), y: rand(H*0.18, H*0.30), side:'left',  tilt: rand(0.18, 0.34) },
        { x: rand(W*0.78, W*0.88), y: rand(H*0.18, H*0.30), side:'right', tilt: rand(-0.34, -0.18) },
        { x: rand(W*0.10, W*0.20), y: rand(H*0.56, H*0.70), side:'left',  tilt: rand(0.16, 0.30) },
        { x: rand(W*0.80, W*0.90), y: rand(H*0.56, H*0.70), side:'right', tilt: rand(-0.30, -0.16) },
      ];
      const g = pickRandom(galaxyOptions);
      return {
        x: g.x,
        y: g.y,
        side: g.side,
        tilt: g.tilt,
        scale: rand(0.72, 0.92),
      };
    })(),
    pulsar: {
      x: pulsar.x,
      y: pulsar.y,
      side: pulsar.side,
      scale: mobilePortrait ? rand(0.62, 0.76) : rand(0.90, 1.05),
      beamBase: radial + Math.PI/2 + rand(-0.18, 0.18),
    },
    saturn: {
      x: saturn.x,
      y: saturn.y,
      side: saturn.side,
      planetR: mobilePortrait ? rand(42, 54) : rand(56, 68),
      ringTilt: saturn.side === 'left' ? rand(0.18, 0.34) : rand(-0.34, -0.18),
      hazeR: mobilePortrait ? rand(110, 140) : rand(160, 190),
    },
  };
}

function getBackgroundDecor(type){
  if(!bgDecorLayout || bgDecorLayout._w !== W || bgDecorLayout._h !== H){
    buildBackgroundDecorLayout();
  }
  return bgDecorLayout[type] || {};
}

function drawBackground(){
  const bg=BACKGROUNDS[selectedBg]||BACKGROUNDS.space;
  const t=menuT;

  if(bg.type==='stars'){
    // Default space - just dark
    const bgc=getBgColors();
    const grad=X.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,bgc.top);grad.addColorStop(0.5,bgc.mid);grad.addColorStop(1,bgc.bot);
    X.fillStyle=grad;X.fillRect(-10,-10,W+20,H+20);
  }
  else if(bg.type==='nebula'){
    // Nebula - colorful clouds
    X.fillStyle='#0a0518';X.fillRect(-10,-10,W+20,H+20);
    const clouds=[
      {x:W*0.3,y:H*0.3,r:W*0.5,c1:'rgba(150,50,200,0.3)',c2:'rgba(150,50,200,0)'},
      {x:W*0.7,y:H*0.6,r:W*0.45,c1:'rgba(50,100,200,0.25)',c2:'rgba(50,100,200,0)'},
      {x:W*0.5,y:H*0.5,r:W*0.4,c1:'rgba(200,50,100,0.2)',c2:'rgba(200,50,100,0)'},
    ];
    for(const c of clouds){
      const g=X.createRadialGradient(c.x+Math.sin(t*0.3)*30,c.y+Math.cos(t*0.2)*20,0,c.x,c.y,c.r);
      g.addColorStop(0,c.c1);g.addColorStop(1,c.c2);
      X.fillStyle=g;X.fillRect(-10,-10,W+20,H+20);
    }
  }
  else if(bg.type==='galaxy'){
    X.fillStyle='#040418';X.fillRect(-10,-10,W+20,H+20);

    const decor = getBackgroundDecor('galaxy');
    const cx = decor.x ?? W*0.84;
    const cy = decor.y ?? H*0.24;
    const scale = decor.scale ?? 0.82;
    const tilt = (decor.tilt ?? -0.24) + Math.sin(t*0.10)*0.015;
    const drift = t*0.045;

    // soft cosmic haze kept tighter so it does not invade the play path
    const haze=X.createRadialGradient(cx,cy,0,cx,cy,150*scale);
    haze.addColorStop(0,'rgba(160,120,255,0.10)');
    haze.addColorStop(0.42,'rgba(90,70,180,0.06)');
    haze.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=haze;X.fillRect(-10,-10,W+20,H+20);

    // spiral arms, smaller and pushed toward the edge like Saturn/Pulsar
    for(let arm=0;arm<3;arm++){
      const armAngle=drift+arm*Math.PI*2/3;
      for(let j=0;j<42;j++){
        const dist=j*5.2*scale;
        const angle=armAngle+j*0.19;
        const rx=Math.cos(angle)*dist;
        const ry=Math.sin(angle)*dist*0.58;

        const x=cx + rx*Math.cos(tilt) - ry*Math.sin(tilt);
        const y=cy + rx*Math.sin(tilt) + ry*Math.cos(tilt);

        X.globalAlpha=Math.max(0.05,0.22-j*0.004);
        X.fillStyle=j<12?'rgba(255,245,170,0.92)':(j<26?'rgba(255,140,210,0.78)':'rgba(150,135,255,0.68)');
        X.beginPath();X.arc(x,y,Math.max(0.8,2.3-j*0.03)*scale,0,Math.PI*2);X.fill();
      }
    }

    // subtle dust ring to make it feel alive, but decorative
    for(let i=0;i<44;i++){
      const a=drift*1.2+i*(Math.PI*2/44);
      const radius=(78+Math.sin(i*1.7+t*0.3)*8)*scale;
      const px=cx + Math.cos(a)*radius*Math.cos(tilt) - Math.sin(a)*(radius*0.42)*Math.sin(tilt);
      const py=cy + Math.cos(a)*radius*Math.sin(tilt) + Math.sin(a)*(radius*0.42)*Math.cos(tilt);
      X.globalAlpha=0.10+0.05*Math.sin(t*0.8+i);
      X.fillStyle=i%2===0?'rgba(255,220,120,0.75)':'rgba(180,140,255,0.66)';
      X.beginPath();X.arc(px,py,1.3*scale,0,Math.PI*2);X.fill();
    }

    // core glow
    const cg=X.createRadialGradient(cx,cy,0,cx,cy,62*scale);
    cg.addColorStop(0,'rgba(255,245,185,0.46)');
    cg.addColorStop(1,'rgba(255,245,185,0)');
    X.fillStyle=cg;X.fillRect(-10,-10,W+20,H+20);
    X.globalAlpha=1;
  }
  else if(bg.type==='blackhole'){
    X.fillStyle='#000005';X.fillRect(-10,-10,W+20,H+20);

    const decor = getBackgroundDecor('blackhole');
    const cx = decor.x ?? W*0.10;
    const cy = decor.y ?? H*0.84;
    const diskR = decor.diskR ?? 30;
    const ringTilt = (decor.ringTilt ?? -0.22) + Math.sin(t*0.22)*0.02;

    // Soft distant haze
    const hg=X.createRadialGradient(cx,cy,0,cx,cy,150);
    hg.addColorStop(0,'rgba(255,140,40,0.06)');
    hg.addColorStop(0.45,'rgba(180,90,20,0.04)');
    hg.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=hg;X.fillRect(-10,-10,W+20,H+20);

    // Subtle accretion disk behind
    for(let i=0;i<7;i++){
      X.globalAlpha=0.12-i*0.012;
      X.strokeStyle=i%2===0?'rgba(255,185,95,0.42)':'rgba(255,120,40,0.24)';
      X.lineWidth=4.5-i*0.35;
      X.beginPath();
      X.ellipse(cx,cy,62+i*9,18+i*3.0,ringTilt,0,Math.PI*2);
      X.stroke();
    }

    // Moving dust tied to the ellipse so the ring feels alive but calm
    for(let i=0;i<48;i++){
      const a=t*0.55 + (i/48)*Math.PI*2;
      const ex=66 + (i%6)*7;
      const ey=17 + (i%4)*2.2;
      const cosA=Math.cos(a), sinA=Math.sin(a);
      const px=cx + cosA*ex*Math.cos(ringTilt) - sinA*ey*Math.sin(ringTilt);
      const py=cy + cosA*ex*Math.sin(ringTilt) + sinA*ey*Math.cos(ringTilt);
      X.globalAlpha=0.03 + (i%4)*0.012;
      X.fillStyle=i%2===0?'rgba(255,210,150,0.78)':'rgba(255,150,70,0.62)';
      X.beginPath();X.arc(px,py,0.85 + (i%3)*0.12,0,Math.PI*2);X.fill();
    }

    X.globalAlpha=1;

    // Event horizon
    X.fillStyle='#000';
    X.shadowColor='rgba(255,120,40,0.28)';X.shadowBlur=18;
    X.beginPath();X.arc(cx,cy,diskR,0,Math.PI*2);X.fill();
    X.shadowBlur=0;

    // Photon ring
    X.strokeStyle='rgba(255,185,95,0.34)';X.lineWidth=2.2;
    X.beginPath();X.arc(cx,cy,diskR+4,0,Math.PI*2);X.stroke();
  }

else if(bg.type==='redgiant'){
    X.fillStyle='#08030a';X.fillRect(-10,-10,W+20,H+20);

    const mobileBg = isPortraitPhoneCanvas();
    const decor = getBackgroundDecor('redgiant');
    const side = decor.side || ((decor.x ?? W*0.9) < W/2 ? 'left' : 'right');
    const starR = (decor.starR ?? 76) * (mobileBg ? 0.92 : 1);
    const cx = mobileBg
      ? (side === 'left' ? -starR*0.18 : W + starR*0.18)
      : (decor.x ?? W*0.90);
    const cy = mobileBg ? Math.min(decor.y ?? H*0.15, H*0.16) : (decor.y ?? H*0.18);
    const atmosphereR = (mobileBg ? 122 : 170) * (starR / (decor.starR ?? 76));
    const flareAlpha = mobileBg ? 0.10 : 0.16;

    const ag=X.createRadialGradient(cx,cy,0,cx,cy,atmosphereR);
    ag.addColorStop(0, mobileBg ? 'rgba(255,110,45,0.08)' : 'rgba(255,110,45,0.12)');
    ag.addColorStop(0.34, mobileBg ? 'rgba(210,55,20,0.05)' : 'rgba(210,55,20,0.07)');
    ag.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=ag;X.fillRect(-10,-10,W+20,H+20);

    X.shadowColor='rgba(255,70,0,0.28)';X.shadowBlur=mobileBg ? 16 : 22;
    const sg=X.createRadialGradient(cx,cy,0,cx,cy,starR);
    sg.addColorStop(0,'#fff4a0');
    sg.addColorStop(0.46,'#ff8a00');
    sg.addColorStop(1,'#d93400');
    X.fillStyle=sg;
    X.beginPath();X.arc(cx,cy,starR+Math.sin(t)*2.2,0,Math.PI*2);X.fill();
    X.shadowBlur=0;

    for(let i=0;i<6;i++){
      const fa=t*0.42+i*Math.PI/3;
      const inner=starR*0.94;
      const outer=starR+(mobileBg ? 18 : 26)+Math.sin(t*2+i)*(mobileBg ? 4 : 6);
      X.fillStyle='rgba(255,160,60,' + flareAlpha + ')';
      X.beginPath();
      X.moveTo(cx+Math.cos(fa)*inner,cy+Math.sin(fa)*inner);
      X.lineTo(cx+Math.cos(fa)*outer,cy+Math.sin(fa)*outer);
      X.lineTo(cx+Math.cos(fa+0.11)*inner,cy+Math.sin(fa+0.11)*inner);
      X.closePath();X.fill();
    }
  }


else if(bg.type==='pulsar'){
    X.fillStyle='#030612';X.fillRect(-10,-10,W+20,H+20);

    const mobileBg = isPortraitPhoneCanvas();
    const decor = getBackgroundDecor('pulsar');
    const side = decor.side || ((decor.x ?? W*0.78) < W/2 ? 'left' : 'right');
    const pScale = (decor.scale ?? 1.0) * (mobileBg ? 0.88 : 1);
    const pcx = mobileBg
      ? (side === 'left' ? -W*0.03 : W + W*0.03)
      : (decor.x ?? W*0.78);
    const pcy = mobileBg ? Math.min(decor.y ?? H*0.18, H*0.20) : (decor.y ?? H*0.28);
    const fieldAlpha = mobileBg ? 0.55 : 1;
    const beamLen = mobileBg ? 250 * pScale : 420 * pScale;
    const beamWide = mobileBg ? 14 : 26;
    const beamThin = mobileBg ? 4 : 7;

    const neb1=X.createRadialGradient(pcx,pcy,0,pcx,pcy,(mobileBg ? 170 : 260)*pScale);
    neb1.addColorStop(0, mobileBg ? 'rgba(80,180,255,0.08)' : 'rgba(80,180,255,0.14)');
    neb1.addColorStop(0.45, mobileBg ? 'rgba(70,100,255,0.05)' : 'rgba(70,100,255,0.08)');
    neb1.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=neb1;X.fillRect(-10,-10,W+20,H+20);

    if(!mobileBg){
      const neb2=X.createRadialGradient(W*0.92,H*0.12,0,W*0.92,H*0.12,220*pScale);
      neb2.addColorStop(0,'rgba(180,120,255,0.08)');
      neb2.addColorStop(1,'rgba(0,0,0,0)');
      X.fillStyle=neb2;X.fillRect(-10,-10,W+20,H+20);
    }

    for(let i=0;i<4;i++){
      X.globalAlpha=(0.10-i*0.015) * fieldAlpha;
      X.strokeStyle=i%2===0?'rgba(110,230,255,0.6)':'rgba(150,130,255,0.45)';
      X.lineWidth=mobileBg ? 1.1 : 1.4;
      X.beginPath();
      X.ellipse(pcx,pcy,(78+i*18)*pScale,(130+i*22)*pScale,0.55,0.12*Math.PI,0.88*Math.PI);
      X.stroke();
      X.beginPath();
      X.ellipse(pcx,pcy,(78+i*18)*pScale,(130+i*22)*pScale,-0.55,1.12*Math.PI,1.88*Math.PI);
      X.stroke();
    }

    const ph=X.createRadialGradient(pcx,pcy,0,pcx,pcy,(mobileBg ? 145 : 210)*pScale);
    ph.addColorStop(0, mobileBg ? 'rgba(160,245,255,0.10)' : 'rgba(160,245,255,0.18)');
    ph.addColorStop(0.18, mobileBg ? 'rgba(110,180,255,0.08)' : 'rgba(110,180,255,0.14)');
    ph.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=ph;X.fillRect(-10,-10,W+20,H+20);

    const beamA=(decor.beamBase ?? 0.75) + t*0.85;
    for(const off of [0, Math.PI]){
      const ang=beamA+off;
      X.globalAlpha=mobileBg ? 0.08 : 0.16;
      X.strokeStyle='rgba(90,225,255,0.95)';
      X.lineWidth=beamWide;
      X.beginPath();
      X.moveTo(pcx-Math.cos(ang)*beamLen,pcy-Math.sin(ang)*beamLen);
      X.lineTo(pcx+Math.cos(ang)*beamLen,pcy+Math.sin(ang)*beamLen);
      X.stroke();

      X.globalAlpha=mobileBg ? 0.14 : 0.26;
      X.strokeStyle='rgba(210,250,255,0.95)';
      X.lineWidth=beamThin;
      X.beginPath();
      X.moveTo(pcx-Math.cos(ang)*beamLen,pcy-Math.sin(ang)*beamLen);
      X.lineTo(pcx+Math.cos(ang)*beamLen,pcy+Math.sin(ang)*beamLen);
      X.stroke();
    }

    for(let i=0;i<3+(mobileBg?0:1);i++){
      const phase=(t*2.2+i*0.85)%4;
      const rr=(mobileBg ? 58 : 74)+phase*(mobileBg ? 34 : 46)*pScale;
      X.globalAlpha=Math.max(0,(mobileBg ? 0.12 : 0.22)-phase*(mobileBg ? 0.030 : 0.045));
      X.strokeStyle=i%2===0?'rgba(130,250,255,0.9)':'rgba(110,150,255,0.7)';
      X.lineWidth=(mobileBg ? 1.7 : 2.4)-phase*0.2;
      X.beginPath();X.arc(pcx,pcy,rr,0,Math.PI*2);X.stroke();
    }

    X.globalAlpha=1;
    X.shadowColor='#8ffcff';X.shadowBlur=mobileBg ? 22 : 32;
    const pg=X.createRadialGradient(pcx,pcy,0,pcx,pcy,(mobileBg ? 62 : 88)*pScale);
    pg.addColorStop(0,'#fffad8');
    pg.addColorStop(0.14,'#a9ffff');
    pg.addColorStop(0.32,'#56b8ff');
    pg.addColorStop(0.58,'rgba(90,130,255,0.55)');
    pg.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=pg;
    X.beginPath();X.arc(pcx,pcy,(mobileBg ? 54 : 82)*pScale,0,Math.PI*2);X.fill();
    X.shadowBlur=0;

    X.fillStyle='#fffbe9';
    X.beginPath();X.arc(pcx,pcy,(mobileBg ? 9 : 12)*pScale,0,Math.PI*2);X.fill();
    X.strokeStyle='rgba(255,255,255,0.85)';X.lineWidth=mobileBg ? 1.6 : 2;
    X.beginPath();
    X.moveTo(pcx-(mobileBg ? 18 : 24)*pScale,pcy);X.lineTo(pcx+(mobileBg ? 18 : 24)*pScale,pcy);
    X.moveTo(pcx,pcy-(mobileBg ? 18 : 24)*pScale);X.lineTo(pcx,pcy+(mobileBg ? 18 : 24)*pScale);
    X.stroke();

    for(let i=0;i<(mobileBg ? 12 : 18);i++){
      const a=(i/(mobileBg ? 12 : 18))*Math.PI*2 + t*0.4;
      const d=((mobileBg ? 18 : 26) + (i%3)*(mobileBg ? 8 : 12) + Math.sin(t*2+i)*3)*pScale;
      X.globalAlpha=mobileBg ? 0.18 : 0.28;
      X.fillStyle=i%2===0?'#9bf6ff':'#c8b6ff';
      X.beginPath();X.arc(pcx+Math.cos(a)*d,pcy+Math.sin(a)*d,(mobileBg ? 1.1 : 1.6),0,Math.PI*2);X.fill();
    }
    X.globalAlpha=1;
  }
  else if(bg.type==='saturnrings'){
    X.fillStyle='#06050c';X.fillRect(-10,-10,W+20,H+20);

    const mobileBg = isPortraitPhoneCanvas();
    const decor = getBackgroundDecor('saturn');
    const side = decor.side || ((decor.x ?? W*0.90) < W/2 ? 'left' : 'right');
    const planetR = (decor.planetR ?? 62) * (mobileBg ? 0.88 : 1);
    const scx = mobileBg
      ? (side === 'left' ? -planetR*0.34 : W + planetR*0.34)
      : (decor.x ?? W*0.90);
    const scy = mobileBg ? Math.min(decor.y ?? H*0.22, H*0.24) : (decor.y ?? H*0.34);
    const ringTilt = (decor.ringTilt ?? -0.28) + Math.sin(t*0.18)*0.028;
    const ringSpin=t*0.65;
    const hazeR = (decor.hazeR ?? 178) * (mobileBg ? 0.78 : 1);

    const sg=X.createRadialGradient(scx,scy,0,scx,scy,hazeR);
    sg.addColorStop(0, mobileBg ? 'rgba(255,215,150,0.07)' : 'rgba(255,215,150,0.10)');
    sg.addColorStop(0.34, mobileBg ? 'rgba(180,120,80,0.04)' : 'rgba(180,120,80,0.06)');
    sg.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=sg;X.fillRect(-10,-10,W+20,H+20);

    X.globalAlpha=mobileBg ? 0.025 : 0.05;
    X.strokeStyle='rgba(170,200,255,0.22)';
    X.lineWidth=mobileBg ? 1.1 : 1.5;
    for(let i=0;i<5;i++){
      X.beginPath();
      X.moveTo(W*0.18, H*(0.24+i*0.09));
      X.bezierCurveTo(W*0.42,H*(0.20+i*0.08),W*0.62,H*(0.34+i*0.06),W*0.96,H*(0.28+i*0.09));
      X.stroke();
    }
    X.globalAlpha=1;

    for(let i=0;i<7;i++){
      X.globalAlpha=(mobileBg ? 0.09 : 0.14)-i*(mobileBg ? 0.009 : 0.012);
      X.strokeStyle=i%3===0?'rgba(245,214,156,0.54)':(i%3===1?'rgba(175,205,255,0.26)':'rgba(214,168,120,0.30)');
      X.lineWidth=(mobileBg ? 4.1 : 5.5)-i*0.42;
      X.beginPath();
      X.ellipse(scx,scy,planetR+(mobileBg ? 20 : 28)+i*(mobileBg ? 8.5 : 12),(planetR*0.35)+i*(mobileBg ? 3.2 : 4.2),ringTilt,0,Math.PI*2);
      X.stroke();
    }

    for(let i=0;i<(mobileBg ? 44 : 72);i++){
      const orbitA=ringSpin + (i/(mobileBg ? 44 : 72))*Math.PI*2;
      const rr=(planetR+(mobileBg ? 20 : 26)) + (i%10)*(mobileBg ? 6 : 9);
      const ex=(rr + Math.sin(t*1.7+i)*2.0);
      const ey=((mobileBg ? 16 : 21) + (i%7)*(mobileBg ? 1.8 : 2.6));
      const cosA=Math.cos(orbitA), sinA=Math.sin(orbitA);
      const px=scx + cosA*ex*Math.cos(ringTilt) - sinA*ey*Math.sin(ringTilt);
      const py=scy + cosA*ex*Math.sin(ringTilt) + sinA*ey*Math.cos(ringTilt);
      X.globalAlpha=(mobileBg ? 0.020 : 0.035) + (i%5)*0.010;
      X.fillStyle=i%2===0?'rgba(255,232,186,0.80)':'rgba(170,210,255,0.72)';
      X.beginPath();X.arc(px,py,(mobileBg ? 0.78 : 0.95) + (i%3)*0.12,0,Math.PI*2);X.fill();
    }

    for(let i=0;i<3;i++){
      const a=ringSpin*0.9 + i*Math.PI*2/3;
      const ex=planetR+(mobileBg ? 42 : 58), ey=planetR*(mobileBg ? 0.45 : 0.53);
      const cosA=Math.cos(a), sinA=Math.sin(a);
      const px=scx + cosA*ex*Math.cos(ringTilt) - sinA*ey*Math.sin(ringTilt);
      const py=scy + cosA*ex*Math.sin(ringTilt) + sinA*ey*Math.cos(ringTilt);
      X.globalAlpha=(mobileBg ? 0.07 : 0.11) + 0.04*Math.sin(t*2+i);
      X.shadowColor='rgba(255,240,190,0.50)';X.shadowBlur=mobileBg ? 4 : 7;
      X.fillStyle='rgba(255,240,190,0.72)';
      X.beginPath();X.arc(px,py,mobileBg ? 2.0 : 2.6,0,Math.PI*2);X.fill();
      X.shadowBlur=0;
    }

    X.globalAlpha=1;
    X.shadowColor='rgba(255,198,126,0.24)';X.shadowBlur=mobileBg ? 12 : 18;
    const sb=X.createRadialGradient(scx-10,scy-14,0,scx,scy,planetR+6);
    sb.addColorStop(0,'#fff7d4');
    sb.addColorStop(0.16,'#ffd78a');
    sb.addColorStop(0.36,'#f3b05d');
    sb.addColorStop(0.62,'#b97338');
    sb.addColorStop(1,'#5b3218');
    X.fillStyle=sb;
    X.beginPath();X.arc(scx,scy,planetR,0,Math.PI*2);X.fill();
    X.shadowBlur=0;

    X.save();
    X.beginPath();X.arc(scx,scy,planetR,0,Math.PI*2);X.clip();
    for(let i=0;i<5;i++){
      X.globalAlpha=(mobileBg ? 0.05 : 0.08) + i*0.010;
      X.fillStyle=i%2===0?'rgba(90,45,18,0.42)':'rgba(255,220,170,0.16)';
      X.fillRect(scx-(planetR+20), scy-(planetR*0.75) + i*(planetR*0.30) + Math.sin(t*0.7+i)*2.2, (planetR+20)*2, (mobileBg ? 7 : 9) + i*1.6);
    }
    X.restore();

    X.globalAlpha=mobileBg ? 0.18 : 0.30;
    X.strokeStyle='rgba(255,236,190,0.68)';
    X.lineWidth=mobileBg ? 2.8 : 4;
    X.beginPath();
    X.ellipse(scx,scy,planetR+(mobileBg ? 48 : 66),planetR*(mobileBg ? 0.48 : 0.56),ringTilt,0.10*Math.PI + 0.08*Math.sin(t*0.35),0.88*Math.PI + 0.06*Math.sin(t*0.35));
    X.stroke();
    X.globalAlpha=mobileBg ? 0.06 : 0.10;
    X.strokeStyle='rgba(130,170,255,0.50)';
    X.lineWidth=mobileBg ? 5 : 8;
    X.beginPath();
    X.ellipse(scx,scy,planetR+(mobileBg ? 60 : 80),planetR*(mobileBg ? 0.58 : 0.68),ringTilt,0.06*Math.PI + 0.06*Math.sin(t*0.32),0.92*Math.PI + 0.05*Math.sin(t*0.32));
    X.stroke();
    X.globalAlpha=1;

    if(!mobileBg){
      const moonOffsets = [
        [-planetR*2.9, -planetR*1.8, 4.5],
        [-planetR*3.2,  planetR*2.2, 3.0],
        [ planetR*1.7,  planetR*3.1, 2.5],
        [ planetR*2.2, -planetR*2.7, 2.8],
      ];
      for(let i=0;i<moonOffsets.length;i++){
        const m=moonOffsets[i];
        const mx=scx+m[0], my=scy+m[1];
        X.globalAlpha=0.18;
        X.strokeStyle='rgba(190,200,255,0.24)';
        X.lineWidth=1;
        X.beginPath();X.arc(mx,my,9+i*2,0,Math.PI*2);X.stroke();
        X.globalAlpha=0.40;
        X.fillStyle='rgba(230,230,255,0.65)';
        X.beginPath();X.arc(mx,my,m[2],0,Math.PI*2);X.fill();
      }
      X.globalAlpha=1;
    }
  }

  else if(bg.type==='astralcathedral'){
    X.fillStyle='#050713';X.fillRect(-10,-10,W+20,H+20);

    const mobileBg = isPortraitPhoneCanvas();
    const glowReach = mobileBg ? W*0.26 : W*0.42;
    const leftGlowX = mobileBg ? W*0.03 : W*0.10;
    const rightGlowX = mobileBg ? W*0.97 : W*0.90;
    const pillarSides = mobileBg ? [0.06, 0.94] : [0.12, 0.88];
    const pillarAlpha = mobileBg ? 0.18 : 0.34;

    const lg=X.createRadialGradient(leftGlowX,H*0.52,0,leftGlowX,H*0.52,glowReach);
    lg.addColorStop(0, mobileBg ? 'rgba(90,140,255,0.08)' : 'rgba(90,140,255,0.16)');
    lg.addColorStop(1,'rgba(90,140,255,0)');
    X.fillStyle=lg;X.fillRect(-10,-10,W+20,H+20);

    const rg=X.createRadialGradient(rightGlowX,H*0.52,0,rightGlowX,H*0.52,glowReach);
    rg.addColorStop(0, mobileBg ? 'rgba(180,90,255,0.08)' : 'rgba(180,90,255,0.16)');
    rg.addColorStop(1,'rgba(180,90,255,0)');
    X.fillStyle=rg;X.fillRect(-10,-10,W+20,H+20);

    X.globalAlpha=pillarAlpha;
    for(const side of pillarSides){
      const cx=W*side;
      X.strokeStyle=side<0.5?'rgba(120,180,255,0.38)':'rgba(210,120,255,0.38)';
      X.lineWidth=mobileBg ? 2 : 3;
      X.beginPath();
      X.moveTo(cx,H*(mobileBg ? 0.24 : 0.18));
      X.lineTo(cx,H*(mobileBg ? 0.86 : 0.88));
      X.stroke();

      X.lineWidth=mobileBg ? 1.4 : 2;
      X.beginPath();
      X.arc(cx,H*(mobileBg ? 0.22 : 0.18),mobileBg ? 36 : 56,Math.PI,0);
      X.stroke();

      X.globalAlpha=mobileBg ? 0.08 : 0.18;
      X.beginPath();
      X.arc(cx,H*(mobileBg ? 0.22 : 0.18),mobileBg ? 54 : 88,Math.PI,0);
      X.stroke();
      X.globalAlpha=pillarAlpha;
    }

    for(let i=0;i<10;i++){
      const side=i<5?(mobileBg ? 0.10 : 0.18):(mobileBg ? 0.90 : 0.82);
      const dir=i<5?-1:1;
      const px=W*side + Math.sin(t*0.6+i)*(mobileBg ? 12 : 22);
      const py=H*((mobileBg ? 0.24 : 0.18) + (i%5)*(mobileBg ? 0.12 : 0.15)) + Math.cos(t*0.5+i)*(mobileBg ? 6 : 9);
      X.fillStyle=i%2===0
        ? (mobileBg ? 'rgba(140,220,255,0.12)' : 'rgba(140,220,255,0.22)')
        : (mobileBg ? 'rgba(220,140,255,0.12)' : 'rgba(220,140,255,0.22)');
      X.beginPath();
      X.moveTo(px,py-(mobileBg ? 8 : 12));
      X.lineTo(px+(mobileBg ? 5 : 8)*dir,py);
      X.lineTo(px,py+(mobileBg ? 8 : 12));
      X.lineTo(px-(mobileBg ? 3 : 5)*dir,py);
      X.closePath();
      X.fill();
    }

    const cg=X.createRadialGradient(W/2,H*0.78,0,W/2,H*0.78,W*(mobileBg ? 0.24 : 0.32));
    cg.addColorStop(0, mobileBg ? 'rgba(255,240,190,0.07)' : 'rgba(255,240,190,0.12)');
    cg.addColorStop(1,'rgba(255,240,190,0)');
    X.fillStyle=cg;X.fillRect(-10,-10,W+20,H+20);

    X.globalAlpha=1;
    for(let i=0;i<16;i++){
      const sx=(i*83)%W;
      const sy=(i*137)%H;
      X.globalAlpha=(mobileBg ? 0.12 : 0.20)+(mobileBg ? 0.12 : 0.20)*Math.sin(t*1.8+i);
      X.fillStyle='#ffffff';
      X.beginPath();X.arc(sx,sy,mobileBg ? 0.9 : 1.2,0,Math.PI*2);X.fill();
    }
    X.globalAlpha=1;
  }
  else if(bg.type==='andromedathrone'){
    X.fillStyle='#04040f';X.fillRect(-10,-10,W+20,H+20);

    const mobileBg = isPortraitPhoneCanvas();
    const gcx=mobileBg ? W*0.88 : W*0.78;
    const gcy=mobileBg ? H*0.16 : H*0.26;
    const galaxyScale = mobileBg ? 0.72 : 1;

    for(let arm=0;arm<4;arm++){
      const armBase=t*0.04+arm*Math.PI/2;
      for(let j=0;j<54;j++){
        const d=j*5.2*galaxyScale;
        const a=armBase+j*0.17;
        X.globalAlpha=(mobileBg ? 0.16 : 0.26)-j*(mobileBg ? 0.0024 : 0.0035);
        X.fillStyle=j<18?'#ffe8ff':(j<36?'#c084fc':'#60a5fa');
        X.beginPath();
        X.arc(gcx+Math.cos(a)*d,gcy+Math.sin(a)*d*0.52,(mobileBg ? 1.8 : 2.4)-j*(mobileBg ? 0.014 : 0.02),0,Math.PI*2);
        X.fill();
      }
    }
    const gg=X.createRadialGradient(gcx,gcy,0,gcx,gcy,120*galaxyScale);
    gg.addColorStop(0, mobileBg ? 'rgba(255,235,255,0.14)' : 'rgba(255,235,255,0.22)');
    gg.addColorStop(1,'rgba(255,235,255,0)');
    X.globalAlpha=1;
    X.fillStyle=gg;X.fillRect(-10,-10,W+20,H+20);

    X.globalAlpha=mobileBg ? 0.10 : 0.22;
    X.fillStyle='rgba(170,120,255,0.20)';
    X.beginPath();
    X.moveTo(W*(mobileBg ? 0.72 : 0.60),H*(mobileBg ? 0.90 : 0.86));
    X.lineTo(W*(mobileBg ? 0.78 : 0.66),H*(mobileBg ? 0.78 : 0.70));
    X.lineTo(W*(mobileBg ? 0.84 : 0.72),H*(mobileBg ? 0.78 : 0.70));
    X.lineTo(W*(mobileBg ? 0.90 : 0.78),H*(mobileBg ? 0.90 : 0.86));
    X.closePath();
    X.fill();

    X.fillStyle='rgba(120,180,255,0.14)';
    X.beginPath();
    X.moveTo(W*(mobileBg ? 0.76 : 0.63),H*(mobileBg ? 0.78 : 0.70));
    X.lineTo(W*(mobileBg ? 0.81 : 0.67),H*(mobileBg ? 0.68 : 0.58));
    X.lineTo(W*(mobileBg ? 0.86 : 0.71),H*(mobileBg ? 0.78 : 0.70));
    X.closePath();
    X.fill();

    for(let i=0;i<6;i++){
      const x=W*(0.08+i*0.16);
      const cg2=X.createLinearGradient(x,0,x,H);
      cg2.addColorStop(0,'rgba(0,0,0,0)');
      cg2.addColorStop(0.45, mobileBg ? 'rgba(80,120,255,0.025)' : 'rgba(80,120,255,0.05)');
      cg2.addColorStop(0.55, mobileBg ? 'rgba(200,100,255,0.035)' : 'rgba(200,100,255,0.07)');
      cg2.addColorStop(1,'rgba(0,0,0,0)');
      X.fillStyle=cg2;
      X.fillRect(x-(mobileBg ? 12 : 20),0,mobileBg ? 24 : 40,H);
    }

    X.globalAlpha=mobileBg ? 0.22 : 0.35;
    const pts=[[W*0.12,H*0.20],[W*0.17,H*0.15],[W*0.23,H*0.21],[W*0.27,H*0.17],[W*0.32,H*0.24]];
    X.strokeStyle='rgba(180,210,255,0.18)';
    X.lineWidth=1;
    X.beginPath();
    pts.forEach((p,idx)=> idx===0 ? X.moveTo(p[0],p[1]) : X.lineTo(p[0],p[1]));
    X.stroke();
    for(const p of pts){
      X.fillStyle='rgba(255,255,255,0.45)';
      X.beginPath();X.arc(p[0],p[1],mobileBg ? 1.5 : 2,0,Math.PI*2);X.fill();
    }
    X.globalAlpha=1;
  }
  else if(bg.type==='cosmicgenesis'){
    X.fillStyle='#01030a';X.fillRect(-10,-10,W+20,H+20);

    const mobileBg = isPortraitPhoneCanvas();
    const rcx=mobileBg ? W*1.01 : W*0.74;
    const rcy=mobileBg ? H*0.18 : H*0.32;
    const riftScale = mobileBg ? 0.72 : 1;

    const rg1=X.createRadialGradient(rcx,rcy,0,rcx,rcy,150*riftScale);
    rg1.addColorStop(0, mobileBg ? 'rgba(255,245,210,0.18)' : 'rgba(255,245,210,0.28)');
    rg1.addColorStop(0.18, mobileBg ? 'rgba(255,190,90,0.12)' : 'rgba(255,190,90,0.20)');
    rg1.addColorStop(0.38, mobileBg ? 'rgba(80,220,255,0.10)' : 'rgba(80,220,255,0.16)');
    rg1.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=rg1;X.fillRect(-10,-10,W+20,H+20);

    for(let i=0;i<3;i++){
      X.globalAlpha=(mobileBg ? 0.13 : 0.22)-i*(mobileBg ? 0.032 : 0.05);
      X.strokeStyle=i===0?'rgba(255,220,120,0.55)':(i===1?'rgba(90,220,255,0.40)':'rgba(170,120,255,0.32)');
      X.lineWidth=(mobileBg ? 1.5 : 2.2)-i*0.3;
      X.beginPath();
      X.ellipse(rcx,rcy,(96+i*26)*riftScale,(58+i*16)*riftScale,t*0.10+i*0.6,0,Math.PI*2);
      X.stroke();
    }

    for(let i=0;i<(mobileBg ? 4 : 7);i++){
      const phase=t*0.18+i*0.7;
      X.globalAlpha=mobileBg ? 0.055 : 0.12;
      X.strokeStyle=i%2===0?'rgba(90,220,255,0.55)':'rgba(255,200,120,0.48)';
      X.lineWidth=mobileBg ? 1.1 : 1.8;
      X.beginPath();
      X.moveTo(-40,H*(0.16+i*0.12));
      X.bezierCurveTo(W*0.16,H*(0.10+i*0.04),W*0.38,H*(0.26+i*0.03),rcx+Math.sin(phase)*12,rcy+Math.cos(phase)*10);
      X.stroke();

      X.beginPath();
      X.moveTo(W+40,H*(0.76-i*0.07));
      X.bezierCurveTo(W*0.84,H*(0.74-i*0.04),W*0.62,H*(0.48-i*0.02),rcx+Math.cos(phase)*12,rcy+Math.sin(phase)*12);
      X.stroke();
    }

    for(let i=0;i<(mobileBg ? 14 : 22);i++){
      const a=t*0.35+i*0.55;
      const d=(mobileBg ? 28 : 40)+(i%6)*(mobileBg ? 11 : 18);
      X.globalAlpha=mobileBg ? 0.18 : 0.28;
      X.fillStyle=i%3===0?'#fff6cf':(i%3===1?'#80ffff':'#d8b4fe');
      X.beginPath();
      X.arc(rcx+Math.cos(a)*d,rcy+Math.sin(a)*d*0.65,mobileBg ? 1.2 : 1.6,0,Math.PI*2);
      X.fill();
    }

    const pcx=mobileBg ? -W*0.04 : W*0.18;
    const pcy=mobileBg ? H*0.86 : H*0.78;
    for(let i=0;i<18;i++){
      const a=t*0.03+i*0.32;
      const d=i*(mobileBg ? 2.6 : 3.2);
      X.globalAlpha=(mobileBg ? 0.08 : 0.18)-i*(mobileBg ? 0.003 : 0.006);
      X.fillStyle=i<8?'#fff':'#6ee7ff';
      X.beginPath();X.arc(pcx+Math.cos(a)*d,pcy+Math.sin(a)*d*0.55,mobileBg ? 1.3 : 1.8,0,Math.PI*2);X.fill();
    }
    X.globalAlpha=1;
  }

  else if(bg.type==='cosmic'){
    X.fillStyle='#02020a';X.fillRect(-10,-10,W+20,H+20);
    const ng=X.createRadialGradient(W*0.3,H*0.4,0,W*0.3,H*0.4,W*0.6);
    ng.addColorStop(0,'rgba(100,50,200,0.4)');
    ng.addColorStop(1,'rgba(100,50,200,0)');
    X.fillStyle=ng;X.fillRect(-10,-10,W+20,H+20);
    const ng2=X.createRadialGradient(W*0.7,H*0.6,0,W*0.7,H*0.6,W*0.5);
    ng2.addColorStop(0,'rgba(0,150,200,0.3)');
    ng2.addColorStop(1,'rgba(0,150,200,0)');
    X.fillStyle=ng2;X.fillRect(-10,-10,W+20,H+20);
    const cx=W*0.2,cy=H*0.7;
    for(let i=0;i<25;i++){
      const a=t*0.05+i*0.25;
      const d=i*4;
      X.globalAlpha=0.4-i*0.012;
      X.fillStyle=i<10?'#fff':'#80a0ff';
      X.beginPath();X.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d*0.6,2,0,Math.PI*2);X.fill();
    }
    X.globalAlpha=1;
    for(let i=0;i<8;i++){
      const sx=(i*97)%W;
      const sy=(i*131)%H;
      const tw=0.5+0.5*Math.sin(t*2+i);
      X.globalAlpha=tw;
      X.fillStyle='#fff';
      X.beginPath();X.arc(sx,sy,2,0,Math.PI*2);X.fill();
      X.strokeStyle='rgba(255,255,255,0.5)';
      X.lineWidth=1;
      X.beginPath();
      X.moveTo(sx-6,sy);X.lineTo(sx+6,sy);
      X.moveTo(sx,sy-6);X.lineTo(sx,sy+6);
      X.stroke();
    }
    X.globalAlpha=1;
  }
}

function draw(){
  X.save();
  if(shakeT>0)X.translate((Math.random()-0.5)*shakeA,(Math.random()-0.5)*shakeA);

  // Draw background variant
  drawBackground();

  // Camera zoom (with gold zoom boost)
  let z=cam.zoom;
  if(goldZoomT>0){
    z += Math.sin(goldZoomT*Math.PI) * 0.15;
  }
  if(z!==1){
    X.translate(W/2,H/2);X.scale(z,z);X.translate(-W/2,-H/2);
  }

  // Stars / speed lines
  const isFlying=!ball.orbiting&&state===ST.PLAY;
  const speedRatio=clamp(ball.speed/500,0,1);

  for(const s of stars){
    const sx=s.x-cam.x,sy=s.y-cam.y;
    if(sx<-30||sx>W+30||sy<-30||sy>H+30)continue;
    const tw=s.alpha*(0.6+0.4*Math.sin(menuT*s.twinkle+s.phase));
    X.globalAlpha=tw;

    if(isFlying&&speedRatio>0.3){
      // Speed lines
      const lineLen=s.size*3*speedRatio*8;
      const angle=Math.atan2(ball.vy,ball.vx);
      X.strokeStyle=speedRatio>0.6?'#8080ff':'#d4c5ff';
      X.lineWidth=s.size*0.8;
      X.beginPath();
      X.moveTo(sx,sy);
      X.lineTo(sx-Math.cos(angle)*lineLen,sy-Math.sin(angle)*lineLen);
      X.stroke();
    } else {
      X.fillStyle='#d4c5ff';
      X.beginPath();X.arc(sx,sy,s.size,0,Math.PI*2);X.fill();
    }
  }
  X.globalAlpha=1;

  // Ring particles
  for(const r of ringParticles){
    X.globalAlpha=r.life*0.5;X.strokeStyle=r.color;X.lineWidth=2;
    X.beginPath();X.arc(r.x-cam.x,r.y-cam.y,r.r,0,Math.PI*2);X.stroke();
  }
  X.globalAlpha=1;

  // Only render game world when playing, paused or dead
  if(state!==ST.MENU){

  // Connection lines
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];
    if(n.captured||n.branchGroup<0)continue;
    // Find parent (last captured node before this branch group)
    let parent=null;
    for(let j=i-1;j>=0;j--){
      if(nodes[j].captured){parent=nodes[j];break;}
    }
    if(!parent)continue;
    const ax=parent.x-cam.x,ay=parent.y-cam.y;
    const bx=n.x-cam.x,by=n.y-cam.y;
    if(!n.visible){X.globalAlpha=0.03;}else{X.globalAlpha=0.1;}

    const tc=TIERS[n.tier]||TIERS.medium;
    X.strokeStyle=tc.color.main;
    X.lineWidth=1;X.setLineDash([4,8]);
    X.beginPath();X.moveTo(ax,ay);X.lineTo(bx,by);X.stroke();
    X.setLineDash([]);
  }
  X.globalAlpha=1;

  // Asteroids
  for(const a of asteroids){
    const ax=a.x-cam.x,ay=a.y-cam.y;
    if(ax<-60||ax>W+60||ay<-60||ay>H+60)continue;
    drawAsteroid(a,ax,ay);
  }

  // Nodes
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];
    const nx=n.x-cam.x,ny=n.y-cam.y;
    if(nx<-100||nx>W+100||ny<-100||ny>H+100)continue;
    if(!n.visible&&!n.captured){
      // Ghost
      X.globalAlpha=0.08+Math.sin(n.pulse*3)*0.04;
      const tc=TIERS[n.tier]||TIERS.medium;
      X.strokeStyle=tc.color.main;X.lineWidth=1;X.setLineDash([2,4]);
      X.beginPath();X.arc(nx,ny,n.nodeR+2,0,Math.PI*2);X.stroke();
      X.setLineDash([]);X.globalAlpha=1;
      continue;
    }
    drawNode(n,nx,ny,i);
  }

  // Trajectory prediction line - shows where ball will fly if released now
  if(state===ST.PLAY&&ball.orbiting&&shouldShowAssistGuides()){
    const tang=ball.angle+(ball.orbitDir*Math.PI/2);
    const bx=ball.x-cam.x,by=ball.y-cam.y;
    const dx=Math.cos(tang),dy=Math.sin(tang);

    // Find which node the trajectory points toward (best match)
    let bestNode=null,bestScore=Infinity;
    for(const n of nodes){
      if(n.captured||!n.visible)continue;
      const ndx=n.x-ball.x,ndy=n.y-ball.y;
      const d=Math.sqrt(ndx*ndx+ndy*ndy);
      if(d<20)continue;
      // How aligned is the trajectory with this node?
      const dot=(dx*ndx+dy*ndy)/d;
      if(dot>0.7){ // forward-ish
        // Perpendicular distance from node to trajectory line
        const perpDist=Math.abs(dx*ndy-dy*ndx);
        if(perpDist<bestScore && d<700){
          bestScore=perpDist;
          bestNode=n;
        }
      }
    }

    // Draw the line
    const tc=bestNode?(TIERS[bestNode.tier]||TIERS.medium):TIERS.medium;
    const lineColor=bestNode?tc.color.main:'#ffffff';
    const lineLen=bestNode?dist(ball.x,ball.y,bestNode.x,bestNode.y):300;

    X.save();
    X.globalAlpha=0.35+Math.sin(menuT*4)*0.1;
    X.strokeStyle=lineColor;
    X.lineWidth=2;
    X.lineCap='round';
    X.setLineDash([6,8]);
    X.lineDashOffset=-menuT*30;
    X.shadowColor=lineColor;
    X.shadowBlur=8;
    X.beginPath();
    X.moveTo(bx+dx*BALL_R,by+dy*BALL_R);
    X.lineTo(bx+dx*lineLen,by+dy*lineLen);
    X.stroke();
    X.setLineDash([]);
    X.shadowBlur=0;

    // Highlight target node
    if(bestNode){
      const nx=bestNode.x-cam.x,ny=bestNode.y-cam.y;
      X.globalAlpha=0.4+Math.sin(menuT*5)*0.2;
      X.strokeStyle=lineColor;
      X.lineWidth=2.5;
      X.shadowColor=lineColor;
      X.shadowBlur=12;
      X.beginPath();
      X.arc(nx,ny,bestNode.captureR+4,0,Math.PI*2);
      X.stroke();
      X.shadowBlur=0;
    }
    X.restore();
    X.globalAlpha=1;
  }

  // Direction arrow hint (toward nearest uncaptured node)
  if(state===ST.PLAY&&ball.orbiting&&shouldShowAssistGuides()){
    let closest=null,closestD=Infinity;
    for(const n of nodes){
      if(n.captured||!n.visible)continue;
      const d=dist(ball.x,ball.y,n.x,n.y);
      if(d<closestD){closestD=d;closest=n;}
    }
    // Draw small arrows toward each available node
    for(const n of nodes){
      if(n.captured||!n.visible)continue;
      const nx=n.x-cam.x,ny=n.y-cam.y;
      const bx=ball.x-cam.x,by=ball.y-cam.y;
      const ang=Math.atan2(ny-by,nx-bx);
      const arrowDist=45;
      const ax2=bx+Math.cos(ang)*arrowDist;
      const ay2=by+Math.sin(ang)*arrowDist;
      const tc=TIERS[n.tier]||TIERS.medium;
      X.globalAlpha=0.2+Math.sin(menuT*3)*0.1;
      X.strokeStyle=tc.color.main;X.lineWidth=1.5;X.lineCap='round';
      const aLen=6;
      X.beginPath();
      X.moveTo(ax2-Math.cos(ang-0.5)*aLen,ay2-Math.sin(ang-0.5)*aLen);
      X.lineTo(ax2,ay2);
      X.lineTo(ax2-Math.cos(ang+0.5)*aLen,ay2-Math.sin(ang+0.5)*aLen);
      X.stroke();
    }
    X.globalAlpha=1;
  }

  // Power-ups in world
  for(const p of powerups){
    drawPowerup(p);
  }

  // Ball trail with skin-specific effects
  drawBallTrail();
  X.globalAlpha=1;

  // Ball
  if(state!==ST.DEAD||deathT<0.08)drawBall();

  // Shield effect around ball
  if(activeShield&&state===ST.PLAY){
    const bx=ball.x-cam.x,by=ball.y-cam.y;
    X.globalAlpha=0.4+Math.sin(menuT*5)*0.2;
    X.strokeStyle='#00ffff';
    X.lineWidth=2;
    X.shadowColor='#00ffff';
    X.shadowBlur=15;
    X.beginPath();
    X.arc(bx,by,BALL_R+8+Math.sin(menuT*4)*2,0,Math.PI*2);
    X.stroke();
    // Inner ring
    X.globalAlpha=0.2;
    X.beginPath();
    X.arc(bx,by,BALL_R+4,0,Math.PI*2);
    X.stroke();
    X.shadowBlur=0;
    X.globalAlpha=1;
  }

  // Slow-mo overlay tint
  if(slowMoTimer>0&&state===ST.PLAY){
    X.globalAlpha=0.1;
    X.fillStyle='#c084fc';
    X.fillRect(-10,-10,W+20,H+20);
    X.globalAlpha=1;
  }

  // Magnet aura around ball
  if(magnetTimer>0&&state===ST.PLAY){
    const bx=ball.x-cam.x,by=ball.y-cam.y;
    X.globalAlpha=0.2+Math.sin(menuT*6)*0.1;
    X.strokeStyle='#ffd32a';
    X.lineWidth=1.5;
    X.setLineDash([4,4]);
    X.beginPath();
    X.arc(bx,by,30+Math.sin(menuT*3)*5,0,Math.PI*2);
    X.stroke();
    X.beginPath();
    X.arc(bx,by,45+Math.sin(menuT*3+1)*5,0,Math.PI*2);
    X.stroke();
    X.setLineDash([]);
    X.globalAlpha=1;
  }

  // Particles
  for(const p of particles){
    X.globalAlpha=Math.max(0,p.life);X.fillStyle=p.color;
    X.beginPath();X.arc(p.x-cam.x,p.y-cam.y,p.size*Math.max(0.2,p.life),0,Math.PI*2);X.fill();
  }
  X.globalAlpha=1;

  // Score popups
  for(const p of scorePopups){
    X.globalAlpha=Math.min(p.life*(p.fadeRate||2),p.maxAlpha||1);
    X.fillStyle=p.color;
    if(p.shadowColor){X.shadowColor=p.shadowColor;X.shadowBlur=p.shadowBlur||0;}
    X.font='bold '+(p.fontSize||22)+'px -apple-system, system-ui, sans-serif';
    X.textAlign='center';X.textBaseline='middle';
    X.fillText(p.text,p.x-cam.x,p.y-cam.y);
    X.shadowBlur=0;
  }
  X.globalAlpha=1;

  } // end !MENU

  // Flash
  if(flashA>0){X.globalAlpha=flashA;X.fillStyle='#fff';X.fillRect(-10,-10,W+20,H+20);X.globalAlpha=1;}

  // Gold flash overlay
  if(goldFlashT>0){
    X.globalAlpha=goldFlashT*0.4;
    const gg=X.createRadialGradient(W/2,H/2,0,W/2,H/2,W);
    gg.addColorStop(0,'rgba(255,211,42,0.8)');
    gg.addColorStop(0.5,'rgba(255,170,0,0.3)');
    gg.addColorStop(1,'rgba(255,170,0,0)');
    X.fillStyle=gg;
    X.fillRect(-10,-10,W+20,H+20);
    X.globalAlpha=1;
  }

  // Reset zoom for UI
  if(z!==1){
    X.translate(W/2,H/2);X.scale(1/z,1/z);X.translate(-W/2,-H/2);
  }

  if(state===ST.PLAY){drawPlayUI();drawPauseBtn();}
  else if(state===ST.MENU){drawMenuUI();}
  else if(state===ST.DEAD){drawDeadUI();}
  else if(state===ST.PAUSE){drawPlayUI();drawPauseScreen();}

  X.restore();
  return true;
}

function drawAsteroid(a,ax,ay){
  X.save();X.translate(ax,ay);X.rotate(a.rot);
  const g=X.createRadialGradient(-2,-2,0,0,0,a.r);
  g.addColorStop(0,'#5a5a6e');g.addColorStop(1,'#2a2a3e');
  X.fillStyle=g;
  X.beginPath();
  a.vertices.forEach((v,i)=>{
    const px=Math.cos(v.a)*a.r*v.r,py=Math.sin(v.a)*a.r*v.r;
    i===0?X.moveTo(px,py):X.lineTo(px,py);
  });
  X.closePath();X.fill();
  X.strokeStyle='rgba(150,150,180,0.3)';X.lineWidth=1;X.stroke();
  X.fillStyle='rgba(0,0,0,0.2)';
  X.beginPath();X.arc(a.r*0.2,-a.r*0.15,a.r*0.2,0,Math.PI*2);X.fill();
  X.restore();
}

function drawNode(n,nx,ny,idx){
  const tc=TIERS[n.tier]||TIERS.medium;
  const col=tc.color;
  const isActive=idx===ball.currentNode&&ball.orbiting;
  const isNext=!n.captured;
  const ps=Math.sin(n.pulse)*2;

  let nodeAlpha=1;
  if(n.disappearing&&!n.captured&&n.visible&&n.disappearTimer<0.8){
    nodeAlpha=0.4+Math.sin(menuT*15)*0.4;
  }

  // Teleport ring effect
  if(n.teleporting&&!n.captured){
    if(n.teleportFlash>0){
      X.globalAlpha=n.teleportFlash*0.6;
      X.strokeStyle='#ff00ff';
      X.lineWidth=2;
      X.shadowColor='#ff00ff';
      X.shadowBlur=10;
      X.beginPath();
      X.arc(nx,ny,(1-n.teleportFlash)*40+10,0,Math.PI*2);
      X.stroke();
      X.shadowBlur=0;
    }
    // Warning ring before teleport
    if(n.teleportTimer<0.6){
      X.globalAlpha=0.3+Math.sin(menuT*20)*0.3;
      X.strokeStyle='#ff00ff';
      X.lineWidth=1.5;
      X.setLineDash([3,3]);
      X.beginPath();
      X.arc(nx,ny,n.nodeR+8,0,Math.PI*2);
      X.stroke();
      X.setLineDash([]);
    }
  }

  // Capture zone
  if(isNext){
    X.globalAlpha=(0.04+Math.sin(n.pulse)*0.02)*nodeAlpha;
    X.fillStyle=col.main;
    X.beginPath();X.arc(nx,ny,n.captureR,0,Math.PI*2);X.fill();
    X.globalAlpha=0.1*nodeAlpha;
    X.strokeStyle=col.main;X.lineWidth=1;X.setLineDash([3,5]);
    X.beginPath();X.arc(nx,ny,n.captureR,0,Math.PI*2);X.stroke();
    X.setLineDash([]);
  }

  // Moving path
  if(n.moving&&!n.captured){
    X.globalAlpha=0.06;X.strokeStyle=col.main;X.lineWidth=1;X.setLineDash([2,4]);
    X.beginPath();X.arc(n.baseX-cam.x,n.baseY-cam.y,n.mRadius,0,Math.PI*2);X.stroke();
    X.setLineDash([]);
  }

  // Body
  X.globalAlpha=nodeAlpha;
  const r=n.nodeR+ps;
  X.shadowColor=col.glow;X.shadowBlur=isActive?20:(isNext?12:5);
  const ng=X.createRadialGradient(nx-2,ny-2,0,nx,ny,r);
  ng.addColorStop(0,col.light);ng.addColorStop(0.6,col.main);ng.addColorStop(1,col.glow);
  X.fillStyle=n.captured&&!isActive?'rgba(60,60,80,0.3)':ng;
  X.beginPath();X.arc(nx,ny,r,0,Math.PI*2);X.fill();
  X.shadowBlur=0;

  // Shine
  if(!n.captured||isActive){
    const sg=X.createRadialGradient(nx-3,ny-3,0,nx,ny,r);
    sg.addColorStop(0,'rgba(255,255,255,0.4)');sg.addColorStop(1,'rgba(255,255,255,0)');
    X.fillStyle=sg;X.beginPath();X.arc(nx,ny,r,0,Math.PI*2);X.fill();
  }

  // Orbit ring (desenhado depois do nó para ficar por cima do glow)
  if(isActive){
    X.globalAlpha=0.55;X.strokeStyle=col.main;X.lineWidth=2;X.setLineDash([5,5]);
    X.lineDashOffset=-menuT*8;
    X.beginPath();X.arc(nx,ny,ball.orbitRadius,0,Math.PI*2);X.stroke();
    X.setLineDash([]);X.lineDashOffset=0;
  }

  // Points label
  if(isNext&&n.label){
    X.globalAlpha=0.8*nodeAlpha;
    X.fillStyle='#ffffff';
    X.font='bold 11px -apple-system, system-ui, sans-serif';
    X.textAlign='center';X.textBaseline='middle';
    X.fillText(n.label,nx,ny);
  }

  X.globalAlpha=1;
}

function drawBallTrail(){
  const skin=SKINS[selectedSkin]||SKINS.default;
  const trailType=skin.trail;

  // Special trails
  if(trailType==='fire'){
    // Phoenix fire trail
    for(let i=0;i<ball.trail.length;i++){
      const t=ball.trail[i];
      if(t.a<=0)continue;
      const tx=t.x-cam.x,ty=t.y-cam.y;
      const prog=i/ball.trail.length;
      X.globalAlpha=t.a*0.6;
      X.shadowColor='#ff4500';X.shadowBlur=8;
      const fg=X.createRadialGradient(tx,ty,0,tx,ty,BALL_R*t.a*0.8);
      fg.addColorStop(0,'#ffff80');
      fg.addColorStop(0.4,'#ff8000');
      fg.addColorStop(1,'rgba(255,0,0,0)');
      X.fillStyle=fg;
      X.beginPath();X.arc(tx,ty,BALL_R*t.a*0.8,0,Math.PI*2);X.fill();
      X.shadowBlur=0;
    }
  }
  else if(trailType==='ice'){
    // Ice crystals trail
    for(let i=0;i<ball.trail.length;i++){
      const t=ball.trail[i];
      if(t.a<=0)continue;
      const tx=t.x-cam.x,ty=t.y-cam.y;
      X.globalAlpha=t.a*0.5;
      X.shadowColor='#00ffff';X.shadowBlur=6;
      X.fillStyle='#80ffff';
      // Crystal shape
      const sz=BALL_R*t.a*0.5;
      X.save();
      X.translate(tx,ty);
      X.rotate(i*0.3);
      X.beginPath();
      X.moveTo(0,-sz);X.lineTo(sz*0.6,0);X.lineTo(0,sz);X.lineTo(-sz*0.6,0);
      X.closePath();
      X.fill();
      X.restore();
      X.shadowBlur=0;
    }
  }
  else if(trailType==='gold'){
    // Golden sparkles
    for(let i=0;i<ball.trail.length;i++){
      const t=ball.trail[i];
      if(t.a<=0)continue;
      const tx=t.x-cam.x,ty=t.y-cam.y;
      X.globalAlpha=t.a*0.6;
      X.shadowColor='#ffd700';X.shadowBlur=10;
      X.fillStyle='#ffd700';
      X.beginPath();X.arc(tx,ty,BALL_R*t.a*0.5,0,Math.PI*2);X.fill();
      // Sparkle cross
      if(i%2===0){
        X.strokeStyle='rgba(255,255,200,0.8)';
        X.lineWidth=1;
        const sz=BALL_R*t.a*0.8;
        X.beginPath();
        X.moveTo(tx-sz,ty);X.lineTo(tx+sz,ty);
        X.moveTo(tx,ty-sz);X.lineTo(tx,ty+sz);
        X.stroke();
      }
      X.shadowBlur=0;
    }
  }
  else if(trailType==='metal'){
    // Metallic gleaming trail
    for(let i=0;i<ball.trail.length;i++){
      const t=ball.trail[i];
      if(t.a<=0)continue;
      const tx=t.x-cam.x,ty=t.y-cam.y;
      X.globalAlpha=t.a*0.4;
      const mg=X.createRadialGradient(tx,ty,0,tx,ty,BALL_R*t.a*0.6);
      mg.addColorStop(0,'#ffffff');
      mg.addColorStop(0.5,'#ccccdd');
      mg.addColorStop(1,'rgba(120,120,160,0)');
      X.fillStyle=mg;
      X.beginPath();X.arc(tx,ty,BALL_R*t.a*0.6,0,Math.PI*2);X.fill();
    }
  }
  else if(trailType==='ghost'){
    // Ghostly purple trail
    for(let i=0;i<ball.trail.length;i++){
      const t=ball.trail[i];
      if(t.a<=0)continue;
      const tx=t.x-cam.x,ty=t.y-cam.y;
      const wobble=Math.sin(menuT*5+i*0.5)*3;
      X.globalAlpha=t.a*0.5;
      X.shadowColor='#7a00ff';X.shadowBlur=15;
      const gg=X.createRadialGradient(tx+wobble,ty,0,tx+wobble,ty,BALL_R*t.a*0.9);
      gg.addColorStop(0,'rgba(200,100,255,0.8)');
      gg.addColorStop(1,'rgba(122,0,255,0)');
      X.fillStyle=gg;
      X.beginPath();X.arc(tx+wobble,ty,BALL_R*t.a*0.9,0,Math.PI*2);X.fill();
      X.shadowBlur=0;
    }
  }
  else if(trailType==='hellfire'){
    // Demon hellfire - red/black
    for(let i=0;i<ball.trail.length;i++){
      const t=ball.trail[i];
      if(t.a<=0)continue;
      const tx=t.x-cam.x,ty=t.y-cam.y;
      X.globalAlpha=t.a*0.7;
      X.shadowColor='#ff0000';X.shadowBlur=12;
      const hg=X.createRadialGradient(tx,ty,0,tx,ty,BALL_R*t.a*0.8);
      hg.addColorStop(0,'#ff4400');
      hg.addColorStop(0.5,'#8b0000');
      hg.addColorStop(1,'rgba(0,0,0,0)');
      X.fillStyle=hg;
      X.beginPath();X.arc(tx,ty,BALL_R*t.a*0.8,0,Math.PI*2);X.fill();
      X.shadowBlur=0;
    }
  }
  else if(trailType==='stars'){
    // Cosmic star trail
    for(let i=0;i<ball.trail.length;i++){
      const t=ball.trail[i];
      if(t.a<=0)continue;
      const tx=t.x-cam.x,ty=t.y-cam.y;
      X.globalAlpha=t.a*0.6;
      const colors=['#ffffff','#a0a0ff','#ff80ff','#80ffff'];
      X.fillStyle=colors[i%colors.length];
      X.shadowColor=colors[i%colors.length];
      X.shadowBlur=8;
      X.beginPath();X.arc(tx,ty,BALL_R*t.a*0.4,0,Math.PI*2);X.fill();
      // Small star points
      if(i%3===0){
        const sz=BALL_R*t.a*0.7;
        X.strokeStyle=colors[i%colors.length];
        X.lineWidth=0.8;
        X.beginPath();
        X.moveTo(tx-sz,ty);X.lineTo(tx+sz,ty);
        X.moveTo(tx,ty-sz);X.lineTo(tx,ty+sz);
        X.stroke();
      }
      X.shadowBlur=0;
    }
  }
  else {
    // Default colored trail based on skin color
    const trailColor=skin.trail||skin.color||'#ffffff';
    for(const t of ball.trail){
      if(t.a<=0)continue;
      const tx=t.x-cam.x,ty=t.y-cam.y;
      X.globalAlpha=t.a*0.35;
      X.fillStyle=trailColor;
      X.beginPath();X.arc(tx,ty,BALL_R*t.a*0.5,0,Math.PI*2);X.fill();
    }
  }
}

function drawPowerup(p){
  const px=p.x-cam.x, py=p.y-cam.y+p.bobY;
  const scale=p.life<2?p.life/2:1;

  X.save();
  X.translate(px,py);
  X.scale(scale,scale);

  let color1,color2,glow,icon;
  if(p.type==='shield'){
    color1='#80ffff';color2='#00aaff';glow='#00ffff';icon='shield';
  } else if(p.type==='slowmo'){
    color1='#e0a0ff';color2='#7000c0';glow='#c084fc';icon='clock';
  } else {
    color1='#ffe066';color2='#ff8000';glow='#ffd32a';icon='magnet';
  }

  // Outer glow ring
  X.shadowColor=glow;
  X.shadowBlur=18;
  X.globalAlpha=0.5+Math.sin(p.pulse)*0.3;
  X.strokeStyle=glow;
  X.lineWidth=2;
  X.beginPath();
  X.arc(0,0,18+Math.sin(p.pulse)*2,0,Math.PI*2);
  X.stroke();

  // Inner background circle
  X.globalAlpha=1;
  const bg=X.createRadialGradient(-3,-4,0,0,0,16);
  bg.addColorStop(0,color1);
  bg.addColorStop(1,color2);
  X.fillStyle=bg;
  X.beginPath();
  X.arc(0,0,15,0,Math.PI*2);
  X.fill();
  X.shadowBlur=0;

  // Icon
  X.fillStyle='#ffffff';
  X.strokeStyle='#ffffff';
  X.lineWidth=2;
  X.lineCap='round';
  X.lineJoin='round';

  if(icon==='shield'){
    // Shield shape
    X.beginPath();
    X.moveTo(0,-8);
    X.lineTo(7,-5);
    X.lineTo(7,2);
    X.quadraticCurveTo(7,7,0,9);
    X.quadraticCurveTo(-7,7,-7,2);
    X.lineTo(-7,-5);
    X.closePath();
    X.fill();
  } else if(icon==='clock'){
    // Clock circle
    X.beginPath();
    X.arc(0,0,7,0,Math.PI*2);
    X.stroke();
    // Hands
    X.beginPath();
    X.moveTo(0,0);X.lineTo(0,-5);
    X.moveTo(0,0);X.lineTo(4,2);
    X.stroke();
  } else if(icon==='magnet'){
    // U-shaped magnet
    X.lineWidth=3;
    X.beginPath();
    X.arc(0,0,6,Math.PI,0,false);
    X.stroke();
    X.beginPath();
    X.moveTo(-6,0);X.lineTo(-6,5);
    X.moveTo(6,0);X.lineTo(6,5);
    X.stroke();
    // Red tips
    X.fillStyle='#ff4444';
    X.fillRect(-8,4,4,3);
    X.fillRect(4,4,4,3);
  }

  // Fade out near end
  if(p.life<3){
    X.globalAlpha=Math.max(0,p.life/3);
  }

  X.restore();
  X.globalAlpha=1;
}

function drawBall(){
  const bx=ball.x-cam.x,by=ball.y-cam.y;
  drawBallAt(bx,by,ball.squash,!ball.orbiting,selectedSkin);
}

function drawBallAt(bx,by,squash,isFlying,skinKey){
  const skin=SKINS[skinKey]||SKINS.default;
  X.save();X.translate(bx,by);
  const sc=squash||1;
  X.scale(2-sc,sc);
  const r=BALL_R;
  const glowP=0.5+Math.sin(ball.glow)*0.3;
  const sr=clamp(ball.speed/500,0,1);

  const glowColor=skin.glow||skin.color;
  X.shadowColor=sr>0.5?'#6688ff':glowColor;
  X.shadowBlur=12+glowP*6+(skin.rarity==='stellar'?8:skin.rarity==='legendary'?5:0);

  // Body
  const bg=X.createRadialGradient(-2,-2,0,0,0,r);
  bg.addColorStop(0,'#ffffff');
  bg.addColorStop(0.4,skin.color);
  bg.addColorStop(1,skin.color2);
  X.fillStyle=bg;X.beginPath();X.arc(0,0,r,0,Math.PI*2);X.fill();
  X.shadowBlur=0;

  // Eyes
  X.fillStyle='#1a1a2e';
  if(isFlying){
    X.beginPath();X.ellipse(-3.5,-1,2.5,3,0,0,Math.PI*2);X.fill();
    X.beginPath();X.ellipse(3.5,-1,2.5,3,0,0,Math.PI*2);X.fill();
  } else {
    X.beginPath();X.arc(-3.5,-1,2,0,Math.PI*2);X.fill();
    X.beginPath();X.arc(3.5,-1,2,0,Math.PI*2);X.fill();
  }
  X.fillStyle='rgba(255,255,255,0.9)';
  X.beginPath();X.arc(-4,-2.5,1,0,Math.PI*2);X.fill();
  X.beginPath();X.arc(3,-2.5,1,0,Math.PI*2);X.fill();
  if(isFlying){
    X.fillStyle='#1a1a2e';X.beginPath();X.ellipse(0,3.5,2.5,2,0,0,Math.PI*2);X.fill();
  } else {
    X.strokeStyle='#1a1a2e';X.lineWidth=1;X.lineCap='round';
    X.beginPath();X.arc(0,2,2.5,0.3,Math.PI-0.3);X.stroke();
  }

  // Accessories
  if(skin.accessory)drawAccessory(skin.accessory,skin,r);

  X.restore();
}

function drawAccessory(type,skin,r){
  X.save();
  switch(type){
    case 'tophat':
      X.fillStyle='#1a1a1a';
      X.fillRect(-7,-15,14,3);
      X.fillRect(-5,-23,10,8);
      X.fillStyle='#ff0000';
      X.fillRect(-5,-17,10,1.5);
      break;

    case 'glasses':
      X.strokeStyle='#1a1a2e';X.lineWidth=1.5;
      X.beginPath();X.arc(-3.5,-1,3.5,0,Math.PI*2);X.stroke();
      X.beginPath();X.arc(3.5,-1,3.5,0,Math.PI*2);X.stroke();
      X.beginPath();X.moveTo(0,-1);X.lineTo(0,-1);X.stroke();
      X.fillStyle='rgba(100,200,255,0.3)';
      X.beginPath();X.arc(-3.5,-1,3,0,Math.PI*2);X.fill();
      X.beginPath();X.arc(3.5,-1,3,0,Math.PI*2);X.fill();
      break;

    case 'cap':
      X.fillStyle='#ff4757';
      X.beginPath();X.arc(0,-3,9,Math.PI,0);X.fill();
      X.fillRect(2,-4,12,2);
      X.fillStyle='#fff';
      X.font='bold 6px sans-serif';
      X.textAlign='center';
      X.fillText('O',0,-7);
      break;

    case 'crown':
      X.fillStyle='#ffd700';
      X.beginPath();
      X.moveTo(-8,-8);
      X.lineTo(-8,-13);
      X.lineTo(-5,-10);
      X.lineTo(-2,-15);
      X.lineTo(0,-10);
      X.lineTo(2,-15);
      X.lineTo(5,-10);
      X.lineTo(8,-13);
      X.lineTo(8,-8);
      X.closePath();
      X.fill();
      X.fillStyle='#ff0000';
      X.beginPath();X.arc(0,-10,1.5,0,Math.PI*2);X.fill();
      break;

    case 'flames':
      // Phoenix flames around head
      const ft=menuT*8;
      X.fillStyle='#ff4500';
      X.shadowColor='#ff8c00';X.shadowBlur=10;
      for(let i=0;i<5;i++){
        const a=-Math.PI/2+(i-2)*0.4;
        const len=8+Math.sin(ft+i)*3;
        X.beginPath();
        X.moveTo(Math.cos(a-0.15)*r,Math.sin(a-0.15)*r);
        X.quadraticCurveTo(Math.cos(a)*(r+len*0.5),Math.sin(a)*(r+len*0.5),
                           Math.cos(a)*(r+len),Math.sin(a)*(r+len));
        X.quadraticCurveTo(Math.cos(a)*(r+len*0.5),Math.sin(a)*(r+len*0.5),
                           Math.cos(a+0.15)*r,Math.sin(a+0.15)*r);
        X.closePath();
        X.fill();
      }
      X.fillStyle='#ffd700';
      for(let i=0;i<3;i++){
        const a=-Math.PI/2+(i-1)*0.4;
        const len=4+Math.sin(ft+i)*2;
        X.beginPath();
        X.arc(Math.cos(a)*(r+len*0.5),Math.sin(a)*(r+len*0.5),2,0,Math.PI*2);
        X.fill();
      }
      X.shadowBlur=0;
      break;

    case 'iceShards':
      X.fillStyle='#80ffff';
      X.shadowColor='#00ffff';X.shadowBlur=8;
      for(let i=0;i<6;i++){
        const a=(i/6)*Math.PI*2;
        const x1=Math.cos(a)*r;
        const y1=Math.sin(a)*r;
        X.beginPath();
        X.moveTo(x1-2,y1);
        X.lineTo(Math.cos(a)*(r+6),Math.sin(a)*(r+6));
        X.lineTo(x1+2,y1);
        X.closePath();
        X.fill();
      }
      X.shadowBlur=0;
      break;

    case 'royalCrown':
      X.fillStyle='#ffd700';
      X.shadowColor='#fff080';X.shadowBlur=6;
      X.beginPath();
      X.moveTo(-10,-8);
      X.lineTo(-10,-15);
      X.lineTo(-6,-11);
      X.lineTo(-3,-18);
      X.lineTo(0,-12);
      X.lineTo(3,-18);
      X.lineTo(6,-11);
      X.lineTo(10,-15);
      X.lineTo(10,-8);
      X.closePath();
      X.fill();
      // Gems
      X.fillStyle='#ff0066';
      X.beginPath();X.arc(-3,-15,1.5,0,Math.PI*2);X.fill();
      X.beginPath();X.arc(3,-15,1.5,0,Math.PI*2);X.fill();
      X.fillStyle='#00ff88';
      X.beginPath();X.arc(0,-13,1.5,0,Math.PI*2);X.fill();
      X.shadowBlur=0;
      break;

    case 'helmet':
      // Medieval knight helmet
      X.fillStyle='#a0a0c0';
      X.shadowColor='#fff';X.shadowBlur=4;
      X.beginPath();
      X.arc(0,-4,r+2,Math.PI,Math.PI*2);
      X.lineTo(r+2,3);
      X.lineTo(-r-2,3);
      X.closePath();
      X.fill();
      // Visor slit
      X.fillStyle='#000';
      X.fillRect(-7,-3,14,2);
      // Top crest
      X.fillStyle='#ff0000';
      X.beginPath();
      X.moveTo(-2,-r-4);
      X.lineTo(0,-r-10);
      X.lineTo(2,-r-4);
      X.closePath();
      X.fill();
      X.shadowBlur=0;
      break;

    case 'skull':
      // Skull mask
      X.fillStyle='#f0f0f0';
      X.shadowColor='#7a00ff';X.shadowBlur=10;
      X.beginPath();
      X.arc(0,-2,r-1,0,Math.PI*2);
      X.fill();
      X.shadowBlur=0;
      // Eye sockets glowing
      X.fillStyle='#7a00ff';
      X.shadowColor='#7a00ff';X.shadowBlur=8;
      X.beginPath();X.arc(-3.5,-2,2.5,0,Math.PI*2);X.fill();
      X.beginPath();X.arc(3.5,-2,2.5,0,Math.PI*2);X.fill();
      X.shadowBlur=0;
      // Nose
      X.fillStyle='#000';
      X.beginPath();
      X.moveTo(0,1);X.lineTo(-1,3);X.lineTo(1,3);X.closePath();
      X.fill();
      // Teeth
      X.fillStyle='#000';
      X.fillRect(-4,4,8,1);
      for(let i=-3;i<=3;i+=2){
        X.fillRect(i,4,1,2);
      }
      break;

    case 'horns':
      // Demon horns
      X.fillStyle='#1a0000';
      X.shadowColor='#ff0000';X.shadowBlur=8;
      X.beginPath();
      X.moveTo(-6,-6);
      X.quadraticCurveTo(-12,-12,-9,-16);
      X.quadraticCurveTo(-7,-14,-4,-7);
      X.closePath();
      X.fill();
      X.beginPath();
      X.moveTo(6,-6);
      X.quadraticCurveTo(12,-12,9,-16);
      X.quadraticCurveTo(7,-14,4,-7);
      X.closePath();
      X.fill();
      X.shadowBlur=0;
      // Glow eyes red
      X.fillStyle='#ff0000';
      X.shadowColor='#ff0000';X.shadowBlur=6;
      X.beginPath();X.arc(-3.5,-1,1.5,0,Math.PI*2);X.fill();
      X.beginPath();X.arc(3.5,-1,1.5,0,Math.PI*2);X.fill();
      X.shadowBlur=0;
      break;

    case 'galaxy':
      // Galaxy swirl around ball
      const gt=menuT*1.5;
      X.shadowColor='#a0a0ff';X.shadowBlur=10;
      for(let i=0;i<12;i++){
        const a=gt+(i/12)*Math.PI*2;
        const dist=r+3+Math.sin(gt*2+i)*2;
        X.fillStyle=i%3===0?'#ffffff':(i%3===1?'#a0a0ff':'#ff80ff');
        X.beginPath();
        X.arc(Math.cos(a)*dist,Math.sin(a)*dist,1.5,0,Math.PI*2);
        X.fill();
      }
      // Inner ring
      X.strokeStyle='rgba(160,160,255,0.4)';
      X.lineWidth=1;
      X.beginPath();
      X.ellipse(0,0,r+5,r+2,gt*0.5,0,Math.PI*2);
      X.stroke();
      X.shadowBlur=0;
      break;
  }
  X.restore();
}

function getRarityColor(rarity){
  switch(rarity){
    case 'common':return '#a0a0a0';
    case 'rare':return '#4d9eff';
    case 'legendary':return '#c084fc';
    case 'stellar':return '#ffd700';
  }
  return '#fff';
}

function getRarityName(rarity){
  switch(rarity){
    case 'common':return 'COMUM';
    case 'rare':return 'RARO';
    case 'legendary':return 'LENDÁRIO';
    case 'stellar':return 'ESTELAR';
  }
  return '';
}

function getMedal(s){
  if(s>=200)return{name:'DIAMANTE',color:'#b9f6ff',glow:'#00d4ff',icon:'◆'};
  if(s>=100)return{name:'OURO',color:'#ffd32a',glow:'#ffaa00',icon:'★'};
  if(s>=50)return{name:'PRATA',color:'#e0e0e8',glow:'#a0a0b0',icon:'★'};
  if(s>=20)return{name:'BRONZE',color:'#cd7f32',glow:'#8b4513',icon:'★'};
  return null;
}

function drawMedal(x,y,medal,scale){
  if(!medal)return;
  scale=scale||1;
  X.save();
  X.translate(x,y);
  X.scale(scale,scale);

  // Glow background
  X.shadowColor=medal.glow;
  X.shadowBlur=20;

  // Outer ring
  const grad=X.createRadialGradient(0,-3,0,0,0,28);
  grad.addColorStop(0,medal.color);
  grad.addColorStop(0.7,medal.color);
  grad.addColorStop(1,medal.glow);
  X.fillStyle=grad;
  X.beginPath();
  X.arc(0,0,28,0,Math.PI*2);
  X.fill();
  X.shadowBlur=0;

  // Inner shine
  const sh=X.createRadialGradient(-6,-8,0,0,0,28);
  sh.addColorStop(0,'rgba(255,255,255,0.6)');
  sh.addColorStop(0.5,'rgba(255,255,255,0.1)');
  sh.addColorStop(1,'rgba(255,255,255,0)');
  X.fillStyle=sh;
  X.beginPath();
  X.arc(0,0,28,0,Math.PI*2);
  X.fill();

  // Border
  X.strokeStyle='rgba(0,0,0,0.3)';
  X.lineWidth=2;
  X.beginPath();
  X.arc(0,0,28,0,Math.PI*2);
  X.stroke();

  // Icon
  X.fillStyle='rgba(0,0,0,0.5)';
  X.font='bold 28px -apple-system, system-ui, sans-serif';
  X.textAlign='center';
  X.textBaseline='middle';
  X.fillText(medal.icon,0,2);

  X.restore();
}

function drawMuteBtn(){
  return;
}

function drawPauseBtn(){
  if (typeof window.drawPauseBtnModule === 'function') {
    return window.drawPauseBtnModule.apply(this, arguments);
  }
}

function drawPauseScreen(){
  if (typeof window.drawPauseScreenModule === 'function') {
    return window.drawPauseScreenModule.apply(this, arguments);
  }
}

function drawActionBtn(){
  if (typeof window.drawActionBtnModule === 'function') {
    return window.drawActionBtnModule.apply(this, arguments);
  }
}

function drawPlayUI(){
  if (typeof window.drawPlayUIModule === 'function') {
    return window.drawPlayUIModule.apply(this, arguments);
  }
}

function drawPuTimer(){
  if (typeof window.drawPuTimerModule === 'function') {
    return window.drawPuTimerModule.apply(this, arguments);
  }
}

function drawTutorial(){
  const pulse=0.5+Math.sin(menuT*3)*0.5;

  if(tutorialStep===1){
    // Step 1: Tap to release
    // Big arrow pointing at ball
    const bx=ball.x-cam.x, by=ball.y-cam.y;

    // Pulsing circle around ball
    X.globalAlpha=0.3+Math.sin(menuT*4)*0.2;
    X.strokeStyle='#ffd32a';
    X.lineWidth=3;
    X.beginPath();
    X.arc(bx,by,30+Math.sin(menuT*4)*5,0,Math.PI*2);
    X.stroke();
    X.globalAlpha=1;

    // Big text at top
    X.globalAlpha=0.95;
    X.fillStyle='rgba(0,0,0,0.6)';
    X.fillRect(0,H*0.15,W,80);
    X.fillStyle='#ffd32a';
    X.font='bold 22px -apple-system, system-ui, sans-serif';
    X.textAlign='center';X.textBaseline='middle';
    X.fillText('A bolinha está orbitando',W/2,H*0.18);
    X.fillStyle='#ffffff';
    X.font='bold 26px -apple-system, system-ui, sans-serif';
    X.fillText('TOQUE A TELA PARA SOLTAR',W/2,H*0.215);
    X.globalAlpha=1;

    // Bottom hint with finger icon
    const fingerY=H*0.78+Math.sin(menuT*3)*8;
    X.globalAlpha=pulse;
    X.font='40px -apple-system, system-ui, sans-serif';
    X.fillText('👆',W/2,fingerY);
    X.globalAlpha=1;
  }
  else if(tutorialStep===2){
    // Step 2: Ball is flying, will be captured automatically
    X.globalAlpha=0.9;
    X.fillStyle='rgba(0,0,0,0.6)';
    X.fillRect(0,H*0.15,W,60);
    X.fillStyle='#00f5d4';
    X.font='bold 22px -apple-system, system-ui, sans-serif';
    X.textAlign='center';X.textBaseline='middle';
    X.fillText('Ela vai pousar no próximo nó!',W/2,H*0.195);
    X.globalAlpha=1;
  }
  else if(tutorialStep===3){
    // Step 3: Explain branches and timing
    X.globalAlpha=0.9;
    X.fillStyle='rgba(0,0,0,0.65)';
    X.fillRect(0,H*0.13,W,100);
    X.fillStyle='#ffd32a';
    X.font='bold 20px -apple-system, system-ui, sans-serif';
    X.textAlign='center';X.textBaseline='middle';
    X.fillText('Escolha qual nó pegar!',W/2,H*0.16);
    X.fillStyle='#ffffff';
    X.font='14px -apple-system, system-ui, sans-serif';
    X.fillText('Solte no momento certo para mirar',W/2,H*0.19);
    X.fillStyle='#d4c5ff';
    X.font='12px -apple-system, system-ui, sans-serif';
    X.fillText('🟢 +1 fácil   🔵 +2 médio   🔴 +3 difícil',W/2,H*0.215);
    X.globalAlpha=1;
  }
  else if(tutorialStep===4){
    // Step 4: Combo tip
    X.globalAlpha=0.9;
    X.fillStyle='rgba(0,0,0,0.6)';
    X.fillRect(0,H*0.13,W,80);
    X.fillStyle='#00f5d4';
    X.font='bold 20px -apple-system, system-ui, sans-serif';
    X.textAlign='center';X.textBaseline='middle';
    X.fillText('Capture rápido para fazer COMBO!',W/2,H*0.16);
    X.fillStyle='#ffffff';
    X.font='13px -apple-system, system-ui, sans-serif';
    X.fillText('Combos multiplicam seus pontos',W/2,H*0.195);
    X.globalAlpha=1;
  }
}


function drawTopStatusBadges() {
  if (typeof window.drawMetaProgressTopStatusBadges === 'function') {
    return window.drawMetaProgressTopStatusBadges();
  }
}
function drawMenuUI(){
  if (typeof window.orbitaMenuShell_drawMenuUI === 'function') return window.orbitaMenuShell_drawMenuUI();
}



function drawMissionInfoCard(x,y,w,compact){
  if (typeof window.drawMetaProgressMissionInfoCard === 'function') {
    return window.drawMetaProgressMissionInfoCard(x,y,w,compact);
  }
  return false;
}
function drawMainMenu(){
  if (typeof window.orbitaMenuShell_drawMainMenu === 'function') return window.orbitaMenuShell_drawMainMenu();
}

function drawMenuButton(x,y,w,h,label,color,highlight,action){
  const isHl=highlight;
  // Background
  X.globalAlpha=isHl?0.9:0.7;
  const g=X.createLinearGradient(x,y,x,y+h);
  if(isHl){
    g.addColorStop(0,color);
    g.addColorStop(1,'rgba(0,0,0,0.4)');
  } else {
    g.addColorStop(0,'rgba(0,0,0,0.5)');
    g.addColorStop(1,'rgba(0,0,0,0.7)');
  }
  X.fillStyle=g;
  roundRect(x,y,w,h,12);
  X.fill();

  // Border
  X.strokeStyle=color;
  X.lineWidth=isHl?2.5:1.5;
  X.shadowColor=color;
  X.shadowBlur=isHl?15:5;
  roundRect(x,y,w,h,12);
  X.stroke();
  X.shadowBlur=0;

  // Text
  X.globalAlpha=1;
  X.fillStyle=isHl?'#fff':color;
  X.font='bold 22px -apple-system, system-ui, sans-serif';
  X.textAlign='center';
  X.textBaseline='middle';
  X.fillText(label,x+w/2,y+h/2);

  menuBtnAreas.push({x,y,w,h,action});
}

function roundRect(x,y,w,h,r){
  X.beginPath();
  X.moveTo(x+r,y);
  X.lineTo(x+w-r,y);
  X.quadraticCurveTo(x+w,y,x+w,y+r);
  X.lineTo(x+w,y+h-r);
  X.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  X.lineTo(x+r,y+h);
  X.quadraticCurveTo(x,y+h,x,y+h-r);
  X.lineTo(x,y+r);
  X.quadraticCurveTo(x,y,x+r,y);
  X.closePath();
}


let menuScrollScreen = '';
let menuScrollY = 0;
let menuScrollTargetY = 0;
let menuScrollMinY = 0;
let menuScrollMaxY = 0;

function isMenuScreenScrollable(){
  return typeof window.orbitaMenuShell_isMenuScreenScrollable === 'function' ? window.orbitaMenuShell_isMenuScreenScrollable() : false;
}

function syncMenuScrollState(){
  if (typeof window.orbitaMenuShell_syncMenuScrollState === 'function') return window.orbitaMenuShell_syncMenuScrollState();
}

function updateMenuScrollAnimation(){
  if (typeof window.orbitaMenuShell_updateMenuScrollAnimation === 'function') return window.orbitaMenuShell_updateMenuScrollAnimation();
}

function getMenuScrollViewport(){
  return typeof window.orbitaMenuShell_getMenuScrollViewport === 'function' ? window.orbitaMenuShell_getMenuScrollViewport() : null;
}

function beginMenuScrollClip(){
  return typeof window.orbitaMenuShell_beginMenuScrollClip === 'function' ? window.orbitaMenuShell_beginMenuScrollClip() : null;
}

function endMenuScrollClip(){
  if (typeof window.orbitaMenuShell_endMenuScrollClip === 'function') return window.orbitaMenuShell_endMenuScrollClip();
}

function setMenuScrollBounds(contentStartY, contentEndY, viewport){
  if (typeof window.orbitaMenuShell_setMenuScrollBounds === 'function') return window.orbitaMenuShell_setMenuScrollBounds(contentStartY, contentEndY, viewport);
}

function canStartMenuScroll(x,y){
  return typeof window.orbitaMenuShell_canStartMenuScroll === 'function' ? window.orbitaMenuShell_canStartMenuScroll(x,y) : false;
}

function applyMenuScrollGesture(deltaY){
  if (typeof window.orbitaMenuShell_applyMenuScrollGesture === 'function') return window.orbitaMenuShell_applyMenuScrollGesture(deltaY);
}

function wheelMenuScroll(deltaY){
  if (typeof window.orbitaMenuShell_wheelMenuScroll === 'function') return window.orbitaMenuShell_wheelMenuScroll(deltaY);
}

function drawMenuScrollBar(viewport){
  if (typeof window.orbitaMenuShell_drawMenuScrollBar === 'function') return window.orbitaMenuShell_drawMenuScrollBar(viewport);
}

function drawMenuScrollFades(viewport){
  if (typeof window.orbitaMenuShell_drawMenuScrollFades === 'function') return window.orbitaMenuShell_drawMenuScrollFades(viewport);
}

function drawSkinsMenu(){
  if (typeof window.orbitaMenuShell_drawSkinsMenu === 'function') return window.orbitaMenuShell_drawSkinsMenu();
}

function drawBackgroundsMenu(){
  if (typeof window.orbitaMenuShell_drawBackgroundsMenu === 'function') return window.orbitaMenuShell_drawBackgroundsMenu();
}

function drawMiniBg(type,x,y,w,h){
  // Simplified versions of each background for previews
  if(type==='stars'){
    X.fillStyle='#0a0a1a';X.fillRect(x,y,w,h);
    for(let i=0;i<20;i++){
      const sx=x+(i*47)%w, sy=y+(i*73)%h;
      X.fillStyle='#fff';X.globalAlpha=0.5;
      X.fillRect(sx,sy,1,1);
    }
    X.globalAlpha=1;
  }
  else if(type==='nebula'){
    X.fillStyle='#0a0518';X.fillRect(x,y,w,h);
    const g=X.createRadialGradient(x+w*0.3,y+h*0.5,0,x+w*0.3,y+h*0.5,w*0.6);
    g.addColorStop(0,'rgba(150,50,200,0.6)');g.addColorStop(1,'rgba(150,50,200,0)');
    X.fillStyle=g;X.fillRect(x,y,w,h);
    const g2=X.createRadialGradient(x+w*0.7,y+h*0.5,0,x+w*0.7,y+h*0.5,w*0.5);
    g2.addColorStop(0,'rgba(50,100,200,0.5)');g2.addColorStop(1,'rgba(50,100,200,0)');
    X.fillStyle=g2;X.fillRect(x,y,w,h);
  }
  else if(type==='galaxy'){
    X.fillStyle='#040418';X.fillRect(x,y,w,h);
    const cx=x+w/2,cy=y+h/2;
    for(let i=0;i<3;i++){
      for(let j=0;j<25;j++){
        const a=i*Math.PI*2/3+j*0.2;
        const d=j*3;
        const px=cx+Math.cos(a)*d,py=cy+Math.sin(a)*d*0.5;
        X.fillStyle=j<8?'#fff080':'#a080ff';
        X.globalAlpha=0.6-j*0.02;
        X.fillRect(px,py,1.5,1.5);
      }
    }
    X.globalAlpha=1;
  }
  else if(type==='blackhole'){
    X.fillStyle='#000005';X.fillRect(x,y,w,h);
    const cx=x+w/2,cy=y+h/2;
    for(let i=0;i<25;i++){
      const a=i*0.4;
      const r=20+i;
      X.fillStyle=`hsla(${20+i*5},90%,60%,0.4)`;
      X.fillRect(cx+Math.cos(a)*r,cy+Math.sin(a)*r*0.3,2,2);
    }
    X.fillStyle='#000';
    X.beginPath();X.arc(cx,cy,15,0,Math.PI*2);X.fill();
    X.strokeStyle='rgba(255,180,80,0.8)';X.lineWidth=2;
    X.beginPath();X.arc(cx,cy,17,0,Math.PI*2);X.stroke();
  }
  else if(type==='redgiant'){
    X.fillStyle='#1a0008';X.fillRect(x,y,w,h);
    const cx=x+w*0.7,cy=y+h*0.3;
    const ag=X.createRadialGradient(cx,cy,0,cx,cy,w*0.6);
    ag.addColorStop(0,'rgba(255,80,40,0.6)');
    ag.addColorStop(1,'rgba(100,0,0,0)');
    X.fillStyle=ag;X.fillRect(x,y,w,h);
    const sg=X.createRadialGradient(cx,cy,0,cx,cy,30);
    sg.addColorStop(0,'#ffff80');sg.addColorStop(0.5,'#ff8000');sg.addColorStop(1,'#cc2200');
    X.fillStyle=sg;
    X.beginPath();X.arc(cx,cy,30,0,Math.PI*2);X.fill();
  }

  else if(type==='pulsar'){
    X.fillStyle='#030612';X.fillRect(x,y,w,h);
    const pcx=x+w*0.74, pcy=y+h*0.34;
    const ph=X.createRadialGradient(pcx,pcy,0,pcx,pcy,w*0.46);
    ph.addColorStop(0,'rgba(120,230,255,0.52)');
    ph.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=ph;X.fillRect(x,y,w,h);
    X.strokeStyle='rgba(130,240,255,0.28)';X.lineWidth=5;
    X.beginPath();X.moveTo(x-w*0.02,y+h*0.10);X.lineTo(x+w*1.02,y+h*0.60);X.stroke();
    X.strokeStyle='rgba(255,255,255,0.78)';X.lineWidth=1.6;
    X.beginPath();X.moveTo(x-w*0.02,y+h*0.10);X.lineTo(x+w*1.02,y+h*0.60);X.stroke();
    for(let i=0;i<3;i++){
      X.globalAlpha=0.16-i*0.04;
      X.strokeStyle=i===0?'rgba(130,250,255,0.9)':'rgba(110,150,255,0.75)';
      X.lineWidth=1.2;
      X.beginPath();X.arc(pcx,pcy,12+i*8,0,Math.PI*2);X.stroke();
    }
    X.globalAlpha=1;
    X.fillStyle='#fff8cf';
    X.beginPath();X.arc(pcx,pcy,9,0,Math.PI*2);X.fill();
  }
  else if(type==='saturnrings'){
    X.fillStyle='#06050c';X.fillRect(x,y,w,h);
    const scx=x+w*0.73, scy=y+h*0.45;
    const ringTilt=-0.30 + Math.sin(menuT*0.18)*0.03;
    const ringSpin=menuT*0.65;
    X.strokeStyle='rgba(245,214,156,0.85)';X.lineWidth=4;
    X.beginPath();X.ellipse(scx,scy,w*0.24,h*0.12,ringTilt,0,Math.PI*2);X.stroke();
    X.strokeStyle='rgba(170,205,255,0.50)';X.lineWidth=2.4;
    X.beginPath();X.ellipse(scx,scy,w*0.30,h*0.16,ringTilt,0,Math.PI*2);X.stroke();
    X.strokeStyle='rgba(214,168,120,0.45)';X.lineWidth=1.6;
    X.beginPath();X.ellipse(scx,scy,w*0.19,h*0.09,ringTilt,0,Math.PI*2);X.stroke();
    for(let i=0;i<16;i++){
      const a=ringSpin + (i/16)*Math.PI*2;
      const ex=w*0.27, ey=h*0.13;
      const cosA=Math.cos(a), sinA=Math.sin(a);
      const px=scx + cosA*ex*Math.cos(ringTilt) - sinA*ey*Math.sin(ringTilt);
      const py=scy + cosA*ex*Math.sin(ringTilt) + sinA*ey*Math.cos(ringTilt);
      X.globalAlpha=0.12 + (i%4)*0.05;
      X.fillStyle=i%2===0?'rgba(255,235,190,0.9)':'rgba(170,205,255,0.82)';
      X.beginPath();X.arc(px,py,1.0 + (i%2)*0.2,0,Math.PI*2);X.fill();
    }
    const sb=X.createRadialGradient(scx-8,scy-8,0,scx,scy,30);
    sb.addColorStop(0,'#fff6d4');sb.addColorStop(0.22,'#ffd78a');sb.addColorStop(0.52,'#f3b05d');sb.addColorStop(1,'#7b4722');
    X.fillStyle=sb;
    X.beginPath();X.arc(scx,scy,24,0,Math.PI*2);X.fill();
    X.globalAlpha=0.16;X.fillStyle='rgba(255,255,255,0.9)';
    X.fillRect(x+w*0.12,y+h*0.20,w*0.46,1.2);
    X.globalAlpha=1;
  }

  else if(type==='astralcathedral'){
    X.fillStyle='#050713';X.fillRect(x,y,w,h);
    const lg=X.createRadialGradient(x+w*0.08,y+h*0.55,0,x+w*0.08,y+h*0.55,w*0.45);
    lg.addColorStop(0,'rgba(120,180,255,0.35)');
    lg.addColorStop(1,'rgba(120,180,255,0)');
    X.fillStyle=lg;X.fillRect(x,y,w,h);
    const rg=X.createRadialGradient(x+w*0.92,y+h*0.55,0,x+w*0.92,y+h*0.55,w*0.45);
    rg.addColorStop(0,'rgba(220,120,255,0.35)');
    rg.addColorStop(1,'rgba(220,120,255,0)');
    X.fillStyle=rg;X.fillRect(x,y,w,h);
    X.strokeStyle='rgba(180,220,255,0.35)';X.lineWidth=2;
    X.beginPath();X.moveTo(x+w*0.12,y+h*0.22);X.lineTo(x+w*0.12,y+h*0.88);X.stroke();
    X.beginPath();X.moveTo(x+w*0.88,y+h*0.22);X.lineTo(x+w*0.88,y+h*0.88);X.stroke();
    X.beginPath();X.arc(x+w*0.12,y+h*0.22,18,Math.PI,0);X.stroke();
    X.beginPath();X.arc(x+w*0.88,y+h*0.22,18,Math.PI,0);X.stroke();
  }
  else if(type==='andromedathrone'){
    X.fillStyle='#04040f';X.fillRect(x,y,w,h);
    const cx=x+w*0.74,cy=y+h*0.30;
    for(let i=0;i<3;i++){
      for(let j=0;j<20;j++){
        const a=i*Math.PI*2/3+j*0.24;
        const d=j*2.6;
        X.globalAlpha=0.45-j*0.014;
        X.fillStyle=j<7?'#ffe6ff':(j<14?'#c084fc':'#60a5fa');
        X.fillRect(cx+Math.cos(a)*d,cy+Math.sin(a)*d*0.55,1.6,1.6);
      }
    }
    X.globalAlpha=0.22;
    X.fillStyle='rgba(180,120,255,0.28)';
    X.beginPath();
    X.moveTo(x+w*0.55,y+h*0.88);
    X.lineTo(x+w*0.64,y+h*0.60);
    X.lineTo(x+w*0.73,y+h*0.88);
    X.closePath();X.fill();
    X.globalAlpha=1;
  }
  else if(type==='cosmicgenesis'){
    X.fillStyle='#01030a';X.fillRect(x,y,w,h);
    const cx=x+w*0.74,cy=y+h*0.34;
    const rg=X.createRadialGradient(cx,cy,0,cx,cy,w*0.34);
    rg.addColorStop(0,'rgba(255,230,180,0.55)');
    rg.addColorStop(0.25,'rgba(255,170,80,0.40)');
    rg.addColorStop(0.45,'rgba(80,220,255,0.28)');
    rg.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=rg;X.fillRect(x,y,w,h);
    X.strokeStyle='rgba(255,215,120,0.35)';X.lineWidth=1.6;
    X.beginPath();X.ellipse(cx,cy,w*0.16,h*0.12,0.4,0,Math.PI*2);X.stroke();
    X.strokeStyle='rgba(90,220,255,0.28)';
    X.beginPath();X.ellipse(cx,cy,w*0.24,h*0.18,-0.4,0,Math.PI*2);X.stroke();
  }

  else if(type==='cosmic'){
    X.fillStyle='#02020a';X.fillRect(x,y,w,h);
    const ng=X.createRadialGradient(x+w*0.3,y+h*0.4,0,x+w*0.3,y+h*0.4,w*0.6);
    ng.addColorStop(0,'rgba(100,50,200,0.6)');ng.addColorStop(1,'rgba(100,50,200,0)');
    X.fillStyle=ng;X.fillRect(x,y,w,h);
    const ng2=X.createRadialGradient(x+w*0.7,y+h*0.6,0,x+w*0.7,y+h*0.6,w*0.5);
    ng2.addColorStop(0,'rgba(0,150,200,0.5)');ng2.addColorStop(1,'rgba(0,150,200,0)');
    X.fillStyle=ng2;X.fillRect(x,y,w,h);
    for(let i=0;i<8;i++){
      const sx=x+(i*53)%w,sy=y+(i*37)%h;
      X.fillStyle='#fff';
      X.fillRect(sx,sy,2,2);
    }
  }
}

function getBackTargetScreen(){
  if(menuScreen==='debug') return 'settings';
  if(menuScreen==='changeNickname') return 'settings';
  if(menuScreen==='confirmDelete') return 'settings';
  if(menuScreen==='installHelp') return 'settings';
  if(menuScreen==='settings') return 'main';
  if(menuScreen==='skins') return 'main';
  if(menuScreen==='backgrounds') return 'main';
  if(menuScreen==='stats') return 'main';
  if(menuScreen==='ranking') return 'main';
  if(menuScreen==='nickname') return 'main';
  return 'main';
}

function drawBackBtn(){
  const mobilePortrait = H > W;
  const bw = mobilePortrait ? 76 : 84;
  const bh = mobilePortrait ? 28 : 34;
  const bx = mobilePortrait ? 12 : 18;
  const by = mobilePortrait ? 12 : 18;
  X.globalAlpha=0.86;
  X.fillStyle='rgba(0,0,0,0.68)';
  roundRect(bx,by,bw,bh,9);
  X.fill();
  X.strokeStyle='#fff';X.lineWidth=1.5;
  roundRect(bx,by,bw,bh,9);
  X.stroke();
  X.fillStyle='#fff';
  X.font=(mobilePortrait?'bold 11px':'bold 13px')+' -apple-system, system-ui, sans-serif';
  X.textAlign='center';X.textBaseline='middle';
  X.fillText('← VOLTAR',bx+bw/2,by+bh/2);
  X.globalAlpha=1;
  menuBtnAreas.push({
    x:bx,y:by,w:bw,h:bh,
    action:()=>{
      menuScreen=getBackTargetScreen();
    }
  });
}

function drawStatsMenu(){
  if (typeof window.drawMetaProgressStatsMenu === 'function') {
    return window.drawMetaProgressStatsMenu();
  }
}
function drawRankingMenu(){
  if (typeof window.drawMetaProgressRankingMenu === 'function') {
    return window.drawMetaProgressRankingMenu();
  }
}
function drawLoadingScreen(){
  X.textAlign='center';X.textBaseline='middle';

  // Big title em duas linhas (logotype: LAST pequeno em cima, ORBIT gigante)
  X.shadowColor='#b0b0ff';X.shadowBlur=12;
  X.fillStyle='rgba(180,200,255,0.75)';
  X.font='600 18px -apple-system, system-ui, sans-serif';
  X.save();
  // Letter-spacing manual pra "LAST"
  const _lsLetters='LAST'.split('');
  const _lsSp=8;
  let _lsTW=0;
  const _lsW=_lsLetters.map(l=>X.measureText(l).width);
  _lsTW=_lsW.reduce((a,b)=>a+b,0)+_lsSp*(_lsLetters.length-1);
  let _lsCx=W/2-_lsTW/2;
  for(let i=0;i<_lsLetters.length;i++){X.fillText(_lsLetters[i],_lsCx+_lsW[i]/2,H*0.36);_lsCx+=_lsW[i]+_lsSp;}
  X.restore();
  X.shadowColor='#b0b0ff';X.shadowBlur=30;
  X.fillStyle='#e0e0ff';
  X.font='bold 54px -apple-system, system-ui, sans-serif';
  X.fillText('ORBIT',W/2,H*0.42);
  X.shadowBlur=0;

  // Animated ball orbiting
  const orbR=40;
  const cx=W/2, cy=H*0.55;
  const ang=menuT*3;

  // Center dot
  X.fillStyle='rgba(255,255,255,0.4)';
  X.beginPath();
  X.arc(cx,cy,3,0,Math.PI*2);
  X.fill();

  // Orbit trail
  for(let i=0;i<8;i++){
    const a=ang-i*0.15;
    const alpha=(8-i)/8*0.6;
    X.globalAlpha=alpha;
    X.fillStyle='#00f5d4';
    X.beginPath();
    X.arc(cx+Math.cos(a)*orbR,cy+Math.sin(a)*orbR,4-i*0.3,0,Math.PI*2);
    X.fill();
  }
  X.globalAlpha=1;

  // Ball
  const bx=cx+Math.cos(ang)*orbR;
  const by=cy+Math.sin(ang)*orbR;
  X.shadowColor='#00f5d4';
  X.shadowBlur=10;
  X.fillStyle='#fff';
  X.beginPath();
  X.arc(bx,by,6,0,Math.PI*2);
  X.fill();
  X.shadowBlur=0;

  // Loading text
  X.fillStyle='rgba(255,255,255,0.5)';
  X.font='12px -apple-system, system-ui, sans-serif';
  const dots='.'.repeat(Math.floor(menuT*2)%4);
  X.fillText('Carregando'+dots,W/2,H*0.68);
}

function drawLoginScreen(){
  if (typeof window.drawLoginScreenModule === 'function') {
    return window.drawLoginScreenModule.apply(this, arguments);
  }
}


function drawNicknameScreen(){
  if (typeof window.drawNicknameScreenModule === 'function') {
    return window.drawNicknameScreenModule.apply(this, arguments);
  }
}


function drawVirtualKeyboard(){
  const keys=[
    'QWERTYUIOP',
    'ASDFGHJKL',
    'ZXCVBNM⌫'
  ];
  const startY=H*0.67;
  const keyW=Math.min(W*0.085,32);
  const keyH=34;
  const gap=4;

  for(let r=0;r<keys.length;r++){
    const row=keys[r];
    const rowW=row.length*(keyW+gap)-gap;
    const rowX=(W-rowW)/2;
    const ky=startY+r*(keyH+gap);

    for(let c=0;c<row.length;c++){
      const ch=row[c];
      const kx=rowX+c*(keyW+gap);

      X.globalAlpha=0.8;
      X.fillStyle='rgba(40,40,60,0.9)';
      roundRect(kx,ky,keyW,keyH,6);
      X.fill();
      X.strokeStyle='rgba(255,255,255,0.3)';
      X.lineWidth=1;
      roundRect(kx,ky,keyW,keyH,6);
      X.stroke();
      X.globalAlpha=1;

      X.fillStyle='#fff';
      X.font='bold 14px -apple-system, system-ui, sans-serif';
      X.textAlign='center';
      X.textBaseline='middle';
      X.fillText(ch,kx+keyW/2,ky+keyH/2);

      menuBtnAreas.push({
        x:kx,y:ky,w:keyW,h:keyH,
        action:()=>{
          nicknameError='';
          if(ch==='⌫'){
            nicknameBuffer=nicknameBuffer.slice(0,-1);
          } else if(nicknameBuffer.length<16){
            nicknameBuffer+=ch;
          }
        }
      });
    }
  }

  // Numbers row
  const numRow='0123456789';
  const nY=startY+3*(keyH+gap);
  const nRowW=numRow.length*(keyW+gap)-gap;
  const nRowX=(W-nRowW)/2;
  for(let i=0;i<numRow.length;i++){
    const ch=numRow[i];
    const kx=nRowX+i*(keyW+gap);
    X.globalAlpha=0.8;
    X.fillStyle='rgba(40,40,60,0.9)';
    roundRect(kx,nY,keyW,keyH,6);
    X.fill();
    X.strokeStyle='rgba(255,255,255,0.3)';
    X.lineWidth=1;
    roundRect(kx,nY,keyW,keyH,6);
    X.stroke();
    X.globalAlpha=1;
    X.fillStyle='#fff';
    X.font='bold 14px -apple-system, system-ui, sans-serif';
    X.textAlign='center';
    X.textBaseline='middle';
    X.fillText(ch,kx+keyW/2,nY+keyH/2);
    menuBtnAreas.push({
      x:kx,y:nY,w:keyW,h:keyH,
      action:()=>{
        nicknameError='';
        if(nicknameBuffer.length<16)nicknameBuffer+=ch;
      }
    });
  }
}

// ============ SETTINGS SCREENS ============
function drawSettingsMenu(){
  if (typeof window.drawSettingsMenuModule === 'function') {
    return window.drawSettingsMenuModule.apply(this, arguments);
  }
}


function drawInstallHelpScreen(){
  if (typeof window.drawInstallHelpScreenModule === 'function') {
    return window.drawInstallHelpScreenModule.apply(this, arguments);
  }
}



function getScrollableMenuAreaY(y){
  return isMenuScreenScrollable() ? (y + menuScrollY) : y;
}

function pushScrollableMenuArea(x,y,w,h,action){
  menuBtnAreas.push({x,y:getScrollableMenuAreaY(y),w,h,action});
}

function drawSettingsBtn(x,y,w,label,icon,color,action){
  const h=38;
  X.globalAlpha=0.7;
  const g=X.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,'rgba(0,0,0,0.6)');
  g.addColorStop(1,'rgba(0,0,0,0.8)');
  X.fillStyle=g;
  roundRect(x,y,w,h,8);
  X.fill();
  X.strokeStyle=color;
  X.lineWidth=1.5;
  roundRect(x,y,w,h,8);
  X.stroke();
  X.globalAlpha=1;

  X.fillStyle=color;
  X.font='bold 16px -apple-system, system-ui, sans-serif';
  X.textAlign='left';
  X.textBaseline='middle';
  X.fillText(icon,x+14,y+h/2);

  X.fillStyle='#fff';
  X.font='bold 13px -apple-system, system-ui, sans-serif';
  X.fillText(label,x+38,y+h/2);

  // Chevron
  X.fillStyle='rgba(255,255,255,0.4)';
  X.textAlign='right';
  X.font='14px -apple-system, system-ui, sans-serif';
  X.fillText('›',x+w-14,y+h/2-1);

  pushScrollableMenuArea(x,y,w,h,action);
}

function drawSlider(x,y,w,label,value,onChange){
  const h=44;
  // Label
  X.fillStyle='#fff';
  X.font='bold 12px -apple-system, system-ui, sans-serif';
  X.textAlign='left';
  X.textBaseline='middle';
  X.fillText(label,x,y+8);

  // Value %
  X.fillStyle='rgba(255,255,255,0.5)';
  X.font='10px -apple-system, system-ui, sans-serif';
  X.textAlign='right';
  X.fillText(Math.round(value*100)+'%',x+w,y+8);

  // Track
  const trackY=y+26;
  const trackH=6;
  X.fillStyle='rgba(0,0,0,0.5)';
  roundRect(x,trackY,w,trackH,3);
  X.fill();

  // Fill
  const fillW=w*value;
  if(fillW>0){
    const g=X.createLinearGradient(x,trackY,x+fillW,trackY);
    g.addColorStop(0,'#00f5d4');
    g.addColorStop(1,'#70a1ff');
    X.fillStyle=g;
    roundRect(x,trackY,fillW,trackH,3);
    X.fill();
  }

  // Knob
  const knobX=x+fillW;
  X.shadowColor='#00f5d4';
  X.shadowBlur=8;
  X.fillStyle='#fff';
  X.beginPath();
  X.arc(knobX,trackY+trackH/2,9,0,Math.PI*2);
  X.fill();
  X.shadowBlur=0;
  X.strokeStyle='#00f5d4';
  X.lineWidth=2;
  X.beginPath();
  X.arc(knobX,trackY+trackH/2,9,0,Math.PI*2);
  X.stroke();

  // Touch zone (bigger than visual)
  pushScrollableMenuArea(x-5,trackY-15,w+10,36,(tapX)=>{
    const newV = clamp((tapX-x)/w, 0, 1);
    onChange(newV);
  });
}

function drawToggle(x,y,w,label,isOn,action){
  const h=38;
  X.fillStyle='rgba(0,0,0,0.5)';
  roundRect(x,y,w,h,8);
  X.fill();
  X.strokeStyle='rgba(255,255,255,0.15)';
  X.lineWidth=1;
  roundRect(x,y,w,h,8);
  X.stroke();

  // Label
  X.fillStyle='#fff';
  X.font='bold 13px -apple-system, system-ui, sans-serif';
  X.textAlign='left';
  X.textBaseline='middle';
  X.fillText(label,x+14,y+h/2);

  // Toggle switch
  const swW=42, swH=22;
  const swX=x+w-swW-12;
  const swY=y+(h-swH)/2;

  X.fillStyle=isOn?'#00f5d4':'rgba(255,255,255,0.15)';
  roundRect(swX,swY,swW,swH,swH/2);
  X.fill();

  // Knob
  const knobX=isOn?swX+swW-swH/2:swX+swH/2;
  X.fillStyle='#fff';
  if(isOn){X.shadowColor='#00f5d4';X.shadowBlur=6;}
  X.beginPath();
  X.arc(knobX,swY+swH/2,swH/2-3,0,Math.PI*2);
  X.fill();
  X.shadowBlur=0;

  pushScrollableMenuArea(x,y,w,h,action);
}


function drawVolumeStepper(x,y,w,label,value,onChange,color){
  const h=40;
  const accent=color||'#70a1ff';
  const vv=clamp(value||0,0,1);

  X.fillStyle='rgba(0,0,0,0.5)';
  roundRect(x,y,w,h,8);
  X.fill();
  X.strokeStyle='rgba(255,255,255,0.12)';
  X.lineWidth=1;
  roundRect(x,y,w,h,8);
  X.stroke();

  X.fillStyle='#fff';
  X.font='bold 12px -apple-system, system-ui, sans-serif';
  X.textAlign='left';
  X.textBaseline='middle';
  X.fillText(label,x+12,y+12);

  const valueText=Math.round(vv*100)+'%';
  X.fillStyle='rgba(255,255,255,0.55)';
  X.font='10px -apple-system, system-ui, sans-serif';
  X.fillText(valueText,x+12,y+28);

  const trackX=x+92, trackY=y+18, trackW=Math.max(70,w-160), trackH=6;
  X.fillStyle='rgba(255,255,255,0.08)';
  roundRect(trackX,trackY,trackW,trackH,3); X.fill();
  const fillW=Math.max(0,trackW*vv);
  if(fillW>0){
    const g=X.createLinearGradient(trackX,trackY,trackX+fillW,trackY);
    g.addColorStop(0,accent);
    g.addColorStop(1,'#ffffff');
    X.fillStyle=g;
    roundRect(trackX,trackY,fillW,trackH,3); X.fill();
  }

  const minusX=x+w-66, plusX=x+w-34, btnY=y+8, btnS=24;
  drawMiniStepButton(minusX,btnY,btnS,'−',accent,()=>onChange(clamp(vv-0.05,0,1)));
  drawMiniStepButton(plusX,btnY,btnS,'+',accent,()=>onChange(clamp(vv+0.05,0,1)));
}

function drawMiniStepButton(x,y,size,label,color,action){
  X.globalAlpha=0.85;
  X.fillStyle='rgba(20,20,35,0.9)';
  roundRect(x,y,size,size,7); X.fill();
  X.strokeStyle=color; X.lineWidth=1.4; roundRect(x,y,size,size,7); X.stroke();
  X.globalAlpha=1;
  X.fillStyle='#fff';
  X.font='bold 16px -apple-system, system-ui, sans-serif';
  X.textAlign='center'; X.textBaseline='middle';
  X.fillText(label,x+size/2,y+size/2+0.5);
  pushScrollableMenuArea(x,y,size,size,action);
}

function drawDebugMenu(){
  if(typeof window.drawOrbitaDebugMenu === 'function') return window.drawOrbitaDebugMenu();
}

function drawChangeNicknameScreen(){
  if (typeof window.drawChangeNicknameScreenModule === 'function') {
    return window.drawChangeNicknameScreenModule.apply(this, arguments);
  }
}


function drawConfirmDeleteScreen(){
  if (typeof window.drawConfirmDeleteScreenModule === 'function') {
    return window.drawConfirmDeleteScreenModule.apply(this, arguments);
  }
}


function drawDeadUI(){
  if (typeof window.drawDeadUIModule === 'function') {
    return window.drawDeadUIModule.apply(this, arguments);
  }
}
