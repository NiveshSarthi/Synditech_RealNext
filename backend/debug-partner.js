require('dotenv').config();
const { sequelize, Partner, PartnerUser, User } = require('./models');

(async () => {
  try {
    console.log('Checking PartnerUser records...\n');
    
    // Find the partner admin user
    const user = await User.findOne({ where: { email: 'partner-admin@acme.com' } });
    console.log('User found:', user ? `${user.email} (ID: ${user.id})` : 'NOT FOUND');
    
    if (!user) {
      console.log('ERROR: User not found!');
      process.exit(1);
    }
    
    // Find all PartnerUser records for this user
    const partnerUsers = await PartnerUser.findAll({
      where: { user_id: user.id },
      include: [{ model: Partner, as: 'Partner', required: false }],
      raw: false
    });
    
    console.log(`\nPartnerUser records found: ${partnerUsers.length}`);
    partnerUsers.forEach((pu, i) => {
      console.log(`\n[${i + 1}] PartnerUser:`, {
        id: pu.id,
        partner_id: pu.partner_id,
        user_id: pu.user_id,
        role: pu.role,
        is_owner: pu.is_owner,
        Partner: pu.Partner ? {
          id: pu.Partner.id,
          name: pu.Partner.name,
          status: pu.Partner.status
        } : 'NULL'
      });
    });
    
    // Also check all Partners
    const partners = await Partner.findAll();
    console.log(`\n\nAll Partners in database: ${partners.length}`);
    partners.forEach((p, i) => {
      console.log(`[${i + 1}]`, {
        id: p.id,
        name: p.name,
        email: p.email,
        status: p.status
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
