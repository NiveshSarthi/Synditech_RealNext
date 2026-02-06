require('dotenv').config();
const { sequelize, Permission, Role, TenantUser } = require('../models');

/**
 * Create permissions and roles tables manually
 */
async function createTables() {
    try {
        console.log('🔧 Creating permissions and roles tables...\n');

        // Create permissions table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                category VARCHAR(50) NOT NULL DEFAULT 'general',
                is_system BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            );
        `);
        console.log('✓ Created permissions table');

        // Create roles table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                permissions JSONB DEFAULT '[]'::jsonb,
                is_system BOOLEAN DEFAULT false,
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE,
                UNIQUE(tenant_id, name)
            );
        `);
        console.log('✓ Created roles table');

        // Add role_id column to tenant_users if it doesn't exist
        await sequelize.query(`
            ALTER TABLE tenant_users 
            ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
        `);
        console.log('✓ Added role_id column to tenant_users');

        // Create indexes
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
            CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
            CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);
            CREATE INDEX IF NOT EXISTS idx_tenant_users_role_id ON tenant_users(role_id);
        `);
        console.log('✓ Created indexes');

        console.log('\n✅ Tables created successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        process.exit(1);
    }
}

createTables();
