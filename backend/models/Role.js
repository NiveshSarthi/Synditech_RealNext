const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('roles', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'tenants',
            key: 'id'
        },
        comment: 'NULL for system roles, UUID for tenant-specific roles'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    permissions: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Array of permission codes'
    },
    is_system: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'System roles (admin, manager, user) cannot be deleted'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Default role assigned to new team members'
    }
}, {
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['is_system'] },
        { unique: true, fields: ['tenant_id', 'name'] }
    ]
});

module.exports = Role;
