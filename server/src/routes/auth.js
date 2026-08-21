import { Router } from 'express';
import { loginLimiter, registerLimiter, verifyBirthdateLimiter } from '../middleware/rateLimiter.js';
import { loginUser, registerUser } from '../services/authService.js';
import { verifyToken } from '../middleware/auth.js';
import pool from '../config/db.js';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,        // tidak bisa diakses JS — cegah XSS
  secure: process.env.NODE_ENV === 'production', // HTTPS only di production
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari dalam ms
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
};

// POST /api/auth/verify-birthdate — Validasi tanggal lahir member
router.post('/verify-birthdate', verifyBirthdateLimiter, async (req, res) => {
  try {
    const { memberId, birthday } = req.body;
    if (!memberId || !birthday || typeof birthday !== 'string') {
      return res.status(400).json({ match: false });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday.trim())) {
      return res.status(400).json({ match: false });
    }

    const query = `
      SELECT id FROM members
      WHERE id = $1 AND TO_CHAR(birthday, 'YYYY-MM-DD') = $2
    `;
    const { rows } = await pool.query(query, [memberId, birthday.trim()]);

    if (rows.length > 0) {
      return res.json({ match: true });
    } else {
      return res.json({ match: false });
    }
  } catch (err) {
    console.error('Error verifying birthdate:', err);
    return res.status(500).json({ match: false });
  }
});


// POST /api/auth/register — Step 3 register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { memberId, nickname, email, password } = req.body;
    if (!nickname || !password)
      return res.status(400).json({ error: 'missing_fields' });

    if (email && !email.includes('@'))
      return res.status(400).json({ error: 'invalid_email' });

    if (password.length < 8)
      return res.status(400).json({ error: 'password_too_short' });

    const result = await registerUser(nickname, email, password, memberId);
    if (result.error) return res.status(400).json({ error: result.error });

    res.status(201).json({ message: 'Akun berhasil dibuat', role: result.role });
  } catch (err) {
    console.error('Error registering user:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { identifier, nickname, password } = req.body;
    const userIdentifier = identifier || nickname;

    if (!userIdentifier || !password)
      return res.status(400).json({ error: 'missing_fields' });

    const result = await loginUser(userIdentifier, password);

    if (result.error === 'locked')
      return res.status(423).json({ error: 'locked', minutesLeft: result.minutesLeft });

    if (result.error)
      return res.status(401).json({ error: 'invalid_credentials' }); // selalu sama

    // Set JWT di HttpOnly cookie
    res.cookie('token', result.token, COOKIE_OPTIONS);
    res.json({ role: result.role });
  } catch (err) {
    console.error('Error logging in user:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  try {
    res.clearCookie('token', COOKIE_OPTIONS);
    res.json({ message: 'Logout berhasil' });
  } catch (err) {
    console.error('Error logging out user:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/auth/me — cek apakah user masih login (untuk frontend redirect & info avatar)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.role, u.member_id, u.nickname AS user_nickname, COALESCE(u.profile_avatar, '') AS profile_avatar, m.name, m.nickname, COALESCE(m.avatar, '') AS avatar, m.gender
       FROM users u
       LEFT JOIN members m ON u.member_id = m.id
       WHERE u.id = $1`,
      [req.user.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'unauthorized' });
    const u = rows[0];
    res.json({
      userId: u.id,
      role: u.role,
      memberId: u.member_id,
      nickname: u.user_nickname || u.nickname || '',
      name: u.name || u.nickname || u.user_nickname,
      profileAvatar: u.profile_avatar || '',
      avatar: u.avatar || '',
      gender: u.gender || ''
    });
  } catch (err) {
    res.json({ userId: req.user.userId, role: req.user.role, gender: '' });
  }
});

export default router;