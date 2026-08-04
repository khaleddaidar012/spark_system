module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  mongoURI:
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spark_erp',
  jwt: {
    secret: process.env.JWT_SECRET || 'spark_erp_dev_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};
