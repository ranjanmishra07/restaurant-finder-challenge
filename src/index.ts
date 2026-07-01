import type { FastifyInstance } from 'fastify';
import { env } from './config/env.js';
import { closePool, createPool, verifyDatabaseConnection } from './db/pool.js';
import { buildApp, createLocationController } from './server.js';
import { logger } from './utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function registerGracefulShutdown(app: FastifyInstance): void {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    logger.info({ signal }, 'Shutdown signal received, closing server');

    const forceExitTimer = setTimeout(() => {
      logger.error('Shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    try {
      await app.close();
      await closePool();
      clearTimeout(forceExitTimer);
      logger.info('Server shut down gracefully');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

async function start() {
  const pool = createPool();

  try {
    await verifyDatabaseConnection(pool);
    const locationController = await createLocationController(pool);
    const app = await buildApp(locationController);
    registerGracefulShutdown(app);
    await app.listen({ port: env.port, host: env.host });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    await closePool();
    process.exit(1);
  }
}

start();
