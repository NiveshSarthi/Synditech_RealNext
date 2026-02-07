const { createClient } = require('./utils/pgClient');
require('dotenv').config();

const client = createClient();

async function checkRoleIdColumn() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_users' AND column_name = 'role_id';
    `);

        if (res.rows.length > 0) {
            console.log('Column role_id EXISTS.');
        } else {
            console.log('Column role_id MISSING.');
        }
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        await client.end();
    }
}

checkRoleIdColumn();
