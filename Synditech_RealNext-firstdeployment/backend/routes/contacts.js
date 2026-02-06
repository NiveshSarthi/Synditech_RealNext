const express = require('express');
const router = express.Router();
const { Lead, Tenant } = require('../models');
const whatsappService = require('../services/whatsappService');
const { authenticate } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/roles');
const { enforceTenantScope } = require('../middleware/scopeEnforcer');
const { requireFeature } = require('../middleware/featureGate');
const { auditAction } = require('../middleware/auditLogger');
const { ApiError } = require('../middleware/errorHandler');
const { getPagination, getPaginatedResponse, buildSearchFilter, mergeFilters } = require('../utils/helpers');
const { validate, validators } = require('../utils/validators');

// Middleware
router.use(authenticate, requireTenantAccess, enforceTenantScope);

/**
 * @route GET /api/contacts
 * @desc List contacts (leads) for WhatsApp
 * @access Tenant User
 */
router.get('/', requireFeature('leads'), async (req, res, next) => {
    try {
        const pagination = getPagination(req.query);
        // Map typical contact filters to lead filters
        const searchFilter = buildSearchFilter(req.query.search, ['name', 'phone', 'email']);
        const tagFilter = req.query.tag ? { tags: { [require('sequelize').Op.contains]: [req.query.tag] } } : null;

        const where = mergeFilters(
            { tenant_id: req.tenant.id },
            searchFilter,
            tagFilter
        );

        const { count, rows } = await Lead.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: pagination.limit,
            offset: pagination.offset,
            attributes: ['id', 'name', 'phone', 'email', 'tags', 'created_at'] 
        });

        // Transform to match expected contact format if different, 
        // but Lead model seems to have name/phone/tags which aligns well.
        const contacts = rows.map(lead => ({
            _id: lead.id,
            name: lead.name,
            number: lead.phone,
            email: lead.email,
            tags: lead.tags || []
        }));

        res.json({
            success: true,
            contacts,
            total: count,
            page: pagination.page,
            pages: Math.ceil(count / pagination.limit)
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/contacts
 * @desc Create new contact (lead)
 * @access Tenant User
 */
router.post('/',
    requireFeature('leads'),
    [
        validators.requiredString('name'),
        validators.phone('number'), // mapped from phone in request
        validate
    ],
    auditAction('create', 'contact'),
    async (req, res, next) => {
        try {
            const { name, number, email, tags } = req.body;
            
            // Check if exists
            let lead = await Lead.findOne({
                where: { 
                    tenant_id: req.tenant.id,
                    phone: number
                }
            });

            if (lead) {
                // Update tags if exists
                const newTags = [...new Set([...(lead.tags || []), ...(tags || [])])];
                await lead.update({ tags: newTags });
            } else {
                // Create new lead
                lead = await Lead.create({
                    tenant_id: req.tenant.id,
                    name,
                    phone: number,
                    email: email || null,
                    tags: tags || [],
                    source: 'whatsapp_contact',
                    status: 'new',
                    assigned_to: req.user.id
                });
            }

            // Sync to External API if needed? 
            // The API doc says Create Contact POST /api/v1/contacts
            // If we want to keep them in sync, we should call the service.
            const tenant = await Tenant.findByPk(req.tenant.id);
            if (tenant.whatsapp_configured) {
                try {
                    await whatsappService.createContact(tenant, {
                        name,
                        number,
                        tags: tags || []
                    });
                } catch (e) {
                    console.error('Failed to sync contact to WhatsApp API:', e.message);
                    // Don't fail the request, basic lead is created
                }
            }

            res.status(201).json({
                success: true,
                data: {
                    _id: lead.id,
                    name: lead.name,
                    number: lead.phone,
                    tags: lead.tags
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route POST /api/contacts/upload
 * @desc Upload contacts CSV
 * @access Tenant User
 */
router.post('/upload',
    requireFeature('leads'),
    auditAction('import', 'contact'),
    async (req, res, next) => {
        try {
            if (!req.files || !req.files.file) {
                throw ApiError.badRequest('No file uploaded');
            }

            const file = req.files.file;
            const tenant = await Tenant.findByPk(req.tenant.id);

            // 1. Upload to WhatsApp API if configured
            if (tenant.whatsapp_configured) {
                try {
                    await whatsappService.uploadContactsCSV(tenant, file.data, file.name);
                } catch (e) {
                    console.error('Failed to upload contacts to WhatsApp API:', e.message);
                    // Continue to process locally? 
                    // Usually CSV upload on external API handles bulk creation.
                    // If we want local leads, we should verify implementation.
                    // For now, let's assume external API handles it and we might want to parse it locally too.
                }
            }

            // 2. Process locally (Simplified CSV parsing)
            const csv = file.data.toString('utf8');
            const lines = csv.split('\n');
            const headers = lines[0].split(','); // assume name,number,tags
            
            let uploadedCount = 0;
            
            // Skip header, process lines
            // This is a naive implementation, a robust one would use a CSV parser library
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',');
                // Mapping depends on CSV structure in doc: name,number,tags
                if (parts.length >= 2) {
                    const name = parts[0];
                    const phone = parts[1];
                    const tags = parts[2] ? parts[2].split(';') : [];
                    
                    await Lead.findOrCreate({
                        where: { tenant_id: tenant.id, phone },
                        defaults: {
                            name,
                            phone,
                            tags,
                            source: 'import',
                            status: 'new',
                            assigned_to: req.user.id
                        }
                    });
                    uploadedCount++;
                }
            }

            res.json({
                success: true,
                message: `Processed ${uploadedCount} contacts`
            });

        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
