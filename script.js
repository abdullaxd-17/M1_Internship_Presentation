/* =====================================================================
   LoRa Telemetry Defense Deck — controller
   NOTE: three.js is imported lazily inside the 3D viewer so that if the
   CDN/module fails (e.g. opened via file://), navigation still works and
   the 3D slide falls back to a static board image.
   ===================================================================== */

const slides = Array.from(document.querySelectorAll('.slide'));
const total = slides.length;
let current = 0;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const fmtTime = s => `${Math.floor(s/60)}:${pad(s%60)}`;
const slideTime = i => parseInt(slides[i].dataset.time || '60', 10);

/* ---------- core navigation ---------- */
const progressFill = document.getElementById('progressFill');
const slideCounter = document.getElementById('slideCounter');
const hudChips = Array.from(document.querySelectorAll('.hc'));
const slideLogo = document.querySelector('.slide-logo'); // CSUG mark — title slide only
const partnerStrip = document.querySelector('.partner-strip'); // partner logos — title slide only

/* transient transition classes are cleared on each move so rapid navigation
   (arrow-mashing, Home/End, overview jumps) can't strand a slide mid-animation */
let _transTimer = 0;
function clearTransient(s){ s.classList.remove('enter','from-right','from-left','exit-left','exit-right'); }

function setActive(i){
  i = Math.max(0, Math.min(total - 1, i));
  const dir = i >= current ? 'fwd' : 'back';
  const prevS = slides[current];
  const nextS = slides[i];

  clearTimeout(_transTimer);
  slides.forEach(clearTransient);

  if (prevS && prevS !== nextS){
    prevS.classList.remove('is-active');
    if (!reduceMotion) prevS.classList.add(dir === 'fwd' ? 'exit-left' : 'exit-right');
  }
  if (!reduceMotion && prevS !== nextS){
    nextS.classList.add('enter', dir === 'fwd' ? 'from-right' : 'from-left');
    void nextS.offsetWidth;                       // commit the armed off-centre, transparent pose
    nextS.classList.add('is-active');             // is-active carries the transition -> eases to centre
    nextS.classList.remove('enter', 'from-right', 'from-left');
  } else {
    nextS.classList.add('is-active');
  }
  _transTimer = setTimeout(() => slides.forEach(s => { if (!s.classList.contains('is-active')) clearTransient(s); }), 720);

  current = i;

  progressFill.style.width = ((current) / (total - 1)) * 100 + '%';
  slideCounter.textContent = `${pad(current+1)} / ${pad(total)}`;

  // footer "you are here" stage
  const stage = slides[current].dataset.stage;
  hudChips.forEach(c => c.classList.toggle('active', stage !== 'all' && c.dataset.stage === stage));

  // overview current marker
  document.querySelectorAll('.ov-card').forEach((c, idx) => c.classList.toggle('current', idx === current));
  // 3D viewers: run only the active slide's
  viewers.forEach(v => v.slideIndex === current ? v.start() : v.stop());
  if (titleGlobe){ current === 0 ? titleGlobe.start() : titleGlobe.stop(); }
  // CSUG logo: visible on the title slide only
  if (slideLogo){ slideLogo.classList.toggle('slide-logo--off', current !== 0); }
  // Partner strip: visible on the title slide only
  if (partnerStrip){ partnerStrip.classList.toggle('partner-strip--off', current !== 0); }
  // background: keep the title page as the original calm look; richer animation elsewhere
  document.body.classList.toggle('on-title', current === 0);
  if (window.setBgMode) window.setBgMode(current === 0 ? 'calm' : 'rich');
  // hide hint after first move
  if (current !== 0) helpHint.classList.add('hide');
}
function next(){ if (current < total - 1) setActive(current + 1); }
function prev(){ if (current > 0) setActive(current - 1); }

/* nav buttons */
document.getElementById('navNext').addEventListener('click', next);
document.getElementById('navPrev').addEventListener('click', prev);

/* ---------- keyboard ---------- */
window.addEventListener('keydown', e => {
  if (overview.classList.contains('open')){
    if (e.key === 'Escape' || e.key.toLowerCase() === 'o'){ toggleOverview(false); }
    return;
  }
  switch(e.key){
    case 'ArrowRight': case 'PageDown': case ' ': e.preventDefault(); next(); break;
    case 'ArrowLeft': case 'PageUp': case 'Backspace': e.preventDefault(); prev(); break;
    case 'Home': e.preventDefault(); setActive(0); break;
    case 'End': e.preventDefault(); setActive(total-1); break;
    case 'f': case 'F': toggleFullscreen(); break;
    case 'o': case 'O': toggleOverview(); break;
    case 't': case 'T': toggleTimer(); break;
    case 'Escape': break;
  }
});

/* ---------- touch swipe ---------- */
let touchX = null, touchY = null;
document.getElementById('deck').addEventListener('touchstart', e => {
  touchX = e.changedTouches[0].clientX; touchY = e.changedTouches[0].clientY;
}, {passive:true});
document.getElementById('deck').addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)){ dx < 0 ? next() : prev(); }
  touchX = touchY = null;
}, {passive:true});

/* ---------- presenter timer ---------- */
const btnTimer = document.getElementById('btnTimer');
const timerLabel = document.getElementById('timerLabel');
let timerOn = false, timerSec = 0, timerId = null;
const TIMER_TARGET = 20*60, TIMER_WARN = 18*60;   /* 20-min talk: amber at 18:00, red past 20:00 */
function paintTimer(){
  timerLabel.textContent = `${pad(Math.floor(timerSec/60))}:${pad(timerSec%60)}`;
  btnTimer.classList.toggle('near', timerSec >= TIMER_WARN && timerSec < TIMER_TARGET);
  btnTimer.classList.toggle('over', timerSec >= TIMER_TARGET);
}
function toggleTimer(){
  timerOn = !timerOn;
  btnTimer.classList.toggle('on', timerOn);
  if (timerOn){ timerId = setInterval(() => { timerSec++; paintTimer(); }, 1000); }
  else { clearInterval(timerId); }
}
btnTimer.addEventListener('click', toggleTimer);
btnTimer.addEventListener('dblclick', () => { timerSec = 0; paintTimer(); });

