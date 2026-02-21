import { FastifyInstance } from 'fastify';
import { createTokenProvider, TokenProvider } from '@token-poc/token-utils';

const TOKEN_PATH = process.env.TOKEN_PATH || '/var/run/secrets/tokens/token';

interface BenchmarkStats {
  strategy: string;
  iterations: number;
  timings: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

function computeStats(
  strategy: string,
  iterations: number,
  timings: number[],
): BenchmarkStats {
  const sorted = [...timings].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const len = sorted.length;

  return {
    strategy,
    iterations,
    timings: sorted,
    min: sorted[0]!,
    max: sorted[len - 1]!,
    mean: sum / len,
    median:
      len % 2 === 0
        ? (sorted[len / 2 - 1]! + sorted[len / 2]!) / 2
        : sorted[Math.floor(len / 2)]!,
    p95: sorted[Math.ceil(len * 0.95) - 1]!,
    p99: sorted[Math.ceil(len * 0.99) - 1]!,
  };
}

async function runBatch(
  provider: TokenProvider,
  iterations: number,
): Promise<number[]> {
  const timings: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await provider.getToken();
    timings.push(performance.now() - start);
  }
  return timings;
}

export default async function tokenBenchmarkRoutes(fastify: FastifyInstance) {
  fastify.get('/api/token/benchmark', async (request) => {
    const { iterations: rawIterations } = request.query as {
      iterations?: string;
    };
    const iterations = Math.min(
      Math.max(1, parseInt(rawIterations || '100', 10) || 100),
      1000,
    );

    const directProvider = createTokenProvider({
      strategy: 'direct',
      tokenPath: TOKEN_PATH,
    });
    const cachedProvider = createTokenProvider({
      strategy: 'cached',
      tokenPath: TOKEN_PATH,
    });

    try {
      // Warm up cached provider so the init read doesn't skew results
      await cachedProvider.getToken();

      const directTimings = await runBatch(directProvider, iterations);
      const cachedTimings = await runBatch(cachedProvider, iterations);

      return {
        direct: computeStats('direct', iterations, directTimings),
        cached: computeStats('cached', iterations, cachedTimings),
        iterations,
        tokenPath: TOKEN_PATH,
        timestamp: new Date().toISOString(),
      };
    } finally {
      directProvider.close();
      cachedProvider.close();
    }
  });
}
