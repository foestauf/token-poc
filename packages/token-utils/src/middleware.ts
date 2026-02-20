import { decodeJwt, isTokenExpired, hasAudience } from './decode-jwt.js';
import { AuthResult, MiddlewareStep, ProjectedTokenPayload } from './token-types.js';
import { getJwksClient, isJwksEnabled } from './jwks-client.js';

function makeStep(step: string, status: MiddlewareStep['status'], detail: string): MiddlewareStep {
  return { step, status, detail, timestamp: Date.now() };
}

export async function validateBearerToken(authHeader: string | undefined, expectedAudience?: string): Promise<AuthResult> {
  const steps: MiddlewareStep[] = [];

  // Step 1: Extract bearer token
  if (!authHeader) {
    steps.push(makeStep('extract_bearer', 'fail', 'No Authorization header present'));
    return { authenticated: false, steps, error: 'Missing Authorization header' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    steps.push(makeStep('extract_bearer', 'fail', `Invalid scheme: ${authHeader.split(' ')[0]}`));
    return { authenticated: false, steps, error: 'Invalid Authorization scheme' };
  }

  const token = authHeader.slice(7);
  if (!token) {
    steps.push(makeStep('extract_bearer', 'fail', 'Empty bearer token'));
    return { authenticated: false, steps, error: 'Empty bearer token' };
  }

  steps.push(makeStep('extract_bearer', 'pass', 'Bearer token extracted'));

  // Step 2: Decode JWT
  let payload: ProjectedTokenPayload;
  try {
    const decoded = decodeJwt(token);
    payload = decoded.payload;
    steps.push(makeStep('decode_jwt', 'pass', `JWT decoded, sub: ${payload.sub}`));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown decode error';
    steps.push(makeStep('decode_jwt', 'fail', message));
    return { authenticated: false, steps, error: message };
  }

  // Step 3: Verify signature (opt-in via JWKS env vars)
  if (isJwksEnabled()) {
    const client = getJwksClient();
    try {
      await client!.verifyToken(token);
      steps.push(makeStep('verify_signature', 'pass', 'Signature verified via JWKS'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signature verification failed';
      steps.push(makeStep('verify_signature', 'fail', message));
      return { authenticated: false, steps, payload, error: 'Signature verification failed' };
    }
  } else {
    steps.push(makeStep('verify_signature', 'skip', 'JWKS not configured'));
  }

  // Step 4: Check expiry
  if (isTokenExpired(payload)) {
    steps.push(makeStep('check_expiry', 'fail', `Token expired at ${new Date(payload.exp * 1000).toISOString()}`));
    return { authenticated: false, steps, payload, error: 'Token expired' };
  }
  steps.push(makeStep('check_expiry', 'pass', `Expires at ${new Date(payload.exp * 1000).toISOString()}`));

  // Step 5: Check audience
  if (expectedAudience) {
    if (!hasAudience(payload, expectedAudience)) {
      const actual = Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud;
      steps.push(makeStep('check_audience', 'fail', `Expected "${expectedAudience}", got "${actual}"`));
      return { authenticated: false, steps, payload, error: 'Invalid audience' };
    }
    steps.push(makeStep('check_audience', 'pass', `Audience "${expectedAudience}" matched`));
  } else {
    steps.push(makeStep('check_audience', 'skip', 'No audience check configured'));
  }

  return { authenticated: true, steps, payload };
}
