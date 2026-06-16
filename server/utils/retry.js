/**
 * Retries an async fn up to maxAttempts times with exponential backoff.
 * Throws the last error if all attempts fail.
 *
 * @param {Function} fn        - async function to execute
 * @param {Object}  options
 * @param {number}  options.maxAttempts  - total attempts (default 3)
 * @param {number}  options.baseDelayMs  - initial delay in ms (default 500)
 * @param {number}  options.maxDelayMs   - ceiling for backoff (default 10000)
 * @param {Function} options.onRetry     - optional callback(attempt, error)
 * @returns {{ result, attempts }}
 */
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        if (onRetry) onRetry(attempt, err);
        await sleep(delay);
      }
    }
  }

  throw Object.assign(lastError, { attempts: maxAttempts });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { withRetry };
