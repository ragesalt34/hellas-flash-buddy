import * as THREE from 'three';
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, box2, toLeft, toRight, town } from './common';

export const lane: SceneBuilder = (kit) => {
  town(kit);
  const solids = new Solids();
  kit.house(-16, 0, -8, 6, 6, 5, { flowers: true });
  kit.house(-8, 0, -8.5, 7, 5, 5);
  kit.house(0, 0, -8, 6, 6.5, 5);
  kit.house(8, 0, -8.5, 5, 5, 5, { flowers: true });
  solids.add(-16, -8, 6, 5).add(-8, -8.5, 7, 5).add(0, -8, 6, 5).add(8, -8.5, 5, 5);
  kit.plaque('ΣΠΙΤΙ', 1.5, 3.2, -5.4, 2, 0.6);
  kit.laundry(new THREE.Vector3(-13, 5.4, -5.3), new THREE.Vector3(-3, 5.6, -5.3), [PAL.red, PAL.wall, PAL.ochre, PAL.blue, PAL.wall]);
  for (let i = 0; i < 4; i++) kit.box(2.4, 0.3 * (i + 1), 0.7, PAL.stone, 4, 0, -5 - i * 0.7);
  kit.cat(4, 1.2, -6.1, 0.4);
  kit.pot(-12.5, 0, -5.2);
  kit.pot(11, 0, -5.6);

  // A wall across the lane (tall behind, low in front) with a locked blue door in the middle
  kit.box(1.2, 4.5, 8.1, PAL.wall, 14, 0, -4.95);
  kit.box(1.2, 1.3, 7.1, PAL.wall, 14, 0, 4.45); // low parapet on the camera side so the door stays visible
  kit.box(1.2, 1.2, 1.8, PAL.wall, 14, 3.3, 0);
  solids.add(14, -4.95, 1.2, 8.1).add(14, 4.45, 1.2, 7.1);
  const door = kit.box(0.3, 3.3, 1.8, PAL.blue, 14, 0, 0);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [{ flag: 'door_open', box: box2(14, 0, 1.2, 1.8), mesh: door }],
    exits: [toLeft('square'), toRight('gate')],
    npcs: [
      { id: 'man', kind: 'figure', x: -6, z: 0.5, cloak: PAL.ochre, trim: PAL.wall, facing: 0.4, anchorY: 2.7 },
      { id: 'door', kind: 'object', x: 14, z: 0, anchorY: 4 },
    ],
    shot: WIDE,
  };
};
