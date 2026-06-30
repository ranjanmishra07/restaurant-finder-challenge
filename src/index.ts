import { env } from './config/env.js';
import { createPool } from './db/pool.js';
import { buildApp, createLocationController } from './server.js';

async function start() {
  const pool = createPool();

  const locationController = await createLocationController(pool);
  const app = await buildApp(locationController);

  try {
    await app.listen({ port: env.port, host: env.host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
