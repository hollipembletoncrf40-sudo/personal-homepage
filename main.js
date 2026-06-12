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

// All buttons that open the QR
['heroWechatBtn', 'connectWechatBtn', 'footerWechatBtn'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', openQR);
});

closeBtn.addEventListener('click', closeQR);

// Close on backdrop click
overlay.addEventListener('click', e => {
  if (e.target === overlay) closeQR();
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeQR();
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

  // ── Shader Material (iridescent) ──
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vNoise;
      uniform float uTime;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;

        // Simple animated displacement
        float noise = sin(position.x * 2.0 + uTime * 0.6)
                    * cos(position.y * 1.8 - uTime * 0.4)
                    * sin(position.z * 2.2 + uTime * 0.5)
                    * 0.28
                    + sin(position.x * 3.5 + position.y * 2.8 + uTime * 0.9) * 0.12;

        vNoise = noise;
        vec3 newPos = position + normal * noise;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vNoise;
      uniform float uTime;

      // Rich multi-stop palette: dark navy → deep purple → violet →
      //   hot teal → acid green → gold → back
      vec3 palette(float t) {
        // Layer two cosine palettes and blend for more bands
        vec3 a1 = vec3(0.20, 0.30, 0.55);
        vec3 b1 = vec3(0.55, 0.40, 0.45);
        vec3 c1 = vec3(1.00, 0.80, 0.55);
        vec3 d1 = vec3(0.00, 0.25, 0.60);
        vec3 col1 = a1 + b1 * cos(6.28318 * (c1 * t + d1));

        vec3 a2 = vec3(0.10, 0.50, 0.35);
        vec3 b2 = vec3(0.50, 0.45, 0.30);
        vec3 c2 = vec3(0.80, 1.00, 0.70);
        vec3 d2 = vec3(0.40, 0.10, 0.80);
        vec3 col2 = a2 + b2 * cos(6.28318 * (c2 * t + d2));

        return mix(col1, col2, 0.5 + 0.5 * sin(t * 3.14159 + uTime * 0.08));
      }

      void main() {
        // Fresnel rim
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.2);

        // Animated colour coordinate
        float t = vNoise * 0.6 + 0.5;
        t += vPosition.y * 0.15 + vPosition.x * 0.08 + uTime * 0.05;

        vec3 col = palette(t);

        // Acid-green hot-spot in bright areas
        float greenZone = smoothstep(0.48, 0.78, t);
        col = mix(col, vec3(0.78, 1.00, 0.30), greenZone * 0.55);

        // Gold / amber highlight band
        float goldZone = smoothstep(0.72, 0.90, sin(t * 6.28 + uTime * 0.1) * 0.5 + 0.5);
        col = mix(col, vec3(1.00, 0.78, 0.15), goldZone * 0.30);

        // Deep violet in dark areas
        float darkZone = 1.0 - smoothstep(0.0, 0.45, t);
        col = mix(col, vec3(0.28, 0.05, 0.60), darkZone * 0.45);

        // Bright teal fresnel rim glow
        col = mix(col, vec3(0.10, 0.95, 0.75), fresnel * 0.55);

        // Exposure
        float brightness = 0.55 + fresnel * 0.55 + max(vNoise, 0.0) * 0.35;
        col *= brightness;

        // Slight gamma lift so blacks aren't too muddy
        col = pow(max(col, vec3(0.0)), vec3(0.88));

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

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    material.uniforms.uTime.value = t;

    // ── Position: heavier feel = higher lerp (more responsive), slow drift home ──
    const lerpSpeed = isNearBlob ? 0.18 : 0.025;
    currentPos.lerp(targetPos, lerpSpeed);
    mesh.position.copy(currentPos);

    // ── Rotation: always slowly self-spinning ──
    // Slow continuous self-rotation
    autoRotY += 0.003;          // slow Y spin ~10°/s
    autoRotX += 0.0008;         // very slow tilt

    // When near blob: mouse movement adds extra spin impulse
    if (isNearBlob) {
      const dTX = targetPos.x - prevTargetX;
      const dTY = targetPos.y - prevTargetY;
      velY += dTX * 0.06;       // horizontal mouse → Y spin
      velX -= dTY * 0.04;       // vertical mouse → X tilt
    }
    prevTargetX = targetPos.x;
    prevTargetY = targetPos.y;

    // Dampen velocity
    velY *= 0.92;
    velX *= 0.92;

    autoRotY += velY;
    autoRotX += velX;

    // Gentle wobble on Z
    mesh.rotation.y = autoRotY;
    mesh.rotation.x = autoRotX + Math.sin(t * 0.07) * 0.08;
    mesh.rotation.z = Math.sin(t * 0.05) * 0.06;

    // Breathing
    const scale = 1 + Math.sin(t * 0.5) * 0.015;
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
