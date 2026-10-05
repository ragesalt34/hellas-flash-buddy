import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, box2, toLeft, town } from './common';

export const gate: SceneBuilder = (kit) => {
  town(kit);
  const solids = new Solids();
  // City wall with two towers and a gateway at z ∈ [-1.4, 1.4]
  kit.box(2, 6, 7, PAL.stone, 13, 0, -6.4);
  kit.box(2, 6, 3.6, PAL.stone, 13, 0, 6.2);
  kit.box(3, 8, 2.2, PAL.stone, 13, 0, -2.5);
  kit.box(3, 8, 2.2, PAL.stone, 13, 0, 2.5);
  kit.box(3, 1.4, 2.8, PAL.stone, 13, 5.6, 0);
  kit.plaque('ΑΘΗΝΑ', 13, 6.3, 3.66, 2.6, 0.8);
  solids.add(13, -6.4, 2, 7).add(13, 6.2, 2, 3.6).add(13, -2.5, 3, 2.2).add(13, 2.5, 3, 2.2);
  const bar = kit.box(0.4, 0.4, 2.8, PAL.wood, 13, 1.2, 0);
  // The road beyond, with cypresses
  kit.box(10, 0.05, 3, PAL.stoneDark, 18.5, 0, 0);
  kit.cypress(16, -5);
  kit.cypress(19.5, -6);
  kit.cypress(21, 4.5);
  solids.add(16, -5, 1.2, 1.2).add(21, 4.5, 1.2, 1.2);

  // Ticket booth
  kit.box(3.6, 3, 0.3, PAL.wood, -6, 0, -4.8);
  kit.box(0.3, 3, 2, PAL.wood, -7.8, 0, -3.8);
  kit.box(0.3, 3, 2, PAL.wood, -4.2, 0, -3.8);
  kit.box(3.6, 1.1, 0.4, PAL.wood, -6, 0, -2.8);
  kit.box(4, 0.2, 2.6, PAL.blue, -6, 3, -3.7);
  kit.signboard('ΕΙΣΙΤΗΡΙΟ', -6, 3.2, -2.5, 4.2, 0.8);
  solids.add(-6, -3.8, 3.9, 2.4);
  kit.pot(-9, 0, -2.5);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [{ flag: 'gate_open', box: box2(13, 0, 1.2, 2.8), mesh: bar }],
    exits: [toLeft('lane'), { side: 'right', end: true }],
    npcs: [
      { id: 'seller', kind: 'figure', x: -6, z: -3.7, cloak: PAL.green, trim: PAL.wall, facing: 0, anchorY: 2.7 },
      { id: 'guard', kind: 'figure', x: 11, z: 2.4, cloak: PAL.brown, trim: PAL.ochre, facing: -1.2, anchorY: 2.7 },
    ],
    shot: WIDE,
  };
};
