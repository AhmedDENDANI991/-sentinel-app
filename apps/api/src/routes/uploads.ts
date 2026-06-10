/** MIA — upload de fichiers (PDF/DXF/IFC) avec contrôle MIME et taille. */
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.post("/:projectId", { preHandler: [app.requireRole("engineer")] }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "aucun fichier" });

    // Contrôle MIME (liste blanche).
    if (!config.allowedUploadMime.includes(file.mimetype)) {
      return reply.code(415).send({
        error: `type non autorisé: ${file.mimetype}`,
        allowed: config.allowedUploadMime,
      });
    }

    // Lecture bornée (le plugin multipart applique déjà fileSize).
    const buffer = await file.toBuffer();
    if (buffer.byteLength > config.maxUploadBytes) {
      return reply.code(413).send({ error: "fichier trop volumineux" });
    }

    // En production : push vers MinIO/S3 + enregistrement table `uploads`.
    const { projectId } = req.params as { projectId: string };
    return reply.code(201).send({
      projectId,
      filename: file.filename,
      mimeType: file.mimetype,
      sizeBytes: buffer.byteLength,
      storageKey: `uploads/${projectId}/${Date.now()}-${file.filename}`,
    });
  });
}
