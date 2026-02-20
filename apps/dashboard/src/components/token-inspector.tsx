'use client';

import { useState } from 'react';
import { TokenStatus } from '@/lib/types';

interface Props {
  tokenStatus: TokenStatus | null;
  onRefresh: () => void;
}

export function TokenInspector({ tokenStatus, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Token Inspector</h2>
        <button
          onClick={onRefresh}
          className="text-xs px-3 py-1 rounded bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Refresh
        </button>
      </div>

      {!tokenStatus || !tokenStatus.exists ? (
        <div className="text-[var(--accent-red)] text-sm">
          {tokenStatus?.error || 'No token available'}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-[var(--muted)]">Subject</div>
            <div className="font-mono text-xs break-all">{tokenStatus.decoded?.sub}</div>

            <div className="text-[var(--muted)]">Issuer</div>
            <div className="font-mono text-xs break-all">{tokenStatus.decoded?.iss}</div>

            <div className="text-[var(--muted)]">Audience</div>
            <div className="font-mono text-xs break-all">
              {Array.isArray(tokenStatus.decoded?.aud)
                ? tokenStatus.decoded.aud.join(', ')
                : tokenStatus.decoded?.aud}
            </div>

            <div className="text-[var(--muted)]">Namespace</div>
            <div className="font-mono text-xs">{tokenStatus.decoded?.['kubernetes.io']?.namespace}</div>

            <div className="text-[var(--muted)]">Service Account</div>
            <div className="font-mono text-xs">{tokenStatus.decoded?.['kubernetes.io']?.serviceaccount?.name}</div>

            <div className="text-[var(--muted)]">Pod</div>
            <div className="font-mono text-xs">{tokenStatus.decoded?.['kubernetes.io']?.pod?.name}</div>

            <div className="text-[var(--muted)]">Status</div>
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${tokenStatus.isExpired ? 'bg-red-900/50 text-[var(--accent-red)]' : 'bg-green-900/50 text-[var(--accent-green)]'}`}>
                {tokenStatus.isExpired ? 'Expired' : 'Valid'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            {expanded ? 'Collapse' : 'Show'} raw JWT payload
          </button>

          {expanded && (
            <pre className="text-xs bg-black/50 rounded p-3 overflow-auto max-h-64 font-mono">
              {JSON.stringify(tokenStatus.decoded, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
