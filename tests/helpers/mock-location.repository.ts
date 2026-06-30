import { toLocationFromUpsertInput } from '../../src/models/location.mapper.js';
import type {
  Location,
  LocationSearchRow,
  LocationUpsertInput,
} from '../../src/models/location.model.js';
import { squaredDistance } from '../../src/utils/distance.js';

export class MockLocationRepository {
  private store: Map<string, Location>;
  private maxRadius: number;

  constructor(locations: Location[]) {
    this.store = new Map(locations.map((location) => [location.id, location]));
    this.maxRadius = locations.reduce(
      (max, location) => Math.max(max, location.radius),
      1,
    );
  }

  async refreshMaxRadius(): Promise<number> {
    return this.maxRadius;
  }

  async findById(id: string): Promise<Location | null> {
    return this.store.get(id) ?? null;
  }

  async searchVisible(
    x: number,
    y: number,
    limit = 20,
    offset = 0,
  ): Promise<LocationSearchRow[]> {
    return [...this.store.values()]
      .filter((location) => {
        const withinBBox =
          location.x >= x - this.maxRadius &&
          location.x <= x + this.maxRadius &&
          location.y >= y - this.maxRadius &&
          location.y <= y + this.maxRadius;
        if (!withinBBox) {
          return false;
        }
        return squaredDistance(x, y, location.x, location.y) <= location.radius ** 2;
      })
      .map((location) => ({
        id: location.id,
        name: location.name,
        x: location.x,
        y: location.y,
        distance: Math.sqrt(squaredDistance(x, y, location.x, location.y)),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(offset, offset + limit);
  }

  async upsert(input: LocationUpsertInput): Promise<Location> {
    const location = toLocationFromUpsertInput(input);
    this.store.set(location.id, location);
    if (location.radius > this.maxRadius) {
      this.maxRadius = location.radius;
    }
    return location;
  }
}
