const { createClient } = require('./utils/pgClient');
require('dotenv').config();

const client = createClient();

async function checkColumns() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_users';
    `);

        console.log('Columns in tenant_users:', res.rows);
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        await client.end();
    }
}

checkColumns();
