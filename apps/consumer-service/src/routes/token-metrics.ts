import { FastifyInstance } from 'fastify';
import { getTokenProvider } from '@token-poc/token-utils';

export default async function tokenMetricsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/token/metrics', async () => {
    const provider = getTokenProvider();
    return {
      strategy: provider.strategy,
      timestamp: new Date().toISOString(),
    };
  });
}
