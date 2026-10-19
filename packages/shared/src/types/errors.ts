/**
 * KuroStudio Domain Error Hierarchy
 */

export class KuroError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code = 'KURO_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends KuroError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class CommandError extends KuroError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'COMMAND_ERROR', details);
  }
}

export class InvariantViolationError extends KuroError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVARIANT_VIOLATION', details);
  }
}

export class ProjectCorruptionError extends KuroError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROJECT_CORRUPTION', details);
  }
}

export class MediaError extends KuroError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'MEDIA_ERROR', details);
  }
}

export class AIProviderError extends KuroError {
  public readonly providerId: string;
  public readonly isRetryable: boolean;

  constructor(providerId: string, message: string, isRetryable = false, details?: Record<string, unknown>) {
    super(message, 'AI_PROVIDER_ERROR', details);
    this.providerId = providerId;
    this.isRetryable = isRetryable;
  }
}
