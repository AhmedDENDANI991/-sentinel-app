/** Routes d'authentification (login -> JWT). */
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Démo : utilisateurs en mémoire. En production -> table `users` + bcrypt.
const DEMO_USERS: Record<string, { id: string; role: "admin" | "engineer" | "viewer" }> = {
  "admin@genie.local": { id: "00000000-0000-0000-0000-000000000001", role: "admin" },
  "ingenieur@genie.local": { id: "00000000-0000-0000-0000-000000000002", role: "engineer" },
};

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "identifiants invalides", details: parsed.error.issues });
    }
    const user = DEMO_USERS[parsed.data.email];
    // En production : vérifier le hash bcrypt. Ici, démo dev uniquement.
    if (!user || parsed.data.password.length < 8) {
      return reply.code(401).send({ error: "email ou mot de passe incorrect" });
    }
    const token = await reply.jwtSign({ id: user.id, email: parsed.data.email, role: user.role });
    return reply.send({ token, user: { id: user.id, email: parsed.data.email, role: user.role } });
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (req) => req.user);
}
