export { decodeJwt, isTokenExpired, getTokenTtlSeconds, hasAudience } from './decode-jwt.js';
export type { DecodedJwt } from './decode-jwt.js';

export { readProjectedToken } from './read-token.js';

export { TokenWatcher } from './token-watcher.js';
export type { TokenRefreshEvent } from './token-watcher.js';

export { validateBearerToken } from './middleware.js';

export type {
  ProjectedTokenPayload,
  TokenStatus,
  TokenReviewResult,
  MiddlewareStep,
  AuthResult,
} from './token-types.js';
