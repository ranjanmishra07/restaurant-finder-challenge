import type { FastifyInstance } from 'fastify';
import type { LocationController } from '../controllers/location.controller.js';
import { authRoutes } from './auth.routes.js';
import { locationRoutes } from './location.routes.js';

export async function registerRoutes(
  app: FastifyInstance,
  locationController: LocationController,
): Promise<void> {
  await app.register(authRoutes);
  await app.register((instance) => locationRoutes(instance, locationController));
}
