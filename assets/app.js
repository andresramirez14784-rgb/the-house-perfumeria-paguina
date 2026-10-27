/* ============================================================
   THE HOUSE PERFUMERÍA — escena 3D
   three.js r169 · módulo ES
   Botella de cristal procedural, suelo reflectante, anillos
   holográficos, polvo dorado y niebla cálida.
   ============================================================ */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("scene");
const loader = document.getElementById("loader");

const state = {
  time: 0,
  scroll: 0,
  pointerX: 0,
  pointerY: 0,
  spin: -0.65,
  momentum: 0,
  dragging: false,
  lastX: 0,
  moved: 0,
};

let renderer;
let scene;
let camera;
let composer;
let bloom;
let clock;
let bottle;
let glow;
let orb;
let vortex = null;
let vortexData = null;
let rings = [];
let dust = null;
let dustSpeeds = null;
let burst = null;
let burstVel = null;
let burstLife = 0;
let portrait = false;
let bottleBaseY = 0.08;
let rafId = 0;
let firstFrame = true;

/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */

function radialTexture(inner, outer, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  if (typeof g.roundRect === "function") {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    return;
  }
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* Etiqueta dibujada en canvas: papel crema, tipografía serif */
function makeLabelTexture() {
  const w = 768;
  const h = 384;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");

  g.fillStyle = "#efe4cf";
  roundRect(g, 24, 24, w - 48, h - 48, 20);
  g.fill();
  g.strokeStyle = "rgba(150, 120, 70, 0.55)";
  g.lineWidth = 3;
  g.stroke();

  g.strokeStyle = "rgba(150, 120, 70, 0.32)";
  g.lineWidth = 1.5;
  roundRect(g, 44, 44, w - 88, h - 88, 12);
  g.stroke();

  g.textAlign = "center";
  g.fillStyle = "#2b2015";
  g.font = "600 56px Georgia, serif";
  g.fillText("THE HOUSE", w / 2, 150);

  g.font = "400 44px Georgia, serif";
  g.fillText("PERFUMERÍA", w / 2, 206);

  g.fillStyle = "#8a6a3a";
  g.fillRect(w / 2 - 88, 232, 176, 2);

  g.fillStyle = "#4a3a26";
  g.font = "400 25px Georgia, serif";
  g.fillText("EAU DE PARFUM  ·  100 ML", w / 2, 282);

  g.fillStyle = "#7a6446";
  g.font = "400 21px Georgia, serif";
  g.fillText("BOGOTÁ  ·  COLOMBIA", w / 2, 320);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------
   Construcción de la escena
   ------------------------------------------------------------ */

function init() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (err) {
    return fail();
  }

  if (!renderer.getContext()) return fail();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060608);
  scene.fog = new THREE.FogExp2(0x060608, 0.045);

  camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0.35, 6.4);

  // Entorno de estudio para reflejos del cristal y del oro
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffe3bd, 3.0);
  key.position.set(3.2, 4.6, 3.4);

  const rim = new THREE.DirectionalLight(0x8fd6ff, 2.4);
  rim.position.set(-4.2, 2.2, -3.6);

  const fill = new THREE.DirectionalLight(0xffc07a, 1.2);
  fill.position.set(-1.6, -1.2, 3.2);

  scene.add(key, rim, fill);

  clock = new THREE.Clock();

  buildFloor();
  buildGlow();
  bottle = buildBottle();
  scene.add(bottle);
  buildRings();
  buildDust();
  buildVortex();
  buildBurst();
  buildComposer();

  layout();
  updateScroll();
  bindEvents();

  clock.start();
  rafId = requestAnimationFrame(animate);
}

function fail() {
  document.body.classList.add("no-webgl", "is-ready");
  hideLoader();
}

