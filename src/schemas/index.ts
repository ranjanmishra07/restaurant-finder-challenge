import type { FastifyInstance } from 'fastify';
import { authSchemas } from './auth.schemas.js';
import { commonSchemas } from './common.schemas.js';
import { locationSchemas } from './location.schemas.js';

export function registerSchemas(app: FastifyInstance): void {
  for (const schema of [...commonSchemas, ...locationSchemas, ...authSchemas]) {
    app.addSchema(schema);
  }
}
