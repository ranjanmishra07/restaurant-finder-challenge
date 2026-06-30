import { describe, expect, it } from 'vitest';
import { AuthService } from '../src/services/auth.service.js';

describe('AuthService', () => {
  it('issues a verifiable JWT with the requested role', () => {
    const authService = new AuthService();
    const { token, role } = authService.issueToken({ role: 'admin' });

    expect(role).toBe('admin');
    expect(token.split('.')).toHaveLength(3);
    expect(authService.verifyToken(token)).toEqual({ role: 'admin' });
  });

  it('defaults role to user', () => {
    const authService = new AuthService();
    const { role } = authService.issueToken();

    expect(role).toBe('user');
  });

  it('returns null for invalid tokens', () => {
    const authService = new AuthService();

    expect(authService.verifyToken('not-a-jwt')).toBeNull();
  });
});
