/** Auth JWT + RBAC (contrôle d'accès basé sur les rôles). */
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@genie/shared";

export interface JwtUser {
  id: string;
  email: string;
  role: Role;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtUser;
  }
  interface FastifyInstance {
    authenticate: typeof authenticate;
    requireRole: typeof requireRole;
  }
}

/** Hook d'authentification : vérifie le JWT et attache l'utilisateur. */
export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await req.jwtVerify<JwtUser>();
    req.user = payload;
  } catch {
    await reply.code(401).send({ error: "non authentifié" });
  }
}

/** Hiérarchie des rôles : admin > engineer > viewer. */
const RANK: Record<Role, number> = { admin: 3, engineer: 2, viewer: 1 };

/** Garde RBAC : exige un rôle minimal. */
export function requireRole(min: Role) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.user) {
      await reply.code(401).send({ error: "non authentifié" });
      return;
    }
    if (RANK[req.user.role] < RANK[min]) {
      await reply.code(403).send({ error: "accès refusé (rôle insuffisant)" });
    }
  };
}
