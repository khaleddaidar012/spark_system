const mongoose = require('mongoose');

/**
 * MongoDB connection placeholder (Phase 1).
 * No database is connected yet — only the structure is prepared.
 */
async function connectDB() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spark_erp';

  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
