/* Hero background — a slow domain-warped fbm field in the brand palette.
   Runs on a fullscreen triangle; pauses when the hero leaves the viewport
   or the tab is hidden. Reduced motion renders a single static frame. */

import * as THREE from 'three';

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;

  // -- simplex-style value noise + fbm --
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = uv;
    p.x *= uRes.x / uRes.y;

    float t = uTime * 0.045;

    // Mouse gently displaces the field's centre of gravity
    vec2 m = (uMouse - 0.5) * 0.35;

    // Domain warp: q warps r warps the final field
    vec2 q = vec2(
      fbm(p * 1.6 + t),
      fbm(p * 1.6 - t * 0.7 + 4.7)
    );
    vec2 r = vec2(
      fbm(p * 1.9 + q * 1.4 + m + vec2(1.7, 9.2) + t * 0.6),
      fbm(p * 1.9 + q * 1.4 + m + vec2(8.3, 2.8) - t * 0.4)
    );
    float f = fbm(p * 1.7 + r * 1.5);

    // Palette: deep charcoal -> umber -> ember -> pale bone highlight
    vec3 charcoal = vec3(0.055, 0.051, 0.043);
    vec3 umber    = vec3(0.16, 0.10, 0.07);
    vec3 ember    = vec3(1.0, 0.30, 0.13);
    vec3 bone     = vec3(0.93, 0.90, 0.86);

    vec3 col = mix(charcoal, umber, smoothstep(0.15, 0.75, f));
    col = mix(col, ember, smoothstep(0.55, 0.95, f * length(r)) * 0.7);
    col = mix(col, bone, smoothstep(0.78, 1.0, f * f) * 0.16);

    // Thin ember contour lines for a topographic feel
    float contour = abs(fract(f * 9.0) - 0.5);
    col += ember * (1.0 - smoothstep(0.0, 0.045, contour)) * 0.05;

    // Vignette + in-shader grain
    float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
    col *= vig;
    col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.025;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function initHero(canvas, { reduceMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  };

  // Fullscreen triangle — cheaper than a quad, no diagonal seam
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3,
  ));
  scene.add(new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
  })));

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }
  resize();
  window.addEventListener('resize', resize);

  // Lerped mouse for a soft, laggy response
  const mouseTarget = new THREE.Vector2(0.5, 0.5);
  window.addEventListener('mousemove', (e) => {
    mouseTarget.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  }, { passive: true });

  if (reduceMotion) {
    uniforms.uTime.value = 12; // pleasant static frame
    renderer.render(scene, camera);
    return;
  }

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; })
    .observe(canvas);

  let start = performance.now();
  let raf;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    uniforms.uTime.value = (now - start) / 1000;
    uniforms.uMouse.value.lerp(mouseTarget, 0.04);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  window.addEventListener('pagehide', () => cancelAnimationFrame(raf));
}
