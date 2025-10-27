import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import tokenRoutes from './routes/tokens.js';
import marketplaceRoutes from './routes/marketplace.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - необхідно для роботи за nginx/reverse proxy
app.set('trust proxy', 1);

connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:8000',
  process.env.FRONTEND_URL,
];

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Занадто багато запитів з цієї IP адреси',
});

app.use(limiter);

app.use('/auth', authRoutes);
app.use('/tokens', tokenRoutes);
app.use('/marketplace', marketplaceRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    network: process.env.SOLANA_NETWORK || 'devnet',
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'CryptoGame Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      tokens: '/tokens',
      marketplace: '/marketplace',
      health: '/health',
    },
    tokenOperations: {
      balance: 'GET /tokens/balance/:walletAddress',
      mint: 'POST /tokens/mint',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint не знайдено' });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  // В production не показуємо деталі помилок
  const errorResponse = {
    error: 'Внутрішня помилка сервера',
  };
  
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }
  
  res.status(err.status || 500).json(errorResponse);
});

app.listen(PORT, () => {
  console.log(PORT);
});

export default app;

