import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';
import { readProjectedToken } from './read-token.js';
import { TokenWatcher } from './token-watcher.js';

// ── Types ──────────────────────────────────────────────────────────

export type TokenStrategy = 'direct' | 'cached';

export interface TokenProvider {
  getToken(): Promise<string>;
  readonly strategy: TokenStrategy;
  close(): void;
}

export interface TokenProviderOptions {
  tokenPath?: string;
  strategy: TokenStrategy;
}

// ── OTel handles ───────────────────────────────────────────────────

const tracer = trace.getTracer('token-provider');
const meter = metrics.getMeter('token-provider');

const readDuration = meter.createHistogram('token.read.duration', {
  description: 'Time for getToken() to return (ms)',
  unit: 'ms',
});

const readCount = meter.createCounter('token.read.count', {
  description: 'Total token reads',
});

const cacheHitCount = meter.createCounter('token.cache.hit_count', {
  description: 'Cache hits (cached strategy only)',
});

const cacheMissCount = meter.createCounter('token.cache.miss_count', {
  description: 'Cache misses (cached strategy only)',
});

const cacheRefreshCount = meter.createCounter('token.cache.refresh_count', {
  description: 'File-change refreshes (cached strategy only)',
});

// ── DirectTokenProvider ────────────────────────────────────────────

const DEFAULT_TOKEN_PATH = '/var/run/secrets/tokens/token';

export class DirectTokenProvider implements TokenProvider {
  readonly strategy: TokenStrategy = 'direct';
  private readonly tokenPath: string;

  constructor(tokenPath?: string) {
    this.tokenPath = tokenPath ?? DEFAULT_TOKEN_PATH;
  }

  async getToken(): Promise<string> {
    return tracer.startActiveSpan('token.read', async (span) => {
      const start = performance.now();
      span.setAttribute('token.strategy', 'direct');
      span.setAttribute('token.path', this.tokenPath);

      try {
        const token = await readProjectedToken(this.tokenPath);
        const duration = performance.now() - start;

        readDuration.record(duration, { strategy: 'direct' });
        readCount.add(1, { strategy: 'direct', result: 'success' });

        span.setStatus({ code: SpanStatusCode.OK });
        return token;
      } catch (err) {
        readCount.add(1, { strategy: 'direct', result: 'error' });
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  close(): void {
    // No resources to clean up for direct reads
  }
}

// ── CachedTokenProvider ────────────────────────────────────────────

export class CachedTokenProvider implements TokenProvider {
  readonly strategy: TokenStrategy = 'cached';
  private readonly tokenPath: string;
  private cachedToken: string | null = null;
  private watcher: TokenWatcher;
  private initPromise: Promise<void> | null = null;

  constructor(tokenPath?: string) {
    this.tokenPath = tokenPath ?? DEFAULT_TOKEN_PATH;
    this.watcher = new TokenWatcher(this.tokenPath);

    this.watcher.on('refresh', () => {
      cacheRefreshCount.add(1);
      this.refreshCache();
    });

    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    this.cachedToken = await readProjectedToken(this.tokenPath);
    await this.watcher.start();
  }

  private async refreshCache(): Promise<void> {
    try {
      this.cachedToken = await readProjectedToken(this.tokenPath);
    } catch {
      // Keep stale cache on refresh failure
    }
  }

  async getToken(): Promise<string> {
    return tracer.startActiveSpan('token.read', async (span) => {
      const start = performance.now();
      span.setAttribute('token.strategy', 'cached');
      span.setAttribute('token.path', this.tokenPath);

      try {
        // Wait for initial load if still pending
        if (this.initPromise) {
          await this.initPromise;
          this.initPromise = null;
        }

        const hit = this.cachedToken !== null;
        span.setAttribute('token.cache.hit', hit);

        if (hit) {
          cacheHitCount.add(1);
        } else {
          cacheMissCount.add(1);
          this.cachedToken = await readProjectedToken(this.tokenPath);
        }

        const duration = performance.now() - start;
        readDuration.record(duration, { strategy: 'cached' });
        readCount.add(1, { strategy: 'cached', result: 'success' });

        span.setStatus({ code: SpanStatusCode.OK });
        return this.cachedToken!;
      } catch (err) {
        readCount.add(1, { strategy: 'cached', result: 'error' });
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  close(): void {
    this.watcher.stop();
  }
}

// ── Factory + Singleton ────────────────────────────────────────────

export function createTokenProvider(options: TokenProviderOptions): TokenProvider {
  const { tokenPath, strategy } = options;
  switch (strategy) {
    case 'cached':
      return new CachedTokenProvider(tokenPath);
    case 'direct':
      return new DirectTokenProvider(tokenPath);
    default:
      throw new Error(`Unknown token strategy: ${strategy as string}`);
  }
}

let singleton: TokenProvider | null = null;

export function getTokenProvider(): TokenProvider {
  if (!singleton) {
    const strategy = (process.env.TOKEN_STRATEGY as TokenStrategy) || 'direct';
    const tokenPath = process.env.TOKEN_PATH;
    singleton = createTokenProvider({ tokenPath, strategy });
  }
  return singleton;
}

/** Reset singleton — only for testing */
export function _resetTokenProvider(): void {
  if (singleton) {
    singleton.close();
  }
  singleton = null;
}
