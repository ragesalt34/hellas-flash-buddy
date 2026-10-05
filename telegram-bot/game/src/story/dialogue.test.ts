import { describe, expect, it } from 'vitest';
import { applyEffects, matches, pickRule, type NpcDef, type WorldState } from './dialogue';

const w = (flags: string[] = [], inventory: WorldState['inventory'] = []): WorldState => ({ flags, inventory });

const fisher: NpcDef = {
  id: 'fisher',
  scene: 'fish',
  kind: 'person',
  rules: [
    { when: [{ flag: 'fish_given' }], say: ['Ψάρια!'] },
    { when: [{ has: 'bread' }], say: ['Ψωμί!'], effects: [{ take: 'bread' }, { give: 'fish' }, { set: 'fish_given' }] },
    { say: ['Θέλω ψωμί.'] },
  ],
};

describe('dialogue', () => {
  it('matches each condition kind', () => {
    expect(matches({ flag: 'a' }, w(['a']))).toBe(true);
    expect(matches({ flag: 'a' }, w())).toBe(false);
    expect(matches({ notFlag: 'a' }, w(['a']))).toBe(false);
    expect(matches({ has: 'key' }, w([], ['key']))).toBe(true);
    expect(matches({ lacks: 'key' }, w([], ['key']))).toBe(false);
  });

  it('picks the first rule whose conditions hold', () => {
    expect(pickRule(fisher, w())!.say).toEqual(['Θέλω ψωμί.']);
    expect(pickRule(fisher, w([], ['bread']))!.say).toEqual(['Ψωμί!']);
    expect(pickRule(fisher, w(['fish_given'], ['bread']))!.say).toEqual(['Ψάρια!']);
  });

  it('applies give, take and set', () => {
    const r = applyEffects(w([], ['bread']), [{ take: 'bread' }, { give: 'fish' }, { set: 'fish_given' }]);
    expect(r.world).toEqual({ flags: ['fish_given'], inventory: ['fish'] });
    expect(r.exam).toBe(false);
  });

  it('never duplicates items or flags and reports exams', () => {
    const start = w(['x'], ['fish']);
    const r = applyEffects(start, [{ give: 'fish' }, { set: 'x' }, { exam: true }]);
    expect(r.world).toBe(start);
    expect(r.exam).toBe(true);
  });

  it('caps the inventory', () => {
    const full = w([], ['water', 'bread', 'fish', 'ticket', 'key']);
    expect(applyEffects(full, [{ give: 'water' }]).world.inventory).toHaveLength(5);
  });
});
