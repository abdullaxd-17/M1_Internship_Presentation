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

function setActive(i){
  i = Math.max(0, Math.min(total - 1, i));
  if (slides[current]) slides[current].classList.remove('is-active');
  current = i;
  slides[current].classList.add('is-active');

  progressFill.style.width = ((current) / (total - 1)) * 100 + '%';
  slideCounter.textContent = `${pad(current+1)} / ${pad(total)}`;

  // footer "you are here" stage
  const stage = slides[current].dataset.stage;
  hudChips.forEach(c => c.classList.toggle('active', stage !== 'all' && c.dataset.stage === stage));

  // refresh notes if open
  if (notesDrawer.classList.contains('open')) renderNotes();
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
    case 'n': case 'N': toggleNotes(); break;
    case 'o': case 'O': toggleOverview(); break;
    case 't': case 'T': toggleTimer(); break;
    case 'Escape': if (notesDrawer.classList.contains('open')) toggleNotes(false); break;
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

/* ---------- speaker notes ---------- */
const notesDrawer = document.getElementById('notesDrawer');
const ndBody = document.getElementById('ndBody');
const ndSlideNo = document.getElementById('ndSlideNo');
const ndTime = document.getElementById('ndTime');
const ndCume = document.getElementById('ndCume');
const btnNotes = document.getElementById('btnNotes');

function renderNotes(){
  const note = slides[current].querySelector('.notes');
  ndBody.innerHTML = note ? note.innerHTML : '<em>No notes for this slide.</em>';
  ndSlideNo.textContent = `Slide ${current+1}`;
  ndTime.textContent = fmtTime(slideTime(current));
  let cume = 0; for (let k=0;k<=current;k++) cume += slideTime(k);
  ndCume.textContent = fmtTime(cume);
}
function toggleNotes(force){
  const open = force !== undefined ? force : !notesDrawer.classList.contains('open');
  notesDrawer.classList.toggle('open', open);
  notesDrawer.setAttribute('aria-hidden', String(!open));
  btnNotes.classList.toggle('on', open);
  if (open) renderNotes();
}
btnNotes.addEventListener('click', () => toggleNotes());
document.getElementById('ndClose').addEventListener('click', () => toggleNotes(false));

/* ---------- presenter timer ---------- */
const btnTimer = document.getElementById('btnTimer');
const timerLabel = document.getElementById('timerLabel');
let timerOn = false, timerSec = 0, timerId = null;
function paintTimer(){ timerLabel.textContent = `${pad(Math.floor(timerSec/60))}:${pad(timerSec%60)}`; }
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

(function ambient(){
  if (reduceMotion) return;
  const cv = document.getElementById('bg-canvas');
  const ctx = cv.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let w, h, nodes = [], pulses = [];
  const rnd = (a,b) => a + Math.random()*(b-a);
  const LINK2 = 17000;   // squared link distance

  function nearby(idx){
    const a = nodes[idx], cand = [];
    for (let j=0;j<nodes.length;j++){
      if (j===idx) continue;
      const dx=a.x-nodes[j].x, dy=a.y-nodes[j].y;
      if (dx*dx+dy*dy < 60000) cand.push(j);
    }
    return cand.length ? cand[(Math.random()*cand.length)|0] : (idx+1)%nodes.length;
  }
  function newPulse(){
    const from = (Math.random()*nodes.length)|0;
    return { from, to: nearby(from), t: Math.random(), speed: rnd(0.005,0.013), hue: Math.random()<0.5?'c':'b' };
  }
  function build(){
    w = window.innerWidth; h = window.innerHeight;
    cv.width = w*DPR; cv.height = h*DPR; cv.style.width = w+'px'; cv.style.height = h+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    const n = Math.min(115, Math.floor(w*h/15000));
    nodes = Array.from({length:n}, () => ({ x:rnd(0,w), y:rnd(0,h), vx:rnd(-0.13,0.13), vy:rnd(-0.13,0.13), r:rnd(0.6,2.1), a:rnd(0.25,0.7) }));
    pulses = Array.from({length:Math.min(24, Math.max(8, (n/5)|0))}, newPulse);
  }
  function frame(){
    ctx.clearRect(0,0,w,h);
    const rich = bgMode === 'rich';
    const lineMax = rich ? 0.12 : 0.05;
    const nodeMul = rich ? 1 : 0.55;

    for (const d of nodes){
      d.x += d.vx; d.y += d.vy;
      if (d.x<-20) d.x=w+20; if (d.x>w+20) d.x=-20;
      if (d.y<-20) d.y=h+20; if (d.y>h+20) d.y=-20;
    }
    // links
    for (let i=0;i<nodes.length;i++){
      const a = nodes[i];
      for (let j=i+1;j<nodes.length;j++){
        const b = nodes[j], dx=a.x-b.x, dy=a.y-b.y, dist=dx*dx+dy*dy;
        if (dist < LINK2){
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle = `rgba(95,155,225,${lineMax*(1-dist/LINK2)})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }
    // nodes
    for (const d of nodes){
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(135,190,238,${d.a*nodeMul})`; ctx.fill();
    }
    // flowing telemetry pulses (rich slides only)
    if (rich){
      for (const p of pulses){
        const a = nodes[p.from], b = nodes[p.to];
        if (!a || !b){ Object.assign(p, newPulse()); continue; }
        p.t += p.speed;
        if (p.t >= 1){ p.from = p.to; p.to = nearby(p.from); p.t = 0; p.speed = rnd(0.005,0.013); }
        const x = a.x + (b.x-a.x)*p.t, y = a.y + (b.y-a.y)*p.t;
        const col = p.hue==='c' ? '52,224,234' : '125,165,255';
        const g = ctx.createRadialGradient(x,y,0,x,y,10);
        g.addColorStop(0,`rgba(${col},0.85)`); g.addColorStop(1,`rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(${col},1)`; ctx.beginPath(); ctx.arc(x,y,1.8,0,Math.PI*2); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  build(); frame();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
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
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
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
   GUI demo video — first use a local MP4 when available; otherwise embed
   YouTube inside the same slide window with a valid referrer/origin.
   ===================================================================== */
(function demoVideo(){
  const frame = document.getElementById('dvFrame');
  if (!frame) return;
  let loaded = false;

  function showHelp(){
    frame.innerHTML = '<div class="dv-help"><b>YouTube embed is blocked in this environment.</b><span>Open this presentation through http://localhost or upload a local MP4 named <code>demo_video.mp4</code> inside the assets folder.</span></div>';
    frame.classList.add('playing');
  }

  function localVideoExists(url){
    return fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then(r => r.ok)
      .catch(() => false);
  }

  async function play(){
    if (loaded) return;
    loaded = true;
    const local = frame.getAttribute('data-local-video') || '';
    if (local && await localVideoExists(local)) {
      const vid = document.createElement('video');
      vid.src = local;
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.preload = 'metadata';
      frame.innerHTML = '';
      frame.appendChild(vid);
      frame.classList.add('playing');
    } else {
      const origin = (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '';
      if (!origin) { showHelp(); return; }
      const sep = frame.getAttribute('data-embed').includes('?') ? '&' : '?';
      const ifr = document.createElement('iframe');
      ifr.src = frame.getAttribute('data-embed') + sep + 'origin=' + encodeURIComponent(origin);
      ifr.title = 'Live system demonstration — sensor to LoRa to GUI';
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      ifr.allowFullscreen = true;
      ifr.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
      frame.innerHTML = '';
      frame.appendChild(ifr);
      frame.classList.add('playing');
    }
    frame.style.cursor = 'default';
    frame.removeAttribute('role');
    frame.removeAttribute('tabindex');
    frame.removeAttribute('aria-label');
  }
  frame.addEventListener('click', play);
  frame.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); play(); } });
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
