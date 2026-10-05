import * as THREE from 'three';
import type { SceneId } from '../../content/chapter1';
import type { Kit } from '../style';
import type { Exit, Shot } from '../types';

export class Solids {
  readonly list: THREE.Box2[] = [];
  add(x: number, z: number, w: number, d: number): this {
    this.list.push(new THREE.Box2(new THREE.Vector2(x - w / 2, z - d / 2), new THREE.Vector2(x + w / 2, z + d / 2)));
    return this;
  }
}

export const box2 = (x: number, z: number, w: number, d: number) => new Solids().add(x, z, w, d).list[0];

export const BOUNDS = { minX: -22, maxX: 22, minZ: -4, maxZ: 6 };

/** High 3/4 shot looking down like Chants' cameras; drifts with the player. */
export const WIDE: Shot = { pos: [11, 24, 25], look: [-1, 0, -4], follow: 0.6 };

export const toLeft = (to: SceneId): Exit => ({ side: 'left', to, toX: 20.5, toZ: 2 });
export const toRight = (to: SceneId): Exit => ({ side: 'right', to, toX: -20.5, toZ: 2 });

export function harbour(kit: Kit): void {
  kit.backdrop();
  kit.sea();
  kit.quay();
  kit.terraces();
}

export function town(kit: Kit): void {
  kit.backdrop();
  kit.plaza();
  // Back row of houses on the first terrace — the town keeps climbing.
  kit.house(-20, 2, -16, 6, 4.5, 5);
  kit.house(-10, 2, -16.5, 7, 5.5, 5, { flowers: true });
  kit.house(1, 2, -16, 6, 4, 5);
  kit.house(12, 2, -16.5, 7, 6, 5, { dome: true });
  kit.house(22, 2, -16, 5, 4.5, 5);
}
