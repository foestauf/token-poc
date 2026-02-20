'use client';

import { MiddlewareStep, CallResult } from '@/lib/types';

interface Props {
  authResult: CallResult | null;
  onCallProtected: () => void;
  loading: boolean;
}

const STEP_LABELS: Record<string, string> = {
  extract_bearer: 'Extract Bearer Token',
  decode_jwt: 'Decode JWT',
  check_expiry: 'Check Expiration',
  check_audience: 'Verify Audience',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  pass: { bg: 'bg-green-900/50', text: 'text-[var(--accent-green)]', icon: '\u2713' },
  fail: { bg: 'bg-red-900/50', text: 'text-[var(--accent-red)]', icon: '\u2717' },
  skip: { bg: 'bg-yellow-900/50', text: 'text-[var(--accent-yellow)]', icon: '\u2014' },
};

export function AuthFlowDiagram({ authResult, onCallProtected, loading }: Props) {
  const steps: MiddlewareStep[] = (authResult?.body as { steps?: MiddlewareStep[] })?.steps || [];

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Auth Flow</h2>
        <button
          onClick={onCallProtected}
          disabled={loading}
          className="text-xs px-3 py-1 rounded bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Calling...' : 'Test Auth Flow'}
        </button>
      </div>

      {!authResult ? (
        <div className="text-[var(--muted)] text-sm">
          Click &quot;Test Auth Flow&quot; to call consumer-service &rarr; token-service with projected token auth
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={authResult.success ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
              {authResult.success ? '\u2713 Authenticated' : '\u2717 Failed'}
            </span>
            <span className="text-[var(--muted)]">HTTP {authResult.status}</span>
          </div>

          <div className="space-y-2">
            {steps.map((step, i) => {
              const style = STATUS_STYLES[step.status] || STATUS_STYLES.skip;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${style.bg} ${style.text}`}>
                      {style.icon}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-px h-4 bg-[var(--card-border)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {STEP_LABELS[step.step] || step.step}
                    </div>
                    <div className="text-xs text-[var(--muted)] break-all">
                      {step.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {authResult.error && (
            <div className="text-xs text-[var(--accent-red)] bg-red-900/20 rounded p-2">
              {authResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
