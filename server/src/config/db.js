import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,                       // batas koneksi ke pooler
  idleTimeoutMillis: 30000,      // lepas koneksi nganggur
  connectionTimeoutMillis: 5000  // jangan hang lama kalau pooler tidak respons
});

pool.on('error', (err) => {
  console.error('Unexpected error pada idle client Postgres:', err.message);
});

export default pool;