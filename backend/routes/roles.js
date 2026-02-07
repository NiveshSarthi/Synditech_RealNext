const express = require('express');
const router = express.Router();
const { Role, Permission, Tenant } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/roles');
const { enforceTenantScope } = require('../middleware/scopeEnforcer');
const { ApiError } = require('../middleware/errorHandler');

// Middleware
router.use(authenticate, requireTenantAccess, enforceTenantScope);

/**
 * @route GET /api/roles
 * @desc Get all roles for the tenant (including system roles)
 */
router.get('/', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;

        // Get tenant-specific roles
        const tenantRoles = await Role.findAll({
            where: { tenant_id: tenantId },
            order: [['is_system', 'DESC'], ['created_at', 'ASC']]
        });

        // Also include system-wide roles (tenant_id = null)
        const systemRoles = await Role.findAll({
            where: { tenant_id: null },
            order: [['created_at', 'ASC']]
        });

        res.json({
            success: true,
            data: {
                tenant_roles: tenantRoles,
                system_roles: systemRoles
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/roles/permissions
 * @desc Get all available permissions
 */
router.get('/permissions', async (req, res, next) => {
    try {
        const permissions = await Permission.findAll({
            order: [['category', 'ASC'], ['code', 'ASC']]
        });

        // Group permissions by category
        const grouped = permissions.reduce((acc, perm) => {
            if (!acc[perm.category]) {
                acc[perm.category] = [];
            }
            acc[perm.category].push({
                code: perm.code,
                name: perm.name,
                description: perm.description
            });
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                permissions: permissions,
                grouped: grouped
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/roles
 * @desc Create a custom role
 */
router.post('/', async (req, res, next) => {
    try {
        const { name, description, permissions } = req.body;
        const tenantId = req.tenant.id;

        if (!name) {
            throw ApiError.badRequest('Role name is required');
        }

        if (!Array.isArray(permissions)) {
            throw ApiError.badRequest('Permissions must be an array');
        }

        // Check if role name already exists for this tenant
        const existingRole = await Role.findOne({
            where: { tenant_id: tenantId, name }
        });

        if (existingRole) {
            throw ApiError.conflict(`Role "${name}" already exists`);
        }

        // Validate that all permissions exist
        const validPermissions = await Permission.findAll({
            where: { code: permissions }
        });

        if (validPermissions.length !== permissions.length) {
            throw ApiError.badRequest('Some permissions are invalid');
        }

        // Create the role
        const role = await Role.create({
            tenant_id: tenantId,
            name,
            description: description || '',
            permissions,
            is_system: false,
            is_default: false
        });

        res.status(201).json({
            success: true,
            data: role,
            message: 'Role created successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route PATCH /api/roles/:id
 * @desc Update a custom role
 */
router.patch('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;
        const tenantId = req.tenant.id;

        const role = await Role.findOne({
            where: { id, tenant_id: tenantId }
        });

        if (!role) {
            throw ApiError.notFound('Role not found');
        }

        // Prevent editing system roles
        if (role.is_system) {
            throw ApiError.forbidden('Cannot edit system roles');
        }

        // Update fields
        if (name !== undefined) {
            // Check for name conflicts
            const existingRole = await Role.findOne({
                where: { tenant_id: tenantId, name, id: { [require('sequelize').Op.ne]: id } }
            });
            if (existingRole) {
                throw ApiError.conflict(`Role "${name}" already exists`);
            }
            role.name = name;
        }

        if (description !== undefined) {
            role.description = description;
        }

        if (permissions !== undefined) {
            if (!Array.isArray(permissions)) {
                throw ApiError.badRequest('Permissions must be an array');
            }

            // Validate permissions
            const validPermissions = await Permission.findAll({
                where: { code: permissions }
            });

            if (validPermissions.length !== permissions.length) {
                throw ApiError.badRequest('Some permissions are invalid');
            }

            role.permissions = permissions;
        }

        await role.save();

        res.json({
            success: true,
            data: role,
            message: 'Role updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route DELETE /api/roles/:id
 * @desc Delete a custom role
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;

        const role = await Role.findOne({
            where: { id, tenant_id: tenantId }
        });

        if (!role) {
            throw ApiError.notFound('Role not found');
        }

        // Prevent deleting system roles
        if (role.is_system) {
            throw ApiError.forbidden('Cannot delete system roles');
        }

        // TODO: Check if any users are assigned to this role
        // If yes, either prevent deletion or reassign to default role

        await role.destroy();

        res.json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
