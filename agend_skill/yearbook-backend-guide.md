---
name: yearbook-backend
description: Panduan lengkap membangun backend untuk website yearbook digital — mencakup setup Express + PostgreSQL, skema database, sistem autentikasi JWT HttpOnly Cookie, alur register multi-langkah (validasi member → gender → dropdown nama → buat akun), alur login dengan 5-layer keamanan (lockout, progressive delay, rate limiting, bcrypt, pesan generik), panduan halaman auth.html, dan deploy ke Supabase + Railway/Render. Gunakan skill ini saat user menyebut "backend yearbook", "login register divenic", "auth system", "database member", "JWT cookie", "lockout login", "deploy supabase", "express yearbook", atau saat frontend sudah siap dan perlu disambungkan ke server. Trigger juga saat user bertanya cara pindah data dari JSON ke PostgreSQL, atau cara proteksi endpoint API dari brute-force.
---

# Yearbook Backend Guide

Panduan membangun backend Node.js + Express untuk website yearbook digital, mulai dari setup lokal hingga deploy production. Skill ini adalah pasangan dari `yearbook-card-refactor` (skill frontend) — keduanya dirancang untuk project Divenic dan yearbook sejenis.

> **Prinsip utama:** Keamanan tidak boleh jadi afterthought. Setiap endpoint, setiap form, setiap response dirancang dengan mempertimbangkan keamanan sejak awal.

> **Cara pakai di Antigravity IDE:** Buka sesi **terpisah** dari sesi frontend. Attach file ini sebagai konteks di awal sesi, lalu buat folder `server/` di root project sebagai workspace backend. Jangan campur sesi frontend dan backend dalam satu sesi agent.

---

## Arsitektur sistem

```
Browser (auth.html)
      │
      │ HTTPS
      ▼
Express Server (Node.js)
      │
      ├── /api/auth/register   POST
      ├── /api/auth/login      POST
      ├── /api/auth/logout     POST
      ├── /api/auth/me         GET  (cek session aktif)
      ├── /api/members/names   GET  (dropdown nama, butuh step token)
      │
      ▼
PostgreSQL
      ├── members   (data yearbook: nama, tgl lahir, gender, dll)
      └── users     (akun login: nickname, password_hash, relasi ke member)
```

---

## Langkah 1 — Struktur folder project

```
server/
├── src/
│   ├── config/
│   │   └── db.js              koneksi PostgreSQL (pg pool)
│   ├── middleware/
│   │   ├── auth.js            verifikasi JWT dari cookie
│   │   ├── rateLimiter.js     express-rate-limit per endpoint
│   │   └── validate.js        validasi input request body
│   ├── routes/
│   │   └── auth.js            semua route /api/auth/*
│   ├── services/
│   │   ├── authService.js     logic register, login, lockout
│   │   └── memberService.js   query member dari DB
│   └── app.js                 setup Express, middleware global
├── scripts/
│   └── seed.js                import data dari members.json ke DB
├── .env                       variabel environment (JANGAN di-commit)
├── .env.example               template .env untuk dokumentasi
└── package.json
```

Pisahkan `routes/` (terima request, kirim response) dari `services/` (logic bisnis, query DB). Ini membuat kode mudah di-test dan debug — kalau ada bug di query, cukup lihat `services/`, bukan seluruh route file.

---

## Langkah 2 — Setup awal

### Install dependencies

```bash
npm init -y
npm install express pg bcrypt jsonwebtoken cookie-parser cors helmet express-rate-limit dotenv
npm install --save-dev nodemon
```

| Package | Fungsi |
|---|---|
| `express` | HTTP server framework |
| `pg` | PostgreSQL client untuk Node.js |
| `bcrypt` | Hash password (cost factor 12) |
| `jsonwebtoken` | Generate + verifikasi JWT |
| `cookie-parser` | Baca HttpOnly cookie dari request |
| `cors` | Izinkan request dari frontend domain |
| `helmet` | Set security headers otomatis |
| `express-rate-limit` | Batasi request per IP |
| `dotenv` | Load variabel dari file `.env` |

### File `.env`

```bash
# .env — JANGAN di-commit ke git, tambahkan ke .gitignore
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/divenic_dev
JWT_SECRET=ganti_dengan_string_random_panjang_minimal_32_karakter
JWT_EXPIRES_IN=7d
COOKIE_DOMAIN=localhost
NODE_ENV=development
```

