import { describe, expect, it, vi } from 'vitest';
import { toLocationSearchItem } from '../src/models/location.mapper.js';
import type { Location, LocationSearchRow } from '../src/models/location.model.js';
import type { LocationRepository } from '../src/repositories/location.repository.js';
import { LocationService } from '../src/services/location.service.js';
import { API_ERROR_MESSAGES } from '../src/utils/api-error-messages.js';
import { MockLocationRepository } from './helpers/mock-location.repository.js';

function createLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: '21e1545c-8b65-4d83-82f9-7fcad4a23114',
    name: 'Deseado Steakhaus',
    type: 'Restaurant',
    openingHours: '10:00AM-11:00PM',
    image: 'https://tinyurl.com',
    coordinates: 'x=2,y=2',
    x: 2,
    y: 2,
    radius: 4,
    ...overrides,
  };
}

describe('LocationService', () => {
  it('maps visible search rows sorted by distance', async () => {
    const rows: LocationSearchRow[] = [
      { id: 'a', name: 'Near', x: 2, y: 2, distance: 1 },
      { id: 'b', name: 'Farther', x: 2, y: 3, distance: 1.414214 },
    ];

    const repository = {
      searchVisible: vi.fn().mockResolvedValue(rows),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    const result = await service.searchLocations(3, 2);

    expect(repository.searchVisible).toHaveBeenCalledWith(3, 2, 20, 0);
    expect(result.userLocation).toBe('x=3,y=2');
    expect(result.locations).toEqual(rows.map(toLocationSearchItem));
  });

  it('passes limit and offset through to the repository', async () => {
    const repository = {
      searchVisible: vi.fn().mockResolvedValue([]),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    await service.searchLocations(3, 2, { limit: 5, offset: 10 });

    expect(repository.searchVisible).toHaveBeenCalledWith(3, 2, 5, 10);
  });

  it('returns an empty location list when nothing is visible', async () => {
    const repository = {
      searchVisible: vi.fn().mockResolvedValue([]),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    const result = await service.searchLocations(100, 100);

    expect(result.userLocation).toBe('x=100,y=100');
    expect(result.locations).toEqual([]);
  });

  it('returns null detail when location is missing', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    await expect(service.getById('missing-id')).resolves.toBeNull();
  });

  it('maps a found location to its detail shape', async () => {
    const location = createLocation();
    const repository = {
      findById: vi.fn().mockResolvedValue(location),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    const result = await service.getById(location.id);

    expect(repository.findById).toHaveBeenCalledWith(location.id);
    expect(result).toEqual({
      id: location.id,
      name: location.name,
      type: location.type,
      openingHours: location.openingHours,
      image: location.image,
      coordinates: location.coordinates,
    });
  });

  it('rejects search when x exceeds safe coordinate max', async () => {
    const repository = {
      searchVisible: vi.fn().mockResolvedValue([]),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    await expect(service.searchLocations(2_147_483_648, 3)).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 400,
    });
    expect(repository.searchVisible).not.toHaveBeenCalled();
  });

  it('rejects search when x is pg integer max but unsafe for bbox math', async () => {
    const repository = {
      searchVisible: vi.fn().mockResolvedValue([]),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    await expect(service.searchLocations(2_147_483_647, 3)).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 400,
    });
    expect(repository.searchVisible).not.toHaveBeenCalled();
  });

  it('allows search at coordinate max safe for bbox math', async () => {
    const repository = {
      searchVisible: vi.fn().mockResolvedValue([]),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    await expect(service.searchLocations(2_147_482_647, 0)).resolves.toMatchObject({
      userLocation: 'x=2147482647,y=0',
      locations: [],
    });
    expect(repository.searchVisible).toHaveBeenCalledWith(2_147_482_647, 0, 20, 0);
  });

  it('rejects upsert when coordinates exceed safe coordinate max', async () => {
    const repository = {
      upsert: vi.fn(),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    await expect(
      service.upsert({
        id: '51e1545c-8b65-4d83-82f9-7fcad4a23111',
        name: 'Bad Coords',
        type: 'Restaurant',
        openingHours: '10:00AM-11:00PM',
        image: 'https://tinyurl.com',
        coordinates: 'x=2147483648,y=3',
        radius: 1,
      }),
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 400,
    });
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('rejects upsert when coordinates are invalid', async () => {
    const repository = new MockLocationRepository([]);
    const service = new LocationService(repository as unknown as LocationRepository);

    await expect(
      service.upsert({
        id: '51e1545c-8b65-4d83-82f9-7fcad4a23111',
        name: 'Bad Coords',
        type: 'Restaurant',
        openingHours: '10:00AM-11:00PM',
        image: 'https://tinyurl.com',
        coordinates: 'invalid',
        radius: 1,
      }),
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 400,
      message: API_ERROR_MESSAGES.INVALID_COORDINATES,
    });
  });

  it('upserts and returns location detail', async () => {
    const saved = createLocation({ id: '51e1545c-8b65-4d83-82f9-7fcad4a23111', x: 5, y: 5, coordinates: 'x=5,y=5' });
    const repository = {
      upsert: vi.fn().mockResolvedValue(saved),
    } as unknown as LocationRepository;

    const service = new LocationService(repository);
    const result = await service.upsert({
      id: saved.id,
      name: saved.name,
      type: saved.type,
      openingHours: saved.openingHours,
      image: saved.image,
      coordinates: saved.coordinates,
      radius: saved.radius,
    });

    expect(result.coordinates).toBe('x=5,y=5');
    expect(result.name).toBe('Deseado Steakhaus');
  });
});
