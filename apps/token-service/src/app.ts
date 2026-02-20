import Fastify from 'fastify';
import cors from '@fastify/cors';
import tokenAuthPlugin from './plugins/token-auth.plugin.js';
import healthRoutes from './routes/health.js';
import tokenInfoRoutes from './routes/token-info.js';
import tokenReviewRoutes from './routes/token-review.js';
import protectedRoutes from './routes/protected.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(cors, { origin: true });
  await fastify.register(tokenAuthPlugin);
  await fastify.register(healthRoutes);
  await fastify.register(tokenInfoRoutes);
  await fastify.register(tokenReviewRoutes);
  await fastify.register(protectedRoutes);

  return fastify;
}
