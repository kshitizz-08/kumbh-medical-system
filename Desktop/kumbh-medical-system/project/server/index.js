import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import devoteeRoutes from './routes/devotees.js';
import incidentRoutes from './routes/incidents.js';
import chatbotRoutes from './routes/chatbot.js';
import weatherRoutes from './routes/weather.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Set it in a .env file.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/devotees', devoteeRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/weather', weatherRoutes);

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check if MongoDB Atlas cluster is running (not paused)');
    console.error('2. Verify your IP address is whitelisted in MongoDB Atlas');
    console.error('3. Check your internet connection');
    console.error('4. Verify the connection string in .env file');
    process.exit(1);
  }
}

start();

