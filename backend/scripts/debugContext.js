require('dotenv').config();
const db = require('../models');
const authService = require('../services/authService');

async function debugContext() {
    try {
        console.log('Debugging getUserContext for tenant-admin@testcompany.com...');

        const user = await db.User.findOne({ where: { email: 'admin@testcompany.com' } });
        if (!user) {
            console.log('User not found. Registering first...');
            return;
        }

        console.log('Found user:', user.email);

        try {
            const context = await authService.getUserContext(user);
            console.log('Context retrieved successfully:');
            console.log(JSON.stringify(context, null, 2));
        } catch (err) {
            console.error('getUserContext FAILED with error:');
            console.error(err);
        }

        await db.sequelize.close();
    } catch (error) {
        console.error('Debug script failed:', error);
    }
}

debugContext();
