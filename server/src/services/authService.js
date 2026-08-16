import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const MAX_ATTEMPTS = 8;
const WARN_AT     = 5;
const LOCK_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

// Delay per jumlah percobaan gagal (ms)
const DELAY_MAP = { 4: 2000, 5: 2000, 6: 5000, 7: 5000 };

async function applyDelay(attempts) {
  const ms = DELAY_MAP[attempts];
  if (ms) await new Promise(r => setTimeout(r, ms));
}

export async function loginUser(nickname, password) {
  // Ambil user — selalu query meskipun belum tahu apakah nickname ada
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE nickname = $1', [nickname]
  );
  const user = rows[0];

  // Cek lockout
  if (user?.is_locked && user.locked_until > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
    return { error: 'locked', minutesLeft };
  }

  // Progressive delay sebelum cek password
  await applyDelay(user?.failed_attempts ?? 0);

  // Verifikasi password — bcrypt.compare tetap dijalankan meski user tidak ada
  // (pakai hash dummy) supaya response time konsisten → cegah timing attack
  const dummyHash = '$2b$12$invalidhashfortimingnormalization000000000000000000000';
  const isValid = await bcrypt.compare(password, user?.password_hash ?? dummyHash);

  if (!user || !isValid) {
    if (user) await recordFailedAttempt(user);
    // Layer 5: pesan SELALU sama, tidak bocorkan mana yang salah
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

  return { token, role: user.role };
}

async function recordFailedAttempt(user) {
  const newAttempts = (user.failed_attempts ?? 0) + 1;
  const shouldLock  = newAttempts >= MAX_ATTEMPTS;

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

export async function validateMember(fullName, birthDate) {
  const { rows } = await pool.query(
    `SELECT id, full_name, gender FROM members
     WHERE LOWER(full_name) = LOWER($1) AND birth_date = $2`,
    [fullName.trim(), birthDate]
  );

  if (!rows[0]) return { error: 'member_not_found' };

  // Cek apakah member ini sudah punya akun
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE member_id = $1', [rows[0].id]
  );
  if (existing[0]) return { error: 'already_registered' };

  // Buat step-token sementara (10 menit)
  const stepToken = jwt.sign(
    { memberId: rows[0].id, gender: rows[0].gender, step: 'register' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  return { stepToken, gender: rows[0].gender, fullName: rows[0].full_name };
}

export async function registerUser(nickname, password, stepToken) {
  // Verifikasi step-token masih valid
  let payload;
  try {
    payload = jwt.verify(stepToken, process.env.JWT_SECRET);
  } catch {
    return { error: 'invalid_step_token' };
  }

  if (payload.step !== 'register') return { error: 'invalid_step_token' };

  // Cek nickname belum dipakai
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE nickname = $1', [nickname]
  );
  if (existing[0]) return { error: 'nickname_taken' };

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Tentukan role berdasarkan apakah ada member_id
  const role = payload.memberId ? 'member' : 'visitor';

  const { rows } = await pool.query(
    `INSERT INTO users (member_id, nickname, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id, role`,
    [payload.memberId ?? null, nickname, passwordHash, role]
  );

  return { userId: rows[0].id, role: rows[0].role };
}
