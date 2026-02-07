require('dotenv').config();
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[set]' : '[missing]');
const { sequelize, FacebookPageConnection, FacebookLeadForm } = require('../models');

async function syncModels() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync only the new models
        await FacebookPageConnection.sync({ alter: true });
        console.log('FacebookPageConnection synced.');

        await FacebookLeadForm.sync({ alter: true });
        console.log('FacebookLeadForm synced.');

        console.log('All done.');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

syncModels();
