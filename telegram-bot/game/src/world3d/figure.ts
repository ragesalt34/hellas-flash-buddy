import * as THREE from 'three';
import { PAL, type Kit } from './style';

export interface Figure {
  root: THREE.Group;
  rig: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  phase: number;
}

/** Hooded low-poly figure (the Chants silhouette) with a procedural walk cycle. */
export function figure(kit: Kit, cloak: number, trim: number, scale = 1): Figure {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const part = (geo: THREE.BufferGeometry, color: number, outline: 'hull' | 'none' = 'hull') =>
    kit.mesh(geo, color, outline, true, 1.09);

  const profile = [
    [0.01, 0.22],
    [0.52, 0.24],
    [0.46, 0.7],
    [0.36, 1.2],
    [0.3, 1.42],
    [0.01, 1.48],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  rig.add(part(new THREE.LatheGeometry(profile, 7), cloak));
  const hem = part(new THREE.CylinderGeometry(0.53, 0.53, 0.08, 7, 1, true), trim, 'none');
  hem.position.y = 0.27;
  rig.add(hem);

  const legs: THREE.Group[] = [];
  for (const sx of [-0.16, 0.16]) {
    const hip = new THREE.Group();
    hip.position.set(sx, 0.5, 0);
    const leg = part(new THREE.BoxGeometry(0.13, 0.5, 0.16), PAL.ink, 'none');
    leg.position.y = -0.25;
    hip.add(leg);
    rig.add(hip);
    legs.push(hip);
  }
  const arms: THREE.Group[] = [];
  for (const sx of [-0.36, 0.36]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx, 1.28, 0);
    const sleeve = part(new THREE.CylinderGeometry(0.09, 0.13, 0.62, 6), cloak);
    sleeve.position.y = -0.3;
    const hand = part(new THREE.IcosahedronGeometry(0.08, 0), PAL.skin, 'none');
    hand.position.y = -0.64;
    shoulder.add(sleeve, hand);
    shoulder.rotation.z = sx > 0 ? -0.12 : 0.12;
    rig.add(shoulder);
    arms.push(shoulder);
  }
  const hood = part(new THREE.SphereGeometry(0.33, 8, 6), cloak);
  hood.position.y = 1.72;
  const tip = part(new THREE.ConeGeometry(0.2, 0.55, 6), cloak);
  tip.position.set(0, 1.95, -0.22);
  tip.rotation.x = -0.9;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.19, 8), new THREE.MeshBasicMaterial({ color: PAL.ink }));
  face.position.set(0, 1.69, 0.3);
  const eyes = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.035), new THREE.MeshBasicMaterial({ color: 0xf2e6c8 }));
  eyes.position.set(0, 1.71, 0.305);
  for (const m of [face, eyes]) (m.material as THREE.Material).userData.own = true;
  const scarf = part(new THREE.TorusGeometry(0.28, 0.07, 5, 8), trim, 'none');
  scarf.position.y = 1.43;
  scarf.rotation.x = Math.PI / 2;
  rig.add(hood, tip, face, eyes, scarf);

  root.scale.setScalar(scale);
  kit.scene.add(root);
  return { root, rig, legs, arms, phase: 0 };
}

export function animateFigure(f: Figure, dt: number, moving: boolean, t: number): void {
  if (moving) f.phase += dt * 9;
  const swing = moving ? Math.sin(f.phase) * 0.7 : 0;
  f.legs[0].rotation.x = swing;
  f.legs[1].rotation.x = -swing;
  f.arms[0].rotation.x = -swing * 0.6;
  f.arms[1].rotation.x = swing * 0.6;
  f.rig.position.y = moving ? Math.abs(Math.sin(f.phase)) * 0.07 : Math.sin(t * 2) * 0.012;
  f.rig.rotation.x = THREE.MathUtils.lerp(f.rig.rotation.x, moving ? 0.1 : 0, 0.15);
}