/* Suelo: piedra oscura pulida + charco de luz + sombra de contacto */
function buildFloor() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({
      color: 0x0b0b0e,
      roughness: 0.3,
      metalness: 0.9,
      envMapIntensity: 0.4,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.06;
  scene.add(floor);

  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({
      map: radialTexture("rgba(230, 194, 112, 0.16)", "rgba(230, 194, 112, 0)"),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -1.05;
  scene.add(pool);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
      map: radialTexture("rgba(0, 0, 0, 0.92)", "rgba(0, 0, 0, 0)"),
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.045;
  scene.add(shadow);
}

/* Halo cálido detrás de la botella */
function buildGlow() {
  glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture("rgba(230, 194, 112, 0.5)", "rgba(230, 194, 112, 0)"),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  glow.scale.set(7.5, 7.5, 1);
  glow.position.set(1.15, 0.5, -2.4);
  scene.add(glow);

  // Orbe de luz que orbita alrededor de la botella
  orb = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture("rgba(255, 226, 166, 0.9)", "rgba(255, 226, 166, 0)"),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
    })
  );
  orb.scale.set(0.5, 0.5, 1);
  scene.add(orb);
}

/* Botella: cristal con transmisión, líquido ámbar, tapón de oro */
function buildBottle() {
  const group = new THREE.Group();

  const W = 1.22;
  const H = 1.58;
  const D = 0.62;

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.05,
    transmission: 1,
    thickness: 0.9,
    ior: 1.47,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    envMapIntensity: 1.9,
  });

  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, 0.16), glass);
  group.add(body);

  // El líquido NO usa transmisión: three.js no dibuja objetos transmisivos
  // dentro de otro objeto transmisivo (la botella no los vería).
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xc0701c,
    roughness: 0.18,
    metalness: 0,
    transmission: 0,
    emissive: new THREE.Color(0x8a3f06),
    emissiveIntensity: 0.85,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
  });

  const liquid = new THREE.Mesh(new RoundedBoxGeometry(W - 0.16, H - 0.45, D - 0.16, 5, 0.13), liquidMat);
  liquid.position.y = -0.2;
  group.add(liquid);

  const gold = new THREE.MeshStandardMaterial({
    color: 0xe0bb6b,
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 1.6,
  });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.22, 48), glass);
  neck.position.y = H / 2 + 0.11;
  group.add(neck);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 48), gold);
  collar.position.y = H / 2 + 0.23;
  group.add(collar);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.44, 64), gold);
  cap.position.y = H / 2 + 0.48;
  group.add(cap);

  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.233, 0.011, 12, 64), gold);
  capRing.rotation.x = Math.PI / 2;
  capRing.position.y = H / 2 + 0.27;
  group.add(capRing);

  const labelTex = makeLabelTexture();
  labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.34),
    new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.75,
      metalness: 0,
      transparent: true,
      envMapIntensity: 0.6,
    })
  );
  label.position.set(0, -0.02, D / 2 + 0.006);
  group.add(label);

  group.position.set(1.15, 0.08, 0);
  return group;
}

