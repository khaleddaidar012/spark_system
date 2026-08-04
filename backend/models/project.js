const mongoose = require('mongoose');

/**
 * Placeholder Project model (Phase 1).
 * Not connected to a database yet.
 */
const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    address: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['planning', 'active', 'finished', 'canceled'],
      default: 'planning',
    },
    budget: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
