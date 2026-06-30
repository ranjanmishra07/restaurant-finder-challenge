import { ApiField } from '../models/api-fields.js';

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
    x: { $ref: 'NonNegativeIntegerString#' },
    y: { $ref: 'NonNegativeIntegerString#' },
    limit: { $ref: 'PositiveIntegerString#' },
    offset: { $ref: 'NonNegativeIntegerString#' },
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
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    [ApiField.OPENING_HOURS]: { type: 'string', minLength: 1 },
    image: { type: 'string', format: 'uri' },
    coordinates: { $ref: 'CoordinatesString#' },
    radius: { $ref: 'PositiveInteger#' },
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
