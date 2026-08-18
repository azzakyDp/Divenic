import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,                       // batas koneksi ke pooler (hindari exhaustion di free tier)
  idleTimeoutMillis: 30000,      // lepas koneksi nganggur
  connectionTimeoutMillis: 5000  // jangan hang lama kalau pooler tidak respons
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Gagal konek ke database saat startup:', err.message);
    return;
  }
  console.log('Database terhubung');
  release();
});

pool.on('error', (err) => {
  console.error('Unexpected error pada idle client Postgres:', err.message);
});

export default pool;