import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { runMigrations } from '../../src/db/migrate.js';
import { seedLocations } from '../../src/db/seed.js';
import { LocationRepository } from '../../src/repositories/location.repository.js';

// Integration suite: exercises the real SQL (sort, radius filter, bbox prune) against PostgreSQL.
// Skipped unless DATABASE_URL is set. Unit-level behaviour (param building, mapping, maxRadius
// caching) lives in tests/location.repository.test.ts with a mocked pool and always runs.
const databaseUrl = process.env.DATABASE_URL;
const describeIfDatabase = databaseUrl ? describe : describe.skip;

describeIfDatabase('LocationRepository (PostgreSQL integration)', () => {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    await runMigrations(pool);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE locations');
    await seedLocations(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('findById returns a seeded location', async () => {
    const repository = new LocationRepository(pool);
    await repository.refreshMaxRadius();

    const location = await repository.findById('19e1545c-8b65-4d83-82f9-7fcad4a23115');

    expect(location).toMatchObject({
      name: 'Goji',
      x: 3,
      y: 3,
      radius: 3,
      coordinates: 'x=3,y=3',
    });
  });

  it('findById returns null for an unknown id', async () => {
    const repository = new LocationRepository(pool);

    const location = await repository.findById('00000000-0000-0000-0000-000000000000');

    expect(location).toBeNull();
  });

  it('searchVisible returns Goji at distance 0 for user at (3,3)', async () => {
    const repository = new LocationRepository(pool);
    await repository.refreshMaxRadius();

    const results = await repository.searchVisible(3, 3);
    const goji = results.find((row) => row.name === 'Goji');

    expect(goji).toMatchObject({
      x: 3,
      y: 3,
      distance: 0,
    });
  });

  it('searchVisible excludes restaurants outside their radius', async () => {
    const repository = new LocationRepository(pool);
    await repository.refreshMaxRadius();

    const results = await repository.searchVisible(100, 100);

    expect(results).toEqual([]);
  });

  it('searchVisible returns results in ascending distance order and excludes in-bbox-but-out-of-circle rows', async () => {
    const repository = new LocationRepository(pool);
    await repository.refreshMaxRadius();

    const results = await repository.searchVisible(3, 3);
    const names = results.map((row) => row.name);
    const distances = results.map((row) => row.distance);

    // Wawa Berlin (1,1) r=1 is inside the maxRadius bbox but the user is 2.83 away — out of its circle.
    expect(names).not.toContain('Wawa Berlin');
    // Every other seeded restaurant can see the user at (3,3).
    expect(results).toHaveLength(9);
    expect(results[0]).toMatchObject({ name: 'Goji', distance: 0 });
    // Full ascending order, not just first vs last.
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('searchVisible includes a restaurant when distance equals its radius (inclusive boundary)', async () => {
    const repository = new LocationRepository(pool);

    // Both centered at (0,4); user at (3,0) is exactly distance 5 away (3-4-5 triangle).
    await repository.upsert({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      name: 'Boundary Inclusive',
      type: 'Restaurant',
      openingHours: '9:00AM-9:00PM',
      image: 'https://example.com',
      coordinates: 'x=0,y=4',
      radius: 5,
    });
    await repository.upsert({
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      name: 'Boundary Outside',
      type: 'Restaurant',
      openingHours: '9:00AM-9:00PM',
      image: 'https://example.com',
      coordinates: 'x=0,y=4',
      radius: 4,
    });
    await repository.refreshMaxRadius();

    const results = await repository.searchVisible(3, 0);
    const names = results.map((row) => row.name);

    expect(names).toContain('Boundary Inclusive');
    expect(names).not.toContain('Boundary Outside');
  });

  it('searchVisible applies limit and offset after sorting by distance', async () => {
    const repository = new LocationRepository(pool);
    await repository.refreshMaxRadius();

    const all = await repository.searchVisible(3, 3);
    const page = await repository.searchVisible(3, 3, 2, 1);

    expect(all.length).toBe(9);
    expect(page).toHaveLength(2);
    expect(page[0]?.name).toBe(all[1]?.name);
    expect(page[1]?.name).toBe(all[2]?.name);
  });

  it('upsert widens the cached maxRadius so far restaurants become visible', async () => {
    // Fresh repository: in-memory maxRadius defaults to 1 (no refresh called).
    const repository = new LocationRepository(pool);

    await repository.upsert({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      name: 'Far Beacon',
      type: 'Restaurant',
      openingHours: '9:00AM-9:00PM',
      image: 'https://example.com',
      coordinates: 'x=50,y=50',
      radius: 20,
    });

    // User at (60,60) is ~14.1 away from (50,50): within radius 20.
    // Only reachable if the bbox used maxRadius=20 (set by the upsert above), not the default 1.
    const results = await repository.searchVisible(60, 60);
    const names = results.map((row) => row.name);

    expect(names).toContain('Far Beacon');
  });

  it('upsert creates and updates a location', async () => {
    const repository = new LocationRepository(pool);
    await repository.refreshMaxRadius();

    const created = await repository.upsert({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      name: 'New Spot',
      type: 'Restaurant',
      openingHours: '9:00AM-9:00PM',
      image: 'https://example.com',
      coordinates: 'x=4,y=4',
      radius: 2,
    });

    expect(created).toMatchObject({
      name: 'New Spot',
      x: 4,
      y: 4,
      radius: 2,
    });

    const updated = await repository.upsert({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      name: 'Updated Spot',
      type: 'Restaurant',
      openingHours: '9:00AM-9:00PM',
      image: 'https://example.com',
      coordinates: 'x=5,y=5',
      radius: 3,
    });

    expect(updated.name).toBe('Updated Spot');
    expect(updated.x).toBe(5);
    expect(updated.y).toBe(5);
  });
});
