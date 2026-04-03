import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  code: z.string().min(1),
  module: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ruleType: z.enum(['VALIDATION', 'MATCHING', 'IMPUTATION', 'ESCALATION', 'AUTOMATION', 'THRESHOLD']),
  condition: z.record(z.unknown()),
  action: z.record(z.unknown()),
  automationLevel: z.enum(['LEVEL_A', 'LEVEL_B', 'LEVEL_C']),
  priority: z.number().int().default(100),
});

export const ruleRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.module) where.module = filters.module;
      if (filters.ruleType) where.ruleType = filters.ruleType;
      if (filters.automationLevel) where.automationLevel = filters.automationLevel;

      const [data, total] = await Promise.all([
        prisma.businessRule.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { priority: 'asc' },
        }),
        prisma.businessRule.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const rule = await prisma.businessRule.create({ data: data as any });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'BusinessRule', entityId: rule.id });
      return reply.status(201).send(rule);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Update with version bump
  app.put('/:id', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.businessRule.findUnique({ where: { id } });
      if (!existing) throw notFound('BusinessRule', id);

      const data = validate(createSchema.partial(), request.body);
      const rule = await prisma.businessRule.update({
        where: { id },
        data: { ...data, version: existing.version + 1 } as any,
      });

      await logAudit({
        userId: request.user.id,
        action: 'UPDATE',
        entityType: 'BusinessRule',
        entityId: id,
        changes: { version: { old: existing.version, new: rule.version } },
      });
      return rule;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
