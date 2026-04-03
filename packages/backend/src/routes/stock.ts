import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const moveSchema = z.object({
  locationId: z.string().uuid(),
  articleId: z.string().uuid(),
  moveType: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RETURN']),
  quantity: z.number().positive(),
  reference: z.string().optional(),
  sourceDoc: z.string().optional(),
});

export const stockRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Articles
  app.get('/articles', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const [data, total] = await Promise.all([
        prisma.article.findMany({
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { name: 'asc' },
        }),
        prisma.article.count(),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Stock levels (computed from moves)
  app.get('/levels', async (request, reply) => {
    try {
      const filters = request.query as { locationId?: string };
      const where = filters.locationId ? { locationId: filters.locationId } : {};

      const moves = await prisma.stockMove.groupBy({
        by: ['articleId', 'locationId'],
        where,
        _sum: { quantity: true },
      });

      // Compute net stock: IN/RETURN positive, OUT negative
      const levels: Record<string, { articleId: string; locationId: string; quantity: number }> = {};
      const allMoves = await prisma.stockMove.findMany({ where });

      for (const move of allMoves) {
        const key = `${move.articleId}-${move.locationId}`;
        if (!levels[key]) levels[key] = { articleId: move.articleId, locationId: move.locationId, quantity: 0 };
        const sign = ['IN', 'RETURN', 'ADJUSTMENT'].includes(move.moveType) ? 1 : -1;
        levels[key].quantity += move.quantity * sign;
      }

      return Object.values(levels);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Record stock move
  app.post('/moves', async (request, reply) => {
    try {
      const data = validate(moveSchema, request.body);
      const move = await prisma.stockMove.create({ data });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'StockMove', entityId: move.id });
      return reply.status(201).send(move);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Low stock alerts
  app.get('/alerts', async (request, reply) => {
    try {
      const articles = await prisma.article.findMany({ where: { minStock: { not: null } } });
      const alerts = [];

      for (const article of articles) {
        const moves = await prisma.stockMove.findMany({ where: { articleId: article.id } });
        let qty = 0;
        for (const m of moves) {
          const sign = ['IN', 'RETURN', 'ADJUSTMENT'].includes(m.moveType) ? 1 : -1;
          qty += m.quantity * sign;
        }
        if (qty < (article.minStock ?? 0)) {
          alerts.push({ article, currentStock: qty, minStock: article.minStock, deficit: (article.minStock ?? 0) - qty });
        }
      }

      return alerts;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
