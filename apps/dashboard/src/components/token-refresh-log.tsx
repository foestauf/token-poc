'use client';

import { useState, useEffect, useRef } from 'react';
import { TokenRefreshEvent } from '@/lib/types';

export function TokenRefreshLog() {
  const [events, setEvents] = useState<TokenRefreshEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource('/api/token/watch');

    es.onmessage = (event) => {
      try {
        const data: TokenRefreshEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev.slice(-49), data]);

        if (data.type === 'connected') {
          setConnected(true);
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Token Refresh Log</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ${connected ? 'bg-green-900/50 text-[var(--accent-green)]' : 'bg-red-900/50 text-[var(--accent-red)]'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div
        ref={logRef}
        className="h-64 overflow-auto space-y-1 font-mono text-xs"
      >
        {events.length === 0 ? (
          <div className="text-[var(--muted)] text-center py-8">
            Waiting for token refresh events...
            <br />
            <span className="text-xs">Kubelet refreshes tokens at ~80% of their lifetime</span>
          </div>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-1.5 rounded ${
                event.type === 'refresh'
                  ? 'bg-blue-900/20'
                  : event.type === 'error'
                  ? 'bg-red-900/20'
                  : 'bg-green-900/10'
              }`}
            >
              <span className="text-[var(--muted)] shrink-0">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span className={
                event.type === 'refresh'
                  ? 'text-[var(--accent)]'
                  : event.type === 'error'
                  ? 'text-[var(--accent-red)]'
                  : 'text-[var(--accent-green)]'
              }>
                {event.type === 'connected' && 'SSE stream connected'}
                {event.type === 'refresh' && (
                  <>
                    Token refreshed
                    {event.newExp && ` - new expiry: ${new Date(event.newExp * 1000).toLocaleTimeString()}`}
                  </>
                )}
                {event.type === 'error' && `Error: ${event.message}`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