/* Anillos holográficos parciales alrededor de la base */
function buildRings() {
  const defs = [
    { r: 1.35, arc: Math.PI * 1.55, tube: 0.005, color: 0xe6c270, opacity: 0.5, speed: 0.55 },
    { r: 1.8, arc: Math.PI * 1.2, tube: 0.0035, color: 0x76d7ff, opacity: 0.3, speed: -0.4 },
    { r: 2.25, arc: Math.PI * 1.72, tube: 0.003, color: 0xe6c270, opacity: 0.22, speed: 0.28 },
  ];

  defs.forEach((d, i) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(d.r, d.tube, 8, 220, d.arc),
      new THREE.MeshBasicMaterial({
        color: d.color,
        transparent: true,
        opacity: d.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = i * 1.15;
    mesh.position.y = -1.03;
    scene.add(mesh);
    rings.push({ mesh, speed: d.speed, base: d.opacity });
  });
}

/* Polvo dorado flotante */
function buildDust() {
  const count = portrait ? 220 : 460;
  const positions = new Float32Array(count * 3);
  dustSpeeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = Math.random() * 5 - 1.2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 9 - 1;
    dustSpeeds[i] = 0.04 + Math.random() * 0.16;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  dust = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xe6c98d,
      size: 0.022,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  scene.add(dust);
}

/* Chorro de partículas al tocar la botella */
function buildBurst() {
  const count = 140;
  const positions = new Float32Array(count * 3);
  burstVel = new Float32Array(count * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  burst = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffd9a0,
      size: 0.03,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(burst);
}

/* Espiral de partículas doradas orbitando la botella */
function buildVortex() {
  const count = 220;
  const pos = new Float32Array(count * 3);
  vortexData = [];

  for (let i = 0; i < count; i++) {
    vortexData.push({
      a: Math.random() * Math.PI * 2,
      r: 1.1 + Math.random() * 2.0,
      y: -0.9 + Math.random() * 2.6,
      speed: 0.4 + Math.random() * 0.9,
      drift: 0.4 + Math.random() * 0.8,
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  vortex = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xf3d98a,
      size: 0.05,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  scene.add(vortex);
}

function buildComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.75, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setSize(window.innerWidth, window.innerHeight);
}

/* ------------------------------------------------------------
   Disposición según el tamaño de pantalla
   ------------------------------------------------------------ */

function layout() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  portrait = w / h < 1.02;

  if (portrait) {
    bottle.position.x = 0;
    bottle.scale.setScalar(0.52);
    bottleBaseY = 2.1;
    camera.fov = 48;
  } else {
    bottle.position.x = 1.15;
    bottle.scale.setScalar(1);
    bottleBaseY = 0.08;
    camera.fov = 36;
  }

  if (glow) glow.position.x = bottle.position.x;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ------------------------------------------------------------
   Eventos
   ------------------------------------------------------------ */

function bindEvents() {
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });

  window.addEventListener("mousemove", (e) => {
    state.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    state.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fail();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      clock.getDelta();
      rafId = requestAnimationFrame(animate);
    }
  });

  initReveals();
  initTilt();
  initTopbar();
}

let resizePending = false;

function onResize() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    layout();
  });
}

function updateScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  state.scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

function onPointerMove(e) {
  if (!state.dragging) return;
  const dx = e.clientX - state.lastX;
  state.spin += dx * 0.008;
  state.momentum = dx * 0.35;
  state.moved += Math.abs(dx);
  state.lastX = e.clientX;
}

function onPointerDown(e) {
  if (e.target.closest("a, button, .card, .pill")) return;
  state.dragging = e.pointerType !== "touch";
  state.lastX = e.clientX;
  state.moved = 0;
  state.momentum = 0;
}

function onPointerUp() {
  if (state.dragging && state.moved < 6) spray();
  state.dragging = false;
}

/* ------------------------------------------------------------
   Interfaz
   ------------------------------------------------------------ */

function initTopbar() {
  const bar = document.getElementById("topbar");
  const onScroll = () => bar.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initReveals() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((el) => io.observe(el));
}

function initTilt() {
  if (reduceMotion) return;

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", ((px - 0.5) * 9).toFixed(2) + "deg");
      card.style.setProperty("--rx", ((0.5 - py) * 9).toFixed(2) + "deg");
      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
    });
  });
}

function hideLoader() {
  if (!loader) return;
  loader.classList.add("is-done");
  window.setTimeout(() => loader.remove(), 900);
}

/* ------------------------------------------------------------
   Chorro de perfume
   ------------------------------------------------------------ */

function spray() {
  if (!burst) return;

  const origin = new THREE.Vector3(0, 1.5, 0);
  bottle.localToWorld(origin);

  const pos = burst.geometry.attributes.position;
  const count = burstVel.length / 3;

  for (let i = 0; i < count; i++) {
    pos.setXYZ(i, origin.x, origin.y, origin.z);
    const angle = Math.random() * Math.PI * 2;
    const spread = 0.25 + Math.random() * 0.9;
    burstVel[i * 3] = Math.cos(angle) * spread * 0.55;
    burstVel[i * 3 + 1] = 1.4 + Math.random() * 2.2;
    burstVel[i * 3 + 2] = Math.sin(angle) * spread * 0.55;
  }

  pos.needsUpdate = true;
  burstLife = 1;
  burst.material.opacity = 1;
}

