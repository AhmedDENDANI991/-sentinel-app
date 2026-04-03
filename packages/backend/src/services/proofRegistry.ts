import { prisma } from '../utils/prisma.js';
import { createHash } from 'crypto';

export interface CreateProofParams {
  auditObjectId: string;
  fieldName: string;
  sourceFileId?: string;
  sourcePage?: number;
  sourceZone?: string;
  extractionEngine?: string;
  extractionScore?: number;
  validationRule?: string;
  decision: 'VALIDATED' | 'VALIDATED_RESERVE' | 'PENDING' | 'REJECTED' | 'EXCLUDED';
  decisionReason?: string;
  humanActorId?: string;
  upstreamProofId?: string;
}

function computeChecksum(data: Record<string, unknown>): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(serialized).digest('hex');
}

export async function createProofRecord(params: CreateProofParams) {
  const checksum = computeChecksum({
    auditObjectId: params.auditObjectId,
    fieldName: params.fieldName,
    decision: params.decision,
    timestamp: new Date().toISOString(),
  });

  return prisma.proofRecord.create({
    data: {
      ...params,
      checksum,
      isImmutable: ['VALIDATED', 'REJECTED', 'EXCLUDED'].includes(params.decision),
    },
  });
}

export async function getProofChain(auditObjectId: string) {
  return prisma.proofRecord.findMany({
    where: { auditObjectId },
    orderBy: { timestamp: 'asc' },
    include: { sourceFile: { select: { id: true, originalName: true, family: true } } },
  });
}

export async function verifyProofIntegrity(proofId: string): Promise<boolean> {
  const proof = await prisma.proofRecord.findUnique({ where: { id: proofId } });
  if (!proof) return false;
  if (!proof.checksum) return true; // no checksum = not yet sealed

  const expectedChecksum = computeChecksum({
    auditObjectId: proof.auditObjectId,
    fieldName: proof.fieldName,
    decision: proof.decision,
    timestamp: proof.timestamp.toISOString(),
  });

  return proof.checksum === expectedChecksum;
}

export async function getProofSummary(auditObjectId: string) {
  const proofs = await prisma.proofRecord.findMany({
    where: { auditObjectId },
  });

  return {
    total: proofs.length,
    validated: proofs.filter(p => p.decision === 'VALIDATED').length,
    withReserve: proofs.filter(p => p.decision === 'VALIDATED_RESERVE').length,
    pending: proofs.filter(p => p.decision === 'PENDING').length,
    rejected: proofs.filter(p => p.decision === 'REJECTED').length,
    excluded: proofs.filter(p => p.decision === 'EXCLUDED').length,
    immutable: proofs.filter(p => p.isImmutable).length,
    averageConfidence: proofs.length > 0
      ? proofs.reduce((sum, p) => sum + (p.extractionScore ?? 0), 0) / proofs.length
      : 0,
  };
}
