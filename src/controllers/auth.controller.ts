import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TokenRequest } from '../models/auth.model.js';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(private authService = new AuthService()) {}

  async issueToken(
    request: FastifyRequest<{ Body: TokenRequest }>,
    reply: FastifyReply,
  ) {
    const startedAt = performance.now();
    try {
      const result = this.authService.issueToken(request.body ?? {});
      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      request.log.info(
        { event: 'auth_token_issued', role: result.role, latencyMs },
        'auth token issued',
      );
      return reply.send(result);
    } catch (error) {
      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      request.log.error(
        { event: 'auth_token_issued', latencyMs, err: error },
        'auth token issuance failed',
      );
      throw error;
    }
  }
}