/* ---------- fullscreen ---------- */
function toggleFullscreen(){
  if (!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); }
  else { document.exitFullscreen?.(); }
}
document.getElementById('btnFull').addEventListener('click', toggleFullscreen);

/* ---------- overview grid ---------- */
const overview = document.getElementById('overview');
const ovGrid = document.getElementById('ovGrid');
slides.forEach((s, i) => {
  const head = s.querySelector('h1, h2');
  const kick = s.querySelector('.kicker, .eyebrow');
  const card = document.createElement('div');
  card.className = 'ov-card';
  card.innerHTML = `<span class="ov-num">${pad(i+1)}</span>
    <span class="ov-title">${(head ? head.textContent : 'Slide').slice(0,64)}</span>
    <span class="ov-kick">${kick ? kick.textContent.slice(0,40) : ''}</span>`;
  card.addEventListener('click', () => { setActive(i); toggleOverview(false); });
  ovGrid.appendChild(card);
});
function toggleOverview(force){
  const open = force !== undefined ? force : !overview.classList.contains('open');
  overview.classList.toggle('open', open);
  overview.setAttribute('aria-hidden', String(!open));
  if (open) document.querySelectorAll('.ov-card').forEach((c, idx) => c.classList.toggle('current', idx === current));
}
document.getElementById('btnGrid').addEventListener('click', () => toggleOverview());

/* ---------- help hint auto-hide ---------- */
const helpHint = document.getElementById('helpHint');
setTimeout(() => helpHint.classList.add('hide'), 6500);

/* =====================================================================
   Animated background — drifting node constellation with telemetry
   pulses flowing along the links. 'calm' on the title, 'rich' elsewhere.
   ===================================================================== */
let bgMode = 'rich';
window.setBgMode = m => { bgMode = m; };

/* ---------- interactive ambient background: orbital telemetry ground-station ----------
   Replaces the old drifting node field ("balls"). Layered, thematic, interactive:
     • parallax starfield (reacts to pointer)
     • a ground-station radar — rotating sweep, range rings, periodic ping pulses
     • an orbiting satellite that streams telemetry packets down a live downlink
     • tap / click emits a "ping" ripple
   Honors prefers-reduced-motion (one calm static frame, no loop).                          */
