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
