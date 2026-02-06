const { TenantUser, Role } = require('../models');
const { ApiError } = require('./errorHandler');

/**
 * Permission checking middleware
 * Checks if the user has the required permission based on their role
 */
const requirePermission = (permissionCode) => {
    return async (req, res, next) => {
        try {
            // Super admins bypass all permission checks
            if (req.user?.is_super_admin) {
                return next();
            }

            // Get the user's tenant membership
            const tenantUser = await TenantUser.findOne({
                where: {
                    user_id: req.user.id,
                    tenant_id: req.tenant?.id
                },
                include: [{
                    model: Role,
                    as: 'customRole'
                }]
            });

            if (!tenantUser) {
                throw ApiError.forbidden('You are not a member of this tenant');
            }

            // Check if user is tenant owner (full access)
            if (tenantUser.is_owner) {
                return next();
            }

            // Get permissions from custom role or fallback to legacy role
            let userPermissions = [];

            if (tenantUser.customRole) {
                userPermissions = tenantUser.customRole.permissions || [];
            } else {
                // Fallback: Get permissions from system role based on legacy role field
                const systemRole = await Role.findOne({
                    where: {
                        tenant_id: null,
                        name: tenantUser.role.charAt(0).toUpperCase() + tenantUser.role.slice(1)
                    }
                });

                if (systemRole) {
                    userPermissions = systemRole.permissions || [];
                }
            }

            // Check if user has the required permission
            if (!userPermissions.includes(permissionCode)) {
                throw ApiError.forbidden(`You don't have permission to ${permissionCode}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Check if user has ANY of the specified permissions
 */
const requireAnyPermission = (permissionCodes) => {
    return async (req, res, next) => {
        try {
            // Super admins bypass all permission checks
            if (req.user?.is_super_admin) {
                return next();
            }

            const tenantUser = await TenantUser.findOne({
                where: {
                    user_id: req.user.id,
                    tenant_id: req.tenant?.id
                },
                include: [{
                    model: Role,
                    as: 'customRole'
                }]
            });

            if (!tenantUser) {
                throw ApiError.forbidden('You are not a member of this tenant');
            }

            if (tenantUser.is_owner) {
                return next();
            }

            let userPermissions = [];

            if (tenantUser.customRole) {
                userPermissions = tenantUser.customRole.permissions || [];
            } else {
                const systemRole = await Role.findOne({
                    where: {
                        tenant_id: null,
                        name: tenantUser.role.charAt(0).toUpperCase() + tenantUser.role.slice(1)
                    }
                });

                if (systemRole) {
                    userPermissions = systemRole.permissions || [];
                }
            }

            // Check if user has at least one of the required permissions
            const hasPermission = permissionCodes.some(code => userPermissions.includes(code));

            if (!hasPermission) {
                throw ApiError.forbidden(`You don't have any of the required permissions`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    requirePermission,
    requireAnyPermission
};
