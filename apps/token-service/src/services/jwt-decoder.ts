import { decodeJwt, isTokenExpired, getTokenTtlSeconds, DecodedJwt } from '@token-poc/token-utils';

export interface TokenInfo {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  isExpired: boolean;
  ttlSeconds: number;
  expiresAt: string;
  issuedAt: string;
}

export function getTokenInfo(token: string): TokenInfo {
  const decoded: DecodedJwt = decodeJwt(token);
  const payload = decoded.payload;

  return {
    header: decoded.header,
    payload: payload as unknown as Record<string, unknown>,
    isExpired: isTokenExpired(payload),
    ttlSeconds: getTokenTtlSeconds(payload),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    issuedAt: new Date(payload.iat * 1000).toISOString(),
  };
}
