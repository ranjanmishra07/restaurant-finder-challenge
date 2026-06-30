import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from '../services/auth.service.js';

export function createAuthMiddleware(authService = new AuthService()) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const token = authorization.slice('Bearer '.length);
    const user = authService.verifyToken(token);
    if (!user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    request.user = user;
  };
}

export const authMiddleware = createAuthMiddleware();
