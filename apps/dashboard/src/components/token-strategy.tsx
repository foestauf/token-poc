'use client';

import { useState, useEffect } from 'react';

interface MetricsResponse {
  strategy: 'direct' | 'cached';
  timestamp: string;
  error?: string;
}

const strategyDescriptions: Record<string, string> = {
  direct: 'Reads the token file from disk on every request.',
  cached: 'Caches the token in memory and watches for file changes.',
};

export function TokenStrategy() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchMetrics() {
      try {
        const res = await fetch('/api/token/metrics');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data: MetricsResponse = await res.json();
        if (active) {
          setMetrics(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to fetch');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold mb-4">Token Strategy</h2>

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading metrics...</div>
      ) : error ? (
        <div className="text-sm text-[var(--accent-red)]">{error}</div>
      ) : metrics ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                metrics.strategy === 'cached'
                  ? 'bg-blue-900/50 text-blue-400'
                  : 'bg-green-900/50 text-[var(--accent-green)]'
              }`}
            >
              {metrics.strategy}
            </span>
          </div>

          <p className="text-sm text-[var(--muted)]">
            {strategyDescriptions[metrics.strategy]}
          </p>

          <div className="text-xs text-[var(--muted)]">
            Last checked: {new Date(metrics.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
