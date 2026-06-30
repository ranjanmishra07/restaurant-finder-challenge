export const nonNegativeIntegerStringSchema = {
  $id: 'NonNegativeIntegerString',
  type: 'string',
  pattern: '^\\d+$',
} as const;

export const uuidParamSchema = {
  $id: 'UuidParam',
  type: 'string',
  format: 'uuid',
} as const;

export const coordinatesStringSchema = {
  $id: 'CoordinatesString',
  type: 'string',
  pattern: '^x=\\d+,y=\\d+$',
} as const;

export const positiveIntegerSchema = {
  $id: 'PositiveInteger',
  type: 'integer',
  minimum: 1,
} as const;

export const positiveIntegerStringSchema = {
  $id: 'PositiveIntegerString',
  type: 'string',
  pattern: '^[1-9]\\d*$',
} as const;

export const errorResponseSchema = {
  $id: 'ErrorResponse',
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
  },
} as const;

export const commonSchemas = [
  nonNegativeIntegerStringSchema,
  positiveIntegerStringSchema,
  uuidParamSchema,
  coordinatesStringSchema,
  positiveIntegerSchema,
  errorResponseSchema,
] as const;
