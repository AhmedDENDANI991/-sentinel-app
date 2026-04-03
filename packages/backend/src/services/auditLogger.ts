import { prisma } from '../utils/prisma.js';

export interface LogParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: LogParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes ? JSON.stringify(params.changes) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function getAuditTrail(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
}
