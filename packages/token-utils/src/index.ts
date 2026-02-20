export { decodeJwt, isTokenExpired, getTokenTtlSeconds, hasAudience } from './decode-jwt.js';
export type { DecodedJwt } from './decode-jwt.js';

export { readProjectedToken } from './read-token.js';

export { TokenWatcher } from './token-watcher.js';
export type { TokenRefreshEvent } from './token-watcher.js';

export { createTokenProvider, getTokenProvider, _resetTokenProvider } from './token-provider.js';
export type { TokenProvider, TokenStrategy } from './token-provider.js';

export { validateBearerToken } from './middleware.js';

export { JwksClient, getJwksClient, isJwksEnabled } from './jwks-client.js';
export type { JwksClientConfig } from './jwks-client.js';

export type {
  ProjectedTokenPayload,
  TokenStatus,
  TokenReviewResult,
  MiddlewareStep,
  AuthResult,
} from './token-types.js';
