import { describe, expect, it } from 'vitest';
import { ApiField } from '../src/models/api-fields.js';
import { buildTestApp, injectWithAuth } from './helpers/test-app.js';

const validLocationId = '51e1545c-8b65-4d83-82f9-7fcad4a23111';

const validUpsertBody = {
  name: 'Da Jia Le',
  type: 'Restaurant',
  [ApiField.OPENING_HOURS]: '10:00AM-11:00PM',
  image: 'https://tinyurl.com',
  coordinates: 'x=5,y=5',
  radius: 1,
};

describe('API validation', () => {
  it('rejects search when y is missing', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/search?x=3',
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects search with negative x', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/search?x=-1&y=2',
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects search with non-integer x', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/search?x=abc&y=2',
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects search when limit is zero', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/search?x=3&y=3&limit=0',
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects get by id when id is not a uuid', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'GET',
      url: '/locations/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects upsert when required field is missing', async () => {
    const app = await buildTestApp();
    await app.ready();

    const { radius: _radius, ...bodyWithoutRadius } = validUpsertBody;
    const response = await injectWithAuth(app, {
      method: 'PUT',
      url: `/locations/${validLocationId}`,
      payload: bodyWithoutRadius,
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects upsert when radius is zero', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'PUT',
      url: `/locations/${validLocationId}`,
      payload: { ...validUpsertBody, radius: 0 },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('rejects upsert when coordinates format is invalid', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'PUT',
      url: `/locations/${validLocationId}`,
      payload: { ...validUpsertBody, coordinates: 'invalid' },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('accepts valid upsert payload', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await injectWithAuth(app, {
      method: 'PUT',
      url: `/locations/${validLocationId}`,
      payload: validUpsertBody,
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
