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

      vec3 palette(float t) {
        // Iridescent: deep teal → acid green → purple → blue
        vec3 a = vec3(0.15, 0.45, 0.30);
        vec3 b = vec3(0.45, 0.40, 0.25);
        vec3 c = vec3(1.00, 0.90, 0.60);
        vec3 d = vec3(0.10, 0.35, 0.55);
        return a + b * cos(6.28318 * (c * t + d));
      }

      void main() {
        // Fresnel
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

        float t = vNoise * 0.5 + 0.5;
        t += vPosition.y * 0.12 + uTime * 0.04;

        vec3 col = palette(t);

        // Boost acid green highlights
        float greenBoost = smoothstep(0.55, 0.85, t);
        col = mix(col, vec3(0.83, 1.0, 0.38), greenBoost * 0.6);

        // Fresnel edge glow
        col = mix(col, vec3(0.6, 1.0, 0.4), fresnel * 0.5);

        // Darken interior, brighten edges
        float brightness = 0.6 + fresnel * 0.5 + vNoise * 0.3;
        col *= brightness;

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

  // ── Mouse tracking (NDC → world position) ──
  // Target position the blob moves toward
  const targetPos = new THREE.Vector3(2.8, 0.3, 0);
  // Current smoothed position
  const currentPos = new THREE.Vector3(2.8, 0.3, 0);

  // Raw mouse in screen pixels
  let rawMouseX = window.innerWidth / 2;
  let rawMouseY = window.innerHeight / 2;
  let isDragging = false;

  // Convert screen coords to world XY at z=0
  function screenToWorld(screenX, screenY) {
    // NDC
    const ndcX = (screenX / window.innerWidth) * 2 - 1;
    const ndcY = -(screenY / window.innerHeight) * 2 + 1;
    // Unproject onto z=0 plane
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    const worldPos = camera.position.clone().addScaledVector(dir, dist);
    return worldPos;
  }

  // Mouse / touch move → update target
  function onPointerMove(screenX, screenY) {
    const world = screenToWorld(screenX, screenY);
    // Clamp so blob doesn't go off-screen too much
    targetPos.x = THREE.MathUtils.clamp(world.x, -5, 5);
    targetPos.y = THREE.MathUtils.clamp(world.y, -3.5, 3.5);
    rawMouseX = screenX;
    rawMouseY = screenY;
  }

  document.addEventListener('mousemove', e => onPointerMove(e.clientX, e.clientY));

  // Touch support
  document.addEventListener('touchstart', e => { isDragging = true; }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 0) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  document.addEventListener('touchend', () => { isDragging = false; });

  // ── Resize ──
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // ── Animate ──
  const clock = new THREE.Clock();
  // Mouse delta for rotation feedback
  let prevMouseX = rawMouseX, prevMouseY = rawMouseY;
  let rotVelX = 0, rotVelY = 0;

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    material.uniforms.uTime.value = t;

    // ── Smooth follow: lerp current → target ──
    const lerpSpeed = 0.06; // 0 = instant, 1 = no movement
    currentPos.lerp(targetPos, lerpSpeed);
    mesh.position.copy(currentPos);

    // ── Rotation: spin based on mouse velocity ──
    const dMouseX = (rawMouseX - prevMouseX) * 0.01;
    const dMouseY = (rawMouseY - prevMouseY) * 0.01;
    prevMouseX = rawMouseX;
    prevMouseY = rawMouseY;

    // Accumulate rotational velocity, then dampen
    rotVelY += dMouseX * 0.4;
    rotVelX += dMouseY * 0.4;
    rotVelY *= 0.88; // damping
    rotVelX *= 0.88;

    mesh.rotation.y += rotVelY + t * 0.04;
    mesh.rotation.x += rotVelX;
    mesh.rotation.z = Math.sin(t * 0.03) * 0.08;

    // ── Breathing ──
    const scale = 1 + Math.sin(t * 0.55) * 0.018;
    mesh.scale.setScalar(scale);

    // ── Light follows blob ──
    point1.position.set(
      currentPos.x - 3,
      currentPos.y + 3,
      4
    );

    renderer.render(scene, camera);
  }

  animate();
})();
