const { createClient, parseDatabaseUrl } = require('./utils/pgClient');
require('dotenv').config();

const dbUrl = parseDatabaseUrl();
const targetDbName = dbUrl.pathname.replace('/', '');
const adminUrl = new URL(process.env.DATABASE_URL);
adminUrl.pathname = '/postgres';

const client = createClient({ connectionString: adminUrl.toString() });

async function createDatabase() {
  try {
    await client.connect();
    console.log('Connected to postgres database.');

    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDbName]);

    if (res.rowCount === 0) {
      console.log(`Database ${targetDbName} does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`Database ${targetDbName} created successfully.`);
    } else {
      console.log(`Database ${targetDbName} already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err);
  } finally {
    await client.end();
  }
}

createDatabase();