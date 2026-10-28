/* ============================================================
   Visor 3D del producto destacado (212 VIP Men)
   Gira 360°, se mueve solo, la tapa se abre y el difusor rocía.
   Se inicializa solo cuando la sección entra en pantalla.
   ============================================================ */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.getElementById("bottle3d");
const viewerEl = document.getElementById("viewer");
const capBtn = document.getElementById("capBtn");
const hintEl = document.getElementById("viewerHint");

let started = false;

if (canvas && viewerEl && "IntersectionObserver" in window) {
  const boot = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          boot.disconnect();
          start();
        }
      });
    },
    { threshold: 0.15 }
  );
  boot.observe(viewerEl);
}

function start() {
  if (started) return;
  started = true;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.4, 6.3);
  camera.lookAt(0, 0.15, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0x9fd4ff, 2.2);
  rim.position.set(-4, 2, -3);
  const fill = new THREE.DirectionalLight(0xffd9a0, 1.1);
  fill.position.set(-2, -1, 3);
  scene.add(key, rim, fill);

  // Sombra de contacto (sin suelo, para que el fondo quede uniforme)
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,0.88)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 2.7),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.9 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.28;
  scene.add(shadow);

  const { group, cap, nozzle, hit } = buildBottle();
  scene.add(group);

  /* ---------- Estado e interacción ---------- */

  const state = {
    spin: -0.55,
    momentum: 0.08,
    dragging: false,
    lastX: 0,
    moved: 0,
    open: 0,
    targetOpen: 0,
    running: true,
  };

  let sprayLife = 0;
  const sprayVel = new Float32Array(150 * 3);
  const tmpQuat = new THREE.Quaternion();

  const spray = buildSpray(scene);

  /* Arrastrar para girar */
  canvas.addEventListener("pointerdown", (e) => {
    state.dragging = true;
    state.lastX = e.clientX;
    state.moved = 0;
    state.momentum = 0;
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    state.spin += dx * 0.009;
    state.momentum = dx * 0.4;
    state.moved += Math.abs(dx);
    state.lastX = e.clientX;
  });

  const release = () => {
    state.dragging = false;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  /* Tapa */
  const toggleCap = () => {
    state.targetOpen = state.targetOpen > 0.5 ? 0 : 1;
    if (capBtn) capBtn.textContent = state.targetOpen > 0.5 ? "Tapar" : "Destapar";
    if (hintEl) {
      hintEl.textContent =
        state.targetOpen > 0.5
          ? "Toca el difusor para rociar"
          : "Arrastra para girar · toca la tapa";
    }
  };

  if (capBtn) capBtn.addEventListener("click", toggleCap);

  /* Clic: tapa o difusor */
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  canvas.addEventListener("click", (e) => {
    if (state.moved > 8) return;

    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);

    const hits = ray.intersectObjects([cap, nozzle, hit], true);
    if (!hits.length) return;

    let obj = hits[0].object;
    let isNozzle = false;
    while (obj) {
      if (obj === nozzle || obj === hit) { isNozzle = true; break; }
      if (obj === cap) break;
      obj = obj.parent;
    }

    if (isNozzle) {
      if (state.open < 0.5) {
        toggleCap(); // primero destapa
      } else {
        fire();
      }
    } else {
      toggleCap();
    }
  });

  function fire() {
    if (!nozzle) return;

    // El perfume sale por la boquilla lateral del pulsador
    const origin = nozzle.localToWorld(new THREE.Vector3(0, 0, 0.13));
    group.getWorldQuaternion(tmpQuat);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(tmpQuat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(tmpQuat);

    const pos = spray.geometry.attributes.position;
    for (let i = 0; i < 150; i++) {
      pos.setXYZ(i, origin.x, origin.y, origin.z);
      const speed = 1.0 + Math.random() * 1.2;
      const lateral = (Math.random() - 0.5) * 0.85;
      const lift = (Math.random() - 0.15) * 0.5;

      sprayVel[i * 3] = fwd.x * speed + right.x * lateral;
      sprayVel[i * 3 + 1] = fwd.y * speed + lift;
      sprayVel[i * 3 + 2] = fwd.z * speed + right.z * lateral;
    }
    pos.needsUpdate = true;
    sprayLife = 1;
    spray.material.opacity = 0.7;
  }

  /* ---------- Tamaño ---------- */

  function resize() {
    const w = viewerEl.clientWidth;
    const h = viewerEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(viewerEl);
  } else {
    window.addEventListener("resize", resize);
  }
  resize();

  /* ---------- Pausa cuando no se ve ---------- */

  const vis = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        state.running = e.isIntersecting;
        document.body.dataset.viewer = e.isIntersecting ? "1" : "0";
      });
    },
    { threshold: 0.05 }
  );
  vis.observe(viewerEl);

  /* ---------- Bucle ---------- */

  const clock = new THREE.Clock();
  let raf = 0;

  function animate() {
    raf = requestAnimationFrame(animate);
    if (!state.running) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!state.dragging) {
      state.spin += dt * 0.3 + state.momentum * dt;
      state.momentum *= Math.pow(0.002, dt);
    }

    group.rotation.y = state.spin;
    group.position.y = -0.22 + Math.sin(t * 0.8) * 0.03;

    // Tapa: se abre deslizando y girando
    state.open += (state.targetOpen - state.open) * Math.min(1, dt * 5);
    cap.position.y = 1.32 + state.open * 0.4;
    cap.position.x = state.open * 0.34;
    cap.rotation.z = state.open * 0.35;

    // Loción
    if (sprayLife > 0) {
      sprayLife -= dt * 1.0;
      const pos = spray.geometry.attributes.position;
      for (let i = 0; i < 150; i++) {
        pos.setX(i, pos.getX(i) + sprayVel[i * 3] * dt);
        pos.setY(i, pos.getY(i) + sprayVel[i * 3 + 1] * dt);
        pos.setZ(i, pos.getZ(i) + sprayVel[i * 3 + 2] * dt);
        sprayVel[i * 3 + 1] -= 1.6 * dt;
      }
      pos.needsUpdate = true;
      spray.material.opacity = Math.max(0, sprayLife) * 0.8;
    }

    renderer.render(scene, camera);
  }

  animate();

  // Gancho solo para pruebas locales
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    window.__viewer = {
      fire,
      toggleCap,
      open: () => state.open,
      spraying: () => sprayLife > 0,
    };
  }
}

