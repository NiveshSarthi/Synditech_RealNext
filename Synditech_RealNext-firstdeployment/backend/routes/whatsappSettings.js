const express = require('express');
const router = express.Router();
const { Tenant } = require('../models');
const whatsappService = require('../services/whatsappService');
const { authenticate } = require('../middleware/auth');
const { requireTenantAdmin } = require('../middleware/roles');
const { auditAction } = require('../middleware/auditLogger');
const { ApiError } = require('../middleware/errorHandler');
const crypto = require('crypto');

// Middleware
router.use(authenticate, requireTenantAdmin);

/**
 * @route GET /api/tenant/whatsapp
 * @desc Get WhatsApp settings (masked token)
 * @access Tenant Admin
 */
router.get('/', async (req, res, next) => {
    try {
        const tenant = await Tenant.findByPk(req.tenant.id);

        if (!tenant.whatsapp_configured) {
            return res.json({
                success: true,
                data: {
                    configured: false
                }
            });
        }

        // Mask the token
        const maskedToken = tenant.whatsapp_token 
            ? `${tenant.whatsapp_token.substring(0, 5)}...${tenant.whatsapp_token.substring(tenant.whatsapp_token.length - 5)}`
            : null;

        res.json({
            success: true,
            data: {
                configured: true,
                phone_number_id: tenant.whatsapp_phone_number_id,
                whatsapp_token_masked: maskedToken,
                waba_id: tenant.whatsapp_waba_id,
                display_name: tenant.whatsapp_display_name,
                webhook_url: `${process.env.API_URL || 'https://your-domain.com'}/api/webhook/${tenant.id}`,
                webhook_verify_token: tenant.whatsapp_webhook_token
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/tenant/whatsapp
 * @desc Save WhatsApp settings
 * @access Tenant Admin
 */
router.post('/',
    auditAction('update_whatsapp_settings', 'tenant'),
    async (req, res, next) => {
        try {
            const { phone_number_id, whatsapp_token, waba_id, display_name } = req.body;
            
            if (!phone_number_id || !waba_id) {
                throw ApiError.badRequest('Phone Number ID and WABA ID are required');
            }

            const tenant = await Tenant.findByPk(req.tenant.id);
            
            // If token is provided, verify it
            let tokenToSave = tenant.whatsapp_token;
            let isValid = false;

            if (whatsapp_token) {
                // Verify credentials with external API
                const verification = await whatsappService.verifyCredentials({
                    phone_number_id,
                    whatsapp_token,
                    waba_id
                });
                
                if (!verification.valid) {
                    throw ApiError.badRequest(`Invalid credentials: ${verification.message}`);
                }
                
                tokenToSave = whatsapp_token;
                isValid = true;
            } else if (tenant.whatsapp_configured) {
                // Changing other fields but keeping token
                isValid = true;
            } else {
                throw ApiError.badRequest('WhatsApp token is required for initial configuration');
            }

            // Generate webhook token if not exists
            const webhookToken = tenant.whatsapp_webhook_token || crypto.randomBytes(32).toString('hex');

            await tenant.update({
                whatsapp_phone_number_id: phone_number_id,
                whatsapp_token: tokenToSave,
                whatsapp_waba_id: waba_id,
                whatsapp_display_name: display_name,
                whatsapp_webhook_token: webhookToken,
                whatsapp_configured: true
            });

            res.json({
                success: true,
                message: 'WhatsApp settings saved successfully',
                data: {
                    configured: true,
                    phone_number_id,
                    waba_id,
                    display_name
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route POST /api/tenant/whatsapp/test
 * @desc Test WhatsApp connection
 * @access Tenant Admin
 */
router.post('/test', async (req, res, next) => {
    try {
        const tenant = await Tenant.findByPk(req.tenant.id);
        
        if (!tenant.whatsapp_configured) {
            throw ApiError.badRequest('WhatsApp is not configured');
        }

        const verification = await whatsappService.verifyCredentials({
            phone_number_id: tenant.whatsapp_phone_number_id,
            whatsapp_token: tenant.whatsapp_token,
            waba_id: tenant.whatsapp_waba_id
        });

        if (!verification.valid) {
            throw ApiError.badRequest(`Connection failed: ${verification.message}`);
        }

        res.json({
            success: true,
            message: 'Connection successful'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
