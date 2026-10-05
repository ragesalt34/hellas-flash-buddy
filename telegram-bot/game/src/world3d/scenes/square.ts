import * as THREE from 'three';
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, toLeft, toRight, town } from './common';

export const square: SceneBuilder = (kit) => {
  town(kit);
  const solids = new Solids();
  // Fountain: basin, water, column, carved ΝΕΡΟ on the front
  kit.add(new THREE.CylinderGeometry(2.2, 2.3, 0.8, 16), PAL.stone, 0, 0.4, -1);
  kit.add(new THREE.CylinderGeometry(1.95, 1.95, 0.1, 16), PAL.sea, 0, 0.75, -1);
  kit.add(new THREE.CylinderGeometry(0.3, 0.38, 2.2, 10), PAL.wall, 0, 1.6, -1);
  kit.add(new THREE.CylinderGeometry(0.8, 0.4, 0.3, 12), PAL.stone, 0, 2.8, -1);
  kit.plaque('ΝΕΡΟ', 0, 0.5, 1.32, 1.4, 0.45);
  solids.add(0, -1, 4.6, 4.6);
  // Bench for the historian, olive trees, the church
  kit.box(3, 0.5, 0.8, PAL.wood, -10, 0, -3.4);
  solids.add(-10, -3.4, 3, 0.8);
  kit.olive(-16, -6);
  kit.olive(9, -6.5);
  solids.add(-16, -6, 1, 1).add(9, -6.5, 1, 1);
  kit.house(14, 0, -9, 7, 5.5, 6, { dome: true });
  kit.house(-4, 0, -9.5, 6, 4, 5, { flowers: true });
  solids.add(14, -9, 7, 6).add(-4, -9.5, 6, 5);
  kit.pot(-7.5, 0, -6.6);
  kit.pot(10.8, 0, -5.6);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [],
    exits: [toLeft('bakery'), toRight('lane')],
    npcs: [
      { id: 'fountain', kind: 'object', x: 0, z: -1, anchorY: 3.4 },
      { id: 'historian', kind: 'figure', x: -10, z: -2.5, cloak: PAL.wall, trim: PAL.blue, facing: 0.3, anchorY: 2.7 },
    ],
    shot: WIDE,
  };
};
