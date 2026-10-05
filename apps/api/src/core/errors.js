export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', errors } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.errors = errors ?? [{ code, message }];
  }
}

export class ValidationError extends AppError {
  constructor(errors, message = 'Validation failed') {
    super(message, { status: 422, code: 'VALIDATION_ERROR', errors });
  }
}

export class BusinessRuleError extends AppError {
  constructor(message, field) {
    super(message, {
      status: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      errors: [{ code: 'BUSINESS_RULE_VIOLATION', message, ...(field ? { field } : {}) }],
    });
  }
}

export class NotFoundError extends AppError {
  constructor(entity = 'Resource') {
    super(`${entity} not found`, { status: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message, field) {
    super(message, {
      status: 409,
      code: 'CONFLICT',
      errors: [{ code: 'CONFLICT', message, ...(field ? { field } : {}) }],
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, { status: 401, code: 'UNAUTHORIZED' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, { status: 403, code: 'FORBIDDEN' });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please slow down.') {
    super(message, { status: 429, code: 'RATE_LIMITED' });
  }
}
