import type { SceneId } from '../../content/chapter1';
import type { SceneBuilder } from '../types';
import { BOUNDS, WIDE, toLeft, toRight, town } from './common';
import { pier } from './pier';

const ORDER: SceneId[] = ['pier', 'fish', 'bakery', 'square', 'lane', 'gate'];

/** Bare town square used until a scene gets its own builder. */
const placeholder =
  (id: SceneId): SceneBuilder =>
  (kit) => {
    town(kit);
    const i = ORDER.indexOf(id);
    return {
      bounds: BOUNDS,
      colliders: [],
      blockers: [],
      exits: [toLeft(ORDER[i - 1]), ...(i < ORDER.length - 1 ? [toRight(ORDER[i + 1])] : [])],
      npcs: [],
      shot: WIDE,
    };
  };

export const SCENE_BUILDERS: Record<SceneId, SceneBuilder> = {
  pier,
  fish: placeholder('fish'),
  bakery: placeholder('bakery'),
  square: placeholder('square'),
  lane: placeholder('lane'),
  gate: placeholder('gate'),
};
