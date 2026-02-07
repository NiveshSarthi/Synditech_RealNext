const { createClient } = require('./utils/pgClient');
require('dotenv').config();

const client = createClient();

async function checkUser() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // Check specific user
        const res = await client.query(`
      SELECT id, email, name, status, created_at 
      FROM users 
      WHERE email = 'tenant-user@testcompany.com';
    `);

        if (res.rows.length > 0) {
            console.log('User found:', res.rows[0]);
        } else {
            console.log('User tenant-user@testcompany.com NOT FOUND.');

            // List some existing users
            console.log('Listing top 5 existing users:');
            const listRes = await client.query(`SELECT email, name FROM users LIMIT 5`);
            console.table(listRes.rows);
        }

    } catch (err) {
        console.error('Error checking user:', err);
    } finally {
        await client.end();
    }
}

checkUser();
