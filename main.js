// ══════════════════════════════════════
// YIN-YANG DIAGONAL BACKGROUND (optimised)
// ══════════════════════════════════════
(function () {
  const cnv = document.getElementById('bgCanvas');
  if (!cnv) return;
  const ctx = cnv.getContext('2d', { alpha: false }); // opaque canvas = faster compositing

  let W, H, t = 0;
  let forestGrad = null; // cached — recreated only on resize
  let diagNorm = 1, nx = 0, ny = 0; // cached diagonal normal

  function resize() {
    W = cnv.width  = window.innerWidth;
    H = cnv.height = window.innerHeight;

    // Cache the static forest gradient (never changes after resize)
    forestGrad = ctx.createLinearGradient(W, H, 0, 0);
    forestGrad.addColorStop(0,   '#010d06');
    forestGrad.addColorStop(0.5, '#030f09');
    forestGrad.addColorStop(1,   '#060807');

    // Cache diagonal normal (constant per viewport)
    diagNorm = Math.sqrt(W * W + H * H);
    nx = -W / diagNorm;
    ny =  H / diagNorm;
  }
  resize();
  window.addEventListener('resize', resize);

  // Reduced to 5 blobs (was 9) — same visual impact, ~44% less fillRect
  const palette = [
    [212, 255,  98],  // acid lime
    [  0, 245, 200],  // teal
    [ 56, 189, 248],  // sky blue
    [168,  85, 247],  // purple
    [255, 107, 107],  // coral
  ];
  const MIN_DIM = () => Math.min(W, H);

  // Cap at ~24fps — background animation doesn't need 60fps
  let lastTs = 0;
  const FPS_INTERVAL = 1000 / 24;

  function frame(ts) {
    requestAnimationFrame(frame);
    if (ts - lastTs < FPS_INTERVAL) return;
    lastTs = ts;
    t += 0.004; // slightly faster tick since we're at 24fps

    // ── 1. Black base (alpha:false canvas → fast opaque fill) ─────────
    ctx.fillStyle = '#060806';
    ctx.fillRect(0, 0, W, H);

    // ── 2. Dark forest half — uses CACHED gradient (no new object) ────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = forestGrad;
    ctx.fill();
    ctx.restore();

    // ── 3. Flowing colour blobs along "/" diagonal ────────────────────
    // screen blend only for the blobs batch — one save/restore
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const minD = MIN_DIM();
    const perpAmp = 0.045 * minD;
    const nBlobs = 5; // was 9

    for (let k = 0; k < nBlobs; k++) {
      const s   = ((k / nBlobs) + t * (0.016 + k * 0.005)) % 1;
      const bx0 = W * (1 - s);
      const by0 = H * s;
      const perp = Math.sin(t * (0.35 + k * 0.1) + k * 1.1) * perpAmp;
      const bx  = bx0 + nx * perp;
      const by  = by0 + ny * perp;
      const bR  = minD * (0.14 + Math.sin(t * 0.45 + k * 0.6) * 0.04);
      const alpha = 0.10 + Math.sin(t * 0.7 + k * 0.45) * 0.025;

      const [pr, pg, pb] = palette[k];
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, bR);
      g.addColorStop(0,   `rgba(${pr},${pg},${pb},${alpha})`);
      g.addColorStop(0.6, `rgba(${pr},${pg},${pb},${alpha * 0.3})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore(); // back to source-over

    // ── 4. Single soft diagonal glow (source-over, cheap) ────────────
    const glowS = Math.sin(t * 0.12) * 0.5 + 0.5;
    const gx = W * (1 - glowS), gy = H * glowS;
    const glowR = minD * 0.26;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowR);
    glow.addColorStop(0,   'rgba(0,220,150,0.035)');
    glow.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  requestAnimationFrame(frame);
})();

// ══════════════════════════════════════
// Custom Cursor — Morphing Gradient Ring
// ══════════════════════════════════════
(function () {
  const ring = document.getElementById('cursorOrb');  // repurpose as ring
  const dot  = document.getElementById('cursorDot');
  if (!ring || !dot) return;

  // Redesign ring element in JS (gradient border ring, not solid blob)
  ring.style.cssText = `
    position:fixed; top:0; left:0; z-index:99999;
    width:38px; height:38px; border-radius:50%;
    pointer-events:none; will-change:transform;
    background: conic-gradient(from 0deg, #d4ff62, #00f5c8, #a855f7, #ff6b6b, #d4ff62) border-box;
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px));
    transition: opacity .2s;
  `;

  dot.style.cssText = `
    position:fixed; top:0; left:0; z-index:100000;
    width:5px; height:5px; border-radius:50%;
    pointer-events:none; will-change:transform;
    background:#d4ff62;
    box-shadow: 0 0 6px 2px rgba(212,255,98,.7);
  `;

  let tx = window.innerWidth/2, ty = window.innerHeight/2;
  let cx = tx, cy = ty;
  let prevTx = tx, prevTy = ty;
  let angle = 0;      // spinning gradient angle
  let isHover = false;

  document.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
    dot.style.transform = `translate(${tx - 2.5}px, ${ty - 2.5}px)`;
    spawnParticle(tx, ty);
  });

  // ── Particle trail ──
  const particles = [];
  function spawnParticle(x, y) {
    const p = document.createElement('div');
    const size = 3 + Math.random() * 4;
    const colors = ['#d4ff62','#00f5c8','#a855f7','#ff6b6b','#38bdf8'];
    const color  = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      position:fixed; pointer-events:none; z-index:99998;
      width:${size}px; height:${size}px; border-radius:50%;
      background:${color}; opacity:.7;
      left:${x - size/2}px; top:${y - size/2}px;
      transform:scale(1); transition: opacity .5s, transform .5s;
    `;
    document.body.appendChild(p);
    particles.push(p);
    requestAnimationFrame(() => {
      p.style.opacity  = '0';
      p.style.transform = `scale(0) translate(${(Math.random()-0.5)*20}px, ${(Math.random()-0.5)*20}px)`;
    });
    setTimeout(() => { p.remove(); }, 550);
  }

  // ── Grow on interactive ──
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
      isHover = true;
      ring.style.opacity = '1';
    });
    el.addEventListener('mouseleave', () => {
      isHover = false;
      ring.style.opacity = '0.85';
    });
  });

  document.addEventListener('mouseleave', () => { ring.style.opacity='0'; dot.style.opacity='0'; });
  document.addEventListener('mouseenter', () => { ring.style.opacity='0.85'; dot.style.opacity='1'; });

  // ── RAF loop ──
  function loop() {
    requestAnimationFrame(loop);

    // Fast follow (lerp 0.35 → snappy but still smooth)
    const lerpT = isHover ? 0.42 : 0.35;
    cx += (tx - cx) * lerpT;
    cy += (ty - cy) * lerpT;

    // Velocity for squish
    const vx = tx - prevTx;
    const vy = ty - prevTy;
    prevTx = tx; prevTy = ty;
    const speed  = Math.sqrt(vx*vx + vy*vy);
    const dir    = Math.atan2(vy, vx) * (180/Math.PI);
    const stretch = Math.min(1 + speed * 0.045, 2.0);
    const squeeze = 1 / stretch;

    // Spinning gradient angle
    angle = (angle + 1.8) % 360;
    ring.style.background = `conic-gradient(from ${angle}deg, #d4ff62, #00f5c8, #a855f7, #ff6b6b, #d4ff62) border-box`;
    ring.style['-webkit-mask'] = `radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))`;
    ring.style['mask']         = `radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))`;

    const w = isHover ? 56 : 38;
    const h = isHover ? 56 : 38;
    ring.style.transform = `translate(${cx - w/2}px, ${cy - h/2}px) rotate(${dir}deg) scaleX(${stretch}) scaleY(${squeeze})`;
    ring.style.width  = w + 'px';
    ring.style.height = h + 'px';
  }
  loop();
})();



