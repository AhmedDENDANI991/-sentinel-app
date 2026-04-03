import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const createSchema = z.object({
  code: z.string().min(1),
  module: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  validatorId: z.string().uuid().optional(),
  arbiterId: z.string().uuid().optional(),
  slaHours: z.number().int().optional(),
  escalateAfterHours: z.number().int().optional(),
  steps: z.array(z.object({
    name: z.string(),
    type: z.enum(['TRIGGER', 'IDENTITY_CHECK', 'COMPLETENESS_CHECK', 'PROOF_CHECK', 'AUTO_PROCESS', 'LOGIC_CHECK', 'BUSINESS_CHECK', 'CROSS_CHECK', 'DECISION', 'NOTIFICATION', 'JOURNAL', 'REPORTING']),
    automationLevel: z.enum(['LEVEL_A', 'LEVEL_B', 'LEVEL_C']),
    config: z.record(z.unknown()).optional(),
  })),
});

export const workflowRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.module) where.module = filters.module;

      const [data, total] = await Promise.all([
        prisma.workflow.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { name: 'asc' },
        }),
        prisma.workflow.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const wf = await prisma.workflow.findUnique({
        where: { id },
        include: {
          actions: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });
      if (!wf) throw notFound('Workflow', id);
      return wf;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const wf = await prisma.workflow.create({ data: data as any });
      return reply.status(201).send(wf);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Execute a workflow step
  app.post('/:id/execute', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { objectType, objectId, stepIndex } = request.body as {
        objectType: string; objectId: string; stepIndex: number;
      };

      const wf = await prisma.workflow.findUnique({ where: { id } });
      if (!wf) throw notFound('Workflow', id);

      const steps = wf.steps as any[];
      if (stepIndex >= steps.length) {
        return reply.status(400).send({ error: 'Step index out of range' });
      }

      const step = steps[stepIndex];
      const action = await prisma.workflowAction.create({
        data: {
          workflowId: id,
          objectType,
          objectId,
          stepIndex,
          stepName: step.name,
          status: 'IN_PROGRESS',
          actorId: request.user.id,
          startedAt: new Date(),
        },
      });

      return action;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Complete a workflow action
  app.post('/actions/:actionId/complete', async (request, reply) => {
    try {
      const { actionId } = request.params as { actionId: string };
      const { result, status } = request.body as { result: unknown; status?: string };

      const action = await prisma.workflowAction.update({
        where: { id: actionId },
        data: {
          status: status || 'COMPLETED',
          result: result as any,
          completedAt: new Date(),
        },
      });

      return action;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