(function ambient(){
  const cv = document.getElementById('bg-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const TAU = Math.PI * 2;
  const rnd = (a,b) => a + Math.random()*(b-a);
  const clamp = (v,a,b) => v<a?a:(v>b?b:v);

  // palette — mirrors the deck CSS custom properties (kept in sync with THEME v6)
  const C = { cyan:'67,236,242', blue:'90,146,255', rf:'195,155,255', pwr:'255,180,81', star:'212,228,255' };

  let w=0, h=0;
  const t0 = performance.now();
  let stars=[], ripples=[], packets=[];
  const origin = {x:0, y:0};
  const orbit  = {cx:0, cy:0, rx:0, ry:0, tilt:-0.30};
  const sat    = {ang:rnd(0,TAU), spd:0.0024};
  let sweep = rnd(0,TAU);
  let lastPing = -9999, lastPacket = -9999, rafId = 0;
  const ptr = {tx:0.5, ty:0.5, x:0.5, y:0.5, active:false};

  function build(){
    w = window.innerWidth; h = window.innerHeight;
    cv.width = Math.round(w*DPR); cv.height = Math.round(h*DPR);
    cv.style.width = w+'px'; cv.style.height = h+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    origin.x = w*0.15;  origin.y = h*0.88;                 // ground station, lower-left
    orbit.cx = w*0.605; orbit.cy = h*0.40;
    orbit.rx = clamp(w*0.40, 280, 780);
    orbit.ry = clamp(h*0.285, 120, 320);
    const area = w*h;
    const counts = [Math.min(64, area/27000|0), Math.min(50, area/42000|0), Math.min(32, area/70000|0)];
    stars = [];
    counts.forEach((n,layer)=>{
      const z = layer+1;                                   // 1 near .. 3 far
      for (let i=0;i<n;i++) stars.push({
        bx:Math.random(), by:Math.random(), z,
        r: layer===0?rnd(0.9,1.8):(layer===1?rnd(0.6,1.2):rnd(0.4,0.85)),
        a: rnd(0.30,0.95), tw:rnd(0,TAU), tws:rnd(0.5,1.7), dx:rnd(-1,1)*0.003/z
      });
    });
  }

  function ping(nx,ny,hue){
    ripples.push({x:nx, y:ny, r:0, max:Math.max(w,h)*rnd(0.30,0.46), a:0.55, sw:rnd(2.0,3.2), hue:hue||'cyan'});
    if (ripples.length>7) ripples.shift();
  }

  window.addEventListener('pointermove', e=>{ ptr.tx=e.clientX/innerWidth; ptr.ty=e.clientY/innerHeight; ptr.active=true; }, {passive:true});
  window.addEventListener('pointerleave', ()=>{ ptr.active=false; }, {passive:true});
  window.addEventListener('pointerdown', e=>{ ping(e.clientX, e.clientY, Math.random()<0.5?'cyan':'rf'); }, {passive:true});

  function satPos(ang){                                     // position on the tilted ellipse
    const ex = Math.cos(ang)*orbit.rx, ey = Math.sin(ang)*orbit.ry;
    const ct = Math.cos(orbit.tilt), st = Math.sin(orbit.tilt);
    return { x: orbit.cx + ex*ct - ey*st, y: orbit.cy + ex*st + ey*ct };
  }

  function render(now){
    const t = now - t0;
    const calm = document.body.classList.contains('on-title');
    const I = calm ? 0.6 : 1;                               // intensity
    ptr.x += (ptr.tx-ptr.x)*0.05; ptr.y += (ptr.ty-ptr.y)*0.05;
    const px = (ptr.x-0.5), py = (ptr.y-0.5);

    ctx.clearRect(0,0,w,h);

    /* ---- parallax starfield ---- */
    for (const s of stars){
      const par = 30/s.z;
      let x = s.bx*w - px*par + (t*s.dx);
      let y = s.by*h - py*(par*0.8);
      x = ((x%w)+w)%w; y = ((y%h)+h)%h;
      const tw = 0.62 + 0.38*Math.sin(t*0.001*s.tws + s.tw);
      ctx.globalAlpha = s.a*tw*I*(s.z===1?1:(s.z===2?0.82:0.62));
      ctx.fillStyle = 'rgb('+C.star+')';
      ctx.beginPath(); ctx.arc(x,y,s.r,0,TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const ox = origin.x - px*16, oy = origin.y - py*12;     // ground station w/ slight parallax
    const Rmax = Math.hypot(w,h)*0.5, R = Rmax*0.62;

    /* ---- range rings ---- */
    ctx.lineWidth = 1;
    for (let k=1;k<=4;k++){
      ctx.strokeStyle = 'rgba('+C.cyan+','+(0.055*I)+')';
      ctx.beginPath(); ctx.arc(ox,oy,R*(k/4),0,TAU); ctx.stroke();
    }

    /* ---- radar sweep (fanned, fading trail) ---- */
    sweep += (calm?0.004:0.006);
    const fan = 16, span = 0.5;
    for (let i=0;i<fan;i++){
      const a = sweep - (i/fan)*span;
      ctx.strokeStyle = 'rgba('+C.cyan+','+((1-i/fan)*0.16*I)+')';
      ctx.lineWidth = i===0?1.6:1;
      ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox+Math.cos(a)*R, oy+Math.sin(a)*R); ctx.stroke();
    }
    // ground-station marker + glow
    const gg = ctx.createRadialGradient(ox,oy,0,ox,oy,16);
    gg.addColorStop(0,'rgba('+C.cyan+','+(0.35*I)+')'); gg.addColorStop(1,'rgba('+C.cyan+',0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(ox,oy,16,0,TAU); ctx.fill();
    ctx.fillStyle = 'rgba('+C.cyan+','+(0.9*I)+')'; ctx.beginPath(); ctx.arc(ox,oy,2.6,0,TAU); ctx.fill();
    if (t - lastPing > (calm?5200:3600)){ lastPing = t; ping(ox,oy,'cyan'); }

    /* ---- orbit path + satellite ---- */
    ctx.save();
    ctx.translate(orbit.cx - px*22, orbit.cy - py*16); ctx.rotate(orbit.tilt);
    ctx.setLineDash([3,7]); ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba('+C.rf+','+(0.22*I)+')';
    ctx.beginPath(); ctx.ellipse(0,0,orbit.rx,orbit.ry,0,0,TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();

    sat.ang += (calm?0.0016:sat.spd);
    const sp = satPos(sat.ang); sp.x -= px*22; sp.y -= py*16;
    const sg = ctx.createRadialGradient(sp.x,sp.y,0,sp.x,sp.y,13);
    sg.addColorStop(0,'rgba('+C.pwr+','+(0.9*I)+')'); sg.addColorStop(1,'rgba('+C.pwr+',0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sp.x,sp.y,13,0,TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,206,'+I+')'; ctx.beginPath(); ctx.arc(sp.x,sp.y,2.4,0,TAU); ctx.fill();

    /* ---- downlink: satellite -> ground station, streaming telemetry packets ---- */
    const dist = Math.hypot(sp.x-ox, sp.y-oy);
    const linkOn = sp.y < oy - 30 && dist < R*1.25;
    if (linkOn){
      ctx.strokeStyle = 'rgba('+C.cyan+','+(0.12*I)+')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sp.x,sp.y); ctx.lineTo(ox,oy); ctx.stroke();
      if (t - lastPacket > (calm?1600:1000)){ lastPacket = t; packets.push({p:0, sx:sp.x, sy:sp.y}); }
    }
    for (let i=packets.length-1;i>=0;i--){
      const pk = packets[i]; pk.p += 0.02;
      if (pk.p>=1){ packets.splice(i,1); continue; }
      const x  = pk.sx + (ox-pk.sx)*pk.p,               y  = pk.sy + (oy-pk.sy)*pk.p;
      const q  = Math.max(0,pk.p-0.05);
      const x2 = pk.sx + (ox-pk.sx)*q,                  y2 = pk.sy + (oy-pk.sy)*q;
      const a  = Math.sin(pk.p*Math.PI)*0.95*I;
      ctx.strokeStyle = 'rgba('+C.cyan+','+(a*0.5)+')'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x,y); ctx.stroke();
      ctx.fillStyle = 'rgba('+C.cyan+','+a+')';
      ctx.beginPath(); ctx.arc(x,y,2.0,0,TAU); ctx.fill();
    }

    /* ---- pointer-proximity constellation (interactive network feel) ---- */
    if (ptr.active && !calm){
      const cx = ptr.x*w, cy = ptr.y*h, RAD=150, RAD2=RAD*RAD;
      for (const s of stars){
        if (s.z!==1) continue;
        const sx = ((s.bx*w - px*30 + (t*s.dx))%w+w)%w, sy = ((s.by*h - py*24)%h+h)%h;
        const dx=sx-cx, dy=sy-cy, d2=dx*dx+dy*dy;
        if (d2<RAD2){
          const f = 1 - Math.sqrt(d2)/RAD;
          ctx.strokeStyle = 'rgba('+C.cyan+','+(f*0.26)+')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(sx,sy); ctx.stroke();
          ctx.fillStyle = 'rgba('+C.cyan+','+(f*0.8)+')';
          ctx.beginPath(); ctx.arc(sx,sy,1.6,0,TAU); ctx.fill();
        }
      }
    }

    /* ---- ripples / pings ---- */
    for (let i=ripples.length-1;i>=0;i--){
      const r = ripples[i]; r.r += r.sw; r.a *= 0.975;
      if (r.r>r.max || r.a<0.02){ ripples.splice(i,1); continue; }
      ctx.strokeStyle = 'rgba('+(r.hue==='rf'?C.rf:C.cyan)+','+r.a+')'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,TAU); ctx.stroke();
    }

    rafId = requestAnimationFrame(render);
  }

  build();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    sweep = -0.6; sat.ang = -0.9;          // pleasant static composition
    render(performance.now());             // draw exactly one frame...
    cancelAnimationFrame(rafId);           // ...then stop the loop it queued
  } else {
    rafId = requestAnimationFrame(render);
  }
  let rt; window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(build,200); });
})();

