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
        COALESCE(u.profile_avatar, '') AS "profileAvatar",
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

// PUT /api/profile/me — Update division, bio, quote, instagram untuk member dan/atau profile_avatar untuk user login
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;

    const userQuery = 'SELECT member_id, profile_avatar FROM users WHERE id = $1';
    const { rows: userRows } = await pool.query(userQuery, [userId]);
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const { profileAvatar, division, bio, quote, instagram } = req.body;
    let updatedProfileAvatar = user.profile_avatar || '';

    // 1. Update profile_avatar di tabel users (jika field profileAvatar dikirim)
    if (profileAvatar !== undefined) {
      if (typeof profileAvatar !== 'string' || !profileAvatar.includes('res.cloudinary.com')) {
        return res.status(400).json({ 
          error: 'invalid_avatar_url', 
          message: 'URL profileAvatar harus berupa URL Cloudinary yang valid (mengandung res.cloudinary.com)' 
        });
      }

      const updateUsersQuery = `
        UPDATE users
        SET profile_avatar = $1
        WHERE id = $2
        RETURNING profile_avatar
      `;
      const { rows: updatedUserRows } = await pool.query(updateUsersQuery, [profileAvatar, userId]);
      if (updatedUserRows[0]) {
        updatedProfileAvatar = updatedUserRows[0].profile_avatar;
      }
    }

    // 2. Update member profile di tabel members (jika ada member_id dan field member dikirim / bukan request khusus profileAvatar saja)
    let updatedMember = null;
    const hasMemberFields = division !== undefined || bio !== undefined || quote !== undefined || instagram !== undefined;

    if (user.member_id && (hasMemberFields || profileAvatar === undefined)) {
      let divVal = typeof division === 'string' ? division.trim() : '';
      let bioVal = typeof bio === 'string' ? bio.trim() : '';
      let quoteVal = typeof quote === 'string' ? quote.trim() : '';
      let instaVal = typeof instagram === 'string' ? instagram.trim() : '';

      if (instaVal.startsWith('@')) {
        instaVal = instaVal.substring(1).trim();
      }

      if (bioVal.length > 150) {
        return res.status(400).json({ error: 'bio_too_long', message: 'Bio maksimal 150 karakter' });
      }

      if (quoteVal.length > 100) {
        return res.status(400).json({ error: 'quote_too_long', message: 'Quote maksimal 100 karakter' });
      }

      const updateMemberQuery = `
        UPDATE members
        SET division = $1, bio = $2, instagram = $3, quote = $4
        WHERE id = $5
        RETURNING id, name, nickname, division, class, bio, quote, avatar, instagram, gender
      `;
      const { rows: updatedMembers } = await pool.query(updateMemberQuery, [
        divVal,
        bioVal,
        instaVal,
        quoteVal,
        user.member_id
      ]);
      updatedMember = updatedMembers[0] || null;
    }

    res.json({
      message: 'Profil berhasil diperbarui',
      profileAvatar: updatedProfileAvatar,
      member: updatedMember
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
