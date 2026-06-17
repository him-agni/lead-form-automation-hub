function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);

  const status = err.statusCode || err.status || 500;
  const message = status >= 500 ? 'Internal server error' : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
