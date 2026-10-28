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
  renderer.toneMappingExposure = 1.05;
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
    const origin = new THREE.Vector3();
    nozzle.getWorldPosition(origin);

    const pos = spray.geometry.attributes.position;
    for (let i = 0; i < 150; i++) {
      pos.setXYZ(i, origin.x, origin.y + 0.02, origin.z);
      const a = Math.random() * Math.PI * 2;
      const spread = (0.3 + Math.random() * 0.7) * 0.6;
      sprayVel[i * 3] = Math.cos(a) * spread;
      sprayVel[i * 3 + 1] = 0.7 + Math.random() * 1.1;
      sprayVel[i * 3 + 2] = Math.sin(a) * spread;
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

function buildBottle() {
  const W = 1.12;
  const H = 1.72;
  const D = 0.48;

  const group = new THREE.Group();

  const metal = new THREE.MeshStandardMaterial({
    color: 0xb9c1c8,
    metalness: 1,
    roughness: 0.28,
    envMapIntensity: 1.15,
  });

  const dark = new THREE.MeshStandardMaterial({
    color: 0x14161b,
    metalness: 0.95,
    roughness: 0.32,
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xd9dde1,
    metalness: 1,
    roughness: 0.16,
    envMapIntensity: 1.3,
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

  // Difusor (la puntica)
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.1, 24), chrome);
  nozzle.position.y = H / 2 + 0.24;
  group.add(nozzle);

  // Zona de toque invisible, más grande que la puntica
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
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

  // Etiqueta vertical
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 1.02),
    new THREE.MeshStandardMaterial({
      map: labelTexture(),
      metalness: 0.35,
      roughness: 0.45,
      envMapIntensity: 0.8,
    })
  );
  label.position.set(0, 0.02, D / 2 + 0.004);
  group.add(label);

  group.position.y = -0.22;
  return { group, cap, nozzle, hit, body };
}

function labelTexture() {
  const W = 512;
  const H = 900;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  g.fillStyle = "#c6cbd1";
  g.fillRect(0, 0, W, H);

  const metal = g.createLinearGradient(0, 0, W, 0);
  metal.addColorStop(0, "rgba(255,255,255,0.55)");
  metal.addColorStop(0.45, "rgba(255,255,255,0)");
  metal.addColorStop(1, "rgba(0,0,0,0.22)");
  g.fillStyle = metal;
  g.fillRect(0, 0, W, H);

  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-Math.PI / 2);
  g.textAlign = "center";
  g.textBaseline = "middle";

  g.fillStyle = "#22304f";
  g.font = "700 98px Helvetica, Arial, sans-serif";
  g.fillText("212  VIP", -120, 0);

  g.fillStyle = "#3c4454";
  g.font = "600 48px Helvetica, Arial, sans-serif";
  g.fillText("MEN", 220, 0);

  g.restore();

  g.fillStyle = "rgba(40,50,70,0.5)";
  g.font = "400 20px Helvetica, Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("EAU DE TOILETTE", W / 2, H - 46);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
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