```bash
# .env.example — ini yang di-commit, tanpa nilai sensitif
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=
JWT_EXPIRES_IN=7d
COOKIE_DOMAIN=
NODE_ENV=development
```

### `src/config/db.js`

```javascript
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test koneksi saat server start
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Gagal konek ke database:', err.message);
    process.exit(1);
  }
  console.log('✅ Database terhubung');
  release();
});

export default pool;
```

`ssl: false` saat development (lokal), `ssl: { rejectUnauthorized: false }` saat production (Supabase/Railway memerlukan SSL).

### `src/app.js`

```javascript
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// CORS — izinkan hanya dari domain frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://divenic.vercel.app'   // ganti dengan domain production
    : 'http://localhost:5500',        // Live Server default port
  credentials: true,                  // wajib untuk cookie lintas origin
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));

export default app;
```

---

## Langkah 3 — Skema database

Jalankan SQL ini di pgAdmin (development) atau Supabase SQL Editor (production):

```sql
-- Tabel data yearbook (dipindah dari members.json)
CREATE TABLE members (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  birth_date  DATE NOT NULL,
  gender      VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  division    VARCHAR(100),
  class       VARCHAR(20),
  avatar_url  TEXT,
  quote       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel akun login
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  member_id     INTEGER REFERENCES members(id) ON DELETE SET NULL,
  nickname      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'visitor' CHECK (role IN ('member', 'visitor')),
  is_locked     BOOLEAN DEFAULT FALSE,
  locked_until  TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  last_failed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query yang sering dipakai
CREATE INDEX idx_users_nickname     ON users(nickname);
CREATE INDEX idx_members_full_name  ON members(full_name);
CREATE INDEX idx_members_birth_date ON members(birth_date);
```

**Catatan penting:**
- `member_id` nullable — visitor tidak punya relasi ke tabel `members`
- `role` hanya dua nilai: `member` (punya akun terhubung ke data yearbook) atau `visitor` (tamu)
- Kolom lockout (`is_locked`, `locked_until`, `failed_attempts`) langsung di tabel `users` — tidak perlu tabel terpisah untuk skala project ini

**Kolom yang diisi manual oleh admin (bukan dari form register):**

Kolom berikut di tabel `members` tidak masuk ke alur register — diisi langsung oleh admin via pgAdmin (development) atau Supabase Dashboard (production):

| Kolom | Cara isi |
|---|---|
| `division` | Isi manual di pgAdmin/Supabase sesuai pembagian divisi |
| `class` | Isi manual sesuai kelas masing-masing member |
| `avatar_url` | URL Cloudinary — upload foto dulu, lalu paste URL-nya |
| `quote` | Isi manual, boleh dikosongkan dulu saat seed awal |

Alur yang benar: jalankan seed dari JSON (data dasar) → buka pgAdmin/Supabase → UPDATE baris per baris untuk kolom yang belum terisi. Tidak perlu endpoint API khusus untuk ini.

### Seed data dari JSON ke database

```javascript
// scripts/seed.js — jalankan SEKALI untuk migrasi data
import pool from '../src/config/db.js';
import { readFileSync } from 'fs';

const members = JSON.parse(
  readFileSync('../divenic-refactor/data/members.json', 'utf-8')
);

async function seed() {
  console.log(`Seeding ${members.length} members...`);

  for (const m of members) {
    await pool.query(
      `INSERT INTO members (full_name, birth_date, gender, division, class, avatar_url, quote)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [m.name, m.birthDate, m.gender, m.division, m.class, m.avatar, m.quote]
    );
  }

  console.log('✅ Seed selesai');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
```

```bash
node scripts/seed.js
```

Jalankan seed hanya sekali. Setelah data ada di DB, file `members.json` tetap bisa dipertahankan sebagai backup tapi tidak lagi jadi sumber data utama.

---

## Langkah 4 — 5 Layer keamanan auth

Semua layer ini diimplementasikan sebelum menulis satu pun route handler. Ini fondasi, bukan fitur tambahan.

### Layer 1 & 2 — Lockout + Progressive delay (`src/services/authService.js`)

```javascript
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
```

### Layer 3 — Rate limiting per IP (`src/middleware/rateLimiter.js`)

```javascript
import rateLimit from 'express-rate-limit';

