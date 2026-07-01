/** Client-safe API error text — describes the error type without exposing limits or input. */
export const API_ERROR_MESSAGES = {
  BAD_REQUEST: 'Bad Request',
  UNAUTHORIZED: 'Unauthorized',
  NOT_FOUND: 'Not Found',
  TOO_MANY_REQUESTS: 'Too Many Requests',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  VALUE_EXCEEDS_MAX: 'Value exceeds the maximum allowed',
  VALUE_BELOW_MIN: 'Value is below the minimum allowed',
  VALUE_EXCEEDS_MAX_LENGTH: 'Value exceeds the maximum allowed length',
  REQUIRED_FIELD_MISSING: 'Required field is missing',
  UNEXPECTED_FIELD: 'Unexpected field in request',
  INVALID_FORMAT: 'Invalid field format',
  INVALID_COORDINATES: 'Invalid coordinates',
  COORDINATE_EXCEEDS_MAX: 'Coordinate exceeds the maximum allowed value',
  COORDINATE_INVALID: 'Invalid coordinate value',
} as const;

type ValidationIssue = { keyword: string };

type FastifyValidationError = Error & {
  code?: string;
  validation?: ValidationIssue[];
};

export function resolveValidationErrorMessage(error: FastifyValidationError): string {
  const keyword = error.validation?.[0]?.keyword;

  switch (keyword) {
    case 'maximum':
      return API_ERROR_MESSAGES.VALUE_EXCEEDS_MAX;
    case 'minimum':
      return API_ERROR_MESSAGES.VALUE_BELOW_MIN;
    case 'maxLength':
      return API_ERROR_MESSAGES.VALUE_EXCEEDS_MAX_LENGTH;
    case 'required':
      return API_ERROR_MESSAGES.REQUIRED_FIELD_MISSING;
    case 'additionalProperties':
      return API_ERROR_MESSAGES.UNEXPECTED_FIELD;
    case 'pattern':
    case 'format':
      return API_ERROR_MESSAGES.INVALID_FORMAT;
    default:
      return API_ERROR_MESSAGES.BAD_REQUEST;
  }
}

export function resolveClientErrorMessage(
  error: Error & { statusCode?: number; code?: string; validation?: ValidationIssue[] },
  statusCode: number,
): string {
  if (statusCode >= 500) {
    return API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  }

  if (error instanceof Error && 'code' in error && error.code === 'FST_ERR_VALIDATION') {
    return resolveValidationErrorMessage(error);
  }

  switch (statusCode) {
    case 401:
      return API_ERROR_MESSAGES.UNAUTHORIZED;
    case 404:
      return API_ERROR_MESSAGES.NOT_FOUND;
    case 429:
      return API_ERROR_MESSAGES.TOO_MANY_REQUESTS;
    default:
      return API_ERROR_MESSAGES.BAD_REQUEST;
  }
}
