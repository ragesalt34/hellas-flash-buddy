import { s } from './strings';

export function Loading({ attempt, error, onRetry }: { attempt: number; error?: boolean; onRetry?: () => void }) {
  return (
    <div className="screen">
      <div className="panel">
        <div className="ship">⛵</div>
        {error ? (
          <>
            <p>{s('networkError')}</p>
            <button onClick={onRetry}>{s('retry')}</button>
          </>
        ) : (
          <>
            <p>{s('loading')}</p>
            {attempt > 0 && <p className="muted">{s('retrying', String(attempt))}</p>}
          </>
        )}
      </div>
    </div>
  );
}
