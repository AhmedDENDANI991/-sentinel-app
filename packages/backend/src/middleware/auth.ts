import { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  companyScope: string[];
  projectScope: string[];
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Authentication required' });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    const user = request.user as JWTPayload;
    if (!roles.includes(user.role) && user.role !== 'ADMIN') {
      reply.status(403).send({ error: 'Insufficient permissions', required: roles });
    }
  };
}

export function requireCompanyAccess(companyId: string, user: JWTPayload): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.companyScope.length === 0) return true; // empty = all
  return user.companyScope.includes(companyId);
}

export function requireProjectAccess(projectId: string, user: JWTPayload): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.projectScope.length === 0) return true;
  return user.projectScope.includes(projectId);
}
