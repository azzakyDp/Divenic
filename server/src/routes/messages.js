import express from 'express';
import pool from '../config/db.js';

const router = express.router();

router.get('/', async (req, res) => {
    try {
        const query = `
        SELECT 
            id,
            author,
            COALESCE(type, '') AS type,
            message,
            TO_CHAR(date, 'YYYY-MM-DD') AS date
        FROM messages
        ORDER BY date DESC
        `;

        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching messages: ', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;