/** Client API léger pour le frontend. */
import type { ProjectParams, LevelLoad, FullStudy } from "@genie/shared";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

let token: string | null = null;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  async login(email: string, password: string) {
    const r = await req<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    token = r.token;
    return r;
  },
  createProject: (name: string) =>
    req<{ id: string; name: string }>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  setParams: (id: string, params: ProjectParams) =>
    req(`/api/projects/${id}/params`, { method: "PUT", body: JSON.stringify(params) }),
  setLevels: (id: string, levels: LevelLoad[]) =>
    req(`/api/projects/${id}/levels`, { method: "PUT", body: JSON.stringify({ levels }) }),
  runCalc: (id: string) =>
    req<{ status: string; job?: { result?: FullStudy } }>(`/api/calc/${id}/run`, { method: "POST" }),
};
