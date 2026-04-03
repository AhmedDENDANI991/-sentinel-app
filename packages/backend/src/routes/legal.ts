import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const contractSchema = z.object({
  companyId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  reference: z.string(),
  type: z.enum(['MARCHE', 'SOUS_TRAITANCE', 'PRESTATION', 'LOCATION', 'AVENANT', 'OTHER']),
  subject: z.string(),
  amount: z.number().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const legalCaseSchema = z.object({
  contractId: z.string().uuid().optional(),
  reference: z.string(),
  subject: z.string(),
  parties: z.array(z.object({ name: z.string(), role: z.string() })),
  amountAtStake: z.number().optional(),
  nextDeadline: z.string().datetime().optional(),
  nextHearing: z.string().datetime().optional(),
});

export const legalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Contracts
  app.get('/contracts', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const [data, total] = await Promise.all([
        prisma.contract.findMany({
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            company: { select: { code: true, name: true } },
            project: { select: { code: true, name: true } },
            thirdParty: { select: { code: true, name: true } },
            _count: { select: { legalCases: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.contract.count(),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/contracts', { preHandler: [requireRole('ADMIN', 'JURIDIQUE', 'DAF')] }, async (request, reply) => {
    try {
      const data = validate(contractSchema, request.body);
      const contract = await prisma.contract.create({ data: data as any });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'Contract', entityId: contract.id });
      return reply.status(201).send(contract);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Legal Cases
  app.get('/cases', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.legalCase.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: { contract: { select: { reference: true, subject: true } } },
          orderBy: { nextDeadline: 'asc' },
        }),
        prisma.legalCase.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/cases', { preHandler: [requireRole('ADMIN', 'JURIDIQUE')] }, async (request, reply) => {
    try {
      const data = validate(legalCaseSchema, request.body);
      const legalCase = await prisma.legalCase.create({ data: data as any });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'LegalCase', entityId: legalCase.id });
      return reply.status(201).send(legalCase);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Upcoming deadlines
  app.get('/deadlines', async (request, reply) => {
    try {
      const thirtyDays = new Date(Date.now() + 30 * 86400000);
      const cases = await prisma.legalCase.findMany({
        where: {
          nextDeadline: { lte: thirtyDays },
          status: { notIn: ['CLOSED', 'ARCHIVED'] },
        },
        include: { contract: true },
        orderBy: { nextDeadline: 'asc' },
      });
      return cases;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
