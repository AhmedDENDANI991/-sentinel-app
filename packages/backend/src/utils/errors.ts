export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(entity: string, id?: string): AppError {
  return new AppError(404, `${entity}${id ? ` (${id})` : ''} not found`);
}

export function forbidden(message = 'Access denied'): AppError {
  return new AppError(403, message);
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, message, details);
}

export function handleError(error: unknown, reply: any) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
      details: error.details,
    });
  }
  console.error('Unhandled error:', error);
  return reply.status(500).send({ error: 'Internal server error' });
}
