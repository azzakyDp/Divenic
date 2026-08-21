import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import mentorsRoutes from './routes/mentors.js';
import membersRoutes from './routes/members.js';
import albumsRoutes from './routes/albums.js';
import messagesRoutes from './routes/messages.js';
import profileRoutes from './routes/profile.js';

const app = express();

// Security headers
app.use(helmet(
  {
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }
));

// CORS — izinkan lokal dev & Vercel same-origin production
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://PLACEHOLDER.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request same-origin (tanpa Origin header) atau yang terdaftar di dev whitelist / production
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
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
app.use('/api/profile', profileRoutes);

export default app;