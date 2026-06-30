import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { LocationController } from '../controllers/location.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export async function locationRoutes(
  app: FastifyInstance,
  controller: LocationController,
): Promise<void> {
  app.addHook('onRequest', authMiddleware);

  app.get('/locations/search', {
    schema: {
      tags: ['locations'],
      security: [{ bearerAuth: [] }],
      querystring: { $ref: 'LocationSearchQuery#' },
      response: {
        200: { $ref: 'LocationSearchResponse#' },
        400: { $ref: 'ErrorResponse#' },
        401: { $ref: 'ErrorResponse#' },
      },
    },
    handler: controller.search.bind(controller),
  });

  app.get('/locations/:id', {
    schema: {
      tags: ['locations'],
      security: [{ bearerAuth: [] }],
      params: { $ref: 'LocationIdParams#' },
      response: {
        200: { $ref: 'LocationDetailResponse#' },
        400: { $ref: 'ErrorResponse#' },
        401: { $ref: 'ErrorResponse#' },
        404: { $ref: 'ErrorResponse#' },
      },
    },
    handler: controller.getById.bind(controller),
  });

  app.put('/locations/:id', {
    config: {
      rateLimit: {
        max: env.rateLimitMax,
        timeWindow: env.rateLimitTimeWindow,
      },
    },
    schema: {
      tags: ['locations'],
      security: [{ bearerAuth: [] }],
      params: { $ref: 'LocationIdParams#' },
      body: { $ref: 'LocationUpsertBody#' },
      response: {
        200: { $ref: 'LocationDetailResponse#' },
        400: { $ref: 'ErrorResponse#' },
        401: { $ref: 'ErrorResponse#' },
        429: { $ref: 'ErrorResponse#' },
      },
    },
    handler: controller.upsert.bind(controller),
  });
}
