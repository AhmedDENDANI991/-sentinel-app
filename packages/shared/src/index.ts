/**
 * @genie/shared — contrats de données partagés (Zod) entre API, Web et workers.
 *
 * Miroir TypeScript des modèles Pydantic (apps/workers/svc-calcul/genie_calc/models.py).
 * Cascade imposée : MSP -> MCC -> MCS2 -> MD -> MF -> MVR -> MGM -> MPD.
 */
import { z } from "zod";

// --------------------------------------------------------------------------- //
// Énumérations RPA
// --------------------------------------------------------------------------- //
export const SeismicZone = z.enum(["I", "IIa", "IIb", "III"]);
export const UsageGroup = z.enum(["1A", "1B", "2", "3"]);
export const SiteCategory = z.enum(["S1", "S2", "S3", "S4"]);
export const StructuralSystem = z.enum([
  "portiques_autostables",
  "voiles_porteurs",
  "mixte_portiques_voiles",
  "noyau",
]);

// --------------------------------------------------------------------------- //
// MSP — Paramètres Projet
// --------------------------------------------------------------------------- //
export const ProjectParamsSchema = z.object({
  name: z.string().min(1),
  zone: SeismicZone,
  usage_group: UsageGroup,
  site: SiteCategory,
  q_adm_kpa: z.number().positive(),
  n_levels: z.number().int().min(1),
  storey_height_m: z.number().positive(),
  system: StructuralSystem,
  damping_pct: z.number().positive().max(30).default(7),
});
export type ProjectParams = z.infer<typeof ProjectParamsSchema>;

// --------------------------------------------------------------------------- //
// MCC — Charges
// --------------------------------------------------------------------------- //
export const LevelLoadSchema = z.object({
  level: z.number().int().min(0),
  area_m2: z.number().positive(),
  g_kpa: z.number().min(0),
  q_kpa: z.number().min(0),
  height_m: z.number().positive(),
});
export type LevelLoad = z.infer<typeof LevelLoadSchema>;

export const LoadResultSchema = z.object({
  level: z.number().int(),
  g_total_kn: z.number(),
  q_total_kn: z.number(),
  w_seismic_kn: z.number(),
});
export type LoadResult = z.infer<typeof LoadResultSchema>;

// --------------------------------------------------------------------------- //
// MCS2 — Sismique
// --------------------------------------------------------------------------- //
export const StoreyForceSchema = z.object({
  level: z.number().int(),
  height_m: z.number(),
  weight_kn: z.number(),
  force_kn: z.number(),
  shear_kn: z.number(),
});

export const SeismicResultSchema = z.object({
  period_s: z.number(),
  A: z.number(),
  D: z.number(),
  Q: z.number(),
  R: z.number(),
  eta: z.number(),
  W_total_kn: z.number(),
  base_shear_kn: z.number(),
  storey_forces: z.array(StoreyForceSchema),
  overturning_moment_knm: z.number(),
});
export type SeismicResult = z.infer<typeof SeismicResultSchema>;

// --------------------------------------------------------------------------- //
// MF — Fondations
// --------------------------------------------------------------------------- //
export const FoundationType = z.enum([
  "semelle_isolee",
  "semelle_filante",
  "radier_general",
  "radier_nervure",
  "pieux",
]);

export const FoundationResultSchema = z.object({
  type: FoundationType,
  required_area_m2: z.number(),
  dimensions: z.record(z.string(), z.number()),
  bearing_check_ratio: z.number(),
  ok: z.boolean(),
  note: z.string().nullable().optional(),
});
export type FoundationResult = z.infer<typeof FoundationResultSchema>;

// --------------------------------------------------------------------------- //
// MVR — Vérification réglementaire
// --------------------------------------------------------------------------- //
export const CheckSeverity = z.enum(["ok", "warning", "error"]);
export const RegulatoryCheckSchema = z.object({
  code: z.string(),
  label: z.string(),
  severity: CheckSeverity,
  value: z.number().nullable().optional(),
  limit: z.number().nullable().optional(),
  message: z.string(),
});
export const RegulatoryReportSchema = z.object({
  checks: z.array(RegulatoryCheckSchema),
});
export type RegulatoryReport = z.infer<typeof RegulatoryReportSchema>;

// --------------------------------------------------------------------------- //
// Étude complète (sortie du worker svc-calcul)
// --------------------------------------------------------------------------- //
export const FullStudySchema = z.object({
  project: ProjectParamsSchema,
  loads: z.array(LoadResultSchema),
  w_total_kn: z.number(),
  seismic: SeismicResultSchema,
  predim: z.object({
    column: z.object({ n_ult_kn: z.number(), side_m: z.number(), area_m2: z.number() }),
    beam: z.object({ span_m: z.number(), h_m: z.number(), b_m: z.number() }),
    slab_thickness_m: z.number(),
    shear_wall_thickness_m: z.number(),
  }),
  foundation: FoundationResultSchema,
  regulatory: RegulatoryReportSchema,
  blocking: z.boolean(),
});
export type FullStudy = z.infer<typeof FullStudySchema>;

// --------------------------------------------------------------------------- //
// Auth / RBAC
// --------------------------------------------------------------------------- //
export const Role = z.enum(["admin", "engineer", "viewer"]);
export type Role = z.infer<typeof Role>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: Role,
});
export type User = z.infer<typeof UserSchema>;
