import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function protectedRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    await (fastify as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate(request, reply);
  });

  fastify.get('/api/protected', async (request) => {
    return {
      message: 'Access granted',
      authenticatedAs: request.authResult?.payload?.sub,
      namespace: request.authResult?.payload?.['kubernetes.io']?.namespace,
      serviceAccount: request.authResult?.payload?.['kubernetes.io']?.serviceaccount?.name,
    };
  });

  fastify.get('/api/protected/middleware-steps', async (request) => {
    return {
      authenticated: request.authResult?.authenticated,
      steps: request.authResult?.steps,
      payload: request.authResult?.payload,
    };
  });
}
