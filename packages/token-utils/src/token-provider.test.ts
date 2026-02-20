import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// ── Mocks ──────────────────────────────────────────────────────────

const watcherInstances = vi.hoisted(() => [] as EventEmitter[]);

vi.mock('./read-token.js', () => ({
  readProjectedToken: vi.fn().mockResolvedValue('mock-token-value'),
}));

vi.mock('./token-watcher.js', async () => {
  const { EventEmitter: EE } = await import('events');
  class MockTokenWatcher extends EE {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn();
    constructor(_tokenPath: string) {
      super();
      watcherInstances.push(this);
    }
  }
  return { TokenWatcher: MockTokenWatcher };
});

import {
  DirectTokenProvider,
  CachedTokenProvider,
  createTokenProvider,
  getTokenProvider,
  _resetTokenProvider,
} from './token-provider.js';

import { readProjectedToken } from './read-token.js';

const mockReadProjectedToken = vi.mocked(readProjectedToken);

// ── DirectTokenProvider ────────────────────────────────────────────

describe('DirectTokenProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has strategy "direct"', () => {
    const provider = new DirectTokenProvider('/tmp/token');
    expect(provider.strategy).toBe('direct');
  });

  it('calls readProjectedToken on every getToken()', async () => {
    const provider = new DirectTokenProvider('/tmp/token');

    const t1 = await provider.getToken();
    const t2 = await provider.getToken();

    expect(t1).toBe('mock-token-value');
    expect(t2).toBe('mock-token-value');
    expect(mockReadProjectedToken).toHaveBeenCalledTimes(2);
    expect(mockReadProjectedToken).toHaveBeenCalledWith('/tmp/token');
  });

  it('propagates errors from readProjectedToken', async () => {
    mockReadProjectedToken.mockRejectedValueOnce(new Error('file not found'));
    const provider = new DirectTokenProvider('/tmp/token');

    await expect(provider.getToken()).rejects.toThrow('file not found');
  });

  it('close() is a no-op', () => {
    const provider = new DirectTokenProvider('/tmp/token');
    expect(() => provider.close()).not.toThrow();
  });
});

// ── CachedTokenProvider ────────────────────────────────────────────

describe('CachedTokenProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watcherInstances.length = 0;
  });

  it('has strategy "cached"', () => {
    const provider = new CachedTokenProvider('/tmp/token');
    expect(provider.strategy).toBe('cached');
    provider.close();
  });

  it('reads token eagerly on construction and returns cached value', async () => {
    const provider = new CachedTokenProvider('/tmp/token');

    const token = await provider.getToken();
    expect(token).toBe('mock-token-value');
    // 1 call from init + 0 from getToken (cache hit)
    expect(mockReadProjectedToken).toHaveBeenCalledTimes(1);

    provider.close();
  });

  it('does not re-read on subsequent getToken() calls', async () => {
    const provider = new CachedTokenProvider('/tmp/token');

    await provider.getToken();
    await provider.getToken();
    await provider.getToken();

    // Only the initial read
    expect(mockReadProjectedToken).toHaveBeenCalledTimes(1);
    provider.close();
  });

  it('refreshes cache when watcher emits "refresh"', async () => {
    const provider = new CachedTokenProvider('/tmp/token');

    // Wait for init
    await provider.getToken();

    mockReadProjectedToken.mockResolvedValueOnce('new-token-value');

    // Get the watcher instance and emit refresh
    const watcherInstance = watcherInstances[0]!;
    watcherInstance.emit('refresh', { timestamp: Date.now(), tokenPath: '/tmp/token' });

    // Allow the async refresh to complete
    await new Promise((r) => setTimeout(r, 10));

    const token = await provider.getToken();
    expect(token).toBe('new-token-value');

    provider.close();
  });

  it('close() stops the watcher', () => {
    const provider = new CachedTokenProvider('/tmp/token');
    const watcherInstance = watcherInstances[0]! as unknown as { stop: ReturnType<typeof vi.fn> };

    provider.close();
    expect(watcherInstance.stop).toHaveBeenCalled();
  });
});

// ── createTokenProvider ────────────────────────────────────────────

describe('createTokenProvider', () => {
  it('creates a DirectTokenProvider for "direct" strategy', () => {
    const provider = createTokenProvider({ strategy: 'direct', tokenPath: '/tmp/t' });
    expect(provider).toBeInstanceOf(DirectTokenProvider);
    expect(provider.strategy).toBe('direct');
  });

  it('creates a CachedTokenProvider for "cached" strategy', () => {
    const provider = createTokenProvider({ strategy: 'cached', tokenPath: '/tmp/t' });
    expect(provider).toBeInstanceOf(CachedTokenProvider);
    expect(provider.strategy).toBe('cached');
    provider.close();
  });

  it('throws for unknown strategy', () => {
    expect(() => createTokenProvider({ strategy: 'invalid' as 'direct' })).toThrow(
      'Unknown token strategy: invalid',
    );
  });
});

// ── Singleton (getTokenProvider / _resetTokenProvider) ──────────────

describe('getTokenProvider / _resetTokenProvider', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup.TOKEN_STRATEGY = process.env.TOKEN_STRATEGY;
    envBackup.TOKEN_PATH = process.env.TOKEN_PATH;
    delete process.env.TOKEN_STRATEGY;
    delete process.env.TOKEN_PATH;
    _resetTokenProvider();
  });

  afterEach(() => {
    process.env.TOKEN_STRATEGY = envBackup.TOKEN_STRATEGY;
    process.env.TOKEN_PATH = envBackup.TOKEN_PATH;
    _resetTokenProvider();
  });

  it('defaults to direct strategy', () => {
    const provider = getTokenProvider();
    expect(provider.strategy).toBe('direct');
  });

  it('returns cached strategy when TOKEN_STRATEGY=cached', () => {
    process.env.TOKEN_STRATEGY = 'cached';
    const provider = getTokenProvider();
    expect(provider.strategy).toBe('cached');
  });

  it('returns same singleton on repeated calls', () => {
    const a = getTokenProvider();
    const b = getTokenProvider();
    expect(a).toBe(b);
  });

  it('_resetTokenProvider creates a new instance', () => {
    const a = getTokenProvider();
    _resetTokenProvider();
    const b = getTokenProvider();
    expect(a).not.toBe(b);
  });
});