/* =====================================================================
   Live GUI mock (slide 10) — clock, packet counter, jittering telemetry
   ===================================================================== */
(function liveGui(){
  const clock = document.getElementById('guiClock');
  const gT1 = document.getElementById('gT1');
  const gRSSI = document.getElementById('gRSSI');
  const gSNR = document.getElementById('gSNR');
  const gPkt = document.getElementById('gPkt');
  const log = document.getElementById('guiLog');
  if (!clock) return;
  let pkt = 1284, temp = 25.75;
  setInterval(() => {
    const now = new Date();
    clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }, 1000);
  setInterval(() => {
    pkt += 1;
    temp += (Math.random()-0.5)*0.4; temp = Math.max(24.2, Math.min(27.4, temp));
    const rssi = -70 - Math.floor(Math.random()*9);
    const snr = (8 + Math.random()*2.2).toFixed(1);
    gT1.textContent = temp.toFixed(2);
    gRSSI.textContent = rssi;
    gSNR.textContent = snr;
    gPkt.textContent = pkt;
    const line = document.createElement('div');
    line.textContent = `T1:${temp.toFixed(2)},T2:0.00`;
    log.appendChild(line);
    while (log.children.length > 4) log.removeChild(log.firstChild);
  }, 2200);
})();

/* =====================================================================
   3D board viewers (Three.js, lazy import + graceful fallback)
   ===================================================================== */
const viewers = [];

/* base64 string -> ArrayBuffer, so GLTFLoader.parse() needs no network fetch */
function b64ToArrayBuffer(b64){
  const bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/* a tiny studio environment so metallic PCB pads reflect light instead of going black */
function makeStudioEnv(renderer){
  try{
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const surround = new THREE.Mesh(
      new THREE.SphereGeometry(60, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x1a2742, side: THREE.BackSide })
    );
    envScene.add(surround);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshBasicMaterial({ color: 0xbad2ff })
    );
    panel.position.set(0, 48, 6); panel.lookAt(0, 0, 0);
    envScene.add(panel);
    return pmrem.fromScene(envScene, 0.04).texture;
  }catch(_e){ return null; }
}

