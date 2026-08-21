import pool from '../src/config/db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const membersPath = join(__dirname, '../../data/members.json');

const members = JSON.parse(readFileSync(membersPath, 'utf-8'));

function formatBirthDate(birthdayStr) {
  if (!birthdayStr) return null;
  const parts = birthdayStr.split('-');
  if (parts.length !== 3) return null;
  if (parts[0].length === 4) return birthdayStr; // YYYY-MM-DD
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`; // YYYY-MM-DD
}

async function seed() {
  console.log(`Seeding ${members.length} members...`);

  for (const m of members) {
    const birthDate = formatBirthDate(m.birthday);
    if (!birthDate) {
      console.warn(`⚠️ Format tanggal lahir tidak valid untuk member ${m.name}: ${m.birthday}`);
      continue;
    }

    await pool.query(
      `INSERT INTO members (full_name, birth_date, gender, division, class, avatar_url, quote)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [
        m.name,
        birthDate,
        m.gender,
        m.division || '',
        m.class || '',
        m.avatar || '',
        m.quote || ''
      ]
    );
  }

  console.log('Seed selesai');
  process.exit(0);
}

seed().catch(err => {
  console.error('Gagal menjalankan seed:', err);
  process.exit(1);
});
