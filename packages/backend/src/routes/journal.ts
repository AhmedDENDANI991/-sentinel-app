import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound, forbidden } from '../utils/errors.js';
import { requireAuth, requireRole, requireCompanyAccess } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid(),
  costCenterId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  entryDate: z.string().datetime(),
  journal: z.string().min(1).max(5),
  reference: z.string().optional(),
  label: z.string().min(1),
  debitAccountId: z.string().uuid(),
  creditAccountId: z.string().uuid(),
  amount: z.number().positive(),
  status: z.enum(['DRAFT', 'PROPOSED']).default('DRAFT'),
  sourceType: z.enum(['ORIGINAL', 'CORRECTED', 'AUTO_IMPUTED']).default('ORIGINAL'),
});

export const journalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.status) where.status = filters.status;
      if (filters.journal) where.journal = filters.journal;
      if (filters.proofStatus) where.proofStatus = filters.proofStatus;

      const [data, total] = await Promise.all([
        prisma.journalEntry.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { entryDate: 'desc' },
          include: {
            company: { select: { code: true, name: true } },
            debitAccount: { select: { code: true, name: true } },
            creditAccount: { select: { code: true, name: true } },
            thirdParty: { select: { code: true, name: true } },
          },
        }),
        prisma.journalEntry.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'DAF', 'COMPTABLE')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      if (!requireCompanyAccess(data.companyId, request.user)) {
        throw forbidden('No access to this company');
      }
      const entry = await prisma.journalEntry.create({ data: data as any });
      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'JournalEntry',
        entityId: entry.id,
      });
      return reply.status(201).send(entry);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Validate entry (Level C — human obligatory)
  app.post('/:id/validate', { preHandler: [requireRole('ADMIN', 'DAF', 'COMPTABLE')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const entry = await prisma.journalEntry.findUnique({ where: { id } });
      if (!entry) throw notFound('JournalEntry', id);

      if (entry.proofStatus === 'MISSING') {
        return reply.status(422).send({
          error: 'Cannot validate: proof is missing',
          proofStatus: entry.proofStatus,
        });
      }

      const updated = await prisma.journalEntry.update({
        where: { id },
        data: { status: 'VALIDATED' },
      });

      await logAudit({
        userId: request.user.id,
        action: 'VALIDATE',
        entityType: 'JournalEntry',
        entityId: id,
        changes: { status: { old: entry.status, new: 'VALIDATED' } },
      });

      return updated;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Anomaly detection endpoint
  app.get('/anomalies', async (request, reply) => {
    try {
      const filters = request.query as { companyId?: string };
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;

      const [missingProof, inconsistent, duplicateRefs] = await Promise.all([
        prisma.journalEntry.count({ where: { ...where, proofStatus: 'MISSING' } }),
        prisma.journalEntry.count({ where: { ...where, proofStatus: 'INCONSISTENT' } }),
        prisma.journalEntry.groupBy({
          by: ['reference'],
          where: { ...where, reference: { not: null } },
          having: { reference: { _count: { gt: 1 } } },
          _count: true,
        }),
      ]);

      return {
        missingProof,
        inconsistent,
        potentialDuplicates: duplicateRefs.length,
      };
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
