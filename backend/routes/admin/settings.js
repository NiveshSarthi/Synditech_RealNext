const express = require('express');
const router = express.Router();
const { EnvironmentFlag, AuditLog, User } = require('../../models');
const { authenticate } = require('../../middleware/auth');
const { requireSuperAdmin } = require('../../middleware/roles');
const { auditAction } = require('../../middleware/auditLogger');
const { ApiError } = require('../../middleware/errorHandler');

router.use(authenticate, requireSuperAdmin);

/**
 * @route GET /api/admin/settings/flags
 * @desc Get all environment flags
 */
router.get('/flags', async (req, res, next) => {
    try {
        const flags = await EnvironmentFlag.findAll({
            include: [{ model: User, as: 'updatedBy', attributes: ['name'] }]
        });
        res.json({ success: true, data: flags });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/admin/settings/flags
 * @desc Create or update environment flag
 */
router.post('/flags', auditAction('update_flag', 'settings'), async (req, res, next) => {
    try {
        const { key, value, description, is_enabled } = req.body;
        const [flag, created] = await EnvironmentFlag.findOrCreate({
            where: { key },
            defaults: { value, description, is_enabled, updated_by: req.user.id }
        });

        if (!created) {
            await flag.update({ value, description, is_enabled, updated_by: req.user.id });
        }

        res.json({ success: true, data: flag });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
