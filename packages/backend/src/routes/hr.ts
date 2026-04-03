import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const employeeSchema = z.object({
  companyId: z.string().uuid(),
  code: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: z.string().optional(),
  department: z.string().optional(),
  contractType: z.enum(['CDI', 'CDD', 'FREELANCE', 'INTERN']).optional(),
  baseSalary: z.number().optional(),
  hireDate: z.string().datetime().optional(),
});

const taskSchema = z.object({
  projectId: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.enum(['STANDARD', 'SPI', 'MISSION']),
  proposedPrice: z.number().optional(),
});

export const hrRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Employees
  app.get('/employees', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.department) where.department = filters.department;

      const [data, total] = await Promise.all([
        prisma.employee.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: { company: { select: { code: true, name: true } } },
          orderBy: { lastName: 'asc' },
        }),
        prisma.employee.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/employees', { preHandler: [requireRole('ADMIN', 'RH')] }, async (request, reply) => {
    try {
      const data = validate(employeeSchema, request.body);
      const emp = await prisma.employee.create({ data: data as any });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'Employee', entityId: emp.id });
      return reply.status(201).send(emp);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Tasks (SPI)
  app.get('/tasks', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.status) where.status = filters.status;
      if (filters.employeeId) where.employeeId = filters.employeeId;
      if (filters.taskType) where.taskType = filters.taskType;

      const [data, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            employee: { select: { firstName: true, lastName: true, code: true } },
            project: { select: { code: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.task.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/tasks', { preHandler: [requireRole('ADMIN', 'RH', 'CHEF_PROJET')] }, async (request, reply) => {
    try {
      const data = validate(taskSchema, request.body);
      const task = await prisma.task.create({ data });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'Task', entityId: task.id });
      return reply.status(201).send(task);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Task state transitions
  app.post('/tasks/:id/validate', { preHandler: [requireRole('ADMIN', 'RH', 'CHEF_PROJET')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { type, decision, comment } = request.body as {
        type: string; decision: string; comment?: string;
      };

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) throw notFound('Task', id);

      await prisma.taskValidation.create({
        data: { taskId: id, validatorId: request.user.id, type, decision, comment },
      });

      // Update task status based on validation
      let newStatus = task.status;
      if (type === 'QUALITY' && decision === 'APPROVED') newStatus = 'QC_PASS';
      if (type === 'QUALITY' && decision === 'REJECTED') newStatus = 'QC_FAIL';
      if (type === 'PAYMENT_RELEASE' && decision === 'APPROVED') newStatus = 'PAID';

      const updated = await prisma.task.update({ where: { id }, data: { status: newStatus } });
      return updated;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Payslips
  app.get('/payslips', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.period) where.period = filters.period;
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.payslip.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: { employee: { select: { firstName: true, lastName: true, code: true } } },
          orderBy: { period: 'desc' },
        }),
        prisma.payslip.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
