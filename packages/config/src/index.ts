/** Configuration partagée (constantes non sensibles) côté TypeScript. */
export const QUEUES = {
  calc: "genie:calc",
  report: "genie:report",
  import: "genie:import",
} as const;

export const UPLOAD = {
  maxBytes: 52_428_800,
  allowedMime: [
    "application/pdf",
    "image/vnd.dxf",
    "model/iges",
    "application/octet-stream",
  ],
} as const;

export const CONNECTOR_MODES = ["mock", "live"] as const;
export type ConnectorMode = (typeof CONNECTOR_MODES)[number];
