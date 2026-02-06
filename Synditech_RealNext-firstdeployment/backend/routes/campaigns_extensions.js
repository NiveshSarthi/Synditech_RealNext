/**
 * @route POST /api/campaigns/:id/execute
 * @desc Manually execute a campaign
 * @access Tenant User
 */
router.post('/:id/execute',
    requireFeature('campaigns'),
    auditAction('execute', 'campaign'),
    async (req, res, next) => {
        try {
            const tenant = await Tenant.findByPk(req.tenant.id);
            if (!tenant.whatsapp_configured) {
                throw ApiError.badRequest('WhatsApp not configured');
            }

            const campaign = await Campaign.findOne({
                where: { id: req.params.id, tenant_id: req.tenant.id }
            });

            if (!campaign) {
                throw ApiError.notFound('Campaign not found');
            }

            if (campaign.status === 'running' || campaign.status === 'completed') {
                throw ApiError.badRequest('Campaign already executed');
            }

            // Execute via WhatsApp Service
            try {
                // Prepare filters or contact IDs
                const { contact_ids, filters } = campaign.target_audience || {};
                
                const executionResult = await whatsappService.executeCampaign(tenant, {
                    template_name: campaign.template_name,
                    contact_ids,
                    filters,
                    variable_mapping: campaign.template_data
                });

                await campaign.update({
                    status: 'running',
                    started_at: new Date(),
                    metadata: {
                        ...campaign.metadata,
                        external_campaign_id: executionResult.campaign_id
                    }
                });

                res.json({
                    success: true,
                    message: 'Campaign execution started',
                    data: executionResult
                });
            } catch (e) {
                await campaign.update({
                    status: 'failed',
                    metadata: {
                        ...campaign.metadata,
                        last_error: e.message
                    }
                });
                throw e;
            }
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route GET /api/campaigns/:id/logs
 * @desc Get campaign execution logs
 * @access Tenant User
 */
router.get('/:id/logs', requireFeature('campaigns'), async (req, res, next) => {
    try {
        const tenant = await Tenant.findByPk(req.tenant.id);
        const campaign = await Campaign.findOne({
            where: { id: req.params.id, tenant_id: req.tenant.id }
        });

        if (!campaign) {
            throw ApiError.notFound('Campaign not found');
        }

        if (!tenant.whatsapp_configured) {
            return res.json({
                success: true,
                data: []
            });
        }

        const logs = await whatsappService.getCampaignLogs(
            tenant, 
            campaign.metadata?.external_campaign_id || campaign.id, 
            req.query
        );

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        next(error);
    }
});
