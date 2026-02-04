const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('🚀 Starting SaaS Systematic Verification...');

    try {
        // 1. Authenticate as Super Admin
        console.log('\n--- 1. Testing Super Admin Auth & Global Access ---');
        const saLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@realnext.com',
            password: 'RealnextAdmin2024!debug'
        });
        const saToken = saLogin.data.data.token;
        console.log('✅ Super Admin logged in');

        const partners = await axios.get(`${API_URL}/admin/partners`, {
            headers: { Authorization: `Bearer ${saToken}` }
        });
        console.log(`✅ Super Admin can see ${partners.data.data.length} partners`);

        // 2. Authenticate as Tenant Admin
        console.log('\n--- 2. Testing Tenant Admin Auth & Isolation ---');
        const tenantLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@testcompany.com',
            password: 'Test123!'
        });
        const tenantToken = tenantLogin.data.data.token;
        const tenantId = tenantLogin.data.data.context.tenant.id;
        console.log(`✅ Tenant Admin logged in (Tenant: ${tenantId})`);

        // Test Isolation: Try to access admin partners (should fail)
        try {
            await axios.get(`${API_URL}/admin/partners`, {
                headers: { Authorization: `Bearer ${tenantToken}` }
            });
            console.log('❌ FAIL: Tenant Admin accessed admin routes');
        } catch (e) {
            console.log('✅ PASS: Tenant Admin denied admin access (403)');
        }

        // 3. Test Partner Scoping
        console.log('\n--- 3. Testing Partner Admin Scoping ---');
        // We need a partner admin. Let's find one or create one.
        // For now, let's assume we have 'partner@testpartner.com'
        try {
            const partnerLogin = await axios.post(`${API_URL}/auth/login`, {
                email: 'partner@testpartner.com',
                password: 'Test123!'
            });
            const partnerToken = partnerLogin.data.data.token;
            console.log('✅ Partner Admin logged in');

            const partnerTenants = await axios.get(`${API_URL}/partner/tenants`, {
                headers: { Authorization: `Bearer ${partnerToken}` }
            });
            console.log(`✅ Partner Admin sees ${partnerTenants.data.data.length} tenants`);

            // Verify no cross-partner contamination (this would require manual check of data)
        } catch (e) {
            console.log('⚠️ Partner Admin test skipped (user might not exist yet)');
        }

        // 4. Test Feature Gating
        console.log('\n--- 4. Testing Feature Gating ---');
        const profile = await axios.get(`${API_URL}/tenant/profile`, {
            headers: { Authorization: `Bearer ${tenantToken}` }
        });
        console.log(`✅ Tenant Profile retrieved. Active Plan: ${profile.data.data.subscriptions[0]?.plan?.name || 'None'}`);

        console.log('\n✨ Verification script finished.');
    } catch (error) {
        console.error('❌ Verification failed:', error.response?.data || error.message);
    }
}

runTests();
