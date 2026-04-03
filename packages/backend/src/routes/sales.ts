import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid(),
  thirdPartyId: z.string().uuid(),
  reference: z.string(),
  orderDate: z.string().datetime(),
  lines: z.array(z.object({
    articleId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});

export const salesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.salesOrder.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            company: { select: { code: true, name: true } },
            thirdParty: { select: { code: true, name: true } },
            _count: { select: { lines: true } },
          },
          orderBy: { orderDate: 'desc' },
        }),
        prisma.salesOrder.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'COMMERCIAL', 'DAF')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const totalAmount = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

      const so = await prisma.salesOrder.create({
        data: {
          companyId: data.companyId,
          thirdPartyId: data.thirdPartyId,
          reference: data.reference,
          orderDate: new Date(data.orderDate),
          totalAmount,
          lines: { create: data.lines },
        },
        include: { lines: true },
      });

      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'SalesOrder', entityId: so.id });
      return reply.status(201).send(so);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
