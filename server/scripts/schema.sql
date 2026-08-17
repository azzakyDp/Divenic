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