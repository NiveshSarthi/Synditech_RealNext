require('dotenv').config({ path: '/app/.env' });
console.log('Database URL set:', !!process.env.DATABASE_URL);
console.log('DB_SSL:', process.env.DB_SSL);

try {
  const { testConnection } = require('./config/database');
  testConnection()
    .then(() => {
      console.log('Database connection successful!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database connection failed:', err.message);
      process.exit(1);
    });
} catch (e) {
  console.error('Error loading database config:', e.message);
  process.exit(1);
}
