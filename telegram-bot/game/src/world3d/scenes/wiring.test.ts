import { describe, expect, it } from 'vitest';
import { NPCS, SCENES } from '../../content/chapter1';

// Builders need WebGL-free three.js only, but the Kit draws text into canvases,
// so the wiring is checked from the source of truth instead: every NPC's scene exists.
describe('scene wiring', () => {
  it('every NPC lives in a known scene', () => {
    const ids = new Set(SCENES.map((s) => s.id));
    for (const n of NPCS) expect(ids.has(n.scene as never), `${n.id} → ${n.scene}`).toBe(true);
  });
});
