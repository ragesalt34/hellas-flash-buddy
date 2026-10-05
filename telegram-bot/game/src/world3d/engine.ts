import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import type { Bus } from '../bus';
import type { SceneId } from '../content/chapter1';
import { animateFigure, figure, type Figure } from './figure';
import { SCENE_BUILDERS } from './scenes';
import { piraeusLook } from './looks';
import { SennaarPipeline } from './pipeline';
import { Kit, PAL, setLineResolution } from './style';
import type { SceneBuild, Shot } from './types';

export interface WorldDeps {
  bus: Bus;
  start: { scene: SceneId; x: number; z: number };
  hasFlag(flag: string): boolean;
  onEnterScene(scene: SceneId, x: number, z: number): void;
}

const SPEED = 4.2;
const TALK_RADIUS = 3.4;
const BODY = 0.45;
const CLOSE: Shot = { pos: [5, 3.2, 9], look: [-1, 1.6, -1], follow: 1 };

function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#e7a866');
  grad.addColorStop(0.45, '#f2cf98');
  grad.addColorStop(0.75, '#f8e6c4');
  grad.addColorStop(1, '#f8e6c4');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Renders one diorama at a time, moves the hooded figure, reports what it is next to. No story logic. */
export class World {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 600);
  private readonly clock = new THREE.Clock();
  private readonly keys = new Set<string>();
  private readonly figures = new Map<string, Figure>();
  private readonly lookAt = new THREE.Vector3();
  private readonly unsubs: (() => void)[] = [];
  private readonly resizeObserver: ResizeObserver;
  private sky: THREE.Texture;
  private readonly pipeline: SennaarPipeline;
  private kit!: Kit;
  private build!: SceneBuild;
  private player!: Figure;
  private frozen = false;
  private closeShot = false;
  private nearId: string | null = null;
  private endSent = false;
  private raf = 0;
  private width = 1;
  private height = 1;

  constructor(private readonly parent: HTMLElement, private readonly deps: WorldDeps) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // colours are display values (see pipeline)
    this.pipeline = new SennaarPipeline(this.renderer, piraeusLook());
    parent.appendChild(this.renderer.domElement);
    this.sky = skyTexture();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.unsubs.push(
      deps.bus.on('world:freeze', ({ frozen }) => {
        this.frozen = frozen;
        this.keys.clear();
      }),
      deps.bus.on('world:flags', () => this.applyBlockers()),
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
    this.loadScene(deps.start.scene, deps.start.x, deps.start.z);
    this.loop();
  }

  /** Screen position (px, relative to the canvas) of an NPC's bubble anchor, or the player's. */
  screenPos(id: string): { x: number; y: number } | null {
    let v: THREE.Vector3;
    if (id === 'player') {
      v = this.player.root.position.clone().setY(2.7);
    } else {
      const n = this.build.npcs.find((s) => s.id === id);
      if (!n) return null;
      v = new THREE.Vector3(n.x, n.anchorY, n.z);
    }
    v.project(this.camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.unsubs.forEach((u) => u());
    this.resizeObserver.disconnect();
    this.clearScene();
    this.sky.dispose();
    this.pipeline.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.frozen) return;
    this.keys.add(e.code);
    if (e.code === 'KeyE' && !e.repeat && this.nearId) this.deps.bus.emit('npc:talk', { npcId: this.nearId });
    if (e.code === 'KeyC' && !e.repeat) this.closeShot = !this.closeShot;
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => this.keys.clear();

  private loadScene(id: SceneId, x: number, z: number): void {
    this.clearScene();
    this.scene.background = this.sky;
    this.scene.fog = null; // distance is handled by the pipeline's filter
    this.addLights();
    this.kit = new Kit(this.scene, seedOf(id), this.pipeline);
    this.build = SCENE_BUILDERS[id](this.kit);
    this.endSent = false;
    this.player = figure(this.kit, PAL.red, PAL.ochre);
    this.player.root.position.set(x, 0, z);
    this.figures.clear();
    for (const n of this.build.npcs) {
      if (n.kind !== 'figure') continue;
      const f = figure(this.kit, n.cloak ?? PAL.blue, n.trim ?? PAL.wall, n.scale ?? 1);
      f.root.position.set(n.x, 0, n.z);
      f.root.rotation.y = n.facing ?? 0;
      this.figures.set(n.id, f);
    }
    this.applyBlockers();
    this.placeCamera(true);
    this.setNear(null);
    this.deps.onEnterScene(id, x, z);
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight();
    const sun = new THREE.DirectionalLight();
    this.pipeline.applyLights(ambient, sun);
    this.scene.add(ambient);
    sun.position.set(-30, 45, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 45, bottom: -30, near: 1, far: 160 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun);
  }

  private clearScene(): void {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof LineSegments2) {
        o.geometry.dispose();
        const m = o.material as THREE.Material | THREE.Material[];
        if (!Array.isArray(m) && m.userData.own) {
          (m as THREE.MeshBasicMaterial).map?.dispose();
          m.dispose();
        }
      } else if (o instanceof THREE.DirectionalLight) {
        o.dispose();
      }
    });
    this.scene.clear();
  }

  private applyBlockers(): void {
    for (const b of this.build.blockers) if (b.mesh) b.mesh.visible = !this.deps.hasFlag(b.flag);
  }

  private blocked(x: number, z: number): boolean {
    const p = new THREE.Vector2(x, z);
    const hit = (b: THREE.Box2) => b.clone().expandByScalar(BODY).containsPoint(p);
    if (this.build.colliders.some(hit)) return true;
    if (this.build.blockers.some((b) => !this.deps.hasFlag(b.flag) && hit(b.box))) return true;
    return this.build.npcs.some((n) => n.kind === 'figure' && Math.hypot(n.x - x, n.z - z) < 0.9);
  }

  /** Returns true when the scene changed. */
  private tryExit(side: 'left' | 'right'): boolean {
    const exit = this.build.exits.find((e) => e.side === side);
    if (!exit) return false;
    if (exit.end) {
      if (!this.endSent) {
        this.endSent = true;
        this.deps.bus.emit('chapter:end', {});
      }
      return false;
    }
    this.loadScene(exit.to!, exit.toX!, exit.toZ!);
    return true;
  }

  private setNear(id: string | null): void {
    if (id === this.nearId) return;
    this.nearId = id;
    this.deps.bus.emit('world:near', { npcId: id });
  }

  private update(dt: number, t: number): void {
    const p = this.player.root.position;
    let moving = false;
    if (!this.frozen) {
      const k = this.keys;
      const dx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const dz = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
      if (dx || dz) {
        moving = true;
        const len = Math.hypot(dx, dz);
        const b = this.build.bounds;
        const nx = p.x + (dx / len) * SPEED * dt;
        if (nx < b.minX || nx > b.maxX) {
          if (this.tryExit(nx < b.minX ? 'left' : 'right')) return;
        } else if (!this.blocked(nx, p.z)) {
          p.x = nx;
        }
        const nz = THREE.MathUtils.clamp(p.z + (dz / len) * SPEED * dt, b.minZ, b.maxZ);
        if (!this.blocked(p.x, nz)) p.z = nz;
        const r = this.player.root.rotation;
        const target = Math.atan2(dx, dz);
        r.y += Math.atan2(Math.sin(target - r.y), Math.cos(target - r.y)) * 0.25;
      }
    }
    animateFigure(this.player, dt, moving, t);

    let near: string | null = null;
    let best = TALK_RADIUS;
    for (const n of this.build.npcs) {
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < best) {
        best = d;
        near = n.id;
      }
    }
    this.setNear(near);

    for (const [id, f] of this.figures) {
      animateFigure(f, dt, false, t + id.length);
      if (id === near) {
        const r = f.root.rotation;
        const target = Math.atan2(p.x - f.root.position.x, p.z - f.root.position.z);
        r.y += Math.atan2(Math.sin(target - r.y), Math.cos(target - r.y)) * 0.08;
      }
    }
    this.placeCamera(false);
    this.kit.tick(t, dt);
  }

  private placeCamera(snap: boolean): void {
    const p = this.player.root.position;
    const shot = this.closeShot ? CLOSE : this.build.shot;
    const dz = this.closeShot ? p.z : 0;
    const pos = new THREE.Vector3(shot.pos[0] + p.x * shot.follow, shot.pos[1], shot.pos[2] + dz);
    const look = new THREE.Vector3(shot.look[0] + p.x * shot.follow, shot.look[1], shot.look[2] + dz);
    if (snap) {
      this.camera.position.copy(pos);
      this.lookAt.copy(look);
    } else {
      this.camera.position.lerp(pos, 0.05);
      this.lookAt.lerp(look, 0.08);
    }
    this.camera.lookAt(this.lookAt);
  }

  private resize(): void {
    this.width = Math.max(1, this.parent.clientWidth);
    this.height = Math.max(1, this.parent.clientHeight);
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    setLineResolution(this.width, this.height);
    this.pipeline.setSize(this.width, this.height);
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt, this.clock.elapsedTime);
    this.pipeline.render(this.scene, this.camera);
  };
}
