const express = require('express');
const router = express.Router();
const { Partner, Tenant, TenantUser, User, Subscription, Plan, PartnerAllowedPlan, Payment, Invoice, PartnerUser } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requirePartnerAdmin, requirePartnerAccess } = require('../middleware/roles');
const { enforcePartnerScope, validateTenantOwnership } = require('../middleware/scopeEnforcer');
const { auditAction } = require('../middleware/auditLogger');
const { ApiError } = require('../middleware/errorHandler');
const { getPagination, getPaginatedResponse, getSorting, buildSearchFilter, mergeFilters } = require('../utils/helpers');
const { createTenant, validate, validators } = require('../utils/validators');
const subscriptionService = require('../services/subscriptionService');
const { Op } = require('sequelize');

// All routes require authentication and partner access
router.use(authenticate, requirePartnerAccess, enforcePartnerScope);

/**
 * @route GET /api/partner/profile
 * @desc Get partner profile
 */
router.get('/profile', async (req, res, next) => {
    try {
        const partner = await Partner.findByPk(req.partner.id, {
            include: [{
                model: PartnerAllowedPlan,
                as: 'partnerPlans',
                include: [{ model: Plan }]
            }]
        });
        res.json({ success: true, data: partner });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/partner/tenants
 * @desc List partner's tenants
 */
router.get('/tenants', async (req, res, next) => {
    try {
        const pagination = getPagination(req.query);
        const where = buildSearchFilter(req.query.search, ['name', 'email']);
        where.partner_id = req.partner.id;

        const { count, rows } = await Tenant.findAndCountAll({
            where,
            include: [{
                model: Subscription,
                as: 'subscriptions',
                required: false,
                where: { status: ['trial', 'active'] },
                include: [{ model: Plan, as: 'plan', attributes: ['name', 'code'] }],
                limit: 1
            }],
            limit: pagination.limit,
            offset: pagination.offset,
            distinct: true
        });

        res.json({ success: true, ...getPaginatedResponse(rows, count, pagination) });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/partner/tenants/:tenantId
 * @desc Get tenant details for partner
 */
router.get('/tenants/:tenantId', validateTenantOwnership, async (req, res, next) => {
    try {
        const tenant = await Tenant.findOne({
            where: { id: req.params.tenantId, partner_id: req.partner.id },
            include: [
                {
                    model: TenantUser,
                    as: 'tenantUsers',
                    include: [{ model: User, attributes: ['id', 'name', 'email', 'status'] }]
                },
                {
                    model: Subscription,
                    as: 'subscriptions',
                    include: [{ model: Plan, as: 'plan' }]
                }
            ]
        });

        if (!tenant) throw ApiError.notFound('Tenant not found');
        res.json({ success: true, data: tenant });
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /api/partner/tenants/:tenantId/subscription
 * @desc Update tenant subscription
 */
router.put('/tenants/:tenantId/subscription', requirePartnerAdmin, validateTenantOwnership, auditAction('update_subscription', 'tenant'), async (req, res, next) => {
    try {
        const { plan_id, billing_cycle } = req.body;

        const allowed = await PartnerAllowedPlan.findOne({
            where: { partner_id: req.partner.id, plan_id, is_active: true }
        });
        if (!allowed) throw ApiError.badRequest('Plan not allowed for this partner');

        let subscription = await Subscription.findOne({
            where: { tenant_id: req.params.tenantId, status: ['trial', 'active'] }
        });

        if (subscription) {
            subscription = await subscriptionService.upgradePlan(req, subscription.id, plan_id);
        } else {
            subscription = await subscriptionService.createSubscription(req.params.tenantId, plan_id, req.partner.id, billing_cycle || 'monthly');
        }

        res.json({ success: true, data: subscription });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/partner/users
 * @desc List partner team members
 */
router.get('/users', async (req, res, next) => {
    try {
        const users = await PartnerUser.findAll({
            where: { partner_id: req.partner.id },
            include: [{ model: User, attributes: ['id', 'name', 'email', 'status'] }]
        });
        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/partner/users
 * @desc Add team member to partner
 */
router.post('/users', requirePartnerAdmin, [
    validators.email(),
    validators.enum('role', ['admin', 'manager', 'user'], false),
    validate
], auditAction('add_user', 'partner'), async (req, res, next) => {
    try {
        const { email, name, role } = req.body;
        let user = await User.findOne({ where: { email } });
        if (!user) {
            user = await User.create({ email, name: name || email.split('@')[0], status: 'active', password_hash: 'temp123' });
        }
        const existing = await PartnerUser.findOne({ where: { partner_id: req.partner.id, user_id: user.id } });
        if (existing) throw ApiError.conflict('User already a member');

        const partnerUser = await PartnerUser.create({ partner_id: req.partner.id, user_id: user.id, role: role || 'user' });
        res.status(201).json({ success: true, data: { ...partnerUser.toJSON(), User: user.toSafeJSON() } });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/partner/plans
 * @desc Get plans available for this partner
 */
router.get('/plans', async (req, res, next) => {
    try {
        const plans = await PartnerAllowedPlan.findAll({
            where: { partner_id: req.partner.id, is_active: true },
            include: [{ model: Plan }]
        });
        res.json({ success: true, data: plans });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/partner/stats
 * @desc Get partner dashboard stats
 */
router.get('/stats', async (req, res, next) => {
    try {
        const count = await Tenant.count({ where: { partner_id: req.partner.id } });
        res.json({ success: true, data: { tenants: { total: count } } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
