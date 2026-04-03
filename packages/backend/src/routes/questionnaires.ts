import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import {
  generateQuestionnaire,
  answerQuestionnaire,
  escalateQuestionnaire,
  batchResolve,
  getOverdueQuestionnaires,
} from '../services/questionnaireEngine.js';

const createSchema = z.object({
  auditObjectId: z.string().uuid(),
  assignedToId: z.string().uuid(),
  context: z.string().min(1),
  missingInfo: z.string().min(1),
  suggestedAnswers: z.array(z.string()).min(2).max(5).optional(),
  expectedDocs: z.array(z.string()).optional(),
  escalateAfterHours: z.number().optional(),
  batchGroupId: z.string().optional(),
});

const answerSchema = z.object({
  response: z.string().min(1),
  responseType: z.enum(['SELECTED_SUGGESTION', 'FREE_TEXT', 'DOCUMENT_UPLOAD', 'BATCH']),
  uploadedDocIds: z.array(z.string().uuid()).optional(),
});

export const questionnaireRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.status) where.status = filters.status;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;

      // Non-admin users see only their questionnaires
      if (request.user.role !== 'ADMIN' && request.user.role !== 'CONTROLE') {
        where.assignedToId = request.user.id;
      }

      const [data, total] = await Promise.all([
        prisma.questionnaire.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            auditObject: { select: { id: true, objectType: true, state: true, criticality: true } },
            assignedTo: { select: { firstName: true, lastName: true, email: true } },
          },
        }),
        prisma.questionnaire.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const q = await generateQuestionnaire(data);
      return reply.status(201).send(q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/:id/answer', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = validate(answerSchema, request.body);
      const q = await answerQuestionnaire(id, data.response, data.responseType, data.uploadedDocIds);
      return q;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/:id/escalate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { newAssigneeId } = request.body as { newAssigneeId: string };
      const q = await escalateQuestionnaire(id, newAssigneeId);
      return q;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/batch-resolve', async (request, reply) => {
    try {
      const { batchGroupId, response } = request.body as { batchGroupId: string; response: string };
      const result = await batchResolve(batchGroupId, response, request.user.id);
      return { resolved: result.count };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/overdue', async (request, reply) => {
    try {
      return await getOverdueQuestionnaires();
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
