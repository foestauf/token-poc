import { FastifyInstance } from 'fastify';
import { TokenWatcher, TokenRefreshEvent } from '@token-poc/token-utils';

const TOKEN_PATH = process.env.TOKEN_PATH || '/var/run/secrets/tokens/token';

export default async function tokenWatchRoutes(fastify: FastifyInstance) {
  fastify.get('/api/token/watch', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    const watcher = new TokenWatcher(TOKEN_PATH);

    watcher.on('refresh', (event: TokenRefreshEvent) => {
      reply.raw.write(`data: ${JSON.stringify({ type: 'refresh', ...event })}\n\n`);
    });

    watcher.on('error', (err: Error) => {
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    });

    await watcher.start();

    request.raw.on('close', () => {
      watcher.stop();
    });

    // Keep the connection open - don't return from the handler
    await new Promise(() => {});
  });
}
