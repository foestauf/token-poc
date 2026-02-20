import { readProjectedToken } from '@token-poc/token-utils';

const TOKEN_PATH = process.env.TOKEN_PATH || '/var/run/secrets/tokens/token';
const TOKEN_SERVICE_URL = process.env.TOKEN_SERVICE_URL || 'http://localhost:3001';

export async function callTokenService(endpoint: string): Promise<{ status: number; body: unknown }> {
  const token = await readProjectedToken(TOKEN_PATH);

  const url = `${TOKEN_SERVICE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await response.json();

  return {
    status: response.status,
    body,
  };
}

export async function callTokenServicePost(endpoint: string, payload: unknown): Promise<{ status: number; body: unknown }> {
  const token = await readProjectedToken(TOKEN_PATH);

  const url = `${TOKEN_SERVICE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  return {
    status: response.status,
    body,
  };
}
