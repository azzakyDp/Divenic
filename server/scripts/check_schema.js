import pool from '../src/config/db.js';

async function checkSchema() {
  try {
    for (const table of ['members', 'mentors', 'events']) {
      const res = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position",
        [table]
      );
      console.log(`\n--- TABLE: ${table} ---`);
      console.table(res.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();