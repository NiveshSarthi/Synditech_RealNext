const { Sequelize } = require('sequelize');
const logger = require('./logger');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
        max: 20,
        min: 5,
        acquire: 60000,
        idle: 10000
    },
    dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
            require: true,
            rejectUnauthorized: false
        } : false,
        connectTimeout: 60000
    },
    define: {
        timestamps: true,
        underscored: true,
        paranoid: true,
        freezeTableName: true
    }
});

const testConnection = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully.');
        return true;
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        throw error;
    }
};

module.exports = { sequelize, testConnection };