class Board3DViewer{
  constructor(el){
    this.el = el;
    this.slideIndex = slides.findIndex(s => s.contains(el));
    this.modelKey = el.dataset.modelKey;
    // Optional: stack several embedded boards into one mated assembly, e.g. data-compose="eps,pcb"
    this.composeKeys = el.dataset.compose ? el.dataset.compose.split(',').map(s => s.trim()).filter(Boolean) : null;
    this.started = false; this.failed = false; this.raf = null;
  }
  init(){
    if (this.started || this.failed) return;
    this.started = true;

    const needKeys = this.composeKeys || [this.modelKey];
    if (typeof THREE === 'undefined' || !THREE.GLTFLoader || !THREE.OrbitControls ||
        !window.MODELS || !needKeys.every(k => k && window.MODELS[k])){
      console.warn('three.js or model data unavailable — showing static board image');
      this.failed = true; this.el.classList.add('failed'); return;
    }

    let renderer;
    try{
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, logarithmicDepthBuffer:true });
    }catch(err){
      console.warn('WebGL unavailable — showing static board image', err);
      this.failed = true; this.el.classList.add('failed'); return;
    }

    const W0 = this.el.clientWidth || 600, H0 = this.el.clientHeight || 380;
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W0 / H0, 0.1, 9000);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(W0, H0);
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x0a1020, 1.0));
    const key  = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1, 1.4, 1.2);   scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fb6ff, 1.0); fill.position.set(-1.2, 0.5, -0.9); scene.add(fill);
    const rim  = new THREE.DirectionalLight(0x66e0ea, 0.8); rim.position.set(0, -1, 0.6);      scene.add(rim);
    const env = makeStudioEnv(renderer);
    if (env) scene.environment = env;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.07;
    controls.autoRotate = !reduceMotion; controls.autoRotateSpeed = 1.0;
    controls.enablePan = false;

    const frameCamera = (maxDim) => {
      const dist = maxDim * 1.9;
      camera.position.set(dist * 0.55, dist * 0.45, dist * 0.85);
      camera.lookAt(0, 0, 0);
      camera.near = Math.max(0.01, maxDim * 0.02);
      camera.far  = maxDim * 12;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.minDistance = maxDim * 0.75;
      controls.maxDistance = maxDim * 4.5;
      controls.update();
    };
    const parseScene = (key) => new Promise((res, rej) => {
      try { new THREE.GLTFLoader().parse(b64ToArrayBuffer(window.MODELS[key]), '', g => res(g.scene), e => rej(e)); }
      catch (e) { rej(e); }
    });

    if (this.composeKeys){
      // Build a real mated PC/104 stack: board[0] on the bottom, each next board mated on top at the
      // standard 15.24 mm board pitch, so the stacking connectors engage and the boards look fixed.
      Promise.all(this.composeKeys.map(parseScene)).then((models) => {
        const pivot = new THREE.Group();
        const PITCH = 15.24;                              // PC/104 board-to-board spacing (mm)
        models.forEach((m, i) => {
          const box = new THREE.Box3().setFromObject(m);
          const ctr = box.getCenter(new THREE.Vector3());
          m.position.x -= ctr.x;                          // centre footprint in X
          m.position.y -= ctr.y;                          // centre footprint in Y
          m.position.z += (i * PITCH - ctr.z);            // seat each board's substrate at its stack level
          pivot.add(m);
        });
        const cbox = new THREE.Box3().setFromObject(pivot);
        const csize = cbox.getSize(new THREE.Vector3());
        pivot.position.sub(cbox.getCenter(new THREE.Vector3()));  // recentre whole stack
        const holder = new THREE.Group();
        holder.add(pivot);
        holder.rotation.x = -Math.PI * 0.16;              // tilt toward viewer
        scene.add(holder);
        frameCamera(Math.max(csize.x, csize.y, csize.z) || 100);
        this.el.classList.add('loaded');
      }).catch((err) => {
        console.warn('composite assembly build failed', err);
        this.failed = true; this.el.classList.add('failed');
      });
    } else {
      parseScene(this.modelKey).then((model) => {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        model.position.sub(box.getCenter(new THREE.Vector3()));   // recenter at origin
        const pivot = new THREE.Group();
        pivot.add(model);
        pivot.rotation.x = -Math.PI * 0.16;               // tilt board toward viewer
        scene.add(pivot);
        frameCamera(Math.max(size.x, size.y, size.z) || 100);
        this.el.classList.add('loaded');                  // hides fallback image
      }).catch((err) => {
        console.warn('GLB parse failed', this.modelKey, err);
        this.failed = true; this.el.classList.add('failed');
      });
    }

    this.scene = scene; this.camera = camera; this.renderer = renderer; this.controls = controls;

    this.ro = new ResizeObserver(() => {
      if (!this.renderer) return;
      const w = this.el.clientWidth, h = this.el.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.ro.observe(this.el);

    this._loop = () => {
      this.raf = requestAnimationFrame(this._loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
  }
  start(){
    if (this.failed) return;
    if (!this.started) this.init();
    if (this.failed || !this.renderer || this.raf) return;
    this._loop();
  }
  stop(){
    if (this.raf){ cancelAnimationFrame(this.raf); this.raf = null; }
  }
}

/* =====================================================================
   Title slide — rotating Earth + CubeSat downlink (global THREE r128)
   ===================================================================== */
class TitleGlobe{
  constructor(el){ this.el = el; this.started = false; this.failed = false; this.raf = null; this.a = 0.6; }
  init(){
    if (this.started || this.failed) return;
    this.started = true;
    if (typeof THREE === 'undefined'){ this.failed = true; return; }

    let renderer;
    try{ renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true }); }
    catch(err){ console.warn('WebGL unavailable — CSS globe fallback', err); this.failed = true; return; }
    this.renderer = renderer;

    const W = this.el.clientWidth || 480, H = this.el.clientHeight || 480;
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0.22, 3.45); camera.lookAt(0, 0, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(W, H);
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    this.el.appendChild(renderer.domElement);
    this.scene = scene; this.camera = camera;

    scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a1424, 0.45));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.7); sun.position.set(3, 1.4, 2.2); scene.add(sun);
    const cyan = new THREE.PointLight(0x34e0ea, 0.35, 14); cyan.position.set(-2.4, -0.4, 2.8); scene.add(cyan);

    // ---- Earth (real NASA Blue Marble texture) ----
    const earth = new THREE.Group(); const R = 1;
    const texLoader = new THREE.TextureLoader();
    const haveTex = (typeof window.EARTH !== 'undefined');
    const colorMat = new THREE.MeshPhongMaterial({ color: 0x2a4a78, emissive: 0x0a1426, emissiveIntensity: 0.08, shininess: 12, specular: 0x222a33 });
    if (haveTex){
      const cmap = texLoader.load(window.EARTH.color); if ('encoding' in cmap) cmap.encoding = THREE.sRGBEncoding;
      colorMat.map = cmap; colorMat.color.setHex(0xffffff);
      const smap = texLoader.load(window.EARTH.spec); colorMat.specularMap = smap; colorMat.specular.setHex(0x556677); colorMat.shininess = 18;
      colorMat.needsUpdate = true;
    }
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), colorMat));
    if (haveTex){
      const cl = texLoader.load(window.EARTH.clouds);
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 64, 64),
        new THREE.MeshPhongMaterial({ color: 0xffffff, alphaMap: cl, transparent: true, opacity: 0.9, depthWrite: false }));
      earth.add(clouds); this.clouds = clouds;
    }
    earth.rotation.z = 0.41;                        // axial tilt
    scene.add(earth); this.earth = earth;

    // atmosphere halo
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.08, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x3b82d6, transparent: true, opacity: 0.12, side: THREE.BackSide })
    ));

    // ---- Satellite ----
    const sat = new THREE.Group();
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xc4cdd9, metalness: 0.65, roughness: 0.38 })));
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x16335c, metalness: 0.5, roughness: 0.5, emissive: 0x0a2350, emissiveIntensity: 0.5 });
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.008, 0.11), panelMat); pL.position.x = -0.235; sat.add(pL);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.008, 0.11), panelMat); pR.position.x =  0.235; sat.add(pR);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0xe8eef6, metalness: 0.4, roughness: 0.5 }));
    dish.rotation.x = Math.PI / 2; dish.position.z = 0.10; sat.add(dish);
    sat.scale.setScalar(0.38);
    scene.add(sat); this.sat = sat;

    // ---- downlink beam + data packets ----
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    scene.add(new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0x34e0ea, transparent: true, opacity: 0.5 })));
    this.beamGeo = beamGeo;
    this.packets = [];
    for (let i = 0; i < 4; i++){
      const pk = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x9af0ff, transparent: true }));
      pk.userData.t = i / 4; scene.add(pk); this.packets.push(pk);
    }
    this.impact = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x34e0ea, transparent: true, opacity: 0.85 }));
    scene.add(this.impact);

    this.orbitR = 1.10; this.incline = 0.40;
    this._sp = new THREE.Vector3(); this._gp = new THREE.Vector3(); this._v = new THREE.Vector3();

    this.el.classList.add('loaded');               // hide CSS fallback

    this.ro = new ResizeObserver(() => {
      if (!this.renderer) return;
      const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h);
    });
    this.ro.observe(this.el);

    const m = reduceMotion ? 0.12 : 1;
    this._tick = () => {
      this.earth.rotation.y += 0.0016 * m;
      if (this.clouds) this.clouds.rotation.y += 0.0010 * m;
      this.a += 0.0052 * m;
      const sp = this._sp.set(
        Math.cos(this.a) * this.orbitR,
        Math.sin(this.a) * this.orbitR * Math.sin(this.incline) + 0.12,
        Math.sin(this.a) * this.orbitR * Math.cos(this.incline)
      );
      this.sat.position.copy(sp); this.sat.lookAt(0, 0, 0);
      const gp = this._gp.copy(sp).normalize().multiplyScalar(1.005);
      const a = this.beamGeo.attributes.position.array;
      a[0]=sp.x; a[1]=sp.y; a[2]=sp.z; a[3]=gp.x; a[4]=gp.y; a[5]=gp.z;
      this.beamGeo.attributes.position.needsUpdate = true;
      this.packets.forEach(pk => {
        pk.userData.t += 0.013 * m; if (pk.userData.t > 1) pk.userData.t -= 1;
        this._v.lerpVectors(sp, gp, pk.userData.t); pk.position.copy(this._v);
        pk.material.opacity = Math.max(0.15, 1 - Math.abs(pk.userData.t - 0.5) * 1.2);
      });
      this.impact.position.copy(gp);
      this.impact.scale.setScalar(Math.max(0.5, 1 + 0.45 * Math.sin(this.a * 6)));
      this.impact.material.opacity = 0.5 + 0.35 * Math.abs(Math.sin(this.a * 6));
    };
    this._loop = () => {
      this._tick();
      this.renderer.render(this.scene, this.camera);
      if (!reduceMotion) this.raf = requestAnimationFrame(this._loop);
    };
  }
  start(){
    if (this.failed) return;
    if (!this.started) this.init();
    if (this.failed || !this.renderer || this.raf) return;
    this._loop();
  }
  stop(){ if (this.raf){ cancelAnimationFrame(this.raf); this.raf = null; } }
}

