import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { toJson } from '../utils/json.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const eventSchema = z.object({
  source: z.enum(['SENTINEL', 'N8N', 'ODOO', 'HUBSPOT', 'ROSSUM', 'AIRCALL', 'POWERBI']),
  target: z.enum(['SENTINEL', 'N8N', 'ODOO', 'HUBSPOT', 'ROSSUM', 'AIRCALL', 'POWERBI']),
  eventType: z.enum(['SYNC', 'WEBHOOK', 'TRIGGER', 'CALLBACK']),
  payload: z.record(z.unknown()),
});

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // List events
  app.get('/events', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.source) where.source = filters.source;
      if (filters.target) where.target = filters.target;
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.integrationEvent.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.integrationEvent.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Create event (trigger n8n workflow)
  app.post('/events', async (request, reply) => {
    try {
      const data = validate(eventSchema, request.body);
      const event = await prisma.integrationEvent.create({ data: { ...data, payload: toJson(data.payload) } as any });
      return reply.status(201).send(event);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Webhook receiver for n8n callbacks
  app.post('/webhook/:source', async (request, reply) => {
    try {
      const { source } = request.params as { source: string };
      const payload = request.body as Record<string, unknown>;

      const event = await prisma.integrationEvent.create({
        data: {
          source: source.toUpperCase(),
          target: 'SENTINEL',
          eventType: 'WEBHOOK',
          payload: toJson(payload),
          status: 'ACKNOWLEDGED',
          processedAt: new Date(),
        },
      });

      return { received: true, eventId: event.id };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Integration health check
  app.get('/health', async (request, reply) => {
    const integrations = ['N8N', 'ODOO', 'HUBSPOT', 'ROSSUM', 'AIRCALL', 'POWERBI'];
    const status: Record<string, string> = {};

    for (const name of integrations) {
      const envKey = `${name}_BASE_URL`;
      const altKey = `${name}_API_KEY`;
      const configured = !!(process.env[envKey] || process.env[altKey] ||
        process.env[`${name}_URL`] || process.env[`${name}_API_ID`] ||
        process.env[`${name}_CLIENT_ID`] || process.env[`CLAUDE_API_KEY`]);
      status[name] = configured ? 'CONFIGURED' : 'NOT_CONFIGURED';
    }

    return { integrations: status };
  });
};
