import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createHash } from 'crypto';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  originalName: z.string(),
  storagePath: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  family: z.string().optional(),
  period: z.string().optional(),
});

export const documentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.family) where.family = filters.family;
      if (filters.status) where.status = filters.status;
      if (filters.companyId) where.companyId = filters.companyId;

      const [data, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            company: { select: { code: true, name: true } },
            project: { select: { code: true, name: true } },
          },
        }),
        prisma.document.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const doc = await prisma.document.findUnique({
        where: { id },
        include: {
          company: true,
          project: true,
          thirdParty: true,
          proofRecords: true,
        },
      });
      if (!doc) throw notFound('Document', id);
      return doc;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const fingerprint = createHash('sha256').update(`${data.originalName}-${data.sizeBytes}-${Date.now()}`).digest('hex');

      // Check for duplicates
      const duplicate = await prisma.document.findFirst({
        where: { fingerprint, isDuplicate: false },
      });

      const doc = await prisma.document.create({
        data: {
          ...data,
          fingerprint,
          isDuplicate: !!duplicate,
          duplicateOfId: duplicate?.id,
          normalizedName: normalizeFileName(data.originalName, data.family, data.period),
        },
      });

      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'Document',
        entityId: doc.id,
      });

      return reply.status(201).send(doc);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Get orphan documents
  app.get('/orphans', async (request, reply) => {
    try {
      const orphans = await prisma.document.findMany({
        where: { status: 'ORPHAN' },
        orderBy: { createdAt: 'desc' },
      });
      return orphans;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};

function normalizeFileName(name: string, family?: string, period?: string): string {
  const ext = name.split('.').pop() || '';
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const parts = [family || 'DOC', period || 'NODATE', base].filter(Boolean);
  return `${parts.join('_')}.${ext}`;
}
