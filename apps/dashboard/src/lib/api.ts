const TOKEN_SERVICE_URL = process.env.NEXT_PUBLIC_TOKEN_SERVICE_URL || 'http://localhost:3001';
const CONSUMER_SERVICE_URL = process.env.NEXT_PUBLIC_CONSUMER_SERVICE_URL || 'http://localhost:3002';

export async function fetchConsumerTokenStatus() {
  const res = await fetch(`${CONSUMER_SERVICE_URL}/api/token/status`, { cache: 'no-store' });
  return res.json();
}

export async function callProtectedEndpoint() {
  const res = await fetch(`${CONSUMER_SERVICE_URL}/api/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: '/api/protected/middleware-steps' }),
  });
  return res.json();
}

export async function decodeToken(token: string) {
  const res = await fetch(`${TOKEN_SERVICE_URL}/api/token/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export function createTokenWatchStream(): EventSource {
  return new EventSource(`${CONSUMER_SERVICE_URL}/api/token/watch`);
}
