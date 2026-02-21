import { createRemoteJWKSet, jwtVerify, type JWTVerifyResult, type FlattenedJWSInput, type JWSHeaderParameters, type GetKeyFunction } from 'jose';
import { readFileSync } from 'node:fs';

const K8S_SA_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';

export interface JwksClientConfig {
  /** Direct JWKS endpoint URL — skips OIDC discovery */
  jwksUri?: string;
  /** Issuer URL for OIDC discovery (used if jwksUri not set) */
  issuer?: string;
  /** JWKS cache max age in ms (default 600000 = 10 min) */
  cacheMaxAge?: number;
  /** Min time between JWKS refetches in ms (default 30000 = 30 sec) */
  cooldownDuration?: number;
}

export class JwksClient {
  private readonly config: Required<Omit<JwksClientConfig, 'jwksUri' | 'issuer'>> & Pick<JwksClientConfig, 'jwksUri' | 'issuer'>;
  private keyResolver: GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput> | null = null;
  private resolvedJwksUri: string | null = null;
  private lastFetchTime = 0;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: JwksClientConfig) {
    this.config = {
      jwksUri: config.jwksUri,
      issuer: config.issuer,
      cacheMaxAge: config.cacheMaxAge ?? 600_000,
      cooldownDuration: config.cooldownDuration ?? 30_000,
    };
  }

  /**
   * Verify a JWT's cryptographic signature using the JWKS.
   * Uses clockTolerance: MAX_SAFE_INTEGER so jose only checks the signature —
   * our middleware pipeline handles exp/aud validation.
   */
  async verifyToken(token: string): Promise<JWTVerifyResult> {
    const resolver = await this.getKeyResolver();
    return jwtVerify(token, resolver, {
      clockTolerance: Number.MAX_SAFE_INTEGER,
    });
  }

  private async getKeyResolver(): Promise<GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput>> {
    const now = Date.now();

    if (this.keyResolver && (now - this.lastFetchTime) < this.config.cacheMaxAge) {
      return this.keyResolver;
    }

    // Cooldown: don't refetch too frequently
    if (this.keyResolver && (now - this.lastFetchTime) < this.config.cooldownDuration) {
      return this.keyResolver;
    }

    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) {
      await this.refreshPromise;
      return this.keyResolver!;
    }

    this.refreshPromise = this.refresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }

    return this.keyResolver!;
  }

  private getK8sAuthHeaders(): Record<string, string> | undefined {
    try {
      const token = readFileSync(K8S_SA_TOKEN_PATH, 'utf-8').trim();
      return { Authorization: `Bearer ${token}` };
    } catch {
      return undefined;
    }
  }

  private async refresh(): Promise<void> {
    const jwksUri = await this.resolveJwksUri();
    const headers = this.getK8sAuthHeaders();

    this.keyResolver = createRemoteJWKSet(new URL(jwksUri), {
      headers,
    });

    this.resolvedJwksUri = jwksUri;
    this.lastFetchTime = Date.now();
  }

  private async resolveJwksUri(): Promise<string> {
    if (this.config.jwksUri) {
      return this.config.jwksUri;
    }

    if (this.resolvedJwksUri) {
      return this.resolvedJwksUri;
    }

    if (!this.config.issuer) {
      throw new Error('JWKS client requires either jwksUri or issuer to be configured');
    }

    const discoveryUrl = `${this.config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    const headers = this.getK8sAuthHeaders();
    const res = await fetch(discoveryUrl, { headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${discoveryUrl}`);
    }

    const discovery = await res.json() as Record<string, unknown>;

    if (!discovery.jwks_uri) {
      throw new Error(`OIDC discovery response missing jwks_uri from ${discoveryUrl}`);
    }

    return discovery.jwks_uri as string;
  }
}

// ── Singleton ──────────────────────────────────────────────────────

let singleton: JwksClient | null = null;

export function isJwksEnabled(): boolean {
  return !!(process.env.JWKS_URI || process.env.TOKEN_ISSUER);
}

export function getJwksClient(): JwksClient | null {
  if (!isJwksEnabled()) return null;

  if (!singleton) {
    singleton = new JwksClient({
      jwksUri: process.env.JWKS_URI,
      issuer: process.env.TOKEN_ISSUER,
      cacheMaxAge: process.env.JWKS_CACHE_MAX_AGE ? Number(process.env.JWKS_CACHE_MAX_AGE) : undefined,
      cooldownDuration: process.env.JWKS_COOLDOWN_DURATION ? Number(process.env.JWKS_COOLDOWN_DURATION) : undefined,
    });
  }

  return singleton;
}

/** Reset singleton — only for testing */
export function _resetJwksClient(): void {
  singleton = null;
}