/* ---------- Construcción del frasco ---------- */

/* ---------- Texturas ---------- */

/* Rugosidad de metal cepillado (líneas finas verticales) */
function brushedTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");

  g.fillStyle = "#8c8c8c";
  g.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 256;
    const v = 90 + Math.floor(Math.random() * 90);
    g.strokeStyle = "rgba(" + v + "," + v + "," + v + "," + (0.05 + Math.random() * 0.18).toFixed(2) + ")";
    g.lineWidth = 0.6 + Math.random();
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  return tex;
}

function buildBottle() {
  const W = 1.12;
  const H = 1.72;
  const D = 0.48;

  const group = new THREE.Group();

  // Metal cepillado: el mapa de rugosidad rompe el reflejo perfecto
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0x9aa3ac,
    metalness: 1,
    roughness: 0.5,
    roughnessMap: brushedTexture(),
    clearcoat: 0.25,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.05,
  });

  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x14161b,
    metalness: 0.9,
    roughness: 0.38,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.2,
  });

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xdfe3e7,
    metalness: 1,
    roughness: 0.12,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.7,
  });

  // Cuerpo
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 8, 0.14), metal);
  group.add(body);

  // Banda superior oscura
  const band = new THREE.Mesh(
    new RoundedBoxGeometry(W + 0.012, H * 0.2, D + 0.012, 6, 0.11),
    dark
  );
  band.position.y = H / 2 - H * 0.1;
  group.add(band);

  // Cuello
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 32), dark);
  neck.position.y = H / 2 + 0.11;
  group.add(neck);

  // Collarín metálico (crimp) sobre el cuello
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.06, 40), chrome);
  collar.position.y = H / 2 + 0.24;
  group.add(collar);

  // Vástago de la bomba
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.07, 16), chrome);
  stem.position.y = H / 2 + 0.3;
  group.add(stem);

  // Pulsador (botón del spray): pastilla ovalada con boquilla lateral
  const nozzle = new THREE.Group();
  nozzle.position.y = H / 2 + 0.36;

  const button = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.07, 0.14, 4, 0.028), chrome);
  nozzle.add(button);

  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.07, 14), chrome);
  spout.rotation.x = Math.PI / 2;
  spout.position.set(0, 0, 0.085);
  nozzle.add(spout);

  // Orificio: pequeño punto oscuro al final de la boquilla
  const orifice = new THREE.Mesh(new THREE.CircleGeometry(0.009, 12), dark);
  orifice.position.set(0, 0, 0.121);
  nozzle.add(orifice);

  group.add(nozzle);

  // Zona de toque invisible, más grande que el pulsador
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 16, 16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.copy(nozzle.position);
  group.add(hit);

  // Tapa
  const cap = new THREE.Group();
  const capBody = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.34, 0.42, 5, 0.07), chrome);
  cap.add(capBody);
  const capLine = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.012, 0.4), dark);
  capLine.position.y = -0.06;
  cap.add(capLine);
  cap.position.set(0, 1.32, 0);
  group.add(cap);

  // Texto impreso sobre el metal (sin etiqueta: fondo transparente)
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 1.02),
    new THREE.MeshStandardMaterial({
      map: labelTexture(),
      transparent: true,
      depthWrite: false,
      metalness: 0.2,
      roughness: 0.5,
      envMapIntensity: 0.7,
    })
  );
  label.position.set(0, 0.02, D / 2 + 0.004);
  group.add(label);

  group.position.y = -0.22;
  return { group, cap, nozzle, hit, body };
}

function labelTexture() {
  const W = 1024;
  const H = 1800;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  // Fondo transparente: el texto va impreso sobre el metal, sin etiqueta
  g.clearRect(0, 0, W, H);

  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-Math.PI / 2);
  g.textAlign = "center";
  g.textBaseline = "middle";

  g.fillStyle = "#1f2c4a";
  g.font = "700 200px Helvetica, Arial, sans-serif";
  g.fillText("212  VIP", -240, 0);

  g.fillStyle = "#39414f";
  g.font = "600 96px Helvetica, Arial, sans-serif";
  g.fillText("MEN", 440, 0);
  g.restore();

  g.textAlign = "center";
  g.fillStyle = "rgba(35,45,65,0.75)";
  g.font = "500 34px Helvetica, Arial, sans-serif";
  g.fillText("CAROLINA HERRERA", W / 2, H - 120);

  g.fillStyle = "rgba(35,45,65,0.55)";
  g.font = "400 26px Helvetica, Arial, sans-serif";
  g.fillText("EAU DE TOILETTE · 100 ML", W / 2, H - 62);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- Loción ---------- */

function buildSpray(scene) {
  const count = 150;
  const positions = new Float32Array(count * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xfff3d8,
      size: 0.075,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  points.frustumCulled = false;
  scene.add(points);
  return points;
}
