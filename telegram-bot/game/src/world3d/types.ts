import type * as THREE from 'three';
import type { SceneId } from '../content/chapter1';
import type { Kit } from './style';

export interface Shot {
  pos: [number, number, number];
  look: [number, number, number];
  follow: number; // how much the shot slides with the player's x
}

export interface Exit {
  side: 'left' | 'right';
  to?: SceneId;
  toX?: number;
  toZ?: number;
  end?: boolean; // walking out here ends the chapter
}

export interface Blocker {
  flag: string; // passable once this story flag is set
  box: THREE.Box2;
  mesh?: THREE.Object3D; // hidden once passable
}

export interface NpcSpot {
  id: string;
  x: number;
  z: number;
  kind: 'figure' | 'object';
  cloak?: number;
  trim?: number;
  scale?: number;
  facing?: number;
  anchorY: number; // where the speech bubble sits
}

export interface SceneBuild {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  colliders: THREE.Box2[];
  blockers: Blocker[];
  exits: Exit[];
  npcs: NpcSpot[];
  shot: Shot;
}

export type SceneBuilder = (kit: Kit) => SceneBuild;
