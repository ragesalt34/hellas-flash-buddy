import * as THREE from 'three';
import { gradientStrip, type Look } from './pipeline';

/** Piraeus: warm sun on whitewash, cool lavender shade, blue-brown ink, terracotta haze far away. */
export function piraeusLook(): Look {
  return {
    shade: new THREE.Color(0.8, 0.79, 0.92),
    lightTint: new THREE.Color(1, 0.97, 0.93),
    edgeTint: new THREE.Color(0.42, 0.33, 0.5),
    edgeDark: 0.62,
    edgeDepth: 1,
    edgeNormal: 1,
    filterTex: gradientStrip('#c9705a', '#e7a57c'),
    filterU: 0.5,
    filterRate: 0.55,
    minDepth: 55,
    maxDepth: 170,
    // Height filter off: the sea sits below the quay and should keep its colour.
    minY: -100,
    maxY: -99,
    hatchRate: 0.6,
    hatchSpacing: 7,
  };
}
