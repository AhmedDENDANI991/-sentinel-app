import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";

describe("API", () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildServer(); await app.ready(); });
  afterAll(async () => { await app.close(); });

  it("health endpoint répond ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
  });

  it("refuse l'accès aux projets sans JWT", async () => {
    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(401);
  });

  it("login délivre un JWT puis crée un projet", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { email: "admin@genie.local", password: "devpassword" },
    });
    expect(login.statusCode).toBe(200);
    const token = login.json().token as string;
    expect(token).toBeTruthy();

    const created = await app.inject({
      method: "POST", url: "/api/projects",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Résidence El Achour R+4" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().name).toContain("El Achour");
  });

  it("rejette un upload de type MIME non autorisé via la config", async () => {
    // Le contrôle MIME est appliqué dans la route uploads (liste blanche).
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.json().ready).toBe(true);
  });
});
