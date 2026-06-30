import type { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const controller = new AuthController();

  app.post('/auth/token', {
    schema: {
      tags: ['auth'],
      body: { $ref: 'TokenRequestBody#' },
      response: {
        200: { $ref: 'TokenResponse#' },
        400: { $ref: 'ErrorResponse#' },
      },
    },
    handler: controller.issueToken.bind(controller),
  });
}
