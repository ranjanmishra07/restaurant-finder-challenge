import { describe, expect, it } from 'vitest';
import { buildTestApp, injectWithAuth } from './helpers/test-app.js';

describe('Restaurant Finder API', () => {
  it('returns 401 for location routes without a token', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/locations/search?x=3&y=3',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: 'Unauthorized' });

    await app.close();
  });

  it('returns visible restaurants sorted by distance', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/search?x=3&y=3',
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body['user-location']).toBe('x=3,y=3');
    expect(body.locations.length).toBeGreaterThan(0);

    const goji = body.locations.find(
      (location: { name: string }) => location.name === 'Goji',
    );
    expect(goji).toMatchObject({
      name: 'Goji',
      coordinates: 'x=3,y=3',
      distance: 0,
    });

    const distances = body.locations.map((location: { distance: number }) => location.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));

    await app.close();
  });

  it('paginates search results with limit and offset', async () => {
    const app = await buildTestApp();
    await app.ready();

    const all = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/search?x=3&y=3',
    });
    const allBody = all.json();
    expect(allBody.locations.length).toBe(9);

    const page = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/search?x=3&y=3&limit=2&offset=1',
    });

    expect(page.statusCode).toBe(200);
    const pageBody = page.json();
    expect(pageBody.locations).toHaveLength(2);
    expect(pageBody.locations[0].name).toBe(allBody.locations[1].name);
    expect(pageBody.locations[1].name).toBe(allBody.locations[2].name);

    await app.close();
  });

  it('returns location details by id', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/51e1545c-8b65-4d83-82f9-7fcad4a23111',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: '51e1545c-8b65-4d83-82f9-7fcad4a23111',
      name: 'Da Jia Le',
      type: 'Restaurant',
      coordinates: 'x=8,y=8',
    });

    await app.close();
  });

  it('issues a JWT auth token', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { role: 'user' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ role: 'user' });
    expect(body.token.split('.')).toHaveLength(3);

    await app.close();
  });
});
