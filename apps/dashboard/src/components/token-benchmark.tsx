'use client';

import { useState } from 'react';
import { BenchmarkResponse, BenchmarkStats } from '@/lib/types';

function fmt(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}us` : `${ms.toFixed(2)}ms`;
}

function StatRow({
  label,
  direct,
  cached,
  showBar,
}: {
  label: string;
  direct: number;
  cached: number;
  showBar?: boolean;
}) {
  const max = Math.max(direct, cached);
  const directPct = max > 0 ? (direct / max) * 100 : 0;
  const cachedPct = max > 0 ? (cached / max) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span className="w-16 font-medium">{label}</span>
        <span className="w-24 text-right text-green-400">{fmt(direct)}</span>
        <span className="w-24 text-right text-blue-400">{fmt(cached)}</span>
      </div>
      {showBar && (
        <div className="flex gap-2">
          <div className="flex-1 h-2 rounded-full bg-[var(--card-border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500/70 transition-all duration-300"
              style={{ width: `${directPct}%` }}
            />
          </div>
          <div className="flex-1 h-2 rounded-full bg-[var(--card-border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500/70 transition-all duration-300"
              style={{ width: `${cachedPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatsPanel({ stats }: { stats: BenchmarkStats }) {
  const color =
    stats.strategy === 'direct' ? 'text-green-400' : 'text-blue-400';
  const badge =
    stats.strategy === 'direct'
      ? 'bg-green-900/50 text-[var(--accent-green)]'
      : 'bg-blue-900/50 text-blue-400';

  return (
    <div className="space-y-2">
      <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>
        {stats.strategy}
      </span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
        <div className="text-[var(--muted)]">Mean</div>
        <div className={color}>{fmt(stats.mean)}</div>
        <div className="text-[var(--muted)]">Median</div>
        <div className={color}>{fmt(stats.median)}</div>
        <div className="text-[var(--muted)]">P95</div>
        <div className={color}>{fmt(stats.p95)}</div>
        <div className="text-[var(--muted)]">P99</div>
        <div className={color}>{fmt(stats.p99)}</div>
        <div className="text-[var(--muted)]">Min</div>
        <div className={color}>{fmt(stats.min)}</div>
        <div className="text-[var(--muted)]">Max</div>
        <div className={color}>{fmt(stats.max)}</div>
      </div>
    </div>
  );
}

export function TokenBenchmark() {
  const [iterations, setIterations] = useState(100);
  const [result, setResult] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runBenchmark() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/token/benchmark?iterations=${iterations}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: BenchmarkResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benchmark failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lg:col-span-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold mb-4">Token Read Benchmark</h2>

      <div className="flex items-end gap-3 mb-5">
        <div>
          <label
            htmlFor="iterations"
            className="block text-xs text-[var(--muted)] mb-1"
          >
            Iterations
          </label>
          <input
            id="iterations"
            type="number"
            min={1}
            max={1000}
            value={iterations}
            onChange={(e) =>
              setIterations(
                Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)),
              )
            }
            className="w-24 px-2 py-1.5 text-sm rounded border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)]"
          />
        </div>
        <button
          onClick={runBenchmark}
          disabled={loading}
          className="px-4 py-1.5 text-sm rounded bg-[var(--accent)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Running...' : 'Run Benchmark'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-[var(--accent-red)] mb-4">{error}</div>
      )}

      {!result && !loading && !error && (
        <div className="text-sm text-[var(--muted)]">
          Configure iterations and hit Run to compare direct vs cached token
          reads.
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <StatsPanel stats={result.direct} />
            <StatsPanel stats={result.cached} />
          </div>

          <div className="border-t border-[var(--card-border)] pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
              <span className="w-16">Metric</span>
              <span className="w-24 text-right text-green-400">Direct</span>
              <span className="w-24 text-right text-blue-400">Cached</span>
            </div>
            <StatRow
              label="Mean"
              direct={result.direct.mean}
              cached={result.cached.mean}
              showBar
            />
            <StatRow
              label="Median"
              direct={result.direct.median}
              cached={result.cached.median}
              showBar
            />
            <StatRow
              label="P95"
              direct={result.direct.p95}
              cached={result.cached.p95}
              showBar
            />
          </div>

          <div className="text-xs text-[var(--muted)]">
            {result.iterations} iterations at{' '}
            {new Date(result.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
