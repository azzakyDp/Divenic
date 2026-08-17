import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import mentorsRoutes from './routes/mentors.js';
import membersRoutes from './routes/members.js';
import albumsRoutes from './routes/albums.js';
import messagesRoutes from './routes/messages.js';

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// CORS — izinkan hanya dari domain frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'PLACEHOLDER_DOMAIN_PRODUCTION'
    : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/mentors', mentorsRoutes);
app.use('/api/albums', albumsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));

export default app;