// Endpoint login: max 20 request per 15 menit per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', retryAfter: '15 menit' },
  // Hitung hanya request yang gagal (status 4xx), bukan yang berhasil
  skipSuccessfulRequests: true,
});

// Endpoint register: lebih longgar
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 10,
  message: { error: 'too_many_requests', retryAfter: '1 jam' },
});
```

Layer 4 (bcrypt cost 12) sudah ada di `authService.js` di atas. Layer 5 (pesan generik) juga sudah diterapkan — `loginUser` selalu return `{ error: 'invalid_credentials' }` tanpa membedakan "nickname salah" vs "password salah".

---

## Langkah 5 — Alur register multi-langkah

Register terjadi dalam **3 step** di frontend, tapi hanya **1 POST request** ke backend saat submit akhir. Validasi step 1 (nama + tgl lahir) menggunakan endpoint terpisah yang hanya mengembalikan token sementara.

```
Step 1 Frontend          Step 2 Frontend       Step 3 Frontend
──────────────────       ──────────────────    ──────────────────
Input nama lengkap  →    Pilih gender     →    Input nickname +
+ tgl lahir             (dari data member)     password
      │                        │                      │
      ▼                        │                      ▼
POST /api/auth/             (client-side        POST /api/auth/register
  validate-member           only, pakai         (kirim semua data +
      │                     data dari step 1)   step-token dari step 1)
      ▼
Return step-token
(JWT sementara 10 menit,
 hanya untuk proses register)
```

### `src/services/authService.js` — tambahan fungsi register

```javascript
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
```

---

## Langkah 6 — Routes

### `src/routes/auth.js`

```javascript
import { Router } from 'express';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';
import { loginUser, validateMember, registerUser } from '../services/authService.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,        // tidak bisa diakses JS — cegah XSS
  secure: process.env.NODE_ENV === 'production', // HTTPS only di production
  sameSite: 'lax',       // proteksi CSRF dasar
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari dalam ms
};

// POST /api/auth/validate-member — Step 1 register
router.post('/validate-member', registerLimiter, async (req, res) => {
  const { fullName, birthDate } = req.body;
  if (!fullName || !birthDate)
    return res.status(400).json({ error: 'missing_fields' });

  const result = await validateMember(fullName, birthDate);
  if (result.error) return res.status(400).json({ error: result.error });

  res.json({ stepToken: result.stepToken, gender: result.gender, fullName: result.fullName });
});

// GET /api/members/names — Step 2: ambil daftar nama untuk dropdown (butuh step-token)
router.get('/members/names', async (req, res) => {
  // Verifikasi step-token dari header
  const stepToken = req.headers['x-step-token'];
  if (!stepToken) return res.status(401).json({ error: 'unauthorized' });

  try {
    const jwt = (await import('jsonwebtoken')).default;
    jwt.verify(stepToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'invalid_step_token' });
  }

  // Hanya nama member yang belum punya akun
  const { rows } = await (await import('../config/db.js')).default.query(
    `SELECT m.id, m.full_name FROM members m
     LEFT JOIN users u ON u.member_id = m.id
     WHERE u.id IS NULL AND m.gender = 'male'
     ORDER BY m.full_name`
  );

  res.json({ names: rows });
});

// POST /api/auth/register — Step 3 register
router.post('/register', registerLimiter, async (req, res) => {
  const { nickname, password, stepToken } = req.body;
  if (!nickname || !password || !stepToken)
    return res.status(400).json({ error: 'missing_fields' });

  if (password.length < 8)
    return res.status(400).json({ error: 'password_too_short' });

  const result = await registerUser(nickname, password, stepToken);
  if (result.error) return res.status(400).json({ error: result.error });

  res.status(201).json({ message: 'Akun berhasil dibuat', role: result.role });
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { nickname, password } = req.body;
  if (!nickname || !password)
    return res.status(400).json({ error: 'missing_fields' });

  const result = await loginUser(nickname, password);

  if (result.error === 'locked')
    return res.status(423).json({ error: 'locked', minutesLeft: result.minutesLeft });

  if (result.error)
    return res.status(401).json({ error: 'invalid_credentials' }); // selalu sama

  // Set JWT di HttpOnly cookie
  res.cookie('token', result.token, COOKIE_OPTIONS);
  res.json({ role: result.role });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logout berhasil' });
});

// GET /api/auth/me — cek apakah user masih login (untuk frontend redirect)
router.get('/me', verifyToken, (req, res) => {
  res.json({ userId: req.user.userId, role: req.user.role });
});

