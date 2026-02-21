import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateKeyPair, SignJWT, exportJWK } from 'jose';
import http from 'node:http';
import { JwksClient, isJwksEnabled, getJwksClient, _resetJwksClient } from './jwks-client.js';
import { validateBearerToken } from './middleware.js';

// ── Helpers ────────────────────────────────────────────────────────

function makeK8sPayload(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: 'https://kubernetes.default.svc.cluster.local',
    sub: 'system:serviceaccount:default:my-sa',
    aud: 'token-service',
    exp: now + 3600,
    iat: now,
    nbf: now,
    'kubernetes.io': {
      namespace: 'default',
      pod: { name: 'my-pod', uid: 'pod-uid' },
      serviceaccount: { name: 'my-sa', uid: 'sa-uid' },
    },
    ...overrides,
  };
}

/** Spin up a tiny HTTP server that serves a JWKS document */
async function createJwksServer(jwks: object): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(jwks));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const url = `http://127.0.0.1:${addr.port}`;

  return {
    url,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/** Create a signed JWT using the given private key */
async function signToken(privateKey: CryptoKey, kid: string, payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'RS256', kid })
    .sign(privateKey);
}

// ── Tests ──────────────────────────────────────────────────────────

describe('isJwksEnabled', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup.JWKS_URI = process.env.JWKS_URI;
    envBackup.TOKEN_ISSUER = process.env.TOKEN_ISSUER;
    delete process.env.JWKS_URI;
    delete process.env.TOKEN_ISSUER;
    _resetJwksClient();
  });

  afterEach(() => {
    process.env.JWKS_URI = envBackup.JWKS_URI;
    process.env.TOKEN_ISSUER = envBackup.TOKEN_ISSUER;
    _resetJwksClient();
  });

  it('returns false when no env vars set', () => {
    expect(isJwksEnabled()).toBe(false);
  });

  it('returns true when JWKS_URI is set', () => {
    process.env.JWKS_URI = 'http://example.com/jwks';
    expect(isJwksEnabled()).toBe(true);
  });

  it('returns true when TOKEN_ISSUER is set', () => {
    process.env.TOKEN_ISSUER = 'https://kubernetes.default.svc.cluster.local';
    expect(isJwksEnabled()).toBe(true);
  });
});

describe('getJwksClient', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup.JWKS_URI = process.env.JWKS_URI;
    delete process.env.JWKS_URI;
    delete process.env.TOKEN_ISSUER;
    _resetJwksClient();
  });

  afterEach(() => {
    process.env.JWKS_URI = envBackup.JWKS_URI;
    _resetJwksClient();
  });

  it('returns null when JWKS not enabled', () => {
    expect(getJwksClient()).toBeNull();
  });

  it('returns a JwksClient when JWKS_URI is set', () => {
    process.env.JWKS_URI = 'http://example.com/jwks';
    const client = getJwksClient();
    expect(client).toBeInstanceOf(JwksClient);
  });

  it('returns the same singleton on repeated calls', () => {
    process.env.JWKS_URI = 'http://example.com/jwks';
    const a = getJwksClient();
    const b = getJwksClient();
    expect(a).toBe(b);
  });
});

describe('JwksClient.verifyToken', () => {
  let server: { url: string; close: () => Promise<void> };

  afterEach(async () => {
    if (server) await server.close();
  });

  it('verifies a properly signed token', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const kid = 'test-key-1';
    const jwk = await exportJWK(publicKey);
    jwk.kid = kid;
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    server = await createJwksServer({ keys: [jwk] });

    const client = new JwksClient({
      jwksUri: `${server.url}/jwks`,
    });

    const payload = makeK8sPayload();
    const token = await signToken(privateKey, kid, payload);

    const result = await client.verifyToken(token);
    expect(result.payload.sub).toBe('system:serviceaccount:default:my-sa');
  });

  it('rejects a token signed with the wrong key', async () => {
    const { publicKey } = await generateKeyPair('RS256');
    const { privateKey: wrongKey } = await generateKeyPair('RS256');
    const kid = 'test-key-1';
    const jwk = await exportJWK(publicKey);
    jwk.kid = kid;
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    server = await createJwksServer({ keys: [jwk] });

    const client = new JwksClient({
      jwksUri: `${server.url}/jwks`,
    });

    const payload = makeK8sPayload();
    const token = await signToken(wrongKey, kid, payload);

    await expect(client.verifyToken(token)).rejects.toThrow();
  });

  it('does not refetch JWKS within cooldown period', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const kid = 'test-key-1';
    const jwk = await exportJWK(publicKey);
    jwk.kid = kid;
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    let fetchCount = 0;
    const jwksServer = http.createServer((_req, res) => {
      fetchCount++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [jwk] }));
    });

    await new Promise<void>((resolve) => jwksServer.listen(0, '127.0.0.1', resolve));
    const addr = jwksServer.address() as { port: number };

    const client = new JwksClient({
      jwksUri: `http://127.0.0.1:${addr.port}/jwks`,
      cooldownDuration: 60_000,
      cacheMaxAge: 60_000,
    });

    const payload = makeK8sPayload();
    const token = await signToken(privateKey, kid, payload);

    // First call triggers a fetch
    await client.verifyToken(token);
    // Second call should use cache
    await client.verifyToken(token);

    // jose's createRemoteJWKSet fetches on first use — we should only see 1 fetch total
    // (the JwksClient creates the resolver once, then jose caches internally)
    expect(fetchCount).toBeLessThanOrEqual(1);

    await new Promise<void>((resolve) => jwksServer.close(() => resolve()));
  });
});

