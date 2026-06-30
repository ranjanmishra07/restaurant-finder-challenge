import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Shared application logger (pino).
 *
 * This same instance is handed to Fastify (`Fastify({ logger })`), so every
 * `request.log` is a child of it and inherits this config plus the request id.
 * Prefer `request.log` inside route handlers/controllers for request-scoped logs
 * (it auto-correlates via reqId); use this `logger` for startup/shutdown and
 * other code that runs outside a request.
 *
 * Log level is configurable via LOG_LEVEL (default "info").
 */
export const logger = pino({
  level: env.logLevel,
  base: { service: 'restaurant-finder' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
