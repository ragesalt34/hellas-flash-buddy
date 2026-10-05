import * as THREE from 'three';
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, harbour, toLeft, toRight } from './common';

export const fish: SceneBuilder = (kit) => {
  harbour(kit);
  const solids = new Solids();
  kit.house(-16, 2, -12, 5, 4.6, 5);
  kit.house(-8, 2, -12.5, 7, 3.8, 4, { flowers: true });
  kit.house(2, 2, -12, 5, 5.4, 5);
  kit.house(10, 2, -11.5, 6, 4, 5, { flowers: true });
  kit.house(-12, 5, -22, 7, 6, 5);
  kit.house(-2, 5, -22.5, 6, 4.5, 5, { dome: true });
  kit.house(9, 5, -22, 6, 5, 5);
  kit.laundry(new THREE.Vector3(-13.5, 6.2, -9.3), new THREE.Vector3(-4.6, 6.4, -9.8), [PAL.wall, PAL.blue, PAL.red, PAL.wall]);

  // Fish stall
  kit.box(5, 0.9, 1.4, PAL.ochre, -4, 0, -1.2);
  solids.add(-4, -1.2, 5, 1.4);
  for (const px of [-6.2, -1.8]) kit.box(0.15, 3, 0.15, PAL.ink, px, 0, -1.8);
  kit.box(5.2, 0.15, 2.6, PAL.red, -4, 3, -1.4);
  kit.signboard('ΨΑΡΙΑ', -4, 3.15, -0.2);
  for (let i = 0; i < 4; i++) {
    const f = kit.add(new THREE.ConeGeometry(0.16, 0.7, 5), PAL.fishScale, -5.4 + i * 0.9, 1.05, -1.1, true);
    f.rotation.z = Math.PI / 2;
  }
  kit.crate(-8, 0, -1.4);
  kit.crate(-8, 0.9, -1.4);
  kit.crate(-9.1, 0, -1.4);
  solids.add(-8.5, -1.4, 2.2, 1);
  kit.boat(-12, 11, PAL.red, 0.1);
  kit.boat(8, 14, PAL.blue, -0.3);
  kit.bollard(-14, 6.2);
  kit.bollard(12, 6.2);
  solids.add(-14, 6.2, 0.7, 0.7).add(12, 6.2, 0.7, 0.7);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [],
    exits: [toLeft('pier'), toRight('bakery')],
    npcs: [
      { id: 'fisher', kind: 'figure', x: -4, z: -2.6, cloak: PAL.blue, trim: PAL.ochre, facing: 0, anchorY: 2.7 },
      { id: 'woman', kind: 'figure', x: 2.5, z: 1.2, cloak: PAL.magenta, trim: PAL.wall, facing: -1.3, anchorY: 2.7 },
    ],
    shot: WIDE,
  };
};
