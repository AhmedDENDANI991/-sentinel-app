import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { handleError } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Main dashboard KPIs
  app.get('/kpis', async (request, reply) => {
    try {
      const [
        companies,
        projects,
        documents,
        auditObjects,
        pendingQuestionnaires,
        pendingHuman,
        validatedProof,
        validatedReserve,
        rejected,
        journalEntries,
        missingProof,
        employees,
        activeTasks,
        openCases,
        integrationErrors,
      ] = await Promise.all([
        prisma.company.count({ where: { isActive: true } }),
        prisma.project.count({ where: { status: 'ACTIVE' } }),
        prisma.document.count(),
        prisma.auditObject.count(),
        prisma.questionnaire.count({ where: { status: 'PENDING' } }),
        prisma.auditObject.count({ where: { state: 'PENDING_HUMAN' } }),
        prisma.auditObject.count({ where: { state: 'VALIDATED_PROOF' } }),
        prisma.auditObject.count({ where: { state: 'VALIDATED_RESERVE' } }),
        prisma.auditObject.count({ where: { state: 'REJECTED_MOTIVATED' } }),
        prisma.journalEntry.count(),
        prisma.journalEntry.count({ where: { proofStatus: 'MISSING' } }),
        prisma.employee.count({ where: { isActive: true } }),
        prisma.task.count({ where: { status: { in: ['IN_PROGRESS', 'CREATED', 'PROPOSED'] } } }),
        prisma.legalCase.count({ where: { status: { notIn: ['CLOSED', 'ARCHIVED'] } } }),
        prisma.integrationEvent.count({ where: { status: 'FAILED' } }),
      ]);

      return {
        overview: { companies, projects, documents, employees },
        governance: {
          totalAuditObjects: auditObjects,
          pendingHuman,
          validatedProof,
          validatedReserve,
          rejected,
          pendingQuestionnaires,
        },
        accounting: { journalEntries, missingProof },
        operations: { activeTasks, openCases },
        integrations: { errors: integrationErrors },
      };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // State distribution
  app.get('/state-distribution', async (request, reply) => {
    try {
      const distribution = await prisma.auditObject.groupBy({
        by: ['state'],
        _count: true,
      });
      return distribution.map(d => ({ state: d.state, count: d._count }));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Recent activity
  app.get('/activity', async (request, reply) => {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      });
      return logs;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Queues (to-arbitrate, missing-proof, blocked, reminders)
  app.get('/queues', async (request, reply) => {
    try {
      const [toArbitrate, missingProof, blocked, overdueReminders] = await Promise.all([
        prisma.auditObject.count({ where: { state: 'PENDING_HUMAN', criticality: { in: ['HIGH', 'CRITICAL'] } } }),
        prisma.auditObject.count({
          where: { proofRecords: { some: { decision: 'PENDING' } } },
        }),
        prisma.workflowAction.count({ where: { status: 'FAILED' } }),
        prisma.questionnaire.count({
          where: { status: 'PENDING', escalateAfter: { lte: new Date() } },
        }),
      ]);

      return { toArbitrate, missingProof, blocked, overdueReminders };
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
