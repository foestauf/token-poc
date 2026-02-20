import { FastifyInstance } from 'fastify';
import { getTokenInfo } from '../services/jwt-decoder.js';

export default async function tokenInfoRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { token: string } }>('/api/token/info', async (request, reply) => {
    const { token } = request.body;

    if (!token) {
      return reply.code(400).send({ error: 'Missing "token" in request body' });
    }

    try {
      const info = getTokenInfo(token);
      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to decode token';
      return reply.code(400).send({ error: message });
    }
  });
}
