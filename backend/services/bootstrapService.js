const logger = require('../config/logger');
const {
    sequelize,
    User,
    Tenant,
    TenantUser
} = require('../models');

const isEnabled = (value, defaultValue = true) => {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    return String(value).toLowerCase() !== 'false';
};

const syncSchemaIfEnabled = async () => {
    const shouldSync = isEnabled(process.env.AUTO_SYNC_DB, true);

    if (!shouldSync) {
        logger.info('Schema sync skipped (AUTO_SYNC_DB=false)');
        return;
    }

    await sequelize.sync({ force: false, alter: false });
    logger.info('Schema synchronized');
};

const ensureSuperAdminIfConfigured = async () => {
    const shouldBootstrap = isEnabled(process.env.BOOTSTRAP_SUPER_ADMIN, true);
    if (!shouldBootstrap) {
        logger.info('Super admin bootstrap skipped (BOOTSTRAP_SUPER_ADMIN=false)');
        return;
    }

    const adminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = (process.env.SUPER_ADMIN_PASSWORD || '').trim();
    const adminName = (process.env.SUPER_ADMIN_NAME || 'Super Admin').trim();
    const tenantName = (process.env.SUPER_ADMIN_TENANT_NAME || 'Primary Organization').trim();

    if (!adminEmail || !adminPassword) {
        logger.warn('Super admin not bootstrapped. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD.');
        return;
    }

    const tx = await sequelize.transaction();
    try {
        const [user] = await User.findOrCreate({
            where: { email: adminEmail },
            defaults: {
                name: adminName,
                email: adminEmail,
                password_hash: adminPassword,
                is_super_admin: true,
                status: 'active',
                email_verified: true
            },
            transaction: tx
        });

        let userUpdated = false;
        if (!user.is_super_admin) {
            user.is_super_admin = true;
            userUpdated = true;
        }
        if (user.status !== 'active') {
            user.status = 'active';
            userUpdated = true;
        }
        if (!user.email_verified) {
            user.email_verified = true;
            userUpdated = true;
        }
        if (userUpdated) {
            await user.save({ transaction: tx });
        }

        let ownerMembership = await TenantUser.findOne({
            where: { user_id: user.id, is_owner: true },
            include: [{ model: Tenant, as: 'Tenant' }],
            transaction: tx
        });

        if (!ownerMembership) {
            const [tenant] = await Tenant.findOrCreate({
                where: { email: adminEmail },
                defaults: {
                    name: tenantName,
                    email: adminEmail,
                    status: 'active',
                    environment: 'production'
                },
                transaction: tx
            });

            await TenantUser.findOrCreate({
                where: {
                    tenant_id: tenant.id,
                    user_id: user.id
                },
                defaults: {
                    tenant_id: tenant.id,
                    user_id: user.id,
                    role: 'admin',
                    is_owner: true,
                    permissions: []
                },
                transaction: tx
            });

            ownerMembership = { Tenant: tenant };
        }

        await tx.commit();
        logger.info(`Super admin ready (${adminEmail}) with tenant "${ownerMembership.Tenant.name}"`);
    } catch (error) {
        await tx.rollback();
        throw error;
    }
};

const initializeDatabase = async () => {
    await syncSchemaIfEnabled();
    await ensureSuperAdminIfConfigured();
};

module.exports = { initializeDatabase };

