import rateLimit from 'express-rate-limit';

// Endpoint login: max 20 request per 15 menit per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', retryAfter: '15 menit' },
  skipSuccessfulRequests: true,
});

// Endpoint register: lebih longgar
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 10,
  message: { error: 'too_many_requests', retryAfter: '1 jam' },
});

// Endpoint verify birthdate: max 10 percobaan per 1 menit per IP untuk mencegah brute-force
export const verifyBirthdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { match: false, error: 'too_many_requests' },
});

