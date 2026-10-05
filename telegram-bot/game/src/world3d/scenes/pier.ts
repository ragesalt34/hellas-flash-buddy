import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, harbour, toRight } from './common';

export const pier: SceneBuilder = (kit) => {
  harbour(kit);
  const solids = new Solids();
  kit.house(-14, 2, -12, 6, 4, 5, { flowers: true });
  kit.house(-6, 2, -12.5, 5, 5.2, 5);
  kit.house(3, 2, -11.5, 7, 3.8, 4);
  kit.house(11, 2, -12, 5, 4.6, 5, { flowers: true });
  kit.house(-10, 5, -22, 6, 5, 6, { dome: true });
  kit.house(1, 5, -22, 6, 6, 5);
  kit.house(10, 5, -21.5, 5, 4, 5);
  kit.pot(-18, 2, -9);
  kit.pot(6, 2, -9);

  kit.ship(-14, 10.5);
  kit.boat(9, 13, PAL.ochre, -0.25);

  kit.stele('ΛΙΜΑΝΙ', 0, 0.5);
  solids.add(0, 0.5, 2.4, 0.6);
  kit.signpost('ΑΘΗΝΑ', 18, 0);
  solids.add(18, 0, 0.6, 0.6);

  kit.crate(-18.5, 0, -1.5);
  kit.crate(-18.5, 0.9, -1.5);
  kit.crate(-17.4, 0, -1.5);
  solids.add(-18, -1.5, 2.2, 1);
  kit.bollard(-8, 6.2);
  kit.bollard(8, 6.2);
  solids.add(-8, 6.2, 0.7, 0.7).add(8, 6.2, 0.7, 0.7);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [],
    exits: [toRight('fish')],
    npcs: [
      { id: 'sailor', kind: 'figure', x: -11, z: 3.5, cloak: PAL.blue, trim: PAL.wall, facing: 0.8, anchorY: 2.7 },
      { id: 'woman_pier', kind: 'figure', x: 8, z: -1.5, cloak: PAL.terracotta, trim: PAL.wall, facing: -0.4, anchorY: 2.7 },
    ],
    shot: WIDE,
  };
};
