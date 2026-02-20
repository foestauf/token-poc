import { FastifyInstance } from 'fastify';
import { callTokenService, callTokenServicePost } from '../services/service-client.js';

export default async function callServiceRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { endpoint?: string } }>('/api/call', async (request) => {
    const endpoint = request.body?.endpoint || '/api/protected';

    try {
      const result = await callTokenService(endpoint);
      return {
        success: result.status >= 200 && result.status < 300,
        targetEndpoint: endpoint,
        ...result,
      };
    } catch (err) {
      return {
        success: false,
        targetEndpoint: endpoint,
        error: err instanceof Error ? err.message : 'Failed to call token-service',
      };
    }
  });

  fastify.post<{ Body: { token: string } }>('/api/call/review', async (request) => {
    const { token } = request.body;

    try {
      const result = await callTokenServicePost('/api/token/review', { token });
      return {
        success: result.status >= 200 && result.status < 300,
        ...result,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to call token-service review',
      };
    }
  });
}
