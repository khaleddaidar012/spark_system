const mongoose = require('mongoose');

/**
 * Placeholder User model (Phase 1).
 * Not connected to a database yet.
 */
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'accountant'], default: 'manager' },
    active: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
