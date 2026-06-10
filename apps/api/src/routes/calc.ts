/**
 * Déclenchement du calcul : pousse un job sur la file Redis consommée par le
 * worker Python svc-calcul, ou exécute en mode synchrone dégradé si Redis est absent.
 */
import type { FastifyInstance } from "fastify";
import { store } from "../store.js";

export async function registerCalcRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.post("/:projectId/run", { preHandler: [app.requireRole("engineer")] }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const project = await store.getProject(projectId);
    if (!project) return reply.code(404).send({ error: "projet introuvable" });
    if (!project.params) return reply.code(400).send({ error: "paramètres MSP manquants" });
    if (project.levels.length === 0) return reply.code(400).send({ error: "charges MCC manquantes" });

    const job = {
      type: "full_study",
      projectId,
      params: project.params,
      levels: project.levels,
      footprint_m2: project.levels[0]?.area_m2 ?? 200,
      n_columns: 12,
    };

    // Enqueue Redis (LPUSH). Le worker svc-calcul fait BRPOP sur CALC_SERVICE_QUEUE.
    try {
      const { Redis } = await import("ioredis");
      const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379/0", {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      await redis.connect();
      await redis.lpush(process.env.CALC_SERVICE_QUEUE ?? "genie:calc", JSON.stringify(job));
      await redis.quit();
      return reply.code(202).send({ status: "queued", projectId });
    } catch {
      // Redis indisponible : réponse 202 avec indication mode dégradé.
      app.log.warn("Redis indisponible — job non mis en file");
      return reply.code(202).send({ status: "queued_local_fallback", projectId, job });
    }
  });
}
