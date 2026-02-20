import { decodeJwt as joseDecodeJwt, decodeProtectedHeader } from 'jose';
import { ProjectedTokenPayload } from './token-types.js';

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: ProjectedTokenPayload;
}

export function decodeJwt(token: string): DecodedJwt {
  const header = decodeProtectedHeader(token) as Record<string, unknown>;
  const payload = joseDecodeJwt<ProjectedTokenPayload>(token);

  return { header, payload: payload as ProjectedTokenPayload };
}

export function isTokenExpired(payload: ProjectedTokenPayload): boolean {
  return Date.now() / 1000 > payload.exp;
}

export function getTokenTtlSeconds(payload: ProjectedTokenPayload): number {
  return Math.max(0, Math.floor(payload.exp - Date.now() / 1000));
}

export function hasAudience(payload: ProjectedTokenPayload, expectedAudience: string): boolean {
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  return audiences.includes(expectedAudience);
}
