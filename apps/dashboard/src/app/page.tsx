'use client';

import { useState, useEffect, useCallback } from 'react';
import { TokenInspector } from '@/components/token-inspector';
import { ExpirationCountdown } from '@/components/expiration-countdown';
import { AuthFlowDiagram } from '@/components/auth-flow-diagram';
import { TokenRefreshLog } from '@/components/token-refresh-log';
import { TokenStrategy } from '@/components/token-strategy';
import { TokenStatus, CallResult } from '@/lib/types';

export default function Home() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [authResult, setAuthResult] = useState<CallResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [callLoading, setCallLoading] = useState(false);

  const fetchTokenStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/token/status');
      const data = await res.json();
      setTokenStatus(data);
    } catch (err) {
      setTokenStatus({ exists: false, error: err instanceof Error ? err.message : 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  }, []);

  const callProtected = useCallback(async () => {
    setCallLoading(true);
    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: '/api/protected/middleware-steps' }),
      });
      const data = await res.json();
      setAuthResult(data);
    } catch (err) {
      setAuthResult({
        success: false,
        status: 0,
        body: null,
        targetEndpoint: '/api/protected/middleware-steps',
        error: err instanceof Error ? err.message : 'Failed to call',
      });
    } finally {
      setCallLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokenStatus();
    const interval = setInterval(fetchTokenStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchTokenStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--muted)]">Loading token state...</div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="border-b border-[var(--card-border)] pb-4">
        <h1 className="text-2xl font-bold">Token POC Dashboard</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Kubernetes projected service account tokens - proof of concept
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TokenInspector tokenStatus={tokenStatus} onRefresh={fetchTokenStatus} />
        <ExpirationCountdown tokenStatus={tokenStatus} />
        <AuthFlowDiagram
          authResult={authResult}
          onCallProtected={callProtected}
          loading={callLoading}
        />
        <TokenRefreshLog />
        <TokenStrategy />
      </div>
    </main>
  );
}
