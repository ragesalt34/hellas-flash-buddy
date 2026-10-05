import { useEffect, useRef } from 'react';
import { bus, type BusEvents } from '../bus';

/** Subscribe to a bus event for the component's lifetime; the latest `fn` is always used. */
export function useBusEvent<K extends keyof BusEvents>(event: K, fn: (payload: BusEvents[K]) => void): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => bus.on(event, (p) => ref.current(p)), [event]);
}
