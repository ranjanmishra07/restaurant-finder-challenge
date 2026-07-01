import {
  COORDINATE_MAX_DIGITS,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_OFFSET,
  UPSERT_RADIUS_MAX,
} from './validation-limits.js';

export const nonNegativeIntegerStringSchema = {
  $id: 'NonNegativeIntegerString',
  type: 'string',
  pattern: '^\\d+$',
} as const;

export const boundedNonNegativeIntegerStringSchema = {
  $id: 'BoundedNonNegativeIntegerString',
  type: 'string',
  pattern: '^\\d+$',
  maxLength: COORDINATE_MAX_DIGITS,
} as const;

export const searchLimitStringSchema = {
  $id: 'SearchLimitString',
  type: 'string',
  pattern: `^([1-9]|[1-9]\\d|${SEARCH_MAX_LIMIT})$`,
} as const;

export const searchOffsetStringSchema = {
  $id: 'SearchOffsetString',
  type: 'string',
  pattern: `^(\\d{1,${String(SEARCH_MAX_OFFSET).length - 1}}|${SEARCH_MAX_OFFSET})$`,
} as const;

export const uuidParamSchema = {
  $id: 'UuidParam',
  type: 'string',
  format: 'uuid',
} as const;

export const coordinatesStringSchema = {
  $id: 'CoordinatesString',
  type: 'string',
  pattern: `^x=\\d{1,${COORDINATE_MAX_DIGITS}},y=\\d{1,${COORDINATE_MAX_DIGITS}}$`,
} as const;

export const positiveIntegerSchema = {
  $id: 'PositiveInteger',
  type: 'integer',
  minimum: 1,
} as const;

export const upsertRadiusSchema = {
  $id: 'UpsertRadius',
  type: 'integer',
  minimum: 1,
  maximum: UPSERT_RADIUS_MAX,
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
  boundedNonNegativeIntegerStringSchema,
  searchLimitStringSchema,
  searchOffsetStringSchema,
  positiveIntegerStringSchema,
  uuidParamSchema,
  coordinatesStringSchema,
  positiveIntegerSchema,
  upsertRadiusSchema,
  errorResponseSchema,
] as const;
