import * as THREE from 'three';
import { gradientStrip, type Look } from './pipeline';

/**
 * Piraeus, tuned against Chants of Sennaar's garden (Jardin) frames: white light, peach-pink hatched shade,
 * maroon ink, and a magenta haze added with distance.
 */
export function piraeusLook(): Look {
  return {
    shade: new THREE.Color(0.98, 0.76, 0.72),
    lightTint: new THREE.Color(1, 1, 1),
    edgeTint: new THREE.Color(0.5, 0.16, 0.3),
    edgeDark: 0.6,
    edgeDepth: 1,
    edgeNormal: 1,
    filterTex: gradientStrip('#a0206e', '#d8609c'),
    filterU: 0.5,
    filterRate: 0,
    additiveRate: 0.35,
    minDepth: 50,
    maxDepth: 150,
    // Height filter off: the sea sits below the quay and should keep its colour.
    minY: -100,
    maxY: -99,
    hatchRate: 0.85,
    hatchSpacing: 5,
  };
}
