export async function fetchConsumerTokenStatus() {
  const res = await fetch('/api/token/status', { cache: 'no-store' });
  return res.json();
}

export async function callProtectedEndpoint() {
  const res = await fetch('/api/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: '/api/protected/middleware-steps' }),
  });
  return res.json();
}

export async function decodeToken(token: string) {
  const res = await fetch('/api/token/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export function createTokenWatchStream(): EventSource {
  return new EventSource('/api/token/watch');
}
