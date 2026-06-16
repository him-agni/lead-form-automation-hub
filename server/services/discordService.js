const axios = require('axios');

/**
 * Posts a formatted embed to a Discord channel via incoming webhook.
 * @param {Object} fields - flat key→value map from the Tally submission
 * @param {string} submissionId
 */
async function sendAlert(fields, submissionId) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL is not set');

  const fieldLines = Object.entries(fields)
    .slice(0, 10) // cap at 10 fields to stay within embed limits
    .map(([k, v]) => ({ name: k, value: String(v ?? '—'), inline: true }));

  const payload = {
    embeds: [
      {
        title: '📋 New Form Submission',
        color: 0x5865f2, // Discord blurple
        fields: fieldLines,
        footer: { text: `Submission ID: ${submissionId}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await axios.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
}

module.exports = { sendAlert };
