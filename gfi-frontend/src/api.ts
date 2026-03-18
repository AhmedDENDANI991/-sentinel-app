const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchDashboard() {
  const res = await fetch(`${API_URL}/api/analytics/dashboard`);
  return res.json();
}

export async function fetchDocuments(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${API_URL}/api/documents/${qs}`);
  return res.json();
}

export async function fetchDocument(uuid: string) {
  const res = await fetch(`${API_URL}/api/documents/${uuid}`);
  return res.json();
}

export async function fetchPipelineStatus() {
  const res = await fetch(`${API_URL}/api/pipeline/status`);
  return res.json();
}

export async function fetchPipelineLayers() {
  const res = await fetch(`${API_URL}/api/pipeline/layers`);
  return res.json();
}

export async function fetchEntities() {
  const res = await fetch(`${API_URL}/api/socle/entities`);
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_URL}/api/socle/projects`);
  return res.json();
}

export async function fetchAssociates() {
  const res = await fetch(`${API_URL}/api/socle/associates`);
  return res.json();
}

export async function fetchAccountingEntries(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${API_URL}/api/accounting/entries${qs}`);
  return res.json();
}

export async function fetchIngestionReport() {
  const res = await fetch(`${API_URL}/api/analytics/ingestion-report`);
  return res.json();
}

export async function fetchArchiveStats() {
  const res = await fetch(`${API_URL}/api/archive/stats`);
  return res.json();
}

export async function uploadFiles(files: FileList) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }
  const res = await fetch(`${API_URL}/api/intake/upload-batch`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function uploadSingleFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/intake/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function validateEntry(entryId: number) {
  const res = await fetch(`${API_URL}/api/accounting/entries/${entryId}/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ validated_by: "DAF" }),
  });
  return res.json();
}

export async function rejectEntry(entryId: number) {
  const res = await fetch(`${API_URL}/api/accounting/entries/${entryId}/reject`, {
    method: "POST",
  });
  return res.json();
}

export async function createEntity(entity: Record<string, string | null>) {
  const res = await fetch(`${API_URL}/api/socle/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entity),
  });
  return res.json();
}

export async function createProject(project: Record<string, string | number | null>) {
  const res = await fetch(`${API_URL}/api/socle/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  return res.json();
}

export async function createAssociate(associate: Record<string, string | null>) {
  const res = await fetch(`${API_URL}/api/socle/associates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(associate),
  });
  return res.json();
}

export async function searchDocuments(query: string) {
  const res = await fetch(`${API_URL}/api/documents/search/text?q=${encodeURIComponent(query)}`);
  return res.json();
}
