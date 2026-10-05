import { describe, expect, it, vi } from 'vitest';
import { Bus } from './bus';

describe('Bus', () => {
  it('delivers payloads to subscribers', () => {
    const b = new Bus();
    const fn = vi.fn();
    b.on('challenge:result', fn);
    b.emit('challenge:result', { requestId: 'r1', correct: true });
    expect(fn).toHaveBeenCalledWith({ requestId: 'r1', correct: true });
  });

  it('stops delivering after unsubscribe', () => {
    const b = new Bus();
    const fn = vi.fn();
    const off = b.on('game:pause', fn);
    off();
    b.emit('game:pause', { paused: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it('ignores events nobody listens to', () => {
    expect(() => new Bus().emit('game:pause', { paused: false })).not.toThrow();
  });
});
