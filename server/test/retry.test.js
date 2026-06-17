const test = require('node:test');
const assert = require('node:assert/strict');
const { withRetry } = require('../utils/retry');

test('withRetry returns result and attempt count after retrying', async () => {
  let calls = 0;

  const output = await withRetry(async () => {
    calls += 1;
    if (calls < 2) throw new Error('temporary');
    return 'ok';
  }, { maxAttempts: 3, baseDelayMs: 1 });

  assert.deepEqual(output, { result: 'ok', attempts: 2 });
});

test('withRetry throws the last error with attempts after exhausting retries', async () => {
  await assert.rejects(
    () => withRetry(async () => {
      throw new Error('still broken');
    }, { maxAttempts: 2, baseDelayMs: 1 }),
    err => {
      assert.equal(err.message, 'still broken');
      assert.equal(err.attempts, 2);
      return true;
    }
  );
});
