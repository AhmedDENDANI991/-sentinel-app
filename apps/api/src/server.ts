/**
 * API Gateway Fastify — GENIE_CIVIL_AI.
 *
 * Expose : santé, auth JWT + RBAC, CRUD projets, paramètres (MSP), charges (MCC),
 * upload (MIA) avec contrôle MIME/taille, et déclenchement du calcul (file Redis).
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";

import { config } from "./config.js";
import { authenticate, requireRole } from "./auth.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerCalcRoutes } from "./routes/calc.js";
import { registerUploadRoutes } from "./routes/uploads.js";
import { registerAuthRoutes } from "./routes/auth.js";

export async function buildServer() {
  const app = Fastify({
    logger: true,
    bodyLimit: config.maxUploadBytes,
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });
  await app.register(multipart, {
    limits: { fileSize: config.maxUploadBytes, files: 5 },
  });

  // Décorateurs d'auth disponibles pour les routes protégées.
  app.decorate("authenticate", authenticate);
  app.decorate("requireRole", requireRole);

  // --- Santé (non protégée) ---
  app.get("/health", async () => ({
    status: "ok",
    service: "genie-api",
    env: config.env,
    time: new Date().toISOString(),
  }));

  app.get("/ready", async (_req, reply) => {
    // En production : vérifier PostgreSQL/Redis ici.
    return reply.send({ ready: true });
  });

  // --- Routes métier ---
  await app.register(registerAuthRoutes, { prefix: "/api/auth" });
  await app.register(registerProjectRoutes, { prefix: "/api/projects" });
  await app.register(registerUploadRoutes, { prefix: "/api/uploads" });
  await app.register(registerCalcRoutes, { prefix: "/api/calc" });

  return app;
}

// Démarrage direct (hors tests).
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  buildServer()
    .then((app) => app.listen({ host: config.host, port: config.port }))
    .then((addr) => console.log(`GENIE_CIVIL_AI API en écoute sur ${addr}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