let titleGlobe = null;
document.querySelectorAll('.viewer').forEach(el => viewers.push(new Board3DViewer(el)));
(function(){ var el = document.getElementById('titleGlobe'); if (el) titleGlobe = new TitleGlobe(el); })();

/* =====================================================================
   GUI demo video — prefers a local MP4 and falls back to an in-slide
   YouTube embed, keeping the demonstration inside the presentation window.
   ===================================================================== */
(function demoVideo(){
  const video = document.getElementById('demoVideo');
  const missing = document.getElementById('dvVideoMissing');
  const ytWrap = document.getElementById('dvYoutubeFallback');
  const yt = document.getElementById('ytFallbackFrame');
  if (!video) return;
  function showYoutubeFallback(){
    if (missing) missing.classList.remove('show');
    if (ytWrap && yt){
      if (!yt.src) yt.src = yt.dataset.src;
      ytWrap.classList.add('show');
      ytWrap.setAttribute('aria-hidden', 'false');
    } else if (missing){
      missing.classList.add('show');
    }
  }
  function hideFallback(){
    if (missing) missing.classList.remove('show');
    if (ytWrap){
      ytWrap.classList.remove('show');
      ytWrap.setAttribute('aria-hidden', 'true');
    }
  }
  video.addEventListener('loadedmetadata', hideFallback);
  video.addEventListener('canplay', hideFallback);
  video.addEventListener('error', showYoutubeFallback);
  setTimeout(() => {
    if (!video.readyState || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) showYoutubeFallback();
  }, 900);
})();

/* Click-to-enlarge static flowchart / diagram images */
(function imageLightbox(){
  const box = document.getElementById('imgLightbox');
  const img = document.getElementById('lbImg');
  const title = document.getElementById('lbTitle');
  const closeBtn = document.getElementById('lbClose');
  if (!box || !img || !title) return;
  function openFrom(el){
    img.src = el.currentSrc || el.src;
    img.alt = el.alt || 'Enlarged diagram';
    title.textContent = el.dataset.zoomTitle || el.alt || 'Diagram';
    box.classList.add('open');
    box.setAttribute('aria-hidden','false');
  }
  function close(){
    box.classList.remove('open');
    box.setAttribute('aria-hidden','true');
    setTimeout(() => { if (!box.classList.contains('open')) img.removeAttribute('src'); }, 250);
  }
  document.querySelectorAll('.zoomable-img').forEach(el => {
    el.setAttribute('tabindex','0');
    el.setAttribute('role','button');
    el.addEventListener('click', () => openFrom(el));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openFrom(el); } });
  });
  closeBtn?.addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
})();

/* =====================================================================
   boot
   ===================================================================== */
paintTimer();
setActive(0);

/* Pre-build the 3D board models during idle time (parse happens off the
   critical path) so navigating to the 3D slide is instant. Rendering only
   runs while that slide is active (handled by start()/stop()). */
(function warmUp3D(){
  var warm = function(){ viewers.forEach(function(v){ try{ v.init(); }catch(e){} }); if (titleGlobe){ try{ titleGlobe.init(); }catch(e){} } };
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 2500 });
  else setTimeout(warm, 1200);
})();


/* Subtle interactive parallax for a more polished live background */
(function bgParallax(){
  const glow = document.querySelector('.bg-glow');
  const grid = document.querySelector('.bg-grid');
  const aura = document.querySelector('.bg-aura');
  const scene = document.querySelector('.bg-scene');
  if (!glow || !grid || !aura || !scene) return;
  let tx = 0, ty = 0, x = 0, y = 0;
  window.addEventListener('mousemove', e => {
    tx = (e.clientX / window.innerWidth - 0.5) * 28;
    ty = (e.clientY / window.innerHeight - 0.5) * 22;
  }, { passive:true });
  function tick(){
    x += (tx - x) * 0.06;
    y += (ty - y) * 0.06;
    glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    aura.style.transform = `translate3d(${x * -0.55}px, ${y * -0.55}px, 0)`;
    grid.style.transform = `translate3d(${x * 0.18}px, ${y * 0.18}px, 0)`;
    scene.style.transform = `translate3d(${x * 0.10}px, ${y * 0.10}px, 0) scale(1.01)`;
    requestAnimationFrame(tick);
  }
  tick();
})();

/* =====================================================================
   Animated Callendar–Van Dusen conversion (STM32 slide) — drives a live
   needle gauge + readouts straight from R = R0(1 + A·T), the PT100 model.
   ===================================================================== */
