export const tokenRequestBodySchema = {
  $id: 'TokenRequestBody',
  type: 'object',
  additionalProperties: false,
  properties: {
    role: { type: 'string', minLength: 1 },
  },
} as const;

export const tokenResponseSchema = {
  $id: 'TokenResponse',
  type: 'object',
  required: ['token', 'role'],
  additionalProperties: false,
  properties: {
    token: { type: 'string', minLength: 1 },
    role: { type: 'string', minLength: 1 },
  },
} as const;

export const authSchemas = [tokenRequestBodySchema, tokenResponseSchema] as const;
