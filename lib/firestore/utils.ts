/**
 * Firestore rejects any field whose value is literally `undefined` (not
 * just absent) with "Unsupported field value: undefined". Our types use
 * optional fields (location?, formationId?, parentId?, etc.) that are very
 * often present-but-undefined on plain JS objects, so every write goes
 * through this first.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
