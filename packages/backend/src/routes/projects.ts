import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  type: z.enum(['CONSTRUCTION', 'PROMOTION', 'SERVICE', 'INTERNAL']),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED', 'ARCHIVED']).default('ACTIVE'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().optional(),
});

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const scope = (request.user.companyScope as string[] | null) || [];
      const where = scope.length > 0
        ? { companyId: { in: scope } }
        : {};
      const [data, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: { company: { select: { code: true, name: true } } },
          orderBy: { createdAt: q.sortOrder },
        }),
        prisma.project.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          company: true,
          costCenters: true,
          companyAssociates: { include: { associate: true } },
          _count: { select: { documents: true, contracts: true, tasks: true } },
        },
      });
      if (!project) throw notFound('Project', id);
      return project;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'DAF', 'CHEF_PROJET')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const project = await prisma.project.create({ data: data as any });
      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'Project',
        entityId: project.id,
      });
      return reply.status(201).send(project);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
