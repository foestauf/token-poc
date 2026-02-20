import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateBearerToken, AuthResult } from '@token-poc/token-utils';

declare module 'fastify' {
  interface FastifyRequest {
    authResult?: AuthResult;
  }
}

export default fp(async function tokenAuthPlugin(fastify: FastifyInstance) {
  const audience = process.env.TOKEN_AUDIENCE || 'token-service';

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    const result = validateBearerToken(request.headers.authorization, audience);
    request.authResult = result;

    if (!result.authenticated) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: result.error,
        steps: result.steps,
      });
    }
  });
}, { name: 'token-auth' });
