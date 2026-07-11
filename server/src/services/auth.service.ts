import { db } from '../config/database';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { v4 as uuid } from 'uuid';

export async function register(data: { email: string; password: string; fullName: string; phone?: string; role?: string }) {
  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(data.email);
  if (existing) throw new Error('此 Email 已被註冊');

  const passwordHash = await hashPassword(data.password);
  const id = uuid();
  db.prepare(`INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?,?,?,?,?,?)`)
    .run(id, data.email, passwordHash, data.fullName, data.phone || null, data.role || 'member');

  const user = db.prepare(`SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?`).get(id) as any;
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  return { user, accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = db.prepare(`SELECT * FROM users WHERE email = ? AND status = 'active'`).get(email) as any;
  if (!user) throw new Error('帳號或密碼錯誤');

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw new Error('帳號或密碼錯誤');

  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id);

  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });

  return {
    user: { id: user.id, email: user.email, fullName: user.full_name, phone: user.phone, role: user.role, avatarUrl: user.avatar_url },
    accessToken, refreshToken,
  };
}

export function getProfile(userId: string) {
  const user = db.prepare(`SELECT id, email, full_name, phone, role, avatar_url, status, created_at FROM users WHERE id = ?`).get(userId) as any;
  if (!user) throw new Error('找不到用戶');
  return user;
}
