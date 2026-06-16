const mongoose = require('mongoose');

const destinationResultSchema = new mongoose.Schema({
  destination: { type: String, enum: ['airtable', 'discord', 'sheets'], required: true },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
  error: { type: String, default: null },
  externalId: { type: String, default: null }, // Airtable record ID, etc.
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  tallyFormId: { type: String },
  tallySubmissionId: { type: String, unique: true },
  respondentId: { type: String },
  fields: { type: Map, of: mongoose.Schema.Types.Mixed }, // raw key→value pairs
  overallStatus: {
    type: String,
    enum: ['success', 'partial_failure', 'failed', 'processing'],
    default: 'processing',
  },
  destinations: { type: [destinationResultSchema], default: [] },
  simulatedAt: { type: Date, default: null }, // set if this was a simulated event
}, { timestamps: true });

// Recompute overallStatus from individual destination results
submissionSchema.methods.computeOverallStatus = function () {
  const results = this.destinations;
  if (!results.length) return 'processing';
  const allSuccess = results.every(r => r.status === 'success');
  const allFailed = results.every(r => r.status === 'failed');
  if (allSuccess) return 'success';
  if (allFailed) return 'failed';
  return 'partial_failure';
};

module.exports = mongoose.model('Submission', submissionSchema);
