import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const MAX_ATTEMPTS = 8;
const WARN_AT = 5;
const LOCK_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

// Delay per jumlah percobaan gagal (ms)
const DELAY_MAP = { 4: 2000, 5: 2000, 6: 5000, 7: 5000 };

async function applyDelay(attempts) {
  const ms = DELAY_MAP[attempts];
  if (ms) await new Promise(r => setTimeout(r, ms));
}

export async function loginUser(identifier, password) {
  const cleanIdentifier = (identifier || '').trim();
  console.log(`[AUTH] loginUser() reached | identifier: "${cleanIdentifier}"`);

  // Ambil user dengan case-insensitive & trimmed matching
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE LOWER(TRIM(nickname)) = LOWER($1) OR LOWER(TRIM(email)) = LOWER($1)',
    [cleanIdentifier]
  );
  const user = rows[0];

  console.log('[AUTH] database query completed | user found:', user ? {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    role: user.role,
    is_locked: user.is_locked,
    failed_attempts: user.failed_attempts
  } : 'NOT_FOUND');

  // Cek lockout
  if (user?.is_locked && user.locked_until > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
    console.log(`[AUTH] user account is locked | minutesLeft: ${minutesLeft}`);
    return { error: 'locked', minutesLeft };
  }

  // Progressive delay sebelum cek password
  await applyDelay(user?.failed_attempts ?? 0);

  // Verifikasi password
  const dummyHash = '$2b$12$invalidhashfortimingnormalization000000000000000000000';
  const isValid = await bcrypt.compare(password, user?.password_hash ?? dummyHash);

  console.log('[AUTH] password verification completed | isValid:', isValid);

  if (!user || !isValid) {
    if (user) await recordFailedAttempt(user);
    console.log('[AUTH] login failed: invalid credentials');
    return { error: 'invalid_credentials' };
  }

  // Login berhasil — reset counter
  await pool.query(
    'UPDATE users SET failed_attempts = 0, is_locked = FALSE, locked_until = NULL WHERE id = $1',
    [user.id]
  );

  const token = jwt.sign(
    { userId: user.id, role: user.role, memberId: user.member_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  console.log('[AUTH] JWT generated & login success | role:', user.role);

  return { token, role: user.role };
}

async function recordFailedAttempt(user) {
  const newAttempts = (user.failed_attempts ?? 0) + 1;
  const shouldLock = newAttempts >= MAX_ATTEMPTS;

  await pool.query(
    `UPDATE users SET
       failed_attempts = $1,
       last_failed_at  = NOW(),
       is_locked       = $2,
       locked_until    = $3
     WHERE id = $4`,
    [
      newAttempts,
      shouldLock,
      shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      user.id,
    ]
  );

  return { attempts: newAttempts, warnAt: WARN_AT, maxAttempts: MAX_ATTEMPTS };
}

export async function registerUser(nickname, email, password, memberId = null) {
  const cleanNickname = (nickname || '').trim();
  const cleanEmail = email ? email.trim() : null;

  // Cek nickname belum dipakai
  const { rows: existingNickname } = await pool.query(
    'SELECT id FROM users WHERE LOWER(TRIM(nickname)) = LOWER($1)', [cleanNickname]
  );
  if (existingNickname[0]) return { error: 'nickname_taken' };

  // Cek email belum dipakai
  if (cleanEmail) {
    const { rows: existingEmail } = await pool.query(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER($1)', [cleanEmail]
    );
    if (existingEmail[0]) return { error: 'email_taken' };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Tentukan role berdasarkan apakah ada member_id
  const role = memberId ? 'member' : 'visitor';

  const { rows } = await pool.query(
    `INSERT INTO users (member_id, nickname, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, role`,
    [memberId ?? null, cleanNickname, cleanEmail ?? null, passwordHash, role]
  );

  return { userId: rows[0].id, role: rows[0].role };
}

console.log('JWT_SECRET tersedia:', Boolean(process.env.JWT_SECRET));
console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);