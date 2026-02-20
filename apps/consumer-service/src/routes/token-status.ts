import { FastifyInstance } from 'fastify';
import { getTokenStatus } from '../services/token-reader.js';

export default async function tokenStatusRoutes(fastify: FastifyInstance) {
  fastify.get('/api/token/status', async () => {
    return getTokenStatus();
  });
}
