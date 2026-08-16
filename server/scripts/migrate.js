import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to locate data directory from various CWD execution points
function getJsonData(filename) {
  const possiblePaths = [
    path.resolve(__dirname, `../../data/${filename}`),
    path.resolve(process.cwd(), `data/${filename}`),
    path.resolve(process.cwd(), `../data/${filename}`)
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  }
  throw new Error(`Could not find data/${filename} in any of: ${possiblePaths.join(', ')}`);
}

export async function migrateMentors() {
  console.log('📦 Migrating mentors...');
  const mentors = getJsonData('mentors.json');
  let insertedCount = 0;

  for (const m of mentors) {
    const res = await pool.query(
      `INSERT INTO mentors (id, nickname, name, role, avatar)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [
        m.id,
        m.nickname || '',
        m.name || '',
        m.role || '',
        m.avatar || ''
      ]
    );
    if (res.rowCount > 0) {
      insertedCount++;
    }
  }
  console.log(`✅ Mentors migration completed. Inserted ${insertedCount} new mentors (total in file: ${mentors.length}).`);
}

export async function migrateMembers() {
  console.log('📦 Migrating members...');
  const members = getJsonData('members.json');
  let insertedCount = 0;

  for (const m of members) {
    const res = await pool.query(
      `INSERT INTO members (id, name, nickname, division, class, bio, quote, avatar, instagram, birthday, gender)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        m.id,
        m.name,
        m.nickname,
        m.division || '',
        m.class || '',
        m.bio || '',
        m.quote || '',
        m.avatar || '',
        m.instagram || '',
        m.birthday || null,
        m.gender
      ]
    );
    if (res.rowCount > 0) {
      insertedCount++;
    }
  }
  console.log(`✅ Members migration completed. Inserted ${insertedCount} new members (total in file: ${members.length}).`);
}

export async function migrateAlbums() {
  console.log('📦 Migrating albums...');
  const albums = getJsonData('albums.json');
  let albumCount = 0;
  let photoCount = 0;

  for (const a of albums) {
    const res = await pool.query(
      `INSERT INTO albums (id, title, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.title, a.category || '']
    );
    if (res.rowCount > 0) albumCount++;

    if (Array.isArray(a.photos)) {
      for (let i = 0; i < a.photos.length; i++) {
        const p = a.photos[i];
        const photoRes = await pool.query(
          `INSERT INTO album_photos (album_id, image, caption, photo_order)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (album_id, photo_order) DO NOTHING`,
          [a.id, p.url, p.caption || '', i]
        );
        if (photoRes.rowCount > 0) photoCount++;
      }
    }
  }
  console.log(`✅ Albums migration completed. Inserted ${albumCount} albums, ${photoCount} photos.`);
}

async function main() {
  try {
    await migrateMentors();
    await migrateMembers();
    await migrateAlbums();
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

// Execute if run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}