export default router;
```

### `src/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'token_expired' });
  }
}
```

---

## Langkah 7 — Halaman auth.html (frontend)

Halaman auth berdiri sendiri (`auth.html`), menampilkan form login atau register tergantung state aktif. Setelah berhasil login/register, redirect ke `index.html` dengan transisi fade.

### Struktur HTML

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Divenic — Masuk</title>
  <link rel="stylesheet" href="asset/style/auth.css">
</head>
<body>
  <div class="auth-container">
    <div class="auth-card">

      <!-- Logo -->
      <img src="asset/img/logo.png" alt="Divenic" class="auth-logo">

      <!-- Tab toggle -->
      <div class="auth-tabs" role="tablist">
        <button class="auth-tab active" data-tab="login">Masuk</button>
        <button class="auth-tab" data-tab="register">Daftar</button>
      </div>

      <!-- Form Login -->
      <div id="form-login" class="auth-form active">
        <div class="form-group">
          <label for="login-nickname">Nickname</label>
          <input type="text" id="login-nickname" autocomplete="username" placeholder="Masukkan nickname">
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" autocomplete="current-password" placeholder="Masukkan password">
        </div>
        <p class="auth-error" id="login-error" aria-live="polite"></p>
        <button class="btn-auth" id="btn-login">Masuk</button>
      </div>

      <!-- Form Register — Step 1 -->
      <div id="form-register" class="auth-form">
        <div id="register-step-1">
          <div class="form-group">
            <label for="reg-fullname">Nama Lengkap</label>
            <input type="text" id="reg-fullname" placeholder="Sesuai data yearbook">
          </div>
          <div class="form-group">
            <label for="reg-birthdate">Tanggal Lahir</label>
            <input type="date" id="reg-birthdate">
          </div>
          <p class="auth-error" id="register-error" aria-live="polite"></p>
          <button class="btn-auth" id="btn-validate">Lanjut</button>
        </div>

        <!-- Step 2 & 3 — muncul setelah step 1 berhasil -->
        <div id="register-step-2" class="hidden">
          <p class="step-info">Halo, <strong id="reg-name-display"></strong>!</p>
          <div class="form-group">
            <label for="reg-nickname">Nickname</label>
            <input type="text" id="reg-nickname" autocomplete="username" placeholder="Nama akun untuk login">
          </div>
          <div class="form-group">
            <label for="reg-password">Password</label>
            <input type="password" id="reg-password" autocomplete="new-password" placeholder="Minimal 8 karakter">
          </div>
          <p class="auth-error" id="register-step2-error" aria-live="polite"></p>
          <button class="btn-auth" id="btn-register">Buat Akun</button>
        </div>
      </div>

    </div>
  </div>

  <script type="module" src="js/auth.js"></script>
</body>
</html>
```

### `js/auth.js`