describe('middleware verify_signature step', () => {
  let server: { url: string; close: () => Promise<void> };
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup.JWKS_URI = process.env.JWKS_URI;
    envBackup.TOKEN_ISSUER = process.env.TOKEN_ISSUER;
    delete process.env.JWKS_URI;
    delete process.env.TOKEN_ISSUER;
    _resetJwksClient();
  });

  afterEach(async () => {
    process.env.JWKS_URI = envBackup.JWKS_URI;
    process.env.TOKEN_ISSUER = envBackup.TOKEN_ISSUER;
    _resetJwksClient();
    if (server) await server.close();
  });

  it('skips verify_signature when JWKS not configured', async () => {
    const { privateKey } = await generateKeyPair('RS256');
    const payload = makeK8sPayload();
    const token = await signToken(privateKey, 'k1', payload);

    const result = await validateBearerToken(`Bearer ${token}`, 'token-service');

    const sigStep = result.steps.find((s) => s.step === 'verify_signature');
    expect(sigStep).toBeDefined();
    expect(sigStep!.status).toBe('skip');
    expect(result.authenticated).toBe(true);
  });

  it('passes verify_signature with valid JWKS', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const kid = 'mw-test-key';
    const jwk = await exportJWK(publicKey);
    jwk.kid = kid;
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    server = await createJwksServer({ keys: [jwk] });
    process.env.JWKS_URI = `${server.url}/jwks`;
    _resetJwksClient();

    const payload = makeK8sPayload();
    const token = await signToken(privateKey, kid, payload);

    const result = await validateBearerToken(`Bearer ${token}`, 'token-service');

    const sigStep = result.steps.find((s) => s.step === 'verify_signature');
    expect(sigStep).toBeDefined();
    expect(sigStep!.status).toBe('pass');
    expect(result.authenticated).toBe(true);
  });

  it('fails verify_signature with wrong key', async () => {
    const { publicKey } = await generateKeyPair('RS256');
    const { privateKey: wrongKey } = await generateKeyPair('RS256');
    const kid = 'mw-test-key';
    const jwk = await exportJWK(publicKey);
    jwk.kid = kid;
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    server = await createJwksServer({ keys: [jwk] });
    process.env.JWKS_URI = `${server.url}/jwks`;
    _resetJwksClient();

    const payload = makeK8sPayload();
    const token = await signToken(wrongKey, kid, payload);

    const result = await validateBearerToken(`Bearer ${token}`, 'token-service');

    const sigStep = result.steps.find((s) => s.step === 'verify_signature');
    expect(sigStep).toBeDefined();
    expect(sigStep!.status).toBe('fail');
    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('Signature verification failed');
  });

  it('includes all 5 steps in correct order when JWKS enabled', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const kid = 'order-test';
    const jwk = await exportJWK(publicKey);
    jwk.kid = kid;
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    server = await createJwksServer({ keys: [jwk] });
    process.env.JWKS_URI = `${server.url}/jwks`;
    _resetJwksClient();

    const payload = makeK8sPayload();
    const token = await signToken(privateKey, kid, payload);

    const result = await validateBearerToken(`Bearer ${token}`, 'token-service');

    const stepNames = result.steps.map((s) => s.step);
    expect(stepNames).toEqual([
      'extract_bearer',
      'decode_jwt',
      'verify_signature',
      'check_expiry',
      'check_audience',
    ]);
  });
});
