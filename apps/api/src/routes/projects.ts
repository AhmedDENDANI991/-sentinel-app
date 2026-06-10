/** CRUD projets + paramètres MSP + charges MCC. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ProjectParamsSchema, LevelLoadSchema } from "@genie/shared";
import { store } from "../store.js";

const CreateProjectSchema = z.object({ name: z.string().min(1) });
const LevelsSchema = z.object({ levels: z.array(LevelLoadSchema).min(1) });

export async function registerProjectRoutes(app: FastifyInstance): Promise<void> {
  // Toutes les routes projets sont authentifiées.
  app.addHook("preHandler", app.authenticate);

  app.post("/", { preHandler: [app.requireRole("engineer")] }, async (req, reply) => {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    const project = await store.createProject(req.user!.id, parsed.data.name);
    return reply.code(201).send(project);
  });

  app.get("/", async (req) => store.listProjects(req.user!.id));

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await store.getProject(id);
    if (!project) return reply.code(404).send({ error: "projet introuvable" });
    return project;
  });

  // MSP — paramètres projet
  app.put("/:id/params", { preHandler: [app.requireRole("engineer")] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await store.getProject(id))) return reply.code(404).send({ error: "projet introuvable" });
    const parsed = ProjectParamsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    await store.setParams(id, parsed.data);
    return reply.send({ ok: true });
  });

  // MCC — charges par niveau
  app.put("/:id/levels", { preHandler: [app.requireRole("engineer")] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await store.getProject(id))) return reply.code(404).send({ error: "projet introuvable" });
    const parsed = LevelsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    await store.setLevels(id, parsed.data.levels);
    return reply.send({ ok: true });
  });
}