// ══════════════════════════════════════
// Clock
// ══════════════════════════════════════
function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const d = new Date();
  el.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}
updateClock();
setInterval(updateClock, 1000);


// ══════════════════════════════════════
// Reveal on Scroll
// ══════════════════════════════════════
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// Hero reveals immediately on load
window.addEventListener('load', () => {
  setTimeout(() => {
    document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('revealed'));
  }, 120);

  // ── Random gradient styles for headings ──
  const gsStyles = ['gs-acid', 'gs-aurora', 'gs-ember', 'gs-frost', 'gs-solar'];

  // Card h2 headings — each gets a different style
  const cardH2s = document.querySelectorAll('.note h2');
  cardH2s.forEach((el, i) => {
    el.classList.add(gsStyles[i % gsStyles.length]);
  });

  // Belief texts — alternate through styles
  const beliefs = document.querySelectorAll('.belief-text');
  beliefs.forEach((el, i) => {
    el.classList.add(gsStyles[i % gsStyles.length]);
  });

  // Currently labels — already gradient, skip (keep brand consistency)
  // Manifesto em tags — already animated, skip

  // Stack category labels — subtle assignment
  const catLabels = document.querySelectorAll('.stack-cat-label');
  catLabels.forEach((el, i) => {
    // Just add a lighter gradient version
    const style = gsStyles[(i * 2) % gsStyles.length];
    el.classList.add(style);
    el.style.fontSize = '10px';
    el.style.letterSpacing = '.14em';
  });

  // Manifesto text big body — random style
  const mLabel = document.querySelector('.manifesto-label');
  if (mLabel) mLabel.classList.add(gsStyles[Math.floor(Math.random() * gsStyles.length)]);
});

