export default class AppError extends Error {
  constructor(message, { statusCode = 500, code = "SERVER_ERROR", details = null } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details) {
    super(message, { statusCode: 400, code: "VALIDATION_ERROR", details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details) {
    super(message, { statusCode: 404, code: "NOT_FOUND", details });
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized", details) {
    super(message, { statusCode: 401, code: "UNAUTHORIZED", details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details) {
    super(message, { statusCode: 403, code: "FORBIDDEN", details });
  }
}
