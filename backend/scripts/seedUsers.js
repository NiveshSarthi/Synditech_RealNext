require('dotenv').config({ path: '../.env' }); // Adjust path if needed
const { sequelize } = require('../config/database');
const { User, Tenant, TenantUser, Partner, PartnerUser } = require('../models');
const logger = require('../config/logger');

const seedUsers = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Connected to database.');

        // 1. Super Admin
        if (process.env.SUPER_ADMIN_EMAIL) {
            const adminEmail = process.env.SUPER_ADMIN_EMAIL;
            const existingAdmin = await User.findOne({ where: { email: adminEmail } });
            if (!existingAdmin) {
                logger.info('Seeding Super Admin...');
                // Note: Password hashing happens in User model hooks
                const user = await User.create({
                    email: adminEmail,
                    password_hash: process.env.SUPER_ADMIN_PASSWORD,
                    name: 'Super Admin',
                    status: 'active',
                    is_super_admin: true,
                    email_verified: true
                });
                const tenant = await Tenant.create({
                    name: 'RealNext Admin',
                    email: adminEmail,
                    status: 'active',
                    environment: 'production'
                });
                await TenantUser.create({
                    tenant_id: tenant.id,
                    user_id: user.id,
                    role: 'admin',
                    is_owner: true
                });
                logger.info('Super Admin seeded.');
            } else {
                logger.info('Super Admin already exists.');
            }
        }

        // 2. Partner Admin
        const partnerEmail = 'partner-admin@acme.com';
        const existingPartner = await User.findOne({ where: { email: partnerEmail } });
        if (!existingPartner) {
            logger.info('Seeding Partner Admin...');
            const pUser = await User.create({
                email: partnerEmail,
                password_hash: 'Test123!',
                name: 'Partner Admin',
                status: 'active',
                email_verified: true
            });
            const partner = await Partner.create({
                name: 'Acme Resellers',
                email: partnerEmail,
                status: 'active',
                commission_rate: 15.00
            });
            await PartnerUser.create({
                partner_id: partner.id,
                user_id: pUser.id,
                role: 'admin',
                is_owner: true
            });
            logger.info('Partner Admin seeded.');
        } else {
            logger.info('Partner Admin already exists.');
        }

        // 3. Tenant Admin
        const tenantRxEmail = 'tenant-admin@testcompany.com';
        const existingTenantRx = await User.findOne({ where: { email: tenantRxEmail } });
        let tenantCompanyId = null;

        if (!existingTenantRx) {
            logger.info('Seeding Tenant Admin...');
            const tUser = await User.create({
                email: tenantRxEmail,
                password_hash: 'Test123!',
                name: 'Tenant Admin',
                status: 'active',
                email_verified: true
            });
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14);

            const tenantCompany = await Tenant.create({
                name: 'Test Company Ltd',
                email: tenantRxEmail,
                status: 'active',
                plan_type: 'trial',
                trial_ends_at: trialEnd
            });
            tenantCompanyId = tenantCompany.id;

            await TenantUser.create({
                tenant_id: tenantCompany.id,
                user_id: tUser.id,
                role: 'admin',
                is_owner: true
            });
            logger.info('Tenant Admin seeded.');
        } else {
            logger.info('Tenant Admin already exists. Fetching tenant ID...');
            const tUser = await User.findOne({ where: { email: tenantRxEmail } });
            const tUserRel = await TenantUser.findOne({ where: { user_id: tUser.id } });
            if (tUserRel) tenantCompanyId = tUserRel.tenant_id;
        }

        // 4. Tenant User
        if (tenantCompanyId) {
            const regUserEmail = 'tenant-user@testcompany.com';
            const existingRegUser = await User.findOne({ where: { email: regUserEmail } });
            if (!existingRegUser) {
                logger.info('Seeding Regular Tenant User...');
                const rUser = await User.create({
                    email: regUserEmail,
                    password_hash: 'Test123!',
                    name: 'Regular User',
                    status: 'active',
                    email_verified: true
                });
                await TenantUser.create({
                    tenant_id: tenantCompanyId,
                    user_id: rUser.id,
                    role: 'user',
                    is_owner: false
                });
                logger.info('Regular Tenant User seeded.');
            } else {
                logger.info('Regular Tenant User already exists.');
            }
        }

        logger.info('Seeding complete.');
        process.exit(0);

    } catch (error) {
        logger.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedUsers();
