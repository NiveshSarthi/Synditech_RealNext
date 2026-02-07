const axios = require('axios');
const logger = require('../config/logger');

/**
 * WhatsApp Service
 * Handles all WhatsApp API communication via the external WhatsApp Flow Builder API
 */
class WhatsAppService {
    constructor() {
        this.baseURL = process.env.WHATSAPP_API_URL || '';
    }

    /**
     * Get tenant's WhatsApp credentials from database
     */
    async getTenantCredentials(tenant) {
        if (!tenant.whatsapp_configured) {
            throw new Error('WhatsApp not configured for this tenant');
        }

        return {
            phone_number_id: tenant.whatsapp_phone_number_id,
            whatsapp_token: tenant.whatsapp_token,
            waba_id: tenant.whatsapp_waba_id,
            display_name: tenant.whatsapp_display_name
        };
    }

    /**
     * Verify WhatsApp credentials by testing API connection
     */
    async verifyCredentials(credentials) {
        try {
            const response = await axios.get(`${this.baseURL}/api/v1/templates`, {
                headers: {
                    'Authorization': `Bearer ${credentials.whatsapp_token}`
                },
                timeout: 10000
            });

            return {
                valid: response.status === 200,
                message: 'Credentials verified successfully'
            };
        } catch (error) {
            logger.error('WhatsApp credential verification failed:', error.message);
            return {
                valid: false,
                message: error.response?.data?.detail || 'Failed to verify credentials'
            };
        }
    }

    /**
     * Fetch templates from WhatsApp Flow Builder API
     */
    async fetchTemplates(tenant) {
        const credentials = await this.getTenantCredentials(tenant);

        try {
            const response = await axios.get(`${this.baseURL}/api/v1/templates`, {
                headers: {
                    'Authorization': `Bearer ${credentials.whatsapp_token}`
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to fetch templates:', error.message);
            throw new Error('Failed to fetch templates from WhatsApp API');
        }
    }

    /**
     * Create template in WhatsApp Flow Builder API
     */
    async createTemplate(tenant, templateData) {
        const credentials = await this.getTenantCredentials(tenant);

        try {
            const response = await axios.post(
                `${this.baseURL}/api/v1/templates`,
                templateData,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.whatsapp_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to create template:', error.message);
            throw new Error(error.response?.data?.detail || 'Failed to create template');
        }
    }

    /**
     * Delete template from WhatsApp Flow Builder API
     */
    async deleteTemplate(tenant, templateName) {
        const credentials = await this.getTenantCredentials(tenant);

        try {
            const response = await axios.delete(
                `${this.baseURL}/api/v1/templates/${templateName}`,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.whatsapp_token}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to delete template:', error.message);
            throw new Error(error.response?.data?.detail || 'Failed to delete template');
        }
    }

    /**
     * Fetch contacts from WhatsApp Flow Builder API
     */
    async fetchContacts(tenant, query = {}) {
        const credentials = await this.getTenantCredentials(tenant);

        try {
            const params = new URLSearchParams(query).toString();
            const response = await axios.get(
                `${this.baseURL}/api/v1/contacts${params ? '?' + params : ''}`,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.whatsapp_token}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to fetch contacts:', error.message);
            throw new Error('Failed to fetch contacts from WhatsApp API');
        }
    }

    /**
     * Create contact in WhatsApp Flow Builder API
     */
    async createContact(tenant, contactData) {
        const credentials = await this.getTenantCredentials(tenant);

        try {
            const response = await axios.post(
                `${this.baseURL}/api/v1/contacts`,
                contactData,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.whatsapp_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to create contact:', error.message);
            throw new Error(error.response?.data?.detail || 'Failed to create contact');
        }
    }

    /**
     * Execute campaign by sending messages via WhatsApp Flow Builder API
     */
    async executeCampaign(tenant, campaignData) {
        const credentials = await this.getTenantCredentials(tenant);

        try {
            const response = await axios.post(
                `${this.baseURL}/api/v1/campaigns`,
                campaignData,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.whatsapp_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to execute campaign:', error.message);
            throw new Error(error.response?.data?.detail || 'Failed to execute campaign');
        }
    }

    /**
     * Get campaign logs from WhatsApp Flow Builder API
     */
    async getCampaignLogs(tenant, campaignId, filters= {}) {
        const credentials = await this.getTenantCredentials(tenant);

        try {
            const params = new URLSearchParams(filters).toString();
            const response = await axios.get(
                `${this.baseURL}/api/v1/campaigns/${campaignId}/logs${params ? '?' + params : ''}`,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.whatsapp_token}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to fetch campaign logs:', error.message);
            throw new Error('Failed to fetch campaign logs');
        }
    }

    /**
     * Upload contacts CSV to WhatsApp Flow Builder API
     */
    async uploadContactsCSV(tenant, fileBuffer, filename) {
        const credentials = await this.getTenantCredentials(tenant);

        try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', fileBuffer, filename);

            const response = await axios.post(
                `${this.baseURL}/api/v1/contacts/upload`,
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        'Authorization': `Bearer ${credentials.whatsapp_token}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to upload contacts:', error.message);
            throw new Error(error.response?.data?.detail || 'Failed to upload contacts');
        }
    }
}

module.exports = new WhatsAppService();