// ══════════════════════════════════════
// Language Switch (EN ↔ ZH)
// ══════════════════════════════════════
let currentLang = 'en';

function setLang(lang) {
  currentLang = lang;
  const btn = document.getElementById('langBtn');

  document.querySelectorAll('[data-en]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (!text) return;
    // If content has HTML (em tags etc), use innerHTML carefully
    if (text.includes('<')) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });

  // Toggle button label
  btn.textContent = lang === 'en' ? '中文' : 'EN';
  // Update html lang attribute
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';

  // Toggle essay versions
  document.querySelectorAll('.lang-en').forEach(el => el.style.display = lang === 'en' ? '' : 'none');
  document.querySelectorAll('.lang-zh').forEach(el => el.style.display = lang === 'zh' ? '' : 'none');
}

document.getElementById('langBtn').addEventListener('click', () => {
  setLang(currentLang === 'en' ? 'zh' : 'en');
});

// ══════════════════════════════════════
// ══════════════════════════════════════
// Animated Stat Counters
// ══════════════════════════════════════
(function () {
  const statEls = document.querySelectorAll('.stat-num[data-target]');
  if (!statEls.length) return;

  function animateCount(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1400;
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * target);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statEls.forEach(el => observer.observe(el));
})();

// ══════════════════════════════════════
// WeChat QR Modal

// ══════════════════════════════════════
const overlay  = document.getElementById('qrOverlay');
const closeBtn = document.getElementById('qrClose');

function openQR()  { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeQR() { overlay.classList.remove('open'); document.body.style.overflow = ''; }

// All buttons that open the WeChat QR
['heroWechatBtn', 'connectWechatBtn', 'footerWechatBtn'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', openQR);
});

closeBtn.addEventListener('click', closeQR);

overlay.addEventListener('click', e => {
  if (e.target === overlay) closeQR();
});

// ── QQ QR Modal ──
const qqOverlay  = document.getElementById('qqOverlay');
const qqCloseBtn = document.getElementById('qqClose');

function openQQ()  { qqOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeQQ() { qqOverlay.classList.remove('open'); document.body.style.overflow = ''; }

['footerQqBtn', 'heroQqBtn', 'connectQqBtn'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', openQQ);
});

if (qqCloseBtn) qqCloseBtn.addEventListener('click', closeQQ);
if (qqOverlay)  qqOverlay.addEventListener('click', e => { if (e.target === qqOverlay) closeQQ(); });

// Close on Escape (both modals)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeQR(); closeQQ(); }
});

