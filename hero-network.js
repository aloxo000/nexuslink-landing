import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js";

const host = document.querySelector(".connection-visual");
const canvas = host?.querySelector(".connection-canvas");

if (host && canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  const network = new THREE.Group();
  const particles = [];
  const rings = [];

  camera.position.set(0, 0.15, 7.4);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.add(network);

  const makeOrbitCurve = (radiusX, radiusY, lift = 0) => {
    const points = [];
    for (let index = 0; index <= 192; index += 1) {
      const angle = (index / 192) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radiusX,
        Math.sin(angle) * radiusY,
        Math.sin(angle * 2) * lift
      ));
    }
    return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.42);
  };

  const orbitDefinitions = [
    {
      color: 0x1528f7,
      radiusX: 2.38,
      radiusY: 0.78,
      lift: 0.1,
      rotation: [0.42, -0.58, -0.18],
      speed: 0.31,
      nodeCount: 3,
    },
    {
      color: 0x8b22d6,
      radiusX: 2.08,
      radiusY: 0.68,
      lift: 0.12,
      rotation: [1.03, 0.1, 0.78],
      speed: -0.27,
      nodeCount: 2,
    },
    {
      color: 0xff6413,
      radiusX: 1.72,
      radiusY: 0.56,
      lift: 0.08,
      rotation: [0.2, 0.88, -0.74],
      speed: 0.34,
      nodeCount: 2,
    },
    {
      color: 0x5665ff,
      radiusX: 2.7,
      radiusY: 0.88,
      lift: 0.14,
      rotation: [1.2, -0.32, 0.2],
      speed: -0.22,
      nodeCount: 3,
    },
  ];

  const particleGeometry = new THREE.SphereGeometry(0.038, 12, 12);

  orbitDefinitions.forEach((definition, orbitIndex) => {
    const curve = makeOrbitCurve(definition.radiusX, definition.radiusY, definition.lift);
    const orbitGroup = new THREE.Group();
    const routeMaterial = new THREE.MeshBasicMaterial({
      color: definition.color,
      transparent: true,
      opacity: 0.46,
    });
    const routeGlowMaterial = new THREE.MeshBasicMaterial({
      color: definition.color,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });

    orbitGroup.rotation.set(...definition.rotation);
    orbitGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.01, 6, true), routeMaterial));
    orbitGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 140, 0.033, 6, true), routeGlowMaterial));
    network.add(orbitGroup);
    rings.push({
      group: orbitGroup,
      drift: orbitIndex % 2 === 0 ? 0.055 : -0.045,
    });

    for (let particleIndex = 0; particleIndex < definition.nodeCount; particleIndex += 1) {
      const particle = new THREE.Mesh(
        particleGeometry,
        new THREE.MeshBasicMaterial({ color: definition.color })
      );
      particle.userData = {
        curve,
        group: orbitGroup,
        offset: particleIndex / definition.nodeCount + orbitIndex * 0.08,
        speed: definition.speed,
      };
      particle.scale.setScalar(particleIndex === 0 ? 1.1 : 0.76);
      particles.push(particle);
      orbitGroup.add(particle);
    }

    [0, 0.25, 0.5, 0.75].forEach((pointOffset) => {
      const anchor = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), new THREE.MeshBasicMaterial({
        color: definition.color,
        transparent: true,
        opacity: 0.44,
      }));
      anchor.position.copy(curve.getPointAt(pointOffset));
      orbitGroup.add(anchor);
    });
  });

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0x1528f7 })
  );
  const coreHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, 0.012, 8, 80),
    new THREE.MeshBasicMaterial({ color: 0x8b22d6, transparent: true, opacity: 0.48 })
  );
  coreHalo.rotation.set(1.1, 0.28, 0.2);
  network.add(core, coreHalo);

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    const safeWidth = Math.max(width, 1);
    const safeHeight = Math.max(height, 1);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(safeWidth, safeHeight, false);
  };

  const pointerTarget = new THREE.Vector2();
  host.addEventListener("pointermove", (event) => {
    const bounds = host.getBoundingClientRect();
    pointerTarget.set(
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.18,
      ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.12
    );
  });
  host.addEventListener("pointerleave", () => pointerTarget.set(0, 0));

  const clock = new THREE.Clock();
  let animationFrame;
  let elapsed = 0;

  const render = () => {
    const delta = Math.min(clock.getDelta(), 0.04);
    elapsed += delta;

    if (!reduceMotion) {
      network.rotation.y += (pointerTarget.x + Math.sin(elapsed * 0.32) * 0.08 - network.rotation.y) * 0.025;
      network.rotation.x += (-pointerTarget.y + Math.cos(elapsed * 0.28) * 0.045 - network.rotation.x) * 0.025;
      network.rotation.z = Math.sin(elapsed * 0.22) * 0.025;
      coreHalo.rotation.z += delta * 0.28;
      rings.forEach(({ group, drift }, index) => {
        group.rotation.z += delta * drift;
        group.rotation.x += Math.sin(elapsed * 0.25 + index) * delta * 0.012;
      });

      particles.forEach((particle) => {
        const rawProgress = elapsed * particle.userData.speed + particle.userData.offset;
        const progress = ((rawProgress % 1) + 1) % 1;
        particle.position.copy(particle.userData.curve.getPointAt(progress));
      });
    } else {
      network.rotation.set(-0.03, 0.08, 0);
      particles.forEach((particle) => {
        particle.position.copy(particle.userData.curve.getPointAt(particle.userData.offset % 1));
      });
    }

    renderer.render(scene, camera);
    if (!reduceMotion && !document.hidden) {
      animationFrame = requestAnimationFrame(render);
    } else {
      animationFrame = undefined;
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    }
    if (!document.hidden && !reduceMotion && !animationFrame) {
      clock.getDelta();
      animationFrame = requestAnimationFrame(render);
    }
  });

  new ResizeObserver(resize).observe(host);
  resize();
  render();
  host.classList.add("three-ready");
}
