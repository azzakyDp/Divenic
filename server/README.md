# Yearbook Backend Server

Backend service for Divenic yearbook. Built with Node.js, Express, and PostgreSQL.

## Cara Install

Buka terminal di folder `server/` lalu jalankan:
```bash
npm install
```

## Setup Environment Variables

1. Duplikat file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Isi nilai-nilai di dalam `.env` sesuai dengan konfigurasi database local atau Supabase Anda. Jangan commit file `.env` ke Git repository.

## Setup Database

1. **Jalankan Skema SQL**:
   Salin isi file `scripts/schema.sql` dan jalankan di SQL Query Tool pgAdmin (lokal) atau SQL Editor Supabase (production) untuk membuat tabel dan index.

2. **Jalankan Seed Data**:
   Setelah database terhubung (ditandai dengan setup `.env` yang benar), jalankan perintah berikut sekali untuk mengimpor data member dari JSON ke database:
   ```bash
   node scripts/seed.js
   ```

## Jalankan Server

- **Development Mode** (dengan auto-reload nodemon):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```
