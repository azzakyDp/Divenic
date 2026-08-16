import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const albumsResult = await pool.query(
            `SELECT id, title, COALESCE(category, '') AS category FROM albums ORDER BY id ASC`
        );

        const photosResult = await pool.query(
            `SELECT album_id, image AS url, COALESCE(caption, '') AS caption
        FROM album_photos
        ORDER BY album_id ASC, photo_order ASC`
        );

        const albums = albumsResult.rows.map(album => ({
            ...album,
            photos: photosResult.rows.filter(p => p.album_id === album.id).map(({ url, caption }) => ({ url, caption }))
        }));

        res.json(albums);
    } catch (err) {
        console.error('Error fetching albums:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;