```javascript
const API = 'http://localhost:3000/api'; // ganti ke URL production saat deploy

// ── Pesan error yang ramah pengguna (bukan expose kode error internal) ──
const ERROR_MESSAGES = {
  invalid_credentials : 'Nickname atau password salah.',
  locked              : (min) => `Akun dikunci. Coba lagi dalam ${min} menit.`,
  member_not_found    : 'Nama atau tanggal lahir tidak ditemukan di data yearbook.',
  already_registered  : 'Akun untuk nama ini sudah terdaftar.',
  nickname_taken      : 'Nickname sudah dipakai, coba yang lain.',
  password_too_short  : 'Password minimal 8 karakter.',
  missing_fields      : 'Mohon isi semua kolom.',
  too_many_requests   : 'Terlalu banyak percobaan. Tunggu beberapa saat.',
  default             : 'Terjadi kesalahan. Silakan coba lagi.',
};

function showError(elId, code, extra) {
  const el = document.getElementById(elId);
  if (!el) return;
  const msg = typeof ERROR_MESSAGES[code] === 'function'
    ? ERROR_MESSAGES[code](extra)
    : (ERROR_MESSAGES[code] ?? ERROR_MESSAGES.default);
  el.textContent = msg;
}

function clearError(elId) {
  const el = document.getElementById(elId);
  if (el) el.textContent = '';
}

// ── Tab toggle ──
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab, .auth-form').forEach(el => el.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`form-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Login ──
document.getElementById('btn-login').addEventListener('click', async () => {
  clearError('login-error');
  const nickname = document.getElementById('login-nickname').value.trim();
  const password = document.getElementById('login-password').value;
  if (!nickname || !password) return showError('login-error', 'missing_fields');

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Memuat...';

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // wajib untuk cookie lintas origin
      body: JSON.stringify({ nickname, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError('login-error', data.error, data.minutesLeft);
      return;
    }

    // Redirect dengan transisi fade
    document.body.style.transition = 'opacity 0.4s ease';
    document.body.style.opacity    = '0';
    setTimeout(() => window.location.href = 'index.html', 400);

  } catch {
    showError('login-error', 'default');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
});

// ── Register Step 1 — validasi nama + tgl lahir ──
let stepToken = null;

document.getElementById('btn-validate').addEventListener('click', async () => {
  clearError('register-error');
  const fullName  = document.getElementById('reg-fullname').value.trim();
  const birthDate = document.getElementById('reg-birthdate').value;
  if (!fullName || !birthDate) return showError('register-error', 'missing_fields');

  const btn = document.getElementById('btn-validate');
  btn.disabled = true;
  btn.textContent = 'Memeriksa...';

  try {
    const res  = await fetch(`${API}/auth/validate-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, birthDate }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError('register-error', data.error);
      return;
    }

    // Cek gender — perempuan → 404
    if (data.gender === 'female') {
      window.location.href = '404.html';
      return;
    }

    // Lanjut ke step 2
    stepToken = data.stepToken;
    document.getElementById('reg-name-display').textContent = data.fullName;
    document.getElementById('register-step-1').classList.add('hidden');
    document.getElementById('register-step-2').classList.remove('hidden');

  } catch {
    showError('register-error', 'default');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lanjut';
  }
});

// ── Register Step 2 — buat akun ──
document.getElementById('btn-register').addEventListener('click', async () => {
  clearError('register-step2-error');
  const nickname = document.getElementById('reg-nickname').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!nickname || !password) return showError('register-step2-error', 'missing_fields');
  if (!stepToken) return showError('register-step2-error', 'default');

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Membuat akun...';

  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, password, stepToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError('register-step2-error', data.error);
      return;
    }

    // Akun dibuat → langsung ke halaman login dengan notif
    document.querySelector('[data-tab="login"]').click();
    document.getElementById('login-error').style.color = 'green';
    document.getElementById('login-error').textContent = 'Akun berhasil dibuat! Silakan masuk.';

  } catch {
    showError('register-step2-error', 'default');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buat Akun';
  }
});
```

---

## Langkah 8 — Guard di index.html (cek session)

Setiap halaman yang perlu login wajib cek session saat load. Kalau belum login → redirect ke `auth.html`.

```javascript
// js/guard.js — import di semua halaman yang butuh auth
export async function requireAuth() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/me', {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('unauthorized');
    return await res.json(); // { userId, role }
  } catch {
    window.location.href = 'auth.html';
  }
}
```

```javascript
// index.html — script module
import { requireAuth } from './js/guard.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth(); // redirect ke auth.html kalau belum login
  if (!user) return;

  // Lanjut init website seperti biasa
  initLoadingScreen();
  initNavbar();
  // ... dst
});
```

---

## Langkah 9 — Setup database: lokal vs production

### Development — pgAdmin lokal

1. Install PostgreSQL + pgAdmin dari [postgresql.org](https://www.postgresql.org/download/)
2. Buat database baru: `divenic_dev`
3. Jalankan SQL dari Langkah 3 di Query Tool pgAdmin
4. Set `DATABASE_URL` di `.env` ke koneksi lokal

### Production — Supabase

1. Buat akun di [supabase.com](https://supabase.com) → New Project
2. Buka **SQL Editor** → paste SQL dari Langkah 3 → Run
3. Buka **Settings → Database → Connection string** → copy URI
4. Set `DATABASE_URL` di environment variable Railway/Render ke URI Supabase tersebut
5. Set juga `NODE_ENV=production` supaya SSL aktif dan cookie `secure: true`

```bash
# .env production (di Railway/Render dashboard, bukan file)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
JWT_SECRET=[string random panjang]
NODE_ENV=production
COOKIE_DOMAIN=[domain production frontend]
```

Tidak ada perubahan kode apapun antara development dan production — hanya nilai `.env` yang berbeda.

### Deploy backend ke Railway

```bash
# Pastikan package.json punya start script
# "scripts": { "start": "node src/app.js" }

# Push ke GitHub → connect repo di railway.app → deploy otomatis
```

---

## Langkah 10 — Checklist sebelum go-live

**Setup & struktur**
- [ ] `.env` tidak ada di git (ada di `.gitignore`)
- [ ] `.env.example` sudah ada dan up-to-date
- [ ] `JWT_SECRET` sudah diganti dari placeholder ke string random minimal 32 karakter
- [ ] `NODE_ENV=production` aktif di server production

**Database**
- [ ] Semua tabel sudah dibuat (members, users) dengan index
- [ ] Seed data sudah dijalankan dan data tampil benar di pgAdmin/Supabase
- [ ] Kolom `birth_date` formatnya konsisten dengan input frontend (`YYYY-MM-DD`)

**Keamanan**
- [ ] Semua 5 layer keamanan aktif (lockout, delay, rate limit, bcrypt, pesan generik)
- [ ] Cookie pakai `httpOnly: true`, `secure: true` di production, `sameSite: 'lax'`
- [ ] CORS hanya izinkan domain frontend yang benar (bukan `*`)
- [ ] `helmet()` aktif di semua environment
- [ ] Pesan error ke client tidak pernah expose stack trace atau detail internal

**Alur auth**
- [ ] Register step 1: nama + tgl lahir → cocok dengan data member
- [ ] Register gender female → redirect ke 404.html (di frontend)
- [ ] Register step 2: nickname unik, password minimal 8 karakter
- [ ] Login berhasil → JWT tersimpan di HttpOnly cookie
- [ ] Logout → cookie terhapus bersih
- [ ] Guard (`requireAuth`) aktif di index.html dan semua halaman protected
- [ ] Step-token register expired dalam 10 menit

**Deploy**
- [ ] `DATABASE_URL` production mengarah ke Supabase
- [ ] SSL aktif untuk koneksi DB production
- [ ] Frontend `API` URL di `auth.js` sudah diubah ke URL production backend
- [ ] `credentials: 'include'` ada di semua `fetch()` yang butuh cookie

---

# Keputusan Arsitektur Auth — Catatan

Dokumen ini menjelaskan *mengapa* beberapa keputusan teknis diambil, untuk referensi saat ada pertanyaan atau diskusi di masa depan.

## Mengapa JWT di HttpOnly Cookie, bukan localStorage?

localStorage mudah diakses oleh JavaScript apapun yang berjalan di halaman — termasuk script dari library pihak ketiga atau injeksi XSS. HttpOnly cookie tidak bisa dibaca JS sama sekali, hanya dikirim otomatis oleh browser ke server. Untuk project yang tidak butuh akses token dari JS (kita hanya butuh "apakah user login?"), HttpOnly cookie adalah pilihan yang lebih aman tanpa trade-off berarti.

## Mengapa step-token untuk register, bukan simpan state di frontend saja?

Kalau validasi step 1 (nama + tgl lahir) hanya disimpan di variabel JS frontend, user bisa memanipulasi state tersebut di console browser dan langsung lompat ke step 3 tanpa validasi yang benar. Step-token yang di-sign oleh server memastikan step 2 dan 3 hanya bisa diakses kalau step 1 benar-benar berhasil divalidasi server.

## Mengapa bcrypt cost 12, bukan lebih tinggi?

Cost 12 menghasilkan waktu hash ~300ms di server modern. Ini cukup untuk membuat brute-force sangat lambat, tapi tidak membebani server saat ada banyak request login bersamaan. Cost 14+ mulai terasa berat (>1 detik per hash) dan tidak sepadan untuk skala project yearbook.

## Mengapa lockout 30 menit, bukan permanen?

Lockout permanen berisiko merugikan user asli yang lupa password atau salah ketik berkali-kali. 30 menit cukup lama untuk menghentikan serangan otomatis (yang biasanya butuh ribuan percobaan per menit), tapi tidak terlalu lama untuk user yang memang lupa password-nya sendiri.

## Mengapa tabel members terpisah dari users?

Tidak semua member yearbook harus punya akun, dan visitor (tamu) punya akun tapi tidak ada di data yearbook. Kalau digabung, akan banyak kolom NULL yang tidak relevan di kedua sisi. Pemisahan ini juga memungkinkan data yearbook (foto, quote, divisi) diperbarui tanpa menyentuh tabel autentikasi.