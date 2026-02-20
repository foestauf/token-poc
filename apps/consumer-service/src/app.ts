import Fastify from 'fastify';
import cors from '@fastify/cors';
import healthRoutes from './routes/health.js';
import tokenStatusRoutes from './routes/token-status.js';
import tokenWatchRoutes from './routes/token-watch.js';
import callServiceRoutes from './routes/call-service.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(cors, { origin: true });
  await fastify.register(healthRoutes);
  await fastify.register(tokenStatusRoutes);
  await fastify.register(tokenWatchRoutes);
  await fastify.register(callServiceRoutes);

  return fastify;
}
