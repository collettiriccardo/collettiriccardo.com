import * as THREE from "three";

/* ----------------------------------------------------------------------------
   Hero: 3D loss landscape with gradient descent walkers.
   Mouse rotates camera. Walkers descend the surface following the gradient
   of a sum of gaussians: a real (if cartoon) optimization landscape.
---------------------------------------------------------------------------- */

const canvas = document.getElementById("hero-canvas");
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.05);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(8, 9, 14);
camera.lookAt(0, 0, 0);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  canvas.remove(); // no WebGL: drop the background layer, page works without it
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  /* -------------------- loss landscape: f(x,z) = -Σ a_k * exp(-|x-μ_k|² / σ²) -------------------- */

  // Gaussian basins (negative => valleys), one ridge (positive) to break symmetry.
  const BASINS = [
    { mx:  4.0, mz:  3.0, a: 1.8, s: 5.0 },
    { mx: -3.5, mz:  4.5, a: 2.3, s: 6.0 },
    { mx: -2.0, mz: -3.5, a: 2.0, s: 4.5 },
    { mx:  3.5, mz: -4.0, a: 1.4, s: 4.0 },
    { mx:  0.0, mz:  0.0, a: -0.9, s: 3.5 }, // central ridge (positive)
  ];

  function loss(x, z) {
    let y = 0;
    for (const b of BASINS) {
      const dx = x - b.mx, dz = z - b.mz;
      y -= b.a * Math.exp(-(dx*dx + dz*dz) / b.s);
    }
    return y;
  }

  function gradient(x, z) {
    let gx = 0, gz = 0;
    for (const b of BASINS) {
      const dx = x - b.mx, dz = z - b.mz;
      const k = -b.a * Math.exp(-(dx*dx + dz*dz) / b.s) * (-2 / b.s);
      gx += k * dx;
      gz += k * dz;
    }
    return [gx, gz];
  }

  const SIZE = 22;
  const SEG = 110;
  const planeGeom = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  planeGeom.rotateX(-Math.PI / 2);

  const posAttr = planeGeom.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, loss(x, z));
  }
  planeGeom.computeVertexNormals();

  const surfaceMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:    { value: 0 },
      uAccent:  { value: new THREE.Color(0x6ee7ff) },
      uAccent2: { value: new THREE.Color(0x0080ff) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormal;
      void main() {
        vPos = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uAccent;
      uniform vec3 uAccent2;
      varying vec3 vPos;
      varying vec3 vNormal;
      void main() {
        // height-based color (low = valleys = accent2, high = peaks = dim)
        float h = clamp((vPos.y + 2.2) / 4.0, 0.0, 1.0);
        vec3 lo = uAccent2 * 0.9;
        vec3 hi = uAccent * 0.15;
        vec3 col = mix(lo, hi, h);

        // contour rings (every 0.25 in y)
        float ring = abs(fract(vPos.y * 4.0) - 0.5);
        float contour = smoothstep(0.45, 0.5, ring);
        col = mix(col + uAccent * 0.4, col, contour);

        // grid lines (every 1 unit on x/z)
        float gx = abs(fract(vPos.x) - 0.5);
        float gz = abs(fract(vPos.z) - 0.5);
        float grid = step(0.48, max(gx, gz));
        col = mix(col, col * 0.4, grid);

        float fres = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0,1.0,0.0)), 0.0), 1.5);
        gl_FragColor = vec4(col * (0.6 + fres * 0.7), 0.85);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const surface = new THREE.Mesh(planeGeom, surfaceMat);
  scene.add(surface);

  // wireframe overlay
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(planeGeom),
    new THREE.LineBasicMaterial({ color: 0x6ee7ff, transparent: true, opacity: 0.08 })
  );
  scene.add(wire);

  /* -------------------- gradient-descent walkers -------------------- */

  const WALKERS = 7;
  const LR = 0.12;
  const TRAIL_LEN = 220;

  class Walker {
    constructor(x, z, hue) {
      this.x = x;
      this.z = z;
      this.trail = [];
      this.dotMat = new THREE.MeshBasicMaterial({ color: hue });
      this.dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), this.dotMat);
      scene.add(this.dot);

      const positions = new Float32Array(TRAIL_LEN * 3);
      const trailGeom = new THREE.BufferGeometry();
      trailGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      this.trailMat = new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: 0.55 });
      this.line = new THREE.Line(trailGeom, this.trailMat);
      scene.add(this.line);
      this.trailPositions = positions;
      this.drawCount = 0;
    }
    step() {
      const [gx, gz] = gradient(this.x, this.z);
      this.x -= gx * LR;
      this.z -= gz * LR;
      // gentle noise so they don't all converge identically
      this.x += (Math.random() - 0.5) * 0.02;
      this.z += (Math.random() - 0.5) * 0.02;

      // re-spawn if it settles (low gradient)
      const gnorm = Math.hypot(gx, gz);
      if (gnorm < 0.04) this.respawn();

      const y = loss(this.x, this.z) + 0.18;
      this.dot.position.set(this.x, y, this.z);

      // trail
      this.trail.push([this.x, y - 0.05, this.z]);
      if (this.trail.length > TRAIL_LEN) this.trail.shift();
      for (let i = 0; i < this.trail.length; i++) {
        this.trailPositions[i * 3]     = this.trail[i][0];
        this.trailPositions[i * 3 + 1] = this.trail[i][1];
        this.trailPositions[i * 3 + 2] = this.trail[i][2];
      }
      this.drawCount = this.trail.length;
      this.line.geometry.setDrawRange(0, this.drawCount);
      this.line.geometry.attributes.position.needsUpdate = true;
    }
    respawn() {
      this.x = (Math.random() - 0.5) * SIZE * 0.85;
      this.z = (Math.random() - 0.5) * SIZE * 0.85;
      this.trail = [];
    }
  }

  const walkers = [];
  const palette = [0x6ee7ff, 0x4f8fff, 0xffe066, 0x8fffb6, 0x7ec6ff, 0x6ee7ff, 0xff8a5c];
  for (let i = 0; i < WALKERS; i++) {
    const x = (Math.random() - 0.5) * SIZE * 0.85;
    const z = (Math.random() - 0.5) * SIZE * 0.85;
    walkers.push(new Walker(x, z, palette[i % palette.length]));
  }

  /* -------------------- interaction: orbit on mouse + scroll -------------------- */

  const target = new THREE.Vector2(0, 0);
  const mouse  = new THREE.Vector2(0, 0);
  window.addEventListener("pointermove", (e) => {
    target.x = (e.clientX / window.innerWidth)  * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let scrollY = 0;
  window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  /* -------------------- loop -------------------- */

  const clock = new THREE.Clock();

  function tick() {
    const t = clock.getElapsedTime();

    mouse.lerp(target, 0.05);

    // slow auto-orbit + mouse offset, eased
    const azim = t * 0.06 + mouse.x * 0.6;
    const elev = 0.55 + mouse.y * 0.15;
    const r    = 16 - Math.min(scrollY / window.innerHeight, 1) * 4;
    camera.position.set(
      Math.sin(azim) * r,
      Math.max(2.5, elev * 12),
      Math.cos(azim) * r
    );
    camera.lookAt(0, -0.5, 0);

    for (const w of walkers) w.step();

    // fade whole scene on scroll past hero
    const scrollNorm = Math.min(scrollY / window.innerHeight, 1);
    const opacity = 1 - scrollNorm * 0.85;
    surface.visible = opacity > 0.05;
    wire.visible = opacity > 0.05;
    walkers.forEach((w) => {
      w.dotMat.opacity = opacity;
      w.trailMat.opacity = opacity * 0.55;
      w.dotMat.transparent = true;
    });

    renderer.render(scene, camera);
    if (!prefersReduced) requestAnimationFrame(tick);
  }

  if (prefersReduced) {
    for (let i = 0; i < 80; i++) walkers.forEach((w) => w.step());
    renderer.render(scene, camera);
  } else {
    tick();
  }
}
