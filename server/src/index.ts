import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initializeDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

// Initialize SQLite database
initializeDatabase();
console.log('📦 Database initialized');

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api', routes);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 Airport Transfer API running on http://localhost:${env.PORT}`);
});
