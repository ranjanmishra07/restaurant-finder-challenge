import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/env.js';

/**
 * Rate limiting is registered with `global: false`, so it only applies to routes
 * that opt in via `config.rateLimit` (currently just PUT /locations/:id).
 * The limit is configurable through RATE_LIMIT_MAX / RATE_LIMIT_TIME_WINDOW,
 * with safe defaults (see config/env.ts).
 *
 * The default store is in-memory, which is fine for a single instance / local dev.
 *
 * ---------------------------------------------------------------------------
 * PRODUCTION / MULTI-INSTANCE (cluster) NOTE — may be a shared Redis store
 * ---------------------------------------------------------------------------
 * The in-memory store keeps counters in each process's own memory. If you run
 * N replicas behind a load balancer, every replica counts independently, so the
 * effective limit becomes N * max (and a client can be throttled inconsistently
 * depending on which instance it lands on).
 *
 * In production with multiple instances, back the limiter with a shared Redis
 * cache so all instances increment the same counters atomically:
 * Notes for prod:
 *  - Set `trustProxy` on the Fastify instance so `request.ip` reflects the real
 *    client IP (via X-Forwarded-For) behind a load balancer / ingress, instead
 *    of the proxy IP. Otherwise all clients may collapse into one bucket.
 *  - Redis gives atomic INCR + TTL, so counters stay correct under concurrency
 *    and survive individual instance restarts.
 * ---------------------------------------------------------------------------
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: false,
    max: env.rateLimitMax,
    timeWindow: env.rateLimitTimeWindow,
  });
}