// ══════════════════════════════════════
// Three.js — Organic Blob
// ══════════════════════════════════════
(function () {
  if (!window.THREE) { console.warn('Three.js not loaded'); return; }

  const canvas = document.getElementById('threeCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  // ── Simplex-like noise via hash ──
  // We embed a simple 3D noise function (no extra dependency needed)
  // Using the classic "smooth noise" approach via sin/cos
  function smoothNoise(x, y, z, t) {
    const sx = Math.sin(x * 1.3 + t * 0.4) * Math.cos(y * 0.9 - t * 0.3);
    const sy = Math.sin(y * 1.1 + t * 0.5) * Math.cos(z * 1.4 + t * 0.2);
    const sz = Math.sin(z * 0.8 - t * 0.6) * Math.cos(x * 1.2 + t * 0.35);
    const s2 = Math.sin(x * 2.1 + y * 1.7 + t * 0.7) * 0.4;
    const s3 = Math.sin(y * 2.3 + z * 1.5 - t * 0.5) * 0.3;
    return (sx + sy + sz + s2 + s3) / 3.2;
  }

  // ── Geometry ──
  const segments = 96;
  const geometry = new THREE.SphereGeometry(1.6, segments, segments);
  const positionAttr = geometry.attributes.position;
  const count = positionAttr.count;

  // Store original positions
  const originalPos = new Float32Array(positionAttr.array.length);
  originalPos.set(positionAttr.array);

  // ── Shader Material — Fiber Bundle with Roughness Morph ──
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0 },
      uRoughness: { value: 0.5 }, // 0=silky smooth, 1=coarse fibrous
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float uTime;
      uniform float uRoughness;

      void main() {
        vNormal   = normalize(normalMatrix * normal);
        vPosition = position;

        // Displacement amplitude scales with roughness (rough = spikier)
        float amp = mix(0.18, 0.35, uRoughness);

        float d  = sin(position.x * 2.1 + uTime * 0.55)
                 * cos(position.y * 1.8 - uTime * 0.38)
                 * sin(position.z * 2.4 + uTime * 0.47) * amp;
        d += sin(position.x * 4.2 + position.y * 3.1 + uTime * 0.90) * (amp * 0.38);
        d += cos(position.y * 5.0 + position.z * 3.8 - uTime * 0.62) * (amp * 0.27);
        // Extra high-freq detail when rough
        d += sin(position.z * 8.5 - position.x * 6.2 + uTime * 1.8) * (uRoughness * 0.12);

        vec3 newPos = position + normal * d;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float uTime;
      uniform float uRoughness;  // 0=smooth, 1=coarse

      vec3 pal(float t) {
        vec3 a1 = vec3(0.15, 0.40, 0.60);
        vec3 b1 = vec3(0.60, 0.45, 0.40);
        vec3 c1 = vec3(1.00, 0.75, 0.50);
        vec3 d1 = vec3(0.00, 0.20, 0.55);
        vec3 A = a1 + b1 * cos(6.2832 * (c1 * t + d1));

        vec3 a2 = vec3(0.55, 0.30, 0.10);
        vec3 b2 = vec3(0.45, 0.50, 0.55);
        vec3 c2 = vec3(0.70, 0.90, 1.10);
        vec3 d2 = vec3(0.35, 0.05, 0.75);
        vec3 B = a2 + b2 * cos(6.2832 * (c2 * t + d2));

        return mix(A, B, 0.5 + 0.5 * sin(t * 3.14159 + uTime * 0.09));
      }

      // Roughness-aware fiber:
      // smooth (rough=0) → thick blurry bands (silky sheen)
      // rough  (rough=1) → thin sharp lines (coarse fibrous)
      float fiber(vec3 p, vec3 axis, float baseFreq, float speed) {
        float freq      = baseFreq * mix(0.45, 1.8, uRoughness);
        float thickness = mix(0.16,  0.025, uRoughness); // wide→thin
        float proj = dot(normalize(p), normalize(axis));
        float band = fract(proj * freq + uTime * speed);
        return 1.0 - smoothstep(0.0, thickness, min(band, 1.0 - band));
      }

      void main() {
        float NdotV = max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
        float fresnel = pow(1.0 - NdotV, mix(2.0, 4.5, uRoughness));

        float tBase = vPosition.y * 0.22 + vPosition.x * 0.10
                    + vPosition.z * 0.08 + uTime * 0.04;
        vec3 base = pal(tBase);

        // 4 fiber layers — frequency & thickness driven by uRoughness
        float f1 = fiber(vPosition, vec3(0.0, 1.0, 0.0), 20.0,  0.04);
        float f2 = fiber(vPosition, vec3(1.0, 0.0, 0.0), 16.0, -0.03);
        float f3 = fiber(vPosition, vec3(0.7, 0.7, 0.0), 26.0,  0.05);
        float f4 = fiber(vPosition, vec3(0.0, 0.5, 0.8), 14.0, -0.02);

        // Brightness of fibers: smooth=soft glow, rough=harsh bright lines
        float fiberBright = mix(1.8, 3.8, uRoughness);
        vec3 fc1 = pal(tBase + 0.00) * fiberBright;
        vec3 fc2 = pal(tBase + 0.25) * fiberBright;
        vec3 fc3 = pal(tBase + 0.50) * fiberBright * 1.1;
        vec3 fc4 = pal(tBase + 0.75) * fiberBright * 0.9;

        vec3 fibers = fc1 * f1 + fc2 * f2 + fc3 * f3 + fc4 * f4;

        // Smooth mode: add a wide specular sheen
        float sheen = pow(NdotV, mix(1.5, 8.0, uRoughness));
        vec3 sheenCol = mix(
          vec3(0.9, 1.0, 1.0) * sheen * 0.6,  // smooth: broad white sheen
          vec3(0.0),                             // rough: no sheen
          uRoughness
        );

        // Caustic shimmer (stronger when rough)
        float shimmer = sin(vPosition.x * 9.0 + uTime * 1.3)
                      * sin(vPosition.y * 7.0 - uTime * 1.0)
                      * sin(vPosition.z * 8.0 + uTime * 1.6);
        shimmer = max(0.0, shimmer) * mix(0.2, 0.55, uRoughness);

        float gt = 0.5 + 0.5 * sin(uTime * 0.30 + vPosition.y * 2.0);
        float ct = 0.5 + 0.5 * cos(uTime * 0.25 + vPosition.x * 1.5);
        vec3 hotspot = mix(vec3(1.0, 0.35, 0.55), vec3(0.82, 1.0, 0.28), gt) * 0.30
                     + mix(vec3(0.15, 1.0, 0.88), vec3(0.55, 0.10, 1.0), ct) * 0.22;

        vec3 rimCol = mix(vec3(0.15, 1.0, 0.88), vec3(0.55, 0.10, 1.0),
                          0.5 + 0.5 * sin(uTime * 0.20));
        // Rim is stronger when smooth (glassy edge)
        vec3 rim = rimCol * fresnel * mix(3.2, 1.8, uRoughness);

        vec3 col = base  * mix(0.55, 0.30, uRoughness)  // base dims when rough (fibers dominate)
                 + fibers * mix(0.55, 0.88, uRoughness)
                 + sheenCol
                 + shimmer * vec3(0.15, 1.0, 0.88)
                 + hotspot
                 + rim;

        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col /= (1.0 + lum * 0.45);
        col = pow(max(col, vec3(0.0)), vec3(0.85));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  // Position blob to the right, slightly up — like the screenshot
  mesh.position.set(2.8, 0.3, 0);
  scene.add(mesh);

  // ── Lighting ──
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);
  const point1 = new THREE.PointLight(0xd4ff62, 2.5, 20);
  point1.position.set(-3, 3, 4);
  scene.add(point1);
  const point2 = new THREE.PointLight(0x3060ff, 1.5, 20);
  point2.position.set(4, -2, 3);
  scene.add(point2);

  // ── Home position ──
  const HOME = new THREE.Vector3(2.8, 0.3, 0);
  const currentPos = new THREE.Vector3().copy(HOME);
  const targetPos  = new THREE.Vector3().copy(HOME);

  // Mouse world position
  let mouseWorld = new THREE.Vector3().copy(HOME);
  let isNearBlob  = false;

  // Convert screen coords → world XY (at z=0 plane)
  function screenToWorld(screenX, screenY) {
    const ndcX = (screenX / window.innerWidth)  *  2 - 1;
    const ndcY = (screenY / window.innerHeight) * -2 + 1;
    const vec  = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(camera);
    const dir  = vec.sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    return camera.position.clone().addScaledVector(dir, dist);
  }

  // Blob radius in world units (approx)
  const BLOB_RADIUS = 2.2;
  const ATTRACT_RADIUS = BLOB_RADIUS * 1.1; // slightly larger hover zone

  document.addEventListener('mousemove', e => {
    const world = screenToWorld(e.clientX, e.clientY);
    mouseWorld.copy(world);

    // Distance from mouse to current blob position (XY only)
    const dx   = world.x - currentPos.x;
    const dy   = world.y - currentPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ATTRACT_RADIUS) {
      // Mouse is inside blob → follow mouse
      isNearBlob  = true;
      targetPos.x = THREE.MathUtils.clamp(world.x, -5, 5);
      targetPos.y = THREE.MathUtils.clamp(world.y, -3.5, 3.5);
    } else {
      // Mouse left blob → drift back home
      isNearBlob = false;
      targetPos.copy(HOME);
    }
  });

  // Touch support
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const world = screenToWorld(t.clientX, t.clientY);
      mouseWorld.copy(world);
      const dx = world.x - currentPos.x, dy = world.y - currentPos.y;
      if (Math.sqrt(dx*dx + dy*dy) < ATTRACT_RADIUS) {
        isNearBlob = true;
        targetPos.set(
          THREE.MathUtils.clamp(world.x, -5, 5),
          THREE.MathUtils.clamp(world.y, -3.5, 3.5),
          0
        );
      } else {
        isNearBlob = false;
        targetPos.copy(HOME);
      }
    }
  }, { passive: true });

  // ── Resize ──
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // ── Animate ──
  const clock = new THREE.Clock();

  // Accumulated self-rotation angles (so rotation persists across frames)
  let autoRotY = 0;
  let autoRotX = 0;

  // Velocity for inertia while dragging
  let velX = 0, velY = 0;
  let prevTargetX = HOME.x, prevTargetY = HOME.y;

  // ── Wander path: dual-frequency Lissajous covering the viewport ──
  // Camera FOV 45° at z=5 → viewport ~±3.5x, ±2.0y at z=0
  function wander(t) {
    const x = Math.sin(t * 0.040) * 2.8 + Math.cos(t * 0.067 + 1.1) * 1.0;
    const y = Math.sin(t * 0.053 + 0.7) * 1.6 + Math.cos(t * 0.038 + 2.3) * 0.6;
    return new THREE.Vector3(x, y, 0);
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    material.uniforms.uTime.value = t;

    // ── Roughness: slow cycle smooth↔coarse (~80s period) ──
    // Eased with sin² so it lingers at extremes (truly smooth or truly rough)
    const rawRough = Math.sin(t * 0.078);
    const roughness = 0.5 + 0.5 * Math.sign(rawRough) * Math.pow(Math.abs(rawRough), 0.6);
    material.uniforms.uRoughness.value = Math.max(0, Math.min(1, roughness));

    // ── Target: wander autonomously unless mouse is controlling ──
    if (!isNearBlob) {
      const wp = wander(t);
      targetPos.lerp(wp, 0.004);    // wander target shifts very slowly
    }

    // ── Position lerp: heavy drag ──
    const lerpSpeed = isNearBlob ? 0.07 : 0.012;
    currentPos.lerp(targetPos, lerpSpeed);
    mesh.position.copy(currentPos);

    // ── Rotation: slow, heavy self-spin ──
    autoRotY += 0.0015;           // halved — feels more massive
    autoRotX += 0.0004;

    // Mouse impulse — reduced sensitivity, heavier feel
    if (isNearBlob) {
      const dTX = targetPos.x - prevTargetX;
      const dTY = targetPos.y - prevTargetY;
      velY += dTX * 0.025;        // was 0.06 — less spin-up per mouse move
      velX -= dTY * 0.016;        // was 0.04
    }
    prevTargetX = targetPos.x;
    prevTargetY = targetPos.y;

    // Heavy damping — velocity decays very slowly (like dense fluid)
    velY *= 0.97;                  // was 0.92 — longer spin-down
    velX *= 0.97;

    autoRotY += velY;
    autoRotX += velX;

    // Slow, deep Z wobble — like a massive buoy
    mesh.rotation.y = autoRotY;
    mesh.rotation.x = autoRotX + Math.sin(t * 0.04) * 0.06;
    mesh.rotation.z = Math.sin(t * 0.03) * 0.04;

    // Slow, deep breathing — heavy object feels alive but weighty
    const scale = 1 + Math.sin(t * 0.20) * 0.022;
    mesh.scale.setScalar(scale);

    renderer.render(scene, camera);
  }

  animate();
})();

