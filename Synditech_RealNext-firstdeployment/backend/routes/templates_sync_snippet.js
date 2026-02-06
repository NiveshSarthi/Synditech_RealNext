/**
 * @route POST /api/templates/sync
 * @desc Sync templates from WhatsApp API
 * @access Tenant User
 */
router.post('/sync', requireFeature('templates'), async (req, res, next) => {
    try {
        const tenant = await Tenant.findByPk(req.tenant.id);
        
        if (!tenant.whatsapp_configured) {
            throw ApiError.badRequest('WhatsApp not configured');
        }

        const externalTemplates = await whatsappService.fetchTemplates(tenant);
        
        // Sync logic: Upsert templates
        const syncedTemplates = [];
        for (const extTmpl of externalTemplates) {
            const [localTmpl] = await Template.upsert({
                tenant_id: tenant.id,
                name: extTmpl.name,
                category: extTmpl.category,
                language: extTmpl.language,
                status: extTmpl.status.toLowerCase(),
                components: extTmpl.components || {},
                metadata: {
                    waba_id: tenant.whatsapp_waba_id,
                    last_synced_at: new Date()
                }
            }, {
                returning: true
            });
            syncedTemplates.push(localTmpl);
        }

        res.json({
            success: true,
            message: `Synced ${syncedTemplates.length} templates`,
            data: syncedTemplates
        });
    } catch (error) {
        next(error);
    }
});
