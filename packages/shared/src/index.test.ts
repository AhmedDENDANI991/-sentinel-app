import { describe, it, expect } from "vitest";
import { ProjectParamsSchema, LevelLoadSchema, FullStudySchema } from "./index.js";

describe("shared contracts", () => {
  it("accepts a valid project (El Achour R+4)", () => {
    const parsed = ProjectParamsSchema.parse({
      name: "Résidence El Achour R+4",
      zone: "III",
      usage_group: "2",
      site: "S3",
      q_adm_kpa: 200,
      n_levels: 5,
      storey_height_m: 3.06,
      system: "mixte_portiques_voiles",
    });
    expect(parsed.damping_pct).toBe(7); // valeur par défaut
  });

  it("rejects a non-positive bearing capacity", () => {
    expect(() =>
      ProjectParamsSchema.parse({
        name: "x", zone: "I", usage_group: "2", site: "S1",
        q_adm_kpa: 0, n_levels: 1, storey_height_m: 3, system: "noyau",
      }),
    ).toThrow();
  });

  it("validates level loads", () => {
    expect(() => LevelLoadSchema.parse({ level: 0, area_m2: -1, g_kpa: 5, q_kpa: 1, height_m: 3 })).toThrow();
    expect(LevelLoadSchema.parse({ level: 0, area_m2: 100, g_kpa: 5, q_kpa: 1, height_m: 3 }).level).toBe(0);
  });

  it("FullStudy schema is well-formed", () => {
    expect(FullStudySchema).toBeDefined();
  });
});
