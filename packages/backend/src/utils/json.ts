// JSON helpers for SQLite compatibility
// Since SQLite stores JSON as text, we serialize/deserialize

export function toJson(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value ?? {});
}

export function fromJson<T = unknown>(value: string | null | undefined): T {
  if (!value) return (Array.isArray(value) ? [] : {}) as T;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}
