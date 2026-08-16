import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test koneksi saat server start
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Gagal konek ke database:', err.message);
    process.exit(1);
  }
  console.log('✅ Database terhubung');
  release();
});

export default pool;
