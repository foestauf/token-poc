import { FastifyInstance } from 'fastify';
import { prometheusExporter } from '../tracing.js';

export default async function prometheusMetricsRoutes(fastify: FastifyInstance) {
  fastify.get('/metrics', async (_request, reply) => {
    reply.hijack();
    prometheusExporter.getMetricsRequestHandler(_request.raw, reply.raw);
  });
}
