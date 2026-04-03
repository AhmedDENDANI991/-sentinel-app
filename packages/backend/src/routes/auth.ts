import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { validate } from '../utils/validation.js';
import { handleError, badRequest, notFound } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum([
    'ADMIN', 'DAF', 'COMPTABLE', 'RH', 'JURIDIQUE', 'ACHATS',
    'COMMERCIAL', 'CHEF_PROJET', 'CONTROLE', 'AUDITEUR', 'OPERATEUR',
  ]),
  companyScope: z.array(z.string()).default([]),
  projectScope: z.array(z.string()).default([]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Register
  app.post('/register', async (request, reply) => {
    try {
      const data = validate(registerSchema, request.body);
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw badRequest('Email already registered');

      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = await prisma.user.create({
        data: { ...data, passwordHash, password: undefined } as any,
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      await logAudit({
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        ipAddress: request.ip,
      });

      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        companyScope: data.companyScope,
        projectScope: data.projectScope,
      });

      return reply.status(201).send({ user, token });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Login
  app.post('/login', async (request, reply) => {
    try {
      const data = validate(loginSchema, request.body);
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      if (!user || !user.isActive) throw badRequest('Invalid credentials');

      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) throw badRequest('Invalid credentials');

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await logAudit({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: request.ip,
      });

      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        companyScope: user.companyScope,
        projectScope: user.projectScope,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
      };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Get current user
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, companyScope: true, projectScope: true, isActive: true,
        },
      });
      if (!user) throw notFound('User');
      return user;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
