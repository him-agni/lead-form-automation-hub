require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { validateEnv } = require('./config/env');

const webhookRoutes = require('./routes/webhookRoutes');
const eventRoutes = require('./routes/eventRoutes');
const errorHandler = require('./middleware/errorHandler');
const { recoverProcessingSubmissions } = require('./services/fanoutService');

const app = express();
const PORT = process.env.PORT || 5000;
let mongoConnectionPromise;

validateEnv();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'https://client-lime-alpha.vercel.app',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
}));

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => {
        console.log('[server] MongoDB connected');
        return recoverProcessingSubmissions().catch(err =>
          console.error('[server] Processing recovery failed:', err.message)
        );
      })
      .catch(err => {
        mongoConnectionPromise = null;
        throw err;
      });
  }

  return mongoConnectionPromise;
}

app.use(async (req, res, next) => {
  if (req.path === '/health') return next();

  try {
    await connectMongo();
    next();
  } catch (err) {
    next(err);
  }
});

// JSON body parsing for all non-webhook routes
// (the webhook route uses express.raw() at the route level to preserve raw body for HMAC)
app.use((req, res, next) => {
  if (req.path === '/webhooks/tally') return next();
  express.json({ limit: '64kb' })(req, res, next);
});

app.use('/webhooks', webhookRoutes);
app.use('/events', eventRoutes);

app.use(errorHandler);

if (require.main === module) {
  connectMongo()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[server] Listening on http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      console.error('[server] MongoDB connection failed:', err.message);
      process.exit(1);
    });
}

module.exports = app;
