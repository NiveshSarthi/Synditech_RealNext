const axios = require('axios');

async function test() {
    try {
        console.log('1. Logging in as Syndicate...');
        const login = await axios.post('http://localhost:5050/api/auth/login', {
            email: 'Syndicate@niveshsarthi.com',
            password: 'Syndicate@123'
        });
        const token = login.data.token;
        console.log('✅ Login successful. Token obtained.');
        console.log(`Token Information: ${token.substring(0, 20)}...`);

        const headers = { Authorization: `Bearer ${token}` };

        console.log('\n2. Fetching WhatsApp Settings...');
        const settings = await axios.get('http://localhost:5050/api/tenant/whatsapp', { headers });
        console.log('Current Settings:', settings.data);

        if (!settings.data.data.configured) {
            console.log('\n⚠️ WhatsApp not configured. Cannot fetch templates/campaigns from external API yet.');
            console.log('To view templates, we need to configure valid WhatsApp credentials.');
            // Attempt to configure with dummy data to see logic flow? 
            // Or just list what we have (empty)
        } else {
            console.log('✅ WhatsApp Configured. Fetching external data...');
        }

        console.log('\n3. Fetching Templates (Local + Sync)...');
        try {
            const templates = await axios.get('http://localhost:5050/api/templates', { headers });
            console.log(`✅ Templates: ${templates.data.data.length} found`);
        } catch (e) {
            console.log('❌ Failed to fetch templates:', e.message);
        }

        console.log('\n4. Fetching Campaigns...');
        try {
             const campaigns = await axios.get('http://localhost:5050/api/campaigns', { headers });
             console.log(`✅ Campaigns: ${campaigns.data.data.length} found`);
        } catch (e) {
            console.log('❌ Failed to fetch campaigns:', e.message);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

test();
