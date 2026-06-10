/** Configuration de l'API à partir de l'environnement (aucun secret en dur). */
export const config = {
  env: process.env.NODE_ENV ?? "development",
  host: process.env.API_HOST ?? "0.0.0.0",
  port: Number(process.env.API_PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? "change-me-dev-only",
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379/0",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 52_428_800),
  allowedUploadMime: (process.env.ALLOWED_UPLOAD_MIME ??
    "application/pdf,image/vnd.dxf,model/iges,application/octet-stream"
  ).split(","),
  calcQueue: process.env.CALC_SERVICE_QUEUE ?? "genie:calc",
} as const;
