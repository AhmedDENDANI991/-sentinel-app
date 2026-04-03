import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { transitionState, getTransitionHistory, getValidTransitions, OBJECT_STATES } from '../services/stateMachine.js';
import { getProofSummary } from '../services/proofRegistry.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  objectType: z.string(),
  objectId: z.string(),
  criticality: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  classFamily: z.string().optional(),
});

const transitionSchema = z.object({
  toState: z.enum(OBJECT_STATES as unknown as [string, ...string[]]),
  reason: z.string().optional(),
  actorType: z.enum(['SYSTEM', 'AI_PROPOSAL', 'HUMAN', 'RULE_ENGINE', 'ESCALATION']).default('HUMAN'),
  ruleId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const auditObjectRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // List with filters
  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.state) where.state = filters.state;
      if (filters.objectType) where.objectType = filters.objectType;
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.criticality) where.criticality = filters.criticality;

      const [data, total] = await Promise.all([
        prisma.auditObject.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            company: { select: { code: true, name: true } },
            project: { select: { code: true, name: true } },
            _count: { select: { proofRecords: true, questionnaires: true } },
          },
        }),
        prisma.auditObject.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Get single with full context
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const obj = await prisma.auditObject.findUnique({
        where: { id },
        include: {
          company: true,
          project: true,
          proofRecords: { orderBy: { timestamp: 'asc' } },
          stateTransitions: { orderBy: { createdAt: 'asc' } },
          questionnaires: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!obj) throw notFound('AuditObject', id);

      const validTransitions = getValidTransitions(obj.state);
      const proofSummary = await getProofSummary(id);

      return { ...obj, validTransitions, proofSummary };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Create audit object
  app.post('/', async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const obj = await prisma.auditObject.create({ data });
      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'AuditObject',
        entityId: obj.id,
      });
      return reply.status(201).send(obj);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Transition state
  app.post('/:id/transition', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = validate(transitionSchema, request.body);

      const result = await transitionState({
        auditObjectId: id,
        toState: data.toState as any,
        reason: data.reason,
        actorType: data.actorType as any,
        actorId: request.user.id,
        ruleId: data.ruleId,
        metadata: data.metadata,
      });

      await logAudit({
        userId: request.user.id,
        action: 'UPDATE',
        entityType: 'AuditObject',
        entityId: id,
        changes: { state: { old: result.transition.fromState, new: result.transition.toState } },
      });

      return result;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Get transition history
  app.get('/:id/history', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await getTransitionHistory(id);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
