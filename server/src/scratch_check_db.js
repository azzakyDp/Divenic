import pool from './config/db.js';

async function main() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('members', 'users', 'mentors', 'events', 'albums', 'album_photos', 'messages')
      ORDER BY table_name, ordinal_position;
    `);
    console.log('=== DATABASE COLUMNS ===');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying information_schema:', err);
  } finally {
    await pool.end();
  }
}

main();
