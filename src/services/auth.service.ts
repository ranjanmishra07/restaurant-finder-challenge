import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { TokenRequest, TokenResponse } from '../models/auth.model.js';

export class AuthService {
  issueToken(request: TokenRequest = {}): TokenResponse {
    const role = request.role ?? 'user';
    const token = jwt.sign({ role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
    });
    return { token, role };
  }

  verifyToken(token: string): { role: string } | null {
    try {
      const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
      if (typeof payload.role !== 'string') {
        return null;
      }
      return { role: payload.role };
    } catch {
      return null;
    }
  }
}
