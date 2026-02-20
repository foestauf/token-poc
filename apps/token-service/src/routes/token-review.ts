import { FastifyInstance } from 'fastify';
import { submitTokenReview } from '../services/token-validator.js';

export default async function tokenReviewRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { token: string; audiences?: string[] } }>('/api/token/review', async (request, reply) => {
    const { token, audiences } = request.body;

    if (!token) {
      return reply.code(400).send({ error: 'Missing "token" in request body' });
    }

    const result = await submitTokenReview(token, audiences);
    return result;
  });
}