(function cvdConvert(){
  const needle = document.getElementById('cvdNeedle');
  const tEl   = document.getElementById('cvdT');
  const rEl   = document.getElementById('cvdR');
  const fill  = document.getElementById('cvdFill');
  const frame = document.getElementById('cvdFrame');
  if (!needle || !tEl || !rEl || !fill || !frame) return;

  const A = 3.9083e-3, R0 = 100;        // PT100 standard coefficient
  const Tmin = -10, Tmax = 90;          // gauge sweep range (°C)
  const Rmin = R0*(1 + A*Tmin), Rmax = R0*(1 + A*Tmax);
  const cvdSlide = needle.closest('.slide');

  function render(T){
    const R   = R0*(1 + A*T);                                  // forward CVD
    const ang = -90 + ((T - Tmin)/(Tmax - Tmin))*180;          // -90°..+90°
    needle.setAttribute('transform', `rotate(${ang.toFixed(1)} 100 98)`);
    tEl.textContent = `${T.toFixed(1)}\u2009°C`;
    rEl.textContent = `${R.toFixed(2)} Ω`;
    fill.style.width = `${(((R - Rmin)/(Rmax - Rmin))*100).toFixed(1)}%`;
    frame.textContent = `T1:${T.toFixed(2)}`;
  }

  if (reduceMotion){ render(25); return; }   // static, readable when motion is reduced

  let start = null;
  function loop(ts){
    requestAnimationFrame(loop);
    if (cvdSlide && !cvdSlide.classList.contains('is-active')) return; // only when on screen
    if (start === null) start = ts;
    const p = (Math.sin((ts - start)/4200 - Math.PI/2) + 1) / 2;  // eased 0..1 ping-pong
    render(Tmin + p*(Tmax - Tmin));
  }
  requestAnimationFrame(loop);
})();

/* =====================================================================
   Fit-to-viewport scaler — keeps every slide fully visible at ANY screen
   size / aspect / fullscreen / projector. Wraps each slide's content in a
   .slide-stage and scales it down (never up) when it would overflow, so
   nothing is ever clipped. Re-runs on resize, fullscreen change, font load,
   and whenever the active slide changes.
   ===================================================================== */
/* =====================================================================
   Uniform canvas scaler — the deck is authored at a FIXED 1440x810 (16:9)
   stage; this scales the WHOLE stage up or down to fit any screen while
   preserving the EXACT layout, so every slide looks identical (just bigger
   or smaller) on a laptop, projector, external monitor or TV. The ambient
   background fills any letterbox area when the screen isn't 16:9.
   ===================================================================== */
(function deckScale(){
  const deck = document.getElementById('deck');
  if (!deck) return;
  const BASE_W = 1440, BASE_H = 810;
  function apply(){
    const s = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
    deck.style.setProperty('--fit', (s > 0 && isFinite(s) ? s : 1).toFixed(4));
  }
  apply();
  let r = 0;
  const onResize = () => { cancelAnimationFrame(r); r = requestAnimationFrame(apply); };
  window.addEventListener('resize', onResize, {passive:true});
  window.addEventListener('orientationchange', () => setTimeout(apply, 80));
  document.addEventListener('fullscreenchange',       () => setTimeout(apply, 60));
  document.addEventListener('webkitfullscreenchange', () => setTimeout(apply, 60));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
  window.addEventListener('load', apply);
})();

(function slideFit(){
  const slides = [...document.querySelectorAll('.slide')];
  if (!slides.length) return;

  // 1) wrap each slide's children in a single scalable stage
  slides.forEach(s => {
    if (s.querySelector(':scope > .slide-stage')) return;
    const stage = document.createElement('div');
    stage.className = 'slide-stage';
    while (s.firstChild) stage.appendChild(s.firstChild);
    s.appendChild(stage);
  });

  const clampK = k => (!isFinite(k) || k <= 0) ? 1 : Math.max(0.46, Math.min(1, k));
  function fit(slide){
    const stage = slide.querySelector(':scope > .slide-stage');
    if (!stage) return;
    const cs = getComputedStyle(slide);
    const padH = parseFloat(cs.paddingTop)  + parseFloat(cs.paddingBottom);
    const padW = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const availH = slide.clientHeight - padH;
    const availW = slide.clientWidth  - padW;
    if (availH <= 0 || availW <= 0) return;
    // Measure natural content size in LAYOUT units (scrollHeight/scrollWidth are
    // immune to CSS transforms — both the stage's own scale below AND the deck's
    // outer canvas scale). Because the slide is a FIXED 1440x810 box, availW/availH
    // are constant, so this safety-shrink is deterministic: a dense slide gets the
    // exact same scale on a laptop, projector, monitor or TV. Nothing ever clips.
    stage.style.transform = 'none';
    const natH = stage.scrollHeight;
    const natW = stage.scrollWidth;
    if (!(natH > 0) || !(natW > 0)) return;
    // only shrink when the slide genuinely overflows the fixed canvas; slides that
    // already fit get NO transform at all (crisp, glitch-free paint).
    const kRaw = Math.min(availH / natH, availW / natW);
    const k = kRaw >= 0.999 ? 1 : clampK(kRaw * 0.992);   // tiny margin only when scaling
    stage.style.transform = k < 0.999 ? 'scale(' + k.toFixed(4) + ')' : 'none';
  }
  function fitActive(){
    const a = document.querySelector('.slide.is-active');
    if (a) fit(a);
  }

  let raf = 0, t1 = 0, t2 = 0;
  const schedule = () => {
    cancelAnimationFrame(raf); raf = requestAnimationFrame(fitActive);
    clearTimeout(t1); clearTimeout(t2);
    t1 = setTimeout(fitActive, 180);   // catch content that sizes after activation (3D viewers etc.)
    t2 = setTimeout(fitActive, 460);
  };

  window.addEventListener('resize', schedule, {passive:true});
  document.addEventListener('fullscreenchange',       () => setTimeout(fitActive, 60));
  document.addEventListener('webkitfullscreenchange', () => setTimeout(fitActive, 60));

  // re-fit whenever a slide's class flips to/from is-active
  const mo = new MutationObserver(muts => {
    for (const m of muts){ if (m.attributeName === 'class'){ schedule(); break; } }
  });
  slides.forEach(s => mo.observe(s, {attributes:true, attributeFilter:['class']}));

  // re-fit whenever a stage's content actually changes size (3D viewers, images,
  // fonts, live widgets that settle after activation). Transforms don't change the
  // observed border-box, so scaling here never re-triggers the observer.
  if (window.ResizeObserver){
    const ro = new ResizeObserver(() => schedule());
    slides.forEach(s => { const st = s.querySelector(':scope > .slide-stage'); if (st) ro.observe(st); });
  }

  fitActive();
  setTimeout(fitActive, 120);
  setTimeout(fitActive, 500);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitActive);
  window.fitActiveSlide = fitActive;                // exposed for manual re-fit
})();

