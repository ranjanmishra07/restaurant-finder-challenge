import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InjectOptions } from 'fastify';
import type { FastifyInstance } from 'fastify';
import { LocationController } from '../../src/controllers/location.controller.js';
import {
  fromLocationApiRecord,
  type LocationApiRecord,
} from '../../src/models/location.mapper.js';
import type { LocationRepository } from '../../src/repositories/location.repository.js';
import { LocationService } from '../../src/services/location.service.js';
import { buildApp } from '../../src/server.js';
import { MockLocationRepository } from './mock-location.repository.js';

function loadSeedLocations() {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(
    path.resolve(testDir, '../../data/locations.json'),
    'utf-8',
  );
  const data = JSON.parse(raw) as { locations: LocationApiRecord[] };
  return data.locations.map(fromLocationApiRecord);
}

export async function createTestLocationController(): Promise<LocationController> {
  const repository = new MockLocationRepository(loadSeedLocations());
  await repository.refreshMaxRadius();
  const service = new LocationService(repository as unknown as LocationRepository);
  return new LocationController(service);
}

export async function buildTestApp() {
  const locationController = await createTestLocationController();
  return buildApp(locationController);
}

export async function buildTestAppWithRepository(repository: LocationRepository) {
  const service = new LocationService(repository);
  const controller = new LocationController(service);
  return buildApp(controller);
}

export async function getAuthToken(app: FastifyInstance, role = 'user'): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/token',
    payload: { role },
  });
  return response.json<{ token: string }>().token;
}

export async function authHeaders(
  app: FastifyInstance,
  role = 'user',
): Promise<{ authorization: string }> {
  const token = await getAuthToken(app, role);
  return { authorization: `Bearer ${token}` };
}

export async function injectWithAuth(
  app: FastifyInstance,
  options: InjectOptions,
  role = 'user',
) {
  const headers = await authHeaders(app, role);
  return app.inject({
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}