function updateBurst(dt) {
  burstLife -= dt * 1.15;

  const pos = burst.geometry.attributes.position;
  const count = burstVel.length / 3;

  for (let i = 0; i < count; i++) {
    pos.setX(i, pos.getX(i) + burstVel[i * 3] * dt);
    pos.setY(i, pos.getY(i) + burstVel[i * 3 + 1] * dt);
    pos.setZ(i, pos.getZ(i) + burstVel[i * 3 + 2] * dt);
    burstVel[i * 3 + 1] -= 3.2 * dt;
  }

  pos.needsUpdate = true;
  burst.material.opacity = Math.max(0, burstLife);
}

/* ------------------------------------------------------------
   Bucle de render
   ------------------------------------------------------------ */

function animate() {
  rafId = requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  state.time += dt;
  const t = state.time;

  if (!state.dragging) {
    state.spin += (reduceMotion ? 0 : 0.45) * dt + state.momentum * dt;
    state.momentum *= Math.pow(0.0015, dt);
  }

  const px = reduceMotion ? 0 : state.pointerX;
  const py = reduceMotion ? 0 : state.pointerY;

  // Entrada cinematográfica: la cámara entra desde lejos y arriba
  const introT = Math.min(1, t / 3.2);
  const introEase = 1 - Math.pow(1 - introT, 3);
  const introZoom = reduceMotion ? 0 : (1 - introEase) * 9.0;
  const introLift = reduceMotion ? 0 : (1 - introEase) * 2.4;

  bottle.rotation.y = state.spin + px * 0.22 + state.scroll * 1.6;
  bottle.rotation.x = THREE.MathUtils.lerp(
    bottle.rotation.x,
    -py * 0.08 + (reduceMotion ? 0 : Math.sin(t * 0.5) * 0.06),
    Math.min(1, dt * 3)
  );
  bottle.position.y = bottleBaseY + (reduceMotion ? 0 : Math.sin(t * 0.75) * 0.08);

  // Orbe de luz orbitando alrededor de la botella
  if (orb) {
    const oa = t * 0.85;
    orb.position.set(
      bottle.position.x + Math.cos(oa) * 1.9,
      bottleBaseY + 0.3 + Math.sin(t * 1.4) * 0.25,
      Math.sin(oa) * 1.9
    );
    orb.material.opacity = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2));
  }

  // Halo pulsante
  if (glow) {
    const s = 7.5 * (1 + (reduceMotion ? 0 : Math.sin(t * 0.9) * 0.06));
    glow.scale.set(s, s, 1);
  }

  camera.position.x = px * 0.45;
  camera.position.y = (portrait ? 1.15 : 0.32) + py * 0.28 + introLift;
  camera.position.z = (portrait ? 7.4 : 6.4) - state.scroll * 0.6 + introZoom + (reduceMotion ? 0 : Math.sin(t * 0.6) * 0.08);
  camera.lookAt(portrait ? 0 : 0.4, portrait ? 1.35 : 0.02, 0);

  rings.forEach((ring, i) => {
    ring.mesh.rotation.z += ring.speed * dt;
    ring.mesh.material.opacity = ring.base * (0.72 + 0.28 * Math.sin(t * 1.1 + i));
  });

  if (dust) {
    const attr = dust.geometry.attributes.position;
    for (let i = 0; i < dustSpeeds.length; i++) {
      let y = attr.getY(i) + dustSpeeds[i] * dt;
      if (y > 4.2) y = -1.2;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  }

  if (vortex && vortexData) {
    const vattr = vortex.geometry.attributes.position;
    for (let i = 0; i < vortexData.length; i++) {
      const p = vortexData[i];
      p.a += p.speed * dt;
      const r = p.r + Math.sin(t * 0.5 + i) * 0.25;
      const y = p.y + Math.sin(t * p.drift + i) * 0.35;
      vattr.setXYZ(
        i,
        bottle.position.x + Math.cos(p.a) * r,
        bottleBaseY + y * 0.7,
        Math.sin(p.a) * r
      );
    }
    vattr.needsUpdate = true;
  }

  if (burstLife > 0) updateBurst(dt);

  if (bloom) bloom.strength = 0.7 - state.scroll * 0.3;

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    document.body.classList.add("is-ready");
    hideLoader();
  }
}

init();