// ══════════════════════════════════════
// APPLE-STYLE CHAR REVEAL
// ══════════════════════════════════════
(function () {
  // ── "Hi, I'm" ── split into chars, animates first
  const hiEl = document.querySelector('.hero-hi');
  if (hiEl) {
    const hiText = hiEl.getAttribute('data-en') || hiEl.textContent.trim();
    hiEl.setAttribute('aria-label', hiText);
    hiEl.innerHTML = hiText.split('').map((ch, i) =>
      `<span class="char" style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`
    ).join('');
  }

  // ── "Josephine." ── split into chars, animates after Hi I'm
  const nameEl = document.getElementById('nameGradient');
  if (nameEl) {
    const text = 'Josephine.';
    nameEl.setAttribute('aria-label', text);
    nameEl.innerHTML = text.split('').map((ch, i) =>
      `<span class="char" style="--i:${i}">${ch}</span>`
    ).join('');
  }
})();

// ══════════════════════════════════════
// DOG MASCOT
// ══════════════════════════════════════
(function () {
  const dog    = document.getElementById('dogMascot');
  const bubble = document.getElementById('dogBubble');
  if (!dog || !bubble) return;

  const barksEn = [
    'Woof! Nice to meet you 🐾',
    'Click me again! 🐶',
    'Building cool things~ ✨',
    'Compound interest FTW 📈',
    'Let\'s go! 🚀',
  ];
  const barksZh = [
    '汪！认识你真高兴 🐾',
    '再点我一下！🐶',
    '一起做有意思的事 ✨',
    '复利的力量！📈',
    '出发！🚀',
  ];

  let barkIdx = 0;

  dog.addEventListener('click', () => {
    // Jump animation
    dog.classList.remove('jump');
    void dog.offsetWidth;
    dog.classList.add('jump');
    dog.addEventListener('animationend', () => dog.classList.remove('jump'), { once: true });

    // Cycle through barks
    const lang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
    const barks = lang === 'zh' ? barksZh : barksEn;
    barkIdx = (barkIdx + 1) % barks.length;

    const enEl = bubble.querySelector('.dog-en');
    const zhEl = bubble.querySelector('.dog-zh');
    if (lang === 'zh') {
      if (zhEl) zhEl.textContent = barks[barkIdx];
    } else {
      if (enEl) enEl.textContent = barks[barkIdx];
    }

    // Bounce the bubble
    bubble.style.transform = 'scale(1.15)';
    setTimeout(() => { bubble.style.transform = ''; }, 200);
  });

  // Sync dog bubble with language toggle
  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const isZh = document.documentElement.lang === 'zh-CN';
      const enEl = bubble.querySelector('.dog-en');
      const zhEl = bubble.querySelector('.dog-zh');
      if (enEl) enEl.style.display = isZh ? '' : 'none';
      if (zhEl) zhEl.style.display = isZh ? 'none' : '';
    });
  }
})();

