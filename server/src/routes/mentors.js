import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET /api/mentors - Fetch all mentors formatted identically to mentors.json
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        COALESCE(nickname, '') AS nickname,
        COALESCE(name, '') AS name,
        COALESCE(role, '') AS role,
        COALESCE(avatar, '') AS avatar
      FROM mentors
      ORDER BY id ASC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching mentors:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;