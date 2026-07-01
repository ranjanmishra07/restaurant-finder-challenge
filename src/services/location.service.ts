import type {
  LocationDetail,
  LocationSearchPagination,
  LocationSearchResult,
  LocationUpsertInput,
} from '../models/location.model.js';
import {
  toLocationDetail,
  toLocationSearchItem,
} from '../models/location.mapper.js';
import type { LocationRepository } from '../repositories/location.repository.js';
import { env } from '../config/env.js';
import { assertCoordinateInRange, formatCoordinates, parseCoordinates } from '../utils/coordinates.js';

export class LocationService {
  constructor(private locationRepo: LocationRepository) {}

  async searchLocations(
    x: number,
    y: number,
    pagination: LocationSearchPagination = {
      limit: env.searchDefaultLimit,
      offset: 0,
    },
  ): Promise<LocationSearchResult> {
    assertCoordinateInRange(x);
    assertCoordinateInRange(y);

    const rows = await this.locationRepo.searchVisible(
      x,
      y,
      pagination.limit,
      pagination.offset,
    );
    return {
      userLocation: formatCoordinates(x, y),
      locations: rows.map(toLocationSearchItem),
    };
  }

  async getById(id: string): Promise<LocationDetail | null> {
    const location = await this.locationRepo.findById(id);
    if (!location) {
      return null;
    }

    return toLocationDetail(location);
  }

  async upsert(input: LocationUpsertInput): Promise<LocationDetail> {
    const { x, y } = parseCoordinates(input.coordinates);
    assertCoordinateInRange(x);
    assertCoordinateInRange(y);

    const saved = await this.locationRepo.upsert(input);
    return toLocationDetail(saved);
  }
}
