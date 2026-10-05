import { bus } from '../bus';

/** Ask one exam question through the existing ChallengeController / ChallengeDialog. */
export function askExam(requestId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const off = bus.on('challenge:result', (r) => {
      if (r.requestId !== requestId) return;
      off();
      resolve(r.correct);
    });
    bus.emit('challenge:request', { requestId, source: 'historian', kind: 'exam' });
  });
}
