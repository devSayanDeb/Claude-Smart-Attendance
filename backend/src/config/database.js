require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'attendance_user',
    password: process.env.DB_PASSWORD || 'secure_password_123',
    database: process.env.DB_DATABASE || 'smart_attendance',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'postgres',
    logging: console.log
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};