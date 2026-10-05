import { describe, expect, it } from 'vitest';
import { addDays, consolidated, dayKey, dueToday, enroll, grade } from './wordSrs';

const T = '2026-10-05';

describe('wordSrs', () => {
  it('formats local days and adds days across month ends', () => {
    expect(dayKey(new Date(2026, 0, 9))).toBe('2026-01-09');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('enrolls new words at level 0, due today, and leaves known ones alone', () => {
    const s = enroll({ fish: { level: 4, due: '2026-11-01' } }, ['fish', 'bread'], T);
    expect(s.bread).toEqual({ level: 0, due: T });
    expect(s.fish).toEqual({ level: 4, due: '2026-11-01' });
  });

  it('a right answer climbs the ladder and schedules by level', () => {
    const s = grade(enroll({}, ['fish'], T), 'fish', true, T);
    expect(s.fish).toEqual({ level: 2, due: '2026-10-06' });
  });

  it('a wrong answer drops two levels and is due again today', () => {
    const s = grade({ fish: { level: 4, due: T } }, 'fish', false, T);
    expect(s.fish).toEqual({ level: 2, due: T });
  });

  it('ignores grades for words that are not enrolled', () => {
    const s = {};
    expect(grade(s, 'fish', true, T)).toBe(s);
  });

  it('lists due words oldest first', () => {
    const s = { bread: { level: 1, due: T }, fish: { level: 2, due: '2026-10-01' }, water: { level: 3, due: '2026-10-09' } };
    expect(dueToday(s, T)).toEqual(['fish', 'bread']);
  });

  it('measures how much of a word set is consolidated', () => {
    const s = { fish: { level: 2, due: T }, bread: { level: 1, due: T } };
    expect(consolidated(s, ['fish', 'bread', 'water', 'ship'])).toBe(0.25);
    expect(consolidated(s, [])).toBe(0);
  });
});
