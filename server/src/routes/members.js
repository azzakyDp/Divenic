import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        nickname,
        COALESCE(division, '') AS division,
        class,
        COALESCE(bio, '') AS bio,
        COALESCE(quote, '') AS quote,
        COALESCE(avatar, '') AS avatar,
        COALESCE(instagram, '') AS instagram,
        gender
      FROM members
      ORDER BY id ASC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
