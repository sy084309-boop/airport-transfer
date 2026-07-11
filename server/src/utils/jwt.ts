import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function signAccessToken(payload: { userId: string; email: string; role: string }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: { userId: string }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
