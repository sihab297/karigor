export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function fieldError(field: string, message: string) {
  return new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', [
    { field, message },
  ]);
}
