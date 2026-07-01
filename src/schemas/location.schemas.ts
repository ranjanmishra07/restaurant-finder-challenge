import { ApiField } from '../models/api-fields.js';
import {
  UPSERT_IMAGE_MAX_LENGTH,
  UPSERT_NAME_MAX_LENGTH,
  UPSERT_OPENING_HOURS_MAX_LENGTH,
  UPSERT_TYPE_MAX_LENGTH,
} from './validation-limits.js';

export const locationSearchItemSchema = {
  $id: 'LocationSearchItem',
  type: 'object',
  required: ['id', 'name', 'coordinates', 'distance'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    coordinates: { $ref: 'CoordinatesString#' },
    distance: { type: 'number', minimum: 0 },
  },
} as const;

export const locationSearchQuerySchema = {
  $id: 'LocationSearchQuery',
  type: 'object',
  required: ['x', 'y'],
  additionalProperties: false,
  properties: {
    x: { $ref: 'BoundedNonNegativeIntegerString#' },
    y: { $ref: 'BoundedNonNegativeIntegerString#' },
    limit: { $ref: 'SearchLimitString#' },
    offset: { $ref: 'SearchOffsetString#' },
  },
} as const;

export const locationSearchResponseSchema = {
  $id: 'LocationSearchResponse',
  type: 'object',
  required: [ApiField.USER_LOCATION, 'locations'],
  additionalProperties: false,
  properties: {
    [ApiField.USER_LOCATION]: { $ref: 'CoordinatesString#' },
    locations: {
      type: 'array',
      items: { $ref: 'LocationSearchItem#' },
    },
  },
} as const;

export const locationIdParamsSchema = {
  $id: 'LocationIdParams',
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { $ref: 'UuidParam#' },
  },
} as const;

export const locationDetailResponseSchema = {
  $id: 'LocationDetailResponse',
  type: 'object',
  required: ['id', 'name', 'type', ApiField.OPENING_HOURS, 'image', 'coordinates'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    type: { type: 'string' },
    [ApiField.OPENING_HOURS]: { type: 'string', minLength: 1 },
    image: { type: 'string', format: 'uri' },
    coordinates: { $ref: 'CoordinatesString#' },
  },
} as const;

export const locationUpsertBodySchema = {
  $id: 'LocationUpsertBody',
  type: 'object',
  required: ['name', 'type', ApiField.OPENING_HOURS, 'image', 'coordinates', 'radius'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: UPSERT_NAME_MAX_LENGTH },
    type: { type: 'string', minLength: 1, maxLength: UPSERT_TYPE_MAX_LENGTH },
    [ApiField.OPENING_HOURS]: {
      type: 'string',
      minLength: 1,
      maxLength: UPSERT_OPENING_HOURS_MAX_LENGTH,
    },
    image: {
      type: 'string',
      format: 'uri',
      maxLength: UPSERT_IMAGE_MAX_LENGTH,
      pattern: '^https://',
    },
    coordinates: { $ref: 'CoordinatesString#' },
    radius: { $ref: 'UpsertRadius#' },
  },
} as const;

export const locationSchemas = [
  locationSearchItemSchema,
  locationSearchQuerySchema,
  locationSearchResponseSchema,
  locationIdParamsSchema,
  locationDetailResponseSchema,
  locationUpsertBodySchema,
] as const;
