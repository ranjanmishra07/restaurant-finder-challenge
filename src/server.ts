import Fastify from 'fastify';
import type { FastifyBaseLogger } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type pg from 'pg';
import { LocationController } from './controllers/location.controller.js';
import { LocationRepository } from './repositories/location.repository.js';
import { LocationService } from './services/location.service.js';
import { registerRateLimit } from './middleware/rate-limit.middleware.js';
import { registerRoutes } from './routes/index.js';
import { registerSchemas } from './schemas/index.js';
import { logger } from './utils/logger.js';

export async function createLocationController(pool: pg.Pool): Promise<LocationController> {
  const locationRepository = new LocationRepository(pool);
  await locationRepository.refreshMaxRadius();
  const locationService = new LocationService(locationRepository);
  return new LocationController(locationService);
}

export async function buildApp(locationController: LocationController) {
  const app = Fastify({ loggerInstance: logger as FastifyBaseLogger });

  registerSchemas(app);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Restaurant Finder API',
        description: 'API for finding nearby restaurants',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await registerRateLimit(app);
  await registerRoutes(app, locationController);

  return app;
}
