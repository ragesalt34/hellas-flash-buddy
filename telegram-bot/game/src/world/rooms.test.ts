import { describe, expect, it } from 'vitest';
import { FLOOR_Y, H, W, dashDistance, jumpDistance, jumpHeight } from './constants';
import { ROOMS, START_ROOM, type RoomId } from './rooms';

const ids = Object.keys(ROOMS) as RoomId[];

describe('rooms', () => {
  it('every exit leads to a room with an exit back', () => {
    for (const id of ids) {
      for (const e of ROOMS[id].exits) {
        const target = ROOMS[e.to];
        expect(target, `${id} -> ${e.to}`).toBeDefined();
        expect(target.exits.some((b) => b.to === id), `${e.to} has no way back to ${id}`).toBe(true);
        expect(e.toX).toBeGreaterThan(0);
        expect(e.toX).toBeLessThan(W);
        expect(e.toY).toBeLessThan(H);
      }
    }
  });

  it('object ids are unique across the world', () => {
    const all = ids.flatMap((id) => [
      ...(ROOMS[id].walls ?? []).map((w) => w.id),
      ...(ROOMS[id].amphorae ?? []).map((a) => a.id),
      ...(ROOMS[id].enemies ?? []).map((e) => e.id),
    ]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('has exactly 4 amphorae, one boss and both altars', () => {
    expect(ids.flatMap((id) => ROOMS[id].amphorae ?? [])).toHaveLength(4);
    expect(ids.filter((id) => ROOMS[id].boss)).toHaveLength(1);
    expect(ids.flatMap((id) => (ROOMS[id].altars ?? []).map((a) => a.id)).sort()).toEqual(['dash', 'doubleJump']);
    expect(ROOMS[START_ROOM]).toBeDefined();
  });

  it('the Plaka gap needs the dash', () => {
    const [left, right] = ROOMS.K3.platforms.filter((p) => p.y === FLOOR_Y);
    const gap = right.x - (left.x + left.w);
    expect(jumpDistance()).toBeLessThan(gap);
    expect(jumpDistance() + dashDistance()).toBeGreaterThan(gap + 30);
  });

  it('the Agora wall needs the double jump', () => {
    const block = ROOMS.A3.platforms.find((p) => p.x === 760)!;
    const rise = FLOOR_Y - block.y;
    expect(jumpHeight()).toBeLessThan(rise);
    expect(2 * jumpHeight()).toBeGreaterThan(rise + 20);
  });
});
