require('dotenv').config();
const { sequelize, Permission, Role, Tenant } = require('../models');

/**
 * Seed system permissions and default roles
 */
async function seedPermissionsAndRoles() {
    try {
        console.log('🌱 Seeding permissions and roles...\n');

        // =====================
        // 1. CREATE PERMISSIONS
        // =====================
        const permissions = [
            // Lead Management
            { code: 'leads.view', name: 'View Leads', category: 'leads', description: 'View all leads in the system' },
            { code: 'leads.create', name: 'Create Leads', category: 'leads', description: 'Create new leads' },
            { code: 'leads.edit', name: 'Edit Leads', category: 'leads', description: 'Edit existing leads' },
            { code: 'leads.delete', name: 'Delete Leads', category: 'leads', description: 'Delete leads' },
            { code: 'leads.export', name: 'Export Leads', category: 'leads', description: 'Export leads to CSV/Excel' },

            // Campaign Management
            { code: 'campaigns.view', name: 'View Campaigns', category: 'campaigns', description: 'View all campaigns' },
            { code: 'campaigns.create', name: 'Create Campaigns', category: 'campaigns', description: 'Create new campaigns' },
            { code: 'campaigns.edit', name: 'Edit Campaigns', category: 'campaigns', description: 'Edit existing campaigns' },
            { code: 'campaigns.delete', name: 'Delete Campaigns', category: 'campaigns', description: 'Delete campaigns' },
            { code: 'campaigns.send', name: 'Send Campaigns', category: 'campaigns', description: 'Send/execute campaigns' },

            // Template Management
            { code: 'templates.view', name: 'View Templates', category: 'templates', description: 'View message templates' },
            { code: 'templates.create', name: 'Create Templates', category: 'templates', description: 'Create new templates' },
            { code: 'templates.edit', name: 'Edit Templates', category: 'templates', description: 'Edit existing templates' },
            { code: 'templates.delete', name: 'Delete Templates', category: 'templates', description: 'Delete templates' },

            // Workflow Management
            { code: 'workflows.view', name: 'View Workflows', category: 'workflows', description: 'View automation workflows' },
            { code: 'workflows.create', name: 'Create Workflows', category: 'workflows', description: 'Create new workflows' },
            { code: 'workflows.edit', name: 'Edit Workflows', category: 'workflows', description: 'Edit existing workflows' },
            { code: 'workflows.delete', name: 'Delete Workflows', category: 'workflows', description: 'Delete workflows' },

            // Team Management
            { code: 'team.view', name: 'View Team', category: 'team', description: 'View team members' },
            { code: 'team.invite', name: 'Invite Members', category: 'team', description: 'Invite new team members' },
            { code: 'team.edit', name: 'Edit Members', category: 'team', description: 'Edit team member details and roles' },
            { code: 'team.remove', name: 'Remove Members', category: 'team', description: 'Remove team members' },

            // Role Management
            { code: 'roles.view', name: 'View Roles', category: 'roles', description: 'View all roles' },
            { code: 'roles.create', name: 'Create Roles', category: 'roles', description: 'Create custom roles' },
            { code: 'roles.edit', name: 'Edit Roles', category: 'roles', description: 'Edit role permissions' },
            { code: 'roles.delete', name: 'Delete Roles', category: 'roles', description: 'Delete custom roles' },

            // Settings
            { code: 'settings.view', name: 'View Settings', category: 'settings', description: 'View tenant settings' },
            { code: 'settings.edit', name: 'Edit Settings', category: 'settings', description: 'Edit tenant settings' },
            { code: 'settings.billing', name: 'Manage Billing', category: 'settings', description: 'Manage billing and subscriptions' },

            // Analytics
            { code: 'analytics.view', name: 'View Analytics', category: 'analytics', description: 'View analytics and reports' },
            { code: 'analytics.export', name: 'Export Analytics', category: 'analytics', description: 'Export analytics data' },
        ];

        for (const perm of permissions) {
            await Permission.findOrCreate({
                where: { code: perm.code },
                defaults: { ...perm, is_system: true }
            });
        }

        console.log(`✓ Created ${permissions.length} system permissions\n`);

        // =====================
        // 2. CREATE DEFAULT SYSTEM ROLES
        // =====================
        
        // Admin Role (Full Access)
        const adminPermissions = permissions.map(p => p.code);
        await Role.findOrCreate({
            where: { tenant_id: null, name: 'Admin' },
            defaults: {
                name: 'Admin',
                description: 'Full access to all features and settings',
                permissions: adminPermissions,
                is_system: true,
                is_default: false
            }
        });

        // Manager Role (Most permissions except role/team management)
        const managerPermissions = permissions
            .filter(p => !p.code.startsWith('roles.') && !p.code.startsWith('team.remove') && !p.code.startsWith('settings.billing'))
            .map(p => p.code);
        await Role.findOrCreate({
            where: { tenant_id: null, name: 'Manager' },
            defaults: {
                name: 'Manager',
                description: 'Manage leads, campaigns, and workflows. Cannot manage team or roles.',
                permissions: managerPermissions,
                is_system: true,
                is_default: false
            }
        });

        // User Role (View-only + basic actions)
        const userPermissions = [
            'leads.view', 'leads.create', 'leads.edit',
            'campaigns.view',
            'templates.view',
            'workflows.view',
            'analytics.view'
        ];
        await Role.findOrCreate({
            where: { tenant_id: null, name: 'User' },
            defaults: {
                name: 'User',
                description: 'Basic access to view and create leads. Limited campaign access.',
                permissions: userPermissions,
                is_system: true,
                is_default: true
            }
        });

        console.log('✓ Created 3 default system roles (Admin, Manager, User)\n');

        // =====================
        // 3. CREATE DEFAULT ROLES FOR EXISTING TENANTS
        // =====================
        const tenants = await Tenant.findAll();
        
        for (const tenant of tenants) {
            // Create tenant-specific default roles
            await Role.findOrCreate({
                where: { tenant_id: tenant.id, name: 'Admin' },
                defaults: {
                    tenant_id: tenant.id,
                    name: 'Admin',
                    description: 'Full access to all features and settings',
                    permissions: adminPermissions,
                    is_system: true,
                    is_default: false
                }
            });

            await Role.findOrCreate({
                where: { tenant_id: tenant.id, name: 'Manager' },
                defaults: {
                    tenant_id: tenant.id,
                    name: 'Manager',
                    description: 'Manage leads, campaigns, and workflows',
                    permissions: managerPermissions,
                    is_system: true,
                    is_default: false
                }
            });

            await Role.findOrCreate({
                where: { tenant_id: tenant.id, name: 'User' },
                defaults: {
                    tenant_id: tenant.id,
                    name: 'User',
                    description: 'Basic access to view and create leads',
                    permissions: userPermissions,
                    is_system: true,
                    is_default: true
                }
            });

            console.log(`✓ Created default roles for tenant: ${tenant.name}`);
        }

        console.log('\n============================================================');
        console.log('✅ PERMISSIONS AND ROLES SEEDED SUCCESSFULLY!');
        console.log('============================================================\n');
        console.log(`📊 Summary:`);
        console.log(`   - ${permissions.length} system permissions created`);
        console.log(`   - 3 system-wide default roles created`);
        console.log(`   - ${tenants.length} tenants configured with default roles\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding permissions and roles:', error);
        process.exit(1);
    }
}

seedPermissionsAndRoles();
