import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import devoteeRoutes from './routes/devotees.js';
import incidentRoutes from './routes/incidents.js';
import chatbotRoutes from './routes/chatbot.js';
import weatherRoutes from './routes/weather.js';
import { analyticsRouter } from './routes/analytics.js';
import { lostFoundRouter } from './routes/lostFound.js';
import faceRoutes from './routes/face.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Set it in a .env file.');
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/devotees', devoteeRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/analytics', analyticsRouter);
app.use('/api/lost-found', lostFoundRouter);
app.use('/api/face', faceRoutes);


// SERVE STATIC FILES (This fixes "Cannot GET /")
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve files from the 'dist' directory (one level up from server/)
const distPath = path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get(/^(?!\/api).+/, (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Build found but index.html is missing. Please run "npm run build" locally or in your deployment pipeline.');
    }
  });
} else {
  // If dist doesn't exist (e.g. running server only without build), show a helpful message
  app.get('/', (req, res) => {
    res.send(`
      <div style="font-family: sans-serif; padding: 20px; text-align: center;">
        <h1>Medical System API is Running</h1>
        <p>Frontend build not found at <code>${distPath}</code></p>
        <p>To serve the frontend:</p>
        <pre>npm run build</pre>
        <p>Then restart the server.</p>
      </div>
    `);
  });
}

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

