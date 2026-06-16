require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const webhookRoutes = require('./routes/webhookRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

// JSON body parsing for all non-webhook routes
// (the webhook route uses express.raw() at the route level to preserve raw body for HMAC)
app.use((req, res, next) => {
  if (req.path === '/webhooks/tally') return next();
  express.json()(req, res, next);
});

app.use('/webhooks', webhookRoutes);
app.use('/events', eventRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[server] MongoDB connected');
    app.listen(PORT, () => console.log(`[server] Listening on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('[server] MongoDB connection failed:', err.message);
    process.exit(1);
  });
