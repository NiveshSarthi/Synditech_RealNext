require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const { sequelize, testConnection } = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://test.niveshsarthi.com',
  'https://realnext.syndicate.niveshsarthi.com'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Partner-ID']
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint
let dbStatus = 'unknown';
let dbError = null;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      status: dbStatus,
      error: dbError ? dbError.message : null
    }
  });
});

const path = require('path');

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, 'public')));

// API Routes - using the centralized routes index
app.use('/api', require('./routes'));

// 404 handler
app.use((req, res, next) => {
  // If the request accepts html, it's likely a navigation request
  // so we serve index.html for the SPA
  // BUT NOT for /api routes
  if (req.accepts('html') && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
    return;
  }

  // Otherwise, if it's an API request or asset that wasn't found
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  // Start listening continuously
  try {
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }

  // Connect to DB asynchronously
  try {
    dbStatus = 'connecting';
    await testConnection();
    dbStatus = 'connected';

    // NOTE: Database sync is disabled to avoid conflicts.
    if (process.env.SYNC_DB === 'true') {
      await sequelize.sync({ force: false, alter: false });
      logger.info('Database synchronized');

      // Seed Super Admin if defined
      if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
        const { User, Tenant, TenantUser, Partner, PartnerUser } = require('./models');
        const adminEmail = process.env.SUPER_ADMIN_EMAIL;
        const adminPass = process.env.SUPER_ADMIN_PASSWORD;

        // 1. Super Admin
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });
        if (!existingAdmin) {
          logger.info('Seeding Super Admin...');
          const user = await User.create({
            email: adminEmail,
            password_hash: adminPass,
            name: 'Super Admin',
            status: 'active',
            is_super_admin: true,
            email_verified: true
          });

          const tenant = await Tenant.create({
            name: 'RealNext Admin',
            email: adminEmail,
            status: 'active',
            environment: 'production'
          });

          await TenantUser.create({
            tenant_id: tenant.id,
            user_id: user.id,
            role: 'admin',
            is_owner: true
          });
          logger.info('Super Admin seeded successfully');
        }

        // 2. Partner Admin
        const partnerEmail = 'partner-admin@acme.com';
        const partnerPass = 'Test123!';
        const existingPartner = await User.findOne({ where: { email: partnerEmail } });
        if (!existingPartner) {
          logger.info('Seeding Partner Admin...');
          const pUser = await User.create({
            email: partnerEmail,
            password_hash: partnerPass,
            name: 'Partner Admin',
            status: 'active',
            email_verified: true
          });

          const partner = await Partner.create({
            name: 'Acme Resellers',
            email: partnerEmail,
            status: 'active',
            commission_rate: 15.00
          });

          await PartnerUser.create({
            partner_id: partner.id,
            user_id: pUser.id,
            role: 'admin',
            is_owner: true
          });
          logger.info('Partner Admin seeded');
        }

        // 3. Tenant Admin
        const tenantRxEmail = 'tenant-admin@testcompany.com';
        const tenantRxPass = 'Test123!';
        const existingTenantRx = await User.findOne({ where: { email: tenantRxEmail } });
        if (!existingTenantRx) {
          logger.info('Seeding Tenant Admin...');
          const tUser = await User.create({
            email: tenantRxEmail,
            password_hash: tenantRxPass, // Hook hashes this
            name: 'Tenant Admin',
            status: 'active',
            email_verified: true
          });

          // Calculate trial end (14 days)
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 14);

          const tenantCompany = await Tenant.create({
            name: 'Test Company Ltd',
            email: tenantRxEmail,
            status: 'active',
            plan_type: 'trial',
            trial_ends_at: trialEnd
          });

          await TenantUser.create({
            tenant_id: tenantCompany.id,
            user_id: tUser.id,
            role: 'admin',
            is_owner: true
          });
          logger.info('Tenant Admin seeded');

          // 4. Tenant User (Regular) - belongs to same tenant
          const regUserEmail = 'tenant-user@testcompany.com';
          const existingRegUser = await User.findOne({ where: { email: regUserEmail } });
          if (!existingRegUser) {
            logger.info('Seeding Regular Tenant User...');
            const rUser = await User.create({
              email: regUserEmail,
              password_hash: 'Test123!',
              name: 'Regular User',
              status: 'active',
              email_verified: true
            });

            await TenantUser.create({
              tenant_id: tenantCompany.id,
              user_id: rUser.id,
              role: 'user', // Not admin
              is_owner: false
            });
            logger.info('Regular Tenant User seeded');
          }
        }
      }
    } else {
      logger.info('Database sync skipped. Use migrations or set SYNC_DB=true');
    }

  } catch (error) {
    logger.error('Failed to connect to database:', error);
    dbStatus = 'failed';
    dbError = error;
  }
};

startServer();

module.exports = app;
