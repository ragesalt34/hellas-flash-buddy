import * as THREE from 'three';
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, toLeft, toRight, town } from './common';

export const bakery: SceneBuilder = (kit) => {
  town(kit);
  const solids = new Solids();
  // The bakery: long whitewashed front with an ochre oven dome
  kit.house(-6, 0, -8, 10, 5, 5);
  solids.add(-6, -8, 10, 5);
  kit.signboard('ΨΩΜΙ', -6, 5.3, -5.4, 3.2, 0.9);
  kit.add(new THREE.SphereGeometry(1.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), PAL.ochre, 1.5, 0, -7.5);
  kit.box(0.6, 2.6, 0.6, PAL.stoneDark, 2.2, 1.2, -8);
  solids.add(1.5, -7.5, 3.6, 3.6);
  // Counter with loaves
  kit.box(4, 1, 1.2, PAL.wood, -6, 0, -3.6);
  solids.add(-6, -3.6, 4, 1.2);
  for (let i = 0; i < 4; i++) {
    const loaf = kit.add(new THREE.CapsuleGeometry(0.22, 0.5, 3, 6), PAL.ochre, -7.4 + i * 0.95, 1.2, -3.6, true);
    loaf.rotation.z = Math.PI / 2;
  }
  kit.house(8, 0, -9, 6, 4.5, 5, { flowers: true });
  kit.house(16, 0, -8.5, 5, 6, 5);
  solids.add(8, -9, 6, 5).add(16, -8.5, 5, 5);
  kit.pot(11.8, 0, -5.8);
  kit.pot(-12, 0, -5.4);
  kit.cat(13.5, 0, -5.6, -0.5);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [],
    exits: [toLeft('fish'), toRight('square')],
    npcs: [
      { id: 'baker', kind: 'figure', x: -6, z: -4.9, cloak: PAL.wall, trim: PAL.ochre, facing: 0, anchorY: 2.7 },
      { id: 'child', kind: 'figure', x: 5, z: 0.5, cloak: PAL.ochre, trim: PAL.blue, scale: 0.65, facing: -0.6, anchorY: 2 },
    ],
    shot: WIDE,
  };
};
