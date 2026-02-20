'use client';

import { useState, useEffect } from 'react';
import { TokenStatus } from '@/lib/types';

interface Props {
  tokenStatus: TokenStatus | null;
}

export function ExpirationCountdown({ tokenStatus }: Props) {
  const [ttl, setTtl] = useState<number>(0);
  const [totalLifetime, setTotalLifetime] = useState<number>(1);

  useEffect(() => {
    if (!tokenStatus?.decoded) return;

    const { exp, iat } = tokenStatus.decoded;
    setTotalLifetime(exp - iat);

    const tick = () => {
      const remaining = Math.max(0, Math.floor(exp - Date.now() / 1000));
      setTtl(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tokenStatus]);

  const pct = totalLifetime > 0 ? Math.max(0, Math.min(100, (ttl / totalLifetime) * 100)) : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const barColor =
    pct > 50 ? 'bg-[var(--accent-green)]' :
    pct > 20 ? 'bg-[var(--accent-yellow)]' :
    'bg-[var(--accent-red)]';

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold mb-4">Expiration Countdown</h2>

      {!tokenStatus?.decoded ? (
        <div className="text-[var(--muted)] text-sm">No token available</div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold tabular-nums">
              {formatTime(ttl)}
            </div>
            <div className="text-[var(--muted)] text-sm mt-1">remaining</div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>Token lifetime</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-3 bg-black/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[var(--muted)]">Issued at</div>
              <div className="font-mono">{new Date(tokenStatus.decoded.iat * 1000).toLocaleTimeString()}</div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Expires at</div>
              <div className="font-mono">{new Date(tokenStatus.decoded.exp * 1000).toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
