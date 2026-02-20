import { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health/live', async () => {
    return { status: 'ok' };
  });

  fastify.get('/health/ready', async () => {
    return { status: 'ok' };
  });
}
