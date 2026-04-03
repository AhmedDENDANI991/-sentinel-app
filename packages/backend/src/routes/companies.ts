import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  legalForm: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
});

export const companyRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const [data, total] = await Promise.all([
        prisma.company.findMany({
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { createdAt: q.sortOrder },
        }),
        prisma.company.count(),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          projects: true,
          companyAssociates: { include: { associate: true } },
          _count: { select: { employees: true, documents: true } },
        },
      });
      if (!company) throw notFound('Company', id);
      return company;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'DAF')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const company = await prisma.company.create({ data });
      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'Company',
        entityId: company.id,
      });
      return reply.status(201).send(company);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.put('/:id', { preHandler: [requireRole('ADMIN', 'DAF')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = validate(createSchema.partial(), request.body);
      const company = await prisma.company.update({ where: { id }, data });
      await logAudit({
        userId: request.user.id,
        action: 'UPDATE',
        entityType: 'Company',
        entityId: id,
        changes: data as any,
      });
      return company;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
