import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import type { LocationUpsertApiBody } from '../models/location.mapper.js';
import {
  fromLocationUpsertApiBody,
  toLocationDetailApi,
  toLocationSearchApi,
} from '../models/location.mapper.js';
import { LocationService } from '../services/location.service.js';

export class LocationController {
  constructor(private locationService: LocationService) {}

  async search(
    request: FastifyRequest<{
      Querystring: { x: string; y: string; limit?: string; offset?: string };
    }>,
    reply: FastifyReply,
  ) {
    const x = Number(request.query.x);
    const y = Number(request.query.y);
    const limit =
      request.query.limit !== undefined
        ? Number(request.query.limit)
        : env.searchDefaultLimit;
    const offset =
      request.query.offset !== undefined ? Number(request.query.offset) : 0;

    // Critical metric: time how long the search takes end-to-end (query + mapping).
    const startedAt = performance.now();
    try {
      const result = await this.locationService.searchLocations(x, y, { limit, offset });
      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      request.log.info(
        {
          event: 'location_search',
          x,
          y,
          limit,
          offset,
          resultCount: result.locations.length,
          latencyMs,
        },
        'location search completed',
      );
      return reply.send(toLocationSearchApi(result));
    } catch (error) {
      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      request.log.error(
        { event: 'location_search', x, y, limit, offset, latencyMs, err: error },
        'location search failed',
      );
      throw error;
    }
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const startedAt = performance.now();
    try {
      const location = await this.locationService.getById(id);
      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      if (!location) {
        request.log.info(
          { event: 'location_get_by_id', id, found: false, latencyMs },
          'location not found',
        );
        return reply.status(404).send({ message: 'Location not found' });
      }
      request.log.info(
        { event: 'location_get_by_id', id, found: true, latencyMs },
        'location fetched',
      );
      return reply.send(toLocationDetailApi(location));
    } catch (error) {
      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      request.log.error(
        { event: 'location_get_by_id', id, latencyMs, err: error },
        'location fetch failed',
      );
      throw error;
    }
  }

  async upsert(
    request: FastifyRequest<{ Params: { id: string }; Body: LocationUpsertApiBody }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const startedAt = performance.now();
    try {
      const location = await this.locationService.upsert(
        fromLocationUpsertApiBody(id, request.body),
      );
      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      request.log.info({ event: 'location_upsert', id, latencyMs }, 'location upserted');
      return reply.status(200).send(toLocationDetailApi(location));
    } catch (error) {
      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      request.log.error(
        { event: 'location_upsert', id, latencyMs, err: error },
        'location upsert failed',
      );
      throw error;
    }
  }
}
