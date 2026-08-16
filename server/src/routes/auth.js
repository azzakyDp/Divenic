import { Router } from 'express';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';
import { loginUser, validateMember, registerUser } from '../services/authService.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,        // tidak bisa diakses JS — cegah XSS
  secure: process.env.NODE_ENV === 'production', // HTTPS only di production
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // none untuk cookie lintas origin di prod
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari dalam ms
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
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
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ message: 'Logout berhasil' });
});

// GET /api/auth/me — cek apakah user masih login (untuk frontend redirect)
router.get('/me', verifyToken, (req, res) => {
  res.json({ userId: req.user.userId, role: req.user.role });
});

export default router;
