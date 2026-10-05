import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

export const PAL = {
  horizon: 0xf8e6c4,
  wall: 0xf3ede2,
  stone: 0xd8c7a3,
  stoneDark: 0xb9a37c,
  blue: 0x2557a8,
  sea: 0x3f7fbf,
  seaFar: 0x7aa6cf,
  ochre: 0xc98b3c,
  terracotta: 0xb4552f,
  red: 0xa63a2a,
  magenta: 0xb8337a,
  green: 0x5d7f3a,
  olive: 0x7d8f4e,
  skin: 0xe9cfa6,
  ink: 0x1b1712,
  mountain: 0xc9a77f,
  mountainFar: 0xdcbf98,
  cloud: 0xfbf3e4,
  cat: 0x3a3330,
  fishScale: 0x9db3c4,
  wood: 0x8a5a34,
  brown: 0x5a4a3a,
} as const;

// Two-step toon ramp: lit / shadow, nothing in between — the comic-book look.
const ramp = new THREE.DataTexture(new Uint8Array([120, 120, 255, 255]), 4, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;

const lines = {
  ink: new LineMaterial({ color: PAL.ink, linewidth: 3 }),
  thin: new LineMaterial({ color: PAL.ink, linewidth: 1.5 }),
  foam: new LineMaterial({ color: 0xeaf2fb, linewidth: 1.6 }),
};
export function setLineResolution(w: number, h: number): void {
  for (const m of Object.values(lines)) m.resolution.set(w, h);
}

const hullMat = new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide });
const toonCache = new Map<number, THREE.MeshToonMaterial>();

export function toon(color: number): THREE.MeshToonMaterial {
  let m = toonCache.get(color);
  if (!m) {
    // polygonOffset pushes faces back so the ink lines on their edges always win the depth test.
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: ramp,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    toonCache.set(color, m);
  }
  return m;
}

export type Outline = 'ink' | 'hull' | 'none';
type Animator = (t: number, dt: number) => void;

/** Seeded RNG so a scene looks the same every time it loads. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scene-building helpers: everything is primitives + toon + ink, Chants style. */
export class Kit {
  readonly animators: Animator[] = [];
  readonly rand: () => number;

  constructor(readonly scene: THREE.Scene, seed: number) {
    this.rand = mulberry32(seed);
  }

  tick(t: number, dt: number): void {
    for (const a of this.animators) a(t, dt);
  }

  mesh(source: THREE.BufferGeometry, color: number, outline: Outline = 'ink', flat = false, hullScale = 1.06): THREE.Mesh {
    let geo = source;
    if (flat) {
      // Toon materials have no flatShading: split vertices so each face gets its own normal.
      if (geo.index) {
        geo = source.toNonIndexed();
        source.dispose();
      }
      geo.computeVertexNormals();
    }
    const m = new THREE.Mesh(geo, toon(color));
    m.castShadow = true;
    m.receiveShadow = true;
    if (outline === 'ink') {
      const edges = new THREE.EdgesGeometry(geo, 25);
      m.add(new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(edges), lines.ink));
      edges.dispose();
    } else if (outline === 'hull') {
      const h = new THREE.Mesh(geo, hullMat);
      h.scale.setScalar(hullScale);
      m.add(h);
    }
    return m;
  }

  add(geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, outline: Outline = 'ink', flat = false): THREE.Mesh {
    const m = this.mesh(geo, color, outline, flat);
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }

  /** Box standing on y (bottom face at y). */
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z);
  }

  lettering(text: string, w: number, h: number, style: 'carved' | 'painted'): THREE.Mesh {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = Math.round((1024 * h) / w);
    const g = c.getContext('2d')!;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const spaced = text.split('').join(' ');
    let px = c.height * 0.8;
    do {
      g.font = `${px}px "GFS Didot", Georgia, serif`;
      px -= 6;
    } while (g.measureText(spaced).width > c.width * 0.88 && px > 20);
    const cx = c.width / 2;
    const cy = c.height / 2;
    if (style === 'carved') {
      g.fillStyle = 'rgba(40,30,20,.9)';
      g.fillText(spaced, cx - 4, cy - 4);
      g.fillStyle = 'rgba(255,248,230,.85)';
      g.fillText(spaced, cx + 4, cy + 4);
      g.fillStyle = '#8f7a58';
    } else {
      g.fillStyle = '#2557a8';
    }
    g.fillText(spaced, cx, cy);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    mat.userData.own = true; // disposed with the scene
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  }

  /** Painted signboard; y is the bottom of the board, text faces +z. */
  signboard(text: string, x: number, y: number, z: number, w = 3.6, h = 0.9): THREE.Mesh {
    const board = this.box(w + 0.2, h + 0.1, 0.14, PAL.wall, x, y, z);
    const t = this.lettering(text, w, h, 'painted');
    t.position.z = 0.08;
    board.add(t);
    return board;
  }

  /** Carved stone plaque centred at (x, y, z), text facing +z. */
  plaque(text: string, x: number, y: number, z: number, w = 2.4, h = 0.8): THREE.Mesh {
    const slab = this.add(new THREE.BoxGeometry(w + 0.3, h + 0.2, 0.12), PAL.stone, x, y, z);
    const t = this.lettering(text, w, h, 'carved');
    t.position.z = 0.07;
    slab.add(t);
    return slab;
  }

  stele(text: string, x: number, z: number): void {
    const s = this.box(2.4, 3.4, 0.6, PAL.stone, x, 0, z);
    this.box(2.8, 0.3, 0.9, PAL.stoneDark, x, 3.4, z);
    const t = this.lettering(text, 2.2, 0.75, 'carved');
    t.position.set(0, 0.6, 0.31);
    s.add(t);
  }

  signpost(text: string, x: number, z: number): void {
    this.box(0.25, 3.2, 0.25, PAL.wood, x, 0, z);
    const arrow = new THREE.Shape([
      new THREE.Vector2(-1.6, -0.45),
      new THREE.Vector2(1.2, -0.45),
      new THREE.Vector2(1.8, 0),
      new THREE.Vector2(1.2, 0.45),
      new THREE.Vector2(-1.6, 0.45),
    ]);
    const board = this.add(new THREE.ExtrudeGeometry(arrow, { depth: 0.12, bevelEnabled: false }), PAL.wall, x + 0.6, 2.6, z + 0.14);
    const t = this.lettering(text, 2.6, 0.7, 'painted');
    t.position.set(-0.1, 0, 0.14);
    board.add(t);
  }

  house(x: number, baseY: number, z: number, w: number, h: number, d: number, opts: { dome?: boolean; flowers?: boolean } = {}): void {
    this.box(w, h, d, PAL.wall, x, baseY, z);
    const front = z + d / 2 + 0.06;
    this.box(1.2, 2.1, 0.12, PAL.blue, x - w / 4, baseY, front);
    this.box(0.9, 0.9, 0.12, PAL.blue, x + w / 4, baseY + h * 0.55, front);
    this.box(w + 0.3, 0.25, d + 0.3, PAL.wall, x, baseY + h, z);
    if (opts.dome) {
      const r = w * 0.34;
      this.add(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), PAL.blue, x, baseY + h + 0.25, z, 'hull');
      this.box(0.12, 0.9, 0.12, PAL.ink, x, baseY + h + 0.25 + r, z);
      this.box(0.6, 0.12, 0.12, PAL.ink, x, baseY + h + 0.85 + r, z);
    }
    if (opts.flowers) this.bougainvillea(x + w / 2 - 0.4, baseY + h - 1.2, front);
  }

  bougainvillea(x: number, y: number, z: number): void {
    for (let i = 0; i < 5; i++) {
      const r = 0.35 + this.rand() * 0.25;
      this.add(new THREE.IcosahedronGeometry(r, 0), PAL.magenta, x + (this.rand() - 0.5) * 1.4, y + this.rand() * 0.9, z, 'hull', true);
    }
  }

  pot(x: number, y: number, z: number): void {
    this.add(new THREE.CylinderGeometry(0.32, 0.22, 0.55, 8), PAL.terracotta, x, y + 0.27, z, 'hull', true);
    this.add(new THREE.IcosahedronGeometry(0.42, 0), PAL.green, x, y + 0.8, z, 'hull', true);
  }

  crate(x: number, y: number, z: number): void {
    this.box(0.9, 0.9, 0.9, PAL.ochre, x, y, z);
  }

  bollard(x: number, z: number): void {
    this.add(new THREE.CylinderGeometry(0.25, 0.32, 0.8, 8), PAL.ink, x, 0.4, z, 'none');
  }

  olive(x: number, z: number): void {
    const trunk = this.add(new THREE.CylinderGeometry(0.25, 0.4, 2.4, 6), PAL.wood, x, 1.2, z, 'hull', true);
    trunk.rotation.z = 0.1;
    for (let i = 0; i < 4; i++) {
      this.add(new THREE.IcosahedronGeometry(1 + this.rand() * 0.5, 0), PAL.olive, x + (this.rand() - 0.5) * 2, 2.8 + this.rand() * 0.8, z + (this.rand() - 0.5) * 1.5, 'hull', true);
    }
  }

  cypress(x: number, z: number): void {
    this.add(new THREE.ConeGeometry(0.8, 5.5, 7), PAL.green, x, 2.75, z, 'hull', true);
  }

  cat(x: number, y: number, z: number, rot: number): void {
    const g = new THREE.Group();
    const body = this.mesh(new THREE.BoxGeometry(0.35, 0.3, 0.6), PAL.cat, 'ink', true);
    body.position.y = 0.15;
    const head = this.mesh(new THREE.BoxGeometry(0.3, 0.26, 0.26), PAL.cat, 'ink', true);
    head.position.set(0, 0.42, 0.25);
    g.add(body, head);
    for (const sx of [-0.09, 0.09]) {
      const ear = this.mesh(new THREE.ConeGeometry(0.06, 0.13, 4), PAL.cat, 'none', true);
      ear.position.set(sx, 0.6, 0.25);
      g.add(ear);
    }
    const tail = this.mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 5), PAL.cat, 'none', true);
    tail.position.set(0.12, 0.25, -0.35);
    tail.rotation.x = 0.9;
    g.add(tail);
    g.position.set(x, y, z);
    g.rotation.y = rot;
    this.scene.add(g);
    this.animators.push((t) => (tail.rotation.z = Math.sin(t * 2) * 0.3));
  }

  boat(x: number, z: number, color: number, rot: number): void {
    const g = new THREE.Group();
    const hull = this.mesh(new THREE.BoxGeometry(5, 0.9, 1.8), color);
    hull.position.y = 0.45;
    const rim = this.mesh(new THREE.BoxGeometry(5.1, 0.15, 1.9), PAL.wall);
    rim.position.y = 0.95;
    const mast = this.mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), PAL.ink, 'none');
    mast.position.y = 2.6;
    const sailShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 3.3), new THREE.Vector2(2.2, 0)]);
    const sail = this.mesh(new THREE.ShapeGeometry(sailShape), PAL.wall);
    sail.material = toon(PAL.wall).clone();
    (sail.material as THREE.Material).side = THREE.DoubleSide;
    (sail.material as THREE.Material).userData.own = true;
    sail.position.set(0.1, 1.1, 0);
    g.add(hull, rim, mast, sail);
    g.position.set(x, -1.75, z);
    g.rotation.y = rot;
    this.scene.add(g);
    const k = this.rand() * 6;
    this.animators.push((t) => {
      g.position.y = -1.75 + Math.sin(t * 1.2 + k) * 0.08;
      g.rotation.z = Math.sin(t * 0.9 + k) * 0.03;
    });
  }

  /** The big ship you arrived on, moored along the quay. */
  ship(x: number, z: number): void {
    const g = new THREE.Group();
    const hull = this.mesh(new THREE.BoxGeometry(12, 2.6, 3.6), PAL.blue);
    hull.position.y = 1.3;
    const band = this.mesh(new THREE.BoxGeometry(12.1, 0.4, 3.7), PAL.wall);
    band.position.y = 2.4;
    const cabin = this.mesh(new THREE.BoxGeometry(4, 2, 2.6), PAL.wall);
    cabin.position.set(2, 3.6, 0);
    const funnel = this.mesh(new THREE.CylinderGeometry(0.5, 0.6, 2, 10), PAL.red, 'hull');
    funnel.position.set(3, 5.5, 0);
    g.add(hull, band, cabin, funnel);
    for (const wx of [0.8, 2, 3.2]) {
      const win = this.mesh(new THREE.BoxGeometry(0.6, 0.6, 0.05), PAL.blue, 'none');
      win.position.set(wx, 3.8, 1.33);
      g.add(win);
    }
    g.position.set(x, -2.2, z);
    this.scene.add(g);
    this.animators.push((t) => (g.position.y = -2.2 + Math.sin(t * 0.7) * 0.05));
  }

  /** Rope with hanging laundry between a and b (world points). */
  laundry(a: THREE.Vector3, b: THREE.Vector3, colors: number[]): void {
    const sagAt = (t: number) => {
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * 0.6;
      return p;
    };
    const pts: number[] = [];
    const N = 12;
    for (let i = 0; i < N; i++) {
      const p = sagAt(i / N);
      const q = sagAt((i + 1) / N);
      pts.push(p.x, p.y, p.z, q.x, q.y, q.z);
    }
    const rope = new LineSegmentsGeometry();
    rope.setPositions(pts);
    this.scene.add(new LineSegments2(rope, lines.thin));
    colors.forEach((col, i) => {
      const cloth = this.mesh(new THREE.PlaneGeometry(1.1, 1.3).translate(0, -0.65, 0), col);
      cloth.material = toon(col).clone();
      (cloth.material as THREE.Material).side = THREE.DoubleSide;
      (cloth.material as THREE.Material).userData.own = true;
      cloth.position.copy(sagAt((i + 1) / (colors.length + 1)));
      this.scene.add(cloth);
      this.animators.push((t) => (cloth.rotation.x = Math.sin(t * 1.6 + i) * 0.18));
    });
  }

  sea(): void {
    this.add(new THREE.BoxGeometry(400, 1, 240), PAL.sea, 0, -2.2, 120, 'none');
    this.add(new THREE.PlaneGeometry(600, 200).rotateX(-Math.PI / 2), PAL.seaFar, 0, -1.69, 160, 'none');
    const pts: number[] = [];
    for (let i = 0; i < 90; i++) {
      const x = (this.rand() - 0.5) * 120;
      const z = 8 + this.rand() * 60;
      const l = 0.6 + this.rand() * 1.6;
      pts.push(x, -1.65, z, x + l, -1.65, z);
    }
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pts);
    const foam = new LineSegments2(geo, lines.foam);
    this.scene.add(foam);
    this.animators.push((t) => (foam.position.x = Math.sin(t * 0.3) * 1.5));
  }

  /** Harbour quay: top at y = 0 for z in [-9, 7]. */
  quay(): void {
    this.box(90, 2, 16, PAL.stone, 0, -2, -1);
    for (let x = -44; x <= 44; x += 4) this.box(4, 0.25, 0.6, PAL.stoneDark, x, 0, 6.7);
  }

  /** Stone terraces climbing behind the front row. */
  terraces(): void {
    this.box(90, 3, 10, PAL.stone, 0, -1, -13);
    this.box(76, 6, 10, PAL.stone, -4, -1, -23);
    this.box(60, 9, 12, PAL.stone, -6, -1, -34);
  }

  /** Inland ground: top at y = 0 for z in [-11, 9], with a low wall at the front. */
  plaza(): void {
    this.box(90, 2, 20, PAL.stone, 0, -2, -1);
    this.box(90, 0.6, 0.6, PAL.stoneDark, 0, 0, 8.7);
    this.box(90, 3, 10, PAL.stone, 0, -1, -16);
    this.box(76, 6, 10, PAL.stone, -4, -1, -26);
  }

  /** Sun, far mountains, islands and drifting clouds. */
  backdrop(): void {
    const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xfff4dc, fog: false }));
    (sun.material as THREE.Material).userData.own = true;
    sun.position.set(-70, 48, -200);
    this.scene.add(sun);
    const peaks: [number, number, number, number, number][] = [
      [-120, -210, 60, 30, PAL.mountainFar],
      [-50, -230, 70, 38, PAL.mountainFar],
      [40, -220, 65, 28, PAL.mountainFar],
      [130, -200, 55, 34, PAL.mountainFar],
      [-85, -120, 30, 16, PAL.mountain],
      [80, -125, 34, 18, PAL.mountain],
    ];
    for (const [x, z, r, h, c] of peaks) this.add(new THREE.ConeGeometry(r, h, 6), c, x, h / 2 - 2, z, 'none', true);
    for (const [x, y, z, s] of [
      [-50, 40, -120, 1.4],
      [20, 52, -150, 1.8],
      [80, 38, -110, 1.2],
      [-110, 55, -160, 2],
    ] as const) {
      const g = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const puff = this.mesh(new THREE.SphereGeometry(4 + this.rand() * 3, 10, 6), PAL.cloud, 'hull');
        puff.castShadow = false;
        puff.position.set((i - 2) * 5, this.rand() * 2, this.rand() * 2);
        puff.scale.y = 0.55;
        g.add(puff);
      }
      g.position.set(x, y, z);
      g.scale.setScalar(s);
      this.scene.add(g);
      const speed = 0.6 + this.rand() * 0.6;
      this.animators.push((_t, dt) => {
        g.position.x += dt * speed;
        if (g.position.x > 180) g.position.x = -180;
      });
    }
  }
}
