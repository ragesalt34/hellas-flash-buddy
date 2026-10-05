import type { SceneId } from '../../content/chapter1';
import type { SceneBuilder } from '../types';
import { bakery } from './bakery';
import { fish } from './fish';
import { gate } from './gate';
import { lane } from './lane';
import { pier } from './pier';
import { square } from './square';

export const SCENE_BUILDERS: Record<SceneId, SceneBuilder> = { pier, fish, bakery, square, lane, gate };
