import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { validate } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { createProofRecord, getProofChain, verifyProofIntegrity, getProofSummary } from '../services/proofRegistry.js';

const createSchema = z.object({
  auditObjectId: z.string().uuid(),
  fieldName: z.string().min(1),
  sourceFileId: z.string().uuid().optional(),
  sourcePage: z.number().int().optional(),
  sourceZone: z.string().optional(),
  extractionEngine: z.string().optional(),
  extractionScore: z.number().min(0).max(1).optional(),
  validationRule: z.string().optional(),
  decision: z.enum(['VALIDATED', 'VALIDATED_RESERVE', 'PENDING', 'REJECTED', 'EXCLUDED']),
  decisionReason: z.string().optional(),
  humanActorId: z.string().uuid().optional(),
  upstreamProofId: z.string().uuid().optional(),
});

export const proofRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.post('/', async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const proof = await createProofRecord(data);
      return reply.status(201).send(proof);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/chain/:auditObjectId', async (request, reply) => {
    try {
      const { auditObjectId } = request.params as { auditObjectId: string };
      return await getProofChain(auditObjectId);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/summary/:auditObjectId', async (request, reply) => {
    try {
      const { auditObjectId } = request.params as { auditObjectId: string };
      return await getProofSummary(auditObjectId);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/verify/:proofId', async (request, reply) => {
    try {
      const { proofId } = request.params as { proofId: string };
      const isValid = await verifyProofIntegrity(proofId);
      return { proofId, integrity: isValid ? 'VALID' : 'TAMPERED' };
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
