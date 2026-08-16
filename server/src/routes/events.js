import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const query = `
        SELECT 
            id,
            title,
            TO_CHAR(date, 'YYYY-MM-DD') AS date,
            COALESCE(description, '') AS description,
            COALESCE(image, '') AS image,
            COALESCE(category, '') AS category,
            highlight
        FROM events
        ORDER BY date ASC
        `;

        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;