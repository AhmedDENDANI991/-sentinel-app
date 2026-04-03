import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRoutes } from './routes/auth.js';
import { companyRoutes } from './routes/companies.js';
import { projectRoutes } from './routes/projects.js';
import { documentRoutes } from './routes/documents.js';
import { auditObjectRoutes } from './routes/auditObjects.js';
import { questionnaireRoutes } from './routes/questionnaires.js';
import { journalRoutes } from './routes/journal.js';
import { hrRoutes } from './routes/hr.js';
import { purchaseRoutes } from './routes/purchases.js';
import { stockRoutes } from './routes/stock.js';
import { salesRoutes } from './routes/sales.js';
import { legalRoutes } from './routes/legal.js';
import { workflowRoutes } from './routes/workflows.js';
import { ruleRoutes } from './routes/rules.js';
import { integrationRoutes } from './routes/integrations.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { proofRoutes } from './routes/proof.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envToLogger: Record<string, object | boolean> = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  },
  production: true,
  test: false,
};

export async function buildApp() {
  const app = Fastify({
    logger: envToLogger[process.env.NODE_ENV ?? 'development'] ?? true,
  });

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'sentinel-dev-secret-change-in-production',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
  });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

  // Serve frontend in production
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  await app.register(fastifyStatic, {
    root: frontendDist,
    prefix: '/',
    decorateReply: true,
    wildcard: false,
  }).catch(() => {
    app.log.info('Frontend dist not found, skipping static serving');
  });

  // Auth decorator
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'sentinel',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // API Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(companyRoutes, { prefix: '/api/companies' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(documentRoutes, { prefix: '/api/documents' });
  await app.register(auditObjectRoutes, { prefix: '/api/audit-objects' });
  await app.register(questionnaireRoutes, { prefix: '/api/questionnaires' });
  await app.register(journalRoutes, { prefix: '/api/journal' });
  await app.register(hrRoutes, { prefix: '/api/hr' });
  await app.register(purchaseRoutes, { prefix: '/api/purchases' });
  await app.register(stockRoutes, { prefix: '/api/stock' });
  await app.register(salesRoutes, { prefix: '/api/sales' });
  await app.register(legalRoutes, { prefix: '/api/legal' });
  await app.register(workflowRoutes, { prefix: '/api/workflows' });
  await app.register(ruleRoutes, { prefix: '/api/rules' });
  await app.register(integrationRoutes, { prefix: '/api/integrations' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(proofRoutes, { prefix: '/api/proof' });

  // SPA fallback
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Route not found' });
    }
    return reply.sendFile('index.html');
  });

  return app;
}

// Start server
const start = async () => {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`Sentinel API running on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
