import { Router } from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET /api/profile/me — Ambil profil member user yang sedang login
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const query = `
      SELECT 
        u.id AS "userId",
        u.nickname AS "userNickname",
        u.role,
        m.id AS "memberId",
        m.name,
        m.nickname,
        COALESCE(m.division, '') AS division,
        m.class,
        COALESCE(m.bio, '') AS bio,
        COALESCE(m.quote, '') AS quote,
        COALESCE(m.avatar, '') AS avatar,
        COALESCE(m.instagram, '') AS instagram,
        m.gender
      FROM users u
      LEFT JOIN members m ON u.member_id = m.id
      WHERE u.id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/profile/me — Update division, bio, instagram untuk member user login
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Ambil member_id dari user login
    const userQuery = 'SELECT member_id FROM users WHERE id = $1';
    const { rows: userRows } = await pool.query(userQuery, [userId]);
    const user = userRows[0];

    if (!user || !user.member_id) {
      return res.status(400).json({ error: 'no_member_profile_linked' });
    }

    let { division = '', bio = '', instagram = '' } = req.body;

    division = typeof division === 'string' ? division.trim() : '';
    bio = typeof bio === 'string' ? bio.trim() : '';
    instagram = typeof instagram === 'string' ? instagram.trim() : '';

    // Clean instagram prefix if user included @
    if (instagram.startsWith('@')) {
      instagram = instagram.substring(1).trim();
    }

    // Validasi bio maksimal 150 karakter
    if (bio.length > 150) {
      return res.status(400).json({ error: 'bio_too_long', message: 'Bio maksimal 150 karakter' });
    }

    const updateQuery = `
      UPDATE members
      SET division = $1, bio = $2, instagram = $3
      WHERE id = $4
      RETURNING id, name, nickname, division, class, bio, quote, avatar, instagram, gender
    `;
    const { rows: updatedMembers } = await pool.query(updateQuery, [
      division,
      bio,
      instagram,
      user.member_id
    ]);

    if (!updatedMembers[0]) {
      return res.status(404).json({ error: 'member_not_found' });
    }

    res.json({
      message: 'Profil berhasil diperbarui',
      member: updatedMembers[0]
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
