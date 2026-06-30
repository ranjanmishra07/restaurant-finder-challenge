import { beforeEach, describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import type { LocationDbRow } from '../src/models/location.model.js';
import { LocationRepository } from '../src/repositories/location.repository.js';

// Unit tests: the pg pool is fully mocked, so NO real database is needed.
// These verify the repository's own logic — SQL parameters, row mapping, the
// numeric distance conversion, and the in-memory maxRadius cache. The actual SQL
// semantics (sort/filter/bbox) are validated separately in the integration suite.

function createMockPool() {
  const query = vi.fn();
  const pool = { query } as unknown as pg.Pool;
  return { pool, query };
}

function dbRow(overrides: Partial<LocationDbRow> = {}): LocationDbRow {
  return {
    id: '19e1545c-8b65-4d83-82f9-7fcad4a23115',
    name: 'Goji',
    type: 'Restaurant',
    opening_hours: '10:00AM-11:00PM',
    image: 'https://tinyurl.com',
    x: 3,
    y: 3,
    radius: 3,
    ...overrides,
  };
}

describe('LocationRepository (mocked pool)', () => {
  let pool: pg.Pool;
  let query: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ({ pool, query } = createMockPool());
  });

  describe('findById', () => {
    it('maps a returned row to a domain Location', async () => {
      query.mockResolvedValueOnce({ rows: [dbRow()] });
      const repository = new LocationRepository(pool);

      const location = await repository.findById('19e1545c-8b65-4d83-82f9-7fcad4a23115');

      expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [
        '19e1545c-8b65-4d83-82f9-7fcad4a23115',
      ]);
      expect(location).toEqual({
        id: '19e1545c-8b65-4d83-82f9-7fcad4a23115',
        name: 'Goji',
        type: 'Restaurant',
        openingHours: '10:00AM-11:00PM',
        image: 'https://tinyurl.com',
        x: 3,
        y: 3,
        radius: 3,
        coordinates: 'x=3,y=3',
      });
    });

    it('returns null when no row is found', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const repository = new LocationRepository(pool);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });
  });

  describe('refreshMaxRadius', () => {
    it('reads MAX(radius) from the database', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_radius: 8 }] });
      const repository = new LocationRepository(pool);

      await expect(repository.refreshMaxRadius()).resolves.toBe(8);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('MAX(radius)'));
    });

    it('defaults to 1 when the table is empty', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_radius: null }] });
      const repository = new LocationRepository(pool);

      await expect(repository.refreshMaxRadius()).resolves.toBe(1);
    });
  });

  describe('searchVisible', () => {
    it('passes user coordinates and the cached maxRadius as query params', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_radius: 10 }] });
      const repository = new LocationRepository(pool);
      await repository.refreshMaxRadius();

      query.mockResolvedValueOnce({ rows: [] });
      await repository.searchVisible(3, 3);

      expect(query).toHaveBeenLastCalledWith(
        expect.stringMatching(/ORDER BY distance ASC\s+LIMIT \$4 OFFSET \$5/s),
        [3, 3, 10, 20, 0],
      );
    });

    it('passes custom limit and offset to the query', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const repository = new LocationRepository(pool);

      await repository.searchVisible(3, 3, 5, 10);

      expect(query).toHaveBeenCalledWith(expect.any(String), [3, 3, 1, 5, 10]);
    });

    it('uses the default maxRadius of 1 when refreshMaxRadius was never called', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const repository = new LocationRepository(pool);

      await repository.searchVisible(5, 5);

      expect(query).toHaveBeenCalledWith(expect.any(String), [5, 5, 1, 20, 0]);
    });

    it('maps rows and coerces the numeric distance to a number', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 'a', name: 'Near', x: 3, y: 3, distance: '0' },
          { id: 'b', name: 'Far', x: 4, y: 4, distance: '1.4142135623730951' },
        ],
      });
      const repository = new LocationRepository(pool);

      const results = await repository.searchVisible(3, 3);

      expect(results).toEqual([
        { id: 'a', name: 'Near', x: 3, y: 3, distance: 0 },
        { id: 'b', name: 'Far', x: 4, y: 4, distance: 1.4142135623730951 },
      ]);
      expect(typeof results[0]?.distance).toBe('number');
    });
  });

  describe('upsert', () => {
    it('passes all columns as params and maps the RETURNING row', async () => {
      query.mockResolvedValueOnce({
        rows: [dbRow({ name: 'New Spot', x: 5, y: 5, radius: 3 })],
      });
      const repository = new LocationRepository(pool);

      const result = await repository.upsert({
        id: '19e1545c-8b65-4d83-82f9-7fcad4a23115',
        name: 'New Spot',
        type: 'Restaurant',
        openingHours: '10:00AM-11:00PM',
        image: 'https://tinyurl.com',
        coordinates: 'x=5,y=5',
        radius: 3,
      });

      expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO locations'), [
        '19e1545c-8b65-4d83-82f9-7fcad4a23115',
        'New Spot',
        'Restaurant',
        '10:00AM-11:00PM',
        'https://tinyurl.com',
        5,
        5,
        3,
      ]);
      expect(result).toMatchObject({ name: 'New Spot', x: 5, y: 5, coordinates: 'x=5,y=5' });
    });

    it('widens the cached maxRadius so the next search uses the larger bbox', async () => {
      // Fresh repository → maxRadius defaults to 1.
      const repository = new LocationRepository(pool);

      query.mockResolvedValueOnce({
        rows: [dbRow({ name: 'Far Beacon', x: 50, y: 50, radius: 20 })],
      });
      await repository.upsert({
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        name: 'Far Beacon',
        type: 'Restaurant',
        openingHours: '9:00AM-9:00PM',
        image: 'https://example.com',
        coordinates: 'x=50,y=50',
        radius: 20,
      });

      query.mockResolvedValueOnce({ rows: [] });
      await repository.searchVisible(60, 60);

      // maxRadius is now 20 (set by upsert), not the default 1.
      expect(query).toHaveBeenLastCalledWith(expect.any(String), [60, 60, 20, 20, 0]);
    });

    it('does not shrink the cached maxRadius for a smaller radius', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_radius: 10 }] });
      const repository = new LocationRepository(pool);
      await repository.refreshMaxRadius();

      query.mockResolvedValueOnce({ rows: [dbRow({ radius: 2 })] });
      await repository.upsert({
        id: '19e1545c-8b65-4d83-82f9-7fcad4a23115',
        name: 'Goji',
        type: 'Restaurant',
        openingHours: '10:00AM-11:00PM',
        image: 'https://tinyurl.com',
        coordinates: 'x=3,y=3',
        radius: 2,
      });

      query.mockResolvedValueOnce({ rows: [] });
      await repository.searchVisible(3, 3);

      expect(query).toHaveBeenLastCalledWith(expect.any(String), [3, 3, 10, 20, 0]);
    });
  });
});
