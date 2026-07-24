/* Hero background — drifting color field on warm paper, quantized with
   ordered Bayer dithering for a fresh print/riso feel. Ember, blush and
   teal blobs slowly orbit and react to the mouse. Pauses when the hero
   leaves the viewport or the tab is hidden; reduced motion renders one
   static frame. */

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
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  // 4x4 Bayer ordered-dither threshold
  float bayer4(vec2 pix) {
    int x = int(mod(pix.x, 4.0));
    int y = int(mod(pix.y, 4.0));
    int idx = y * 4 + x;
    float m[16];
    m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
    m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
    m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
    m[12]=15.0; m[13]=7.0; m[14]=13.0; m[15]=5.0;
    for (int i = 0; i < 16; i++) { if (i == idx) return (m[i] + 0.5) / 16.0; }
    return 0.5;
  }

  float blob(vec2 p, vec2 c, float r) {
    return smoothstep(r, 0.0, length(p - c));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = uv;
    p.x *= uRes.x / uRes.y;
    float aspect = uRes.x / uRes.y;

    float t = uTime * 0.09;
    vec2 m = uMouse;
    m.x *= aspect;

    // gentle domain warp so blobs feel organic, not geometric
    vec2 w = vec2(fbm(p * 1.4 + t * 0.5), fbm(p * 1.4 - t * 0.35 + 3.7));
    vec2 q = p + (w - 0.5) * 0.55;

    // orbiting colour centres
    vec2 cEmber = vec2(aspect * 0.72 + 0.16 * cos(t * 0.9), 0.62 + 0.14 * sin(t * 0.7));
    vec2 cBlush = vec2(aspect * 0.24 + 0.20 * sin(t * 0.6), 0.30 + 0.16 * cos(t * 0.8));
    vec2 cTeal  = vec2(aspect * 0.50 + 0.24 * sin(t * 0.45 + 2.0), 0.85 + 0.10 * sin(t * 0.55));

    // mouse drags a soft ember highlight
    float mBlob = blob(q, m, 0.45) * 0.5;

    float bEmber = blob(q, cEmber, 0.66);
    float bBlush = blob(q, cBlush, 0.78);
    float bTeal  = blob(q, cTeal, 0.60);

    vec3 paper = vec3(0.957, 0.937, 0.898);
    vec3 ember = vec3(1.0, 0.42, 0.22);
    vec3 blush = vec3(0.965, 0.80, 0.68);
    vec3 teal  = vec3(0.22, 0.47, 0.42);

    vec3 col = paper;
    col = mix(col, blush, bBlush * 0.85);
    col = mix(col, teal,  bTeal * 0.5);
    col = mix(col, ember, clamp(bEmber + mBlob, 0.0, 1.0) * 0.75);

    // ordered dither: quantize to a few levels with a chunky 2.5px cell
    float levels = 5.0;
    float thr = bayer4(floor(gl_FragCoord.xy / 2.5));
    col = floor(col * levels + thr) / levels;

    // faint paper grain
    col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

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

  const mouseTarget = new THREE.Vector2(0.5, 0.5);
  window.addEventListener('mousemove', (e) => {
    mouseTarget.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  }, { passive: true });

  if (reduceMotion) {
    uniforms.uTime.value = 20;
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
    uniforms.uMouse.value.lerp(mouseTarget, 0.045);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  window.addEventListener('pagehide', () => cancelAnimationFrame(raf));
}
