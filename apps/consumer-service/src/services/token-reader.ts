import { getTokenProvider, decodeJwt, isTokenExpired, getTokenTtlSeconds, TokenStatus } from '@token-poc/token-utils';

export async function getTokenStatus(): Promise<TokenStatus> {
  try {
    const token = await getTokenProvider().getToken();
    const decoded = decodeJwt(token);
    const payload = decoded.payload;

    return {
      exists: true,
      token,
      decoded: payload,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      expiresInSeconds: getTokenTtlSeconds(payload),
      isExpired: isTokenExpired(payload),
    };
  } catch (err) {
    return {
      exists: false,
      error: err instanceof Error ? err.message : 'Failed to read token',
    };
  }
}
