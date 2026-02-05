const express = require('express');
const router = express.Router();
const { User, TenantUser, Tenant, Role } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/roles');
const { enforceTenantScope } = require('../middleware/scopeEnforcer');
const { ApiError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

// Middleware
router.use(authenticate, requireTenantAccess, enforceTenantScope);

/**
 * @route GET /api/team
 * @desc Get all team members for the tenant
 */
router.get('/', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;

        const teamMembers = await TenantUser.findAll({
            where: { tenant_id: tenantId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'avatar_url', 'status', 'last_login_at', 'created_at']
                },
                {
                    model: Role,
                    as: 'customRole',
                    attributes: ['id', 'name', 'description', 'permissions']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const formattedMembers = teamMembers.map(tm => ({
            id: tm.id,
            user_id: tm.user.id,
            name: tm.user.name,
            email: tm.user.email,
            phone: tm.user.phone,
            avatar_url: tm.user.avatar_url,
            status: tm.user.status,
            role: tm.role, // Legacy role
            role_id: tm.role_id,
            custom_role: tm.customRole ? {
                id: tm.customRole.id,
                name: tm.customRole.name,
                description: tm.customRole.description
            } : null,
            is_owner: tm.is_owner,
            department: tm.department,
            last_login_at: tm.user.last_login_at,
            joined_at: tm.created_at
        }));

        res.json({
            success: true,
            data: formattedMembers
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/team/invite
 * @desc Invite a new team member
 */
router.post('/invite', async (req, res, next) => {
    try {
        const { email, name, role, role_id, department } = req.body;
        const tenantId = req.tenant.id;

        // Validate required fields
        if (!email || !name) {
            throw ApiError.badRequest('Email and name are required');
        }

        // Check if user already exists
        let user = await User.findOne({ where: { email } });

        if (!user) {
            // Create new user with temporary password
            const tempPassword = Math.random().toString(36).slice(-10);
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            user = await User.create({
                email,
                name,
                password_hash: hashedPassword,
                status: 'active'
            });

            // TODO: Send invitation email with temp password
            logger.info(`New user created: ${email} with temp password: ${tempPassword}`);
        }

        // Check if user is already a team member
        const existingMember = await TenantUser.findOne({
            where: { tenant_id: tenantId, user_id: user.id }
        });

        if (existingMember) {
            throw ApiError.conflict('User is already a team member');
        }

        // Create tenant user relationship
        const tenantUser = await TenantUser.create({
            tenant_id: tenantId,
            user_id: user.id,
            role: role || 'user',
            role_id: role_id || null,
            department: department || null,
            is_owner: false
        });

        // Fetch the created member with associations
        const newMember = await TenantUser.findByPk(tenantUser.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'avatar_url', 'status']
                },
                {
                    model: Role,
                    as: 'customRole',
                    attributes: ['id', 'name', 'description']
                }
            ]
        });

        res.status(201).json({
            success: true,
            data: {
                id: newMember.id,
                user_id: newMember.user.id,
                name: newMember.user.name,
                email: newMember.user.email,
                role: newMember.role,
                role_id: newMember.role_id,
                custom_role: newMember.customRole,
                department: newMember.department,
                is_owner: newMember.is_owner
            },
            message: 'Team member invited successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route PATCH /api/team/:userId
 * @desc Update team member role/details
 */
router.patch('/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { role, role_id, department, status } = req.body;
        const tenantId = req.tenant.id;

        const tenantUser = await TenantUser.findOne({
            where: { tenant_id: tenantId, user_id: userId }
        });

        if (!tenantUser) {
            throw ApiError.notFound('Team member not found');
        }

        // Prevent modifying the owner
        if (tenantUser.is_owner) {
            throw ApiError.forbidden('Cannot modify the tenant owner');
        }

        // Update fields
        if (role !== undefined) tenantUser.role = role;
        if (role_id !== undefined) tenantUser.role_id = role_id;
        if (department !== undefined) tenantUser.department = department;

        await tenantUser.save();

        // If status is being updated, update the user record
        if (status !== undefined) {
            await User.update(
                { status },
                { where: { id: userId } }
            );
        }

        // Fetch updated member
        const updatedMember = await TenantUser.findByPk(tenantUser.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'status']
                },
                {
                    model: Role,
                    as: 'customRole',
                    attributes: ['id', 'name', 'description']
                }
            ]
        });

        res.json({
            success: true,
            data: updatedMember,
            message: 'Team member updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route DELETE /api/team/:userId
 * @desc Remove a team member
 */
router.delete('/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const tenantId = req.tenant.id;

        const tenantUser = await TenantUser.findOne({
            where: { tenant_id: tenantId, user_id: userId }
        });

        if (!tenantUser) {
            throw ApiError.notFound('Team member not found');
        }

        // Prevent removing the owner
        if (tenantUser.is_owner) {
            throw ApiError.forbidden('Cannot remove the tenant owner');
        }

        await tenantUser.destroy();

        res.json({
            success: true,
            message: 'Team member removed successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
