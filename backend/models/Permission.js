const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Permission = sequelize.define('permissions', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique permission code, e.g., leads.create'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Human-readable permission name'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Permission category for grouping (leads, campaigns, team, etc.)'
    },
    is_system: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'System permissions cannot be deleted'
    }
}, {
    tableName: 'permissions',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['code'] },
        { fields: ['category'] }
    ]
});

module.exports = Permission;
