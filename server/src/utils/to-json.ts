/**
 * How a document looks when sent from the API:
 * `id` instead of `_id`, no `__v`, maps as plain objects, and private fields removed.
 */
export function toJSONOptions(hiddenFields: string[] = []) {
  return {
    virtuals: true,
    versionKey: false,
    flattenMaps: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret._id;
      for (const field of hiddenFields) delete ret[field];
      return ret;
    },
  };
}
