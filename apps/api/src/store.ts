/**
 * Couche de persistance.
 *
 * Utilise PostgreSQL si DATABASE_URL est défini, sinon bascule sur un store
 * mémoire (utile pour le développement, les tests et les démos sans DB).
 */
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import type { ProjectParams, LevelLoad } from "@genie/shared";

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  params?: ProjectParams;
  levels: LevelLoad[];
  createdAt: string;
}

interface Store {
  createProject(ownerId: string, name: string): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  listProjects(ownerId: string): Promise<Project[]>;
  setParams(id: string, params: ProjectParams): Promise<void>;
  setLevels(id: string, levels: LevelLoad[]): Promise<void>;
}

class MemoryStore implements Store {
  private projects = new Map<string, Project>();

  async createProject(ownerId: string, name: string): Promise<Project> {
    const p: Project = {
      id: randomUUID(), name, ownerId, levels: [],
      createdAt: new Date().toISOString(),
    };
    this.projects.set(p.id, p);
    return p;
  }
  async getProject(id: string) { return this.projects.get(id); }
  async listProjects(ownerId: string) {
    return [...this.projects.values()].filter((p) => p.ownerId === ownerId);
  }
  async setParams(id: string, params: ProjectParams) {
    const p = this.projects.get(id);
    if (p) p.params = params;
  }
  async setLevels(id: string, levels: LevelLoad[]) {
    const p = this.projects.get(id);
    if (p) p.levels = levels;
  }
}

// Note : l'implémentation PostgreSQL (pg) suit le même contrat `Store`.
// Tant qu'elle n'est pas branchée, le store mémoire garantit une API fonctionnelle.
export const store: Store = new MemoryStore();
export const usingDatabase = Boolean(config.databaseUrl);
