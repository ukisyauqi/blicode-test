export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = (message = "Belum login") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Akses ditolak") => new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Data tidak ditemukan") =>
  new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);
export const unprocessable = (message: string, details?: unknown) =>
  new AppError(422, "VALIDATION_ERROR", message, details);
