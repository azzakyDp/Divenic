import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'server_misconfigured' });
    }
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'token_expired' });
  }
}