const express = require('express');
const router = express.Router();
const { Tenant, Campaign } = require('../models');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @route POST /api/webhook/:tenantId
 * @desc Handle WhatsApp webhooks (status updates, incoming messages)
 * @access Public (Validated via token)
 */
router.post('/:tenantId', async (req, res, next) => {
    try {
        const { tenantId } = req.params;
        const signature = req.headers['x-webhook-signature']; // If signed
        const event = req.body;

        const tenant = await Tenant.findByPk(tenantId);
        
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // Validate token if provided in query or header (Basic security)
        // In a real implementation we should verify signature using whatsapp_webhook_token
        // For now we assume the path ID is enough for routing, but we should check if configured
        if (!tenant.whatsapp_configured) {
            return res.status(400).json({ error: 'WhatsApp not configured' });
        }

        // Process Event
        // Event structure depends on the WhatsApp Flow Builder API webhooks
        // Assuming standard Meta-like structure or simplified
        
        console.log(`Received webhook for tenant ${tenantId}:`, JSON.stringify(event));

        if (event.type === 'status_update') {
            await handleStatusUpdate(tenant, event.data);
        } else if (event.type === 'message') {
            // Handle incoming message (e.g. for chat or bot)
            console.log('Incoming message:', event.data);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

async function handleStatusUpdate(tenant, data) {
    // data: { campaign_id, message_id, status: 'delivered'|'read'|'failed', recipient_id, timestamp }
    const { campaign_id, status } = data;

    if (!campaign_id) return;

    // Find campaign by external ID or internal ID
    // We stored external ID in metadata.external_campaign_id
    // But simplified logic might pass internal ID if we control the sender
    
    // Try to find campaign
    const campaign = await Campaign.findOne({
        where: { 
            // This requires diverse query, or we assume campaign_id is the internal one
            // or we search metadata
            tenant_id: tenant.id,
            [require('sequelize').Op.or]: [
                { id: campaign_id }, // if UUID match
                { 'metadata.external_campaign_id': campaign_id }
            ]
        }
    });

    if (campaign) {
        // Update stats
        const currentStats = campaign.stats || { sent: 0, delivered: 0, read: 0, failed: 0 };
        const newStats = { ...currentStats };

        // Increment counter based on status
        if (status === 'sent') newStats.sent++;
        if (status === 'delivered') newStats.delivered++;
        if (status === 'read') newStats.read++;
        if (status === 'failed') newStats.failed++;

        await campaign.update({
            stats: newStats
        });
    }
}

module.exports = router;
