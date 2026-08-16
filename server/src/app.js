import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// CORS — izinkan hanya dari domain frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'PLACEHOLDER_DOMAIN_PRODUCTION'   // ⚠️ BAGIAN HUMAN — isi domain Vercel asli setelah deploy
    : 'http://localhost:5500',        // Live Server default port
  credentials: true,         
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));

export default app;