/* ===== Packet journey animation — self-running "follow one measurement" ===== */
(function packetJourney(){
  const pj = document.getElementById('pj');
  if(!pj) return;
  const screen = document.getElementById('pjScreen');
  const cards  = Array.prototype.slice.call(screen.querySelectorAll('.pj-card'));
  const label  = document.getElementById('pjLabel');
  const sub    = document.getElementById('pjSub');
  const fill   = document.getElementById('pjFill');
  const puck   = document.getElementById('pjPuck');
  const stops  = Array.prototype.slice.call(document.querySelectorAll('#pjStops .pj-stop'));
  const chirp  = document.getElementById('pjChirpPath');
  const ghost  = document.getElementById('pjChirpGhost');
  const pktEl  = document.getElementById('pjdP');

  function chirpD(){
    const W=640,H=150,mid=H/2,amp=48,f0=2,f1=15; let d='';
    for(let i=0;i<=W;i++){ const t=i/W; const ph=2*Math.PI*(f0*t + (f1-f0)*t*t/2); const y=mid+amp*Math.sin(ph); d+=(i===0?'M':'L')+i+' '+y.toFixed(1)+' '; }
    return d;
  }
  const d = chirpD();
  if(chirp) chirp.setAttribute('d', d);
  if(ghost) ghost.setAttribute('d', d);

  const phases = [
    {label:'PT100 RTD · sensing',        sub:"A platinum RTD's resistance rises with temperature.",                     card:0, stop:0, dur:2400},
    {label:'STM32 · conversion',         sub:'Callendar–Van Dusen solves the resistance for degrees Celsius.',          card:1, stop:1, dur:2600},
    {label:'UART · framing',             sub:'Packed into an ASCII telemetry frame — 115200 8N1.',                      card:2, stop:2, dur:2400, chk:2},
    {label:'Heltec · LoRa modulation',   sub:'The frame becomes an 868 MHz chirp-spread-spectrum burst.',               card:3, stop:3, dur:3000, chk:3},
    {label:'Receiver · demodulation',    sub:'Demodulated back to the exact same bytes — nothing lost in the air.',     card:4, stop:4, dur:2400, chk:4},
    {label:'GUI · live telemetry',       sub:'The identical payload becomes a live reading on the dashboard.',          card:5, stop:5, dur:2900, chk:5},
  ];

  let idx=-1, t0=0, pkt=1284, wasActive=false;
  function isActive(){ const s=pj.closest('.slide'); return !!(s && s.classList.contains('is-active')); }
  function clearChecks(){ stops.forEach(function(s){ const c=s.querySelector('.pj-chk'); if(c) c.classList.remove('lit'); }); }

  function setPhase(i){
    const p=phases[i];
    if(label) label.textContent=p.label;
    if(sub) sub.textContent=p.sub;
    cards.forEach(function(c){ c.classList.toggle('on', String(p.card)===c.getAttribute('data-p')); });
    stops.forEach(function(s,si){ s.classList.toggle('active', si===p.stop); s.classList.toggle('done', si<p.stop); });
    const frac = p.stop/(stops.length-1);
    if(fill) fill.style.width=(frac*100)+'%';
    if(puck){ puck.style.left=(frac*100)+'%'; puck.style.background = p.stop>=3 ? 'var(--rf)' : 'var(--cyan)'; puck.style.boxShadow = '0 0 16px '+(p.stop>=3?'var(--rf)':'var(--cyan)'); }
    if(p.chk!=null){ const c=stops[p.chk].querySelector('.pj-chk'); if(c) c.classList.add('lit'); }
    if(p.card===3 && chirp){ chirp.style.animation='none'; void chirp.getBBox(); chirp.style.animation=''; }
    if(p.card===5 && pktEl){ pkt++; pktEl.textContent=pkt; }
  }

  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    cards.forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-p')==='5'); });
    stops.forEach(function(s){ s.classList.add('done'); const c=s.querySelector('.pj-chk'); if(c) c.classList.add('lit'); });
    stops[stops.length-1].classList.add('active');
    if(fill) fill.style.width='100%';
    if(puck){ puck.style.left='100%'; puck.style.background='var(--gui)'; }
    if(label) label.textContent='Sensor → screen · one payload, four checkpoints';
    if(sub) sub.textContent='Each stage carries the identical bytes — verified end to end.';
    return;
  }

  function loop(ts){
    requestAnimationFrame(loop);
    const act=isActive();
    if(act && !wasActive){ idx=-1; }   // restart whenever the slide is shown
    wasActive=act;
    if(!act) return;
    if(idx<0){ clearChecks(); idx=0; t0=ts; setPhase(0); return; }
    if(ts - t0 >= phases[idx].dur){
      t0=ts; idx++;
      if(idx>=phases.length){ idx=0; clearChecks(); }
      setPhase(idx);
    }
  }
  requestAnimationFrame(loop);

  window.pjGoto=function(i){ idx=i; t0=performance.now(); if(i===0) clearChecks(); for(let k=0;k<=i;k++){ const p=phases[k]; if(p.chk!=null){ const c=stops[p.chk].querySelector('.pj-chk'); if(c) c.classList.add('lit'); } } setPhase(i); };
})();