// ══════════════════════════════════════
// GALAXY CLICK PARTICLES — 仙女散花
// ══════════════════════════════════════
(function () {
  // Full-screen overlay canvas — pointer-events:none so clicks pass through
  const cvs = document.createElement('canvas');
  cvs.style.cssText = [
    'position:fixed', 'inset:0', 'width:100%', 'height:100%',
    'pointer-events:none', 'z-index:99999'
  ].join(';');
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  function resize() { cvs.width = innerWidth; cvs.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  // ── Palette: matches the site's fiber / tag rainbow ──
  const PAL = [
    '#d4ff62','#00f5c8','#38bdf8','#a855f7',
    '#ff6b6b','#ffd93d','#ff9f43','#c084fc',
    '#67e8f9','#86efac','#fbbf24','#f472b6',
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Particle ──
  class Star {
    constructor(x, y, isSparkle) {
      this.x = this.ox = x;
      this.y = this.oy = y;
      const angle = rnd(0, Math.PI * 2);
      const spd   = isSparkle ? rnd(5, 16) : rnd(2, 9);
      this.vx     = Math.cos(angle) * spd;
      // 仙女散花: upward bias on velocity
      this.vy     = Math.sin(angle) * spd - rnd(2, isSparkle ? 8 : 5);
      this.size   = isSparkle ? rnd(0.8, 2.2) : rnd(2, 5.5);
      this.color  = pick(PAL);
      this.alpha  = 1;
      this.fade   = isSparkle ? rnd(0.035, 0.055) : rnd(0.022, 0.038);
      this.grav   = isSparkle ? 0.10 : 0.18;
      this.drag   = isSparkle ? 0.96 : 0.975;
      this.glow   = isSparkle ? rnd(4, 10)  : rnd(10, 24);
      this.trail  = [];
      this.tLen   = isSparkle ? Math.floor(rnd(2, 4)) : Math.floor(rnd(3, 7));
      // slow rotation for star twinkle
      this.angle  = rnd(0, Math.PI * 2);
      this.spin   = rnd(-0.15, 0.15);
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.tLen) this.trail.shift();
      this.vx *= this.drag;
      this.vy *= this.drag;
      this.vy += this.grav;
      this.x  += this.vx;
      this.y  += this.vy;
      this.alpha -= this.fade;
      this.angle += this.spin;
    }

    draw() {
      // Trail
      for (let i = 0; i < this.trail.length; i++) {
        const t  = this.trail[i];
        const ta = (i / this.trail.length) * this.alpha * 0.35;
        const ts = this.size * (i / this.trail.length) * 0.65;
        ctx.save();
        ctx.globalAlpha = ta;
        ctx.shadowBlur  = this.glow * 0.6;
        ctx.shadowColor = this.color;
        ctx.fillStyle   = this.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ts, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Glowing orb
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.shadowBlur  = this.glow;
      ctx.shadowColor = this.color;
      ctx.fillStyle   = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      // Bright white inner core
      ctx.shadowBlur  = this.glow * 0.4;
      ctx.fillStyle   = `rgba(255,255,255,${this.alpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    dead() { return this.alpha <= 0; }
  }

  // ── Shockwave ring flash at click point ──
  class Ring {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.r = 4; this.alpha = 0.8;
      this.color = pick(PAL);
    }
    update() { this.r += 6; this.alpha -= 0.055; }
    draw() {
      ctx.save();
      ctx.globalAlpha  = Math.max(0, this.alpha);
      ctx.strokeStyle  = this.color;
      ctx.shadowBlur   = 18;
      ctx.shadowColor  = this.color;
      ctx.lineWidth    = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    dead() { return this.alpha <= 0; }
  }

  const pool = [];

  function burst(x, y) {
    // 3 concentric rings
    for (let i = 0; i < 3; i++) setTimeout(() => pool.push(new Ring(x, y)), i * 80);
    // 80 glowing stars
    for (let i = 0; i < 80; i++) pool.push(new Star(x, y, false));
    // 55 fast sparkles
    for (let i = 0; i < 55; i++) pool.push(new Star(x, y, true));
  }

  let rafId = null;
  function loop() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (let i = pool.length - 1; i >= 0; i--) {
      pool[i].update();
      pool[i].draw();
      if (pool[i].dead()) pool.splice(i, 1);
    }
    rafId = pool.length > 0 ? requestAnimationFrame(loop) : null;
  }

  document.addEventListener('click', e => {
    // Don't fire inside modals / buttons that have their own interactions
    if (e.target.closest('.qr-overlay, .qr-modal')) return;
    burst(e.clientX, e.clientY);
    if (!rafId) loop();
  });
})();
