import Fastify from 'fastify';
import dnsManagementRoutes from '../routes/dns-management.js';
import enhancedOnboardingRoutes from '../routes/enhanced-onboarding.js';
import paymentProfileCompletionRoutes from '../routes/payment-profile-completion.js';
import DNSManagementService from '../services/dns-management-service.js';
import DomainVerificationService from '../services/domain-verification-service.js';

/**
 * Example: DNS Management Integration
 *
 * This example shows how to integrate DNS management with your existing Fastify application.
 * The routing is handled at the load balancer level, and this service only manages DNS records.
 */

// Environment variables needed
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_HOSTED_ZONE_ID',
  'BASE_DOMAIN',
  'SERVER_TARGET' // Your server's domain/IP that tenants should point to
];

async function createServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
            tenant: request.tenant?.organizationName
          };
        }
      }
    }
  });

  try {
    // Validate environment variables
    validateEnvironment();

    // Register DNS management routes
    console.log('🚀 Registering DNS management routes...');
    await fastify.register(dnsManagementRoutes, { prefix: '/api' });

    // Register enhanced onboarding routes (if using)
    await fastify.register(enhancedOnboardingRoutes, { prefix: '/api' });

    // Register payment completion routes (if using)
    await fastify.register(paymentProfileCompletionRoutes, { prefix: '/api' });

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
      const dnsHealth = await DNSManagementService.healthCheck();
      const domainVerification = await DomainVerificationService.healthCheck();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          dns: dnsHealth,
          domainVerification: domainVerification
        }
      };
    });

    // Start server
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📋 DNS management enabled for: ${process.env.BASE_DOMAIN}`);
    console.log(`🎯 Server target for tenants: ${process.env.SERVER_TARGET}`);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      await fastify.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      await fastify.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

/**
 * Example usage of DNS management APIs
 */
const exampleUsage = {
  // 1. Create subdomain for tenant
  createSubdomain: async (tenantId) => {
    const response = await fetch('/api/dns/subdomains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    });

    const result = await response.json();
    console.log('Subdomain created:', result.data);
    return result;
  },

  // 2. Setup custom domain
  setupCustomDomain: async (tenantId, customDomain) => {
    // Step 1: Initiate custom domain setup
    const setupResponse = await fetch('/api/dns/custom-domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, customDomain })
    });

    const setupResult = await setupResponse.json();
    console.log('Custom domain setup initiated:', setupResult.data);

    // Step 2: User adds TXT record to their DNS
    console.log('User needs to add TXT record:');
    console.log(`Domain: ${setupResult.data.verificationDomain}`);
    console.log(`Value: "${setupResult.data.verificationToken}"`);

    // Step 3: Verify domain ownership
    const verifyResponse = await fetch('/api/dns/verify-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, customDomain })
    });

    const verifyResult = await verifyResponse.json();
    console.log('Domain verification result:', verifyResult);

    return verifyResult;
  },

  // 3. Check tenant domains
  getTenantDomains: async (tenantId) => {
    const response = await fetch(`/api/dns/tenants/${tenantId}/domains`);
    const result = await response.json();
    console.log('Tenant domains:', result.data);
    return result;
  },

  // 4. Check subdomain availability
  checkSubdomain: async (subdomain) => {
    const response = await fetch('/api/dns/check-subdomain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain })
    });

    const result = await response.json();
    console.log('Subdomain availability:', result);
    return result;
  },

  // 5. Validate domain format
  validateDomain: async (domain) => {
    const response = await fetch('/api/dns/validate-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain })
    });

    const result = await response.json();
    console.log('Domain validation:', result);
    return result;
  },

  // 6. Get DNS change status
  getDNSChangeStatus: async (changeId) => {
    const response = await fetch(`/api/dns/changes/${changeId}`);
    const result = await response.json();
    console.log('DNS change status:', result.data);
    return result;
  }
};

/**
 * AWS Route 53 Setup Instructions
 */
const awsSetupInstructions = `
# AWS Route 53 Setup for DNS Management

## 1. Create IAM Policy for Route 53 Access
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones",
        "route53:GetHostedZone",
        "route53:ListResourceRecordSets",
        "route53:ChangeResourceRecordSets",
        "route53:GetChange"
      ],
      "Resource": "*"
    }
  ]
}

## 2. Create Hosted Zone (if not exists)
aws route53 create-hosted-zone \\
  --name myapp.com \\
  --caller-reference "dns-management-$(date +%s)"

## 3. Get Hosted Zone ID
aws route53 list-hosted-zones \\
  --query 'HostedZones[?Name==\`myapp.com.\`].Id' \\
  --output text

## 4. Create Wildcard CNAME Record (Optional)
# This allows any subdomain to work initially
aws route53 change-resource-record-sets \\
  --hosted-zone-id Z123456789 \\
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "*.myapp.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "your-load-balancer.com"}]
      }
    }]
  }'
`;

/**
 * Load Balancer Configuration Examples
 */
const loadBalancerExamples = {
  awsALB: {
    description: 'AWS Application Load Balancer Configuration',
    configuration: `
# Listener Rules for subdomain routing
# Priority 1: CRM application
{
  "Conditions": [
    {
      "Field": "host-header",
      "Values": ["*.myapp.com"],
      "HostHeaderConfig": {
        "Values": ["crm.*.myapp.com", "crm.myapp.com"]
      }
    }
  ],
  "Actions": [
    {
      "Type": "forward",
      "TargetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/crm-service/123456"
    }
  ]
}

# Priority 2: HR application
{
  "Conditions": [
    {
      "Field": "host-header",
      "Values": ["*.myapp.com"],
      "HostHeaderConfig": {
        "Values": ["hr.*.myapp.com", "hr.myapp.com"]
      }
    }
  ],
  "Actions": [
    {
      "Type": "forward",
      "TargetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/hr-service/123456"
    }
  ]
}
    `
  },

  nginx: {
    description: 'Nginx Configuration for subdomain routing',
    configuration: `
# Upstream services
upstream crm-service {
  server crm-service:3001;
}

upstream hr-service {
  server hr-service:3002;
}

# HTTP Server
server {
  listen 80;
  server_name *.myapp.com;

  # Extract subdomain
  set $subdomain "";
  if ($host ~* "^(.+)\.myapp\.com$") {
    set $subdomain $1;
  }

  # Route based on subdomain
  location / {
    # CRM routing
    if ($subdomain ~* "^crm\.|^crm\.") {
      proxy_pass http://crm-service;
      break;
    }

    # HR routing
    if ($subdomain ~* "^hr\.|^hr\.") {
      proxy_pass http://hr-service;
      break;
    }

    # Default routing
    proxy_pass http://default-service;
  }
}
    `
  },

  cloudflare: {
    description: 'Cloudflare Page Rules for subdomain routing',
    configuration: `
# Page Rules for subdomain routing

# CRM Application
- URL: crm.*.myapp.com/*
  Setting: Forwarding URL
  Value: https://crm-service.myapp.com$1

# HR Application
- URL: hr.*.myapp.com/*
  Setting: Forwarding URL
  Value: https://hr-service.myapp.com$1

# Custom Domain Support
- URL: custom-domain.com/*
  Setting: Forwarding URL
  Value: https://tenant-service.myapp.com/custom-domain$1
    `
  }
};

/**
 * Monitoring and Alerting
 */
const monitoringSetup = {
  healthChecks: [
    {
      name: 'DNS Service Health',
      endpoint: '/api/dns/health',
      frequency: '1 minute',
      alerts: ['service_down', 'high_error_rate']
    },
    {
      name: 'Route 53 Connectivity',
      type: 'custom_check',
      script: 'check-route53-connectivity.js',
      frequency: '5 minutes'
    }
  ],

  alerts: {
    dnsRecordCreationFailed: {
      severity: 'warning',
      channels: ['slack', 'email'],
      message: 'Failed to create DNS record for tenant {{tenantId}}'
    },

    domainVerificationFailed: {
      severity: 'info',
      channels: ['email'],
      message: 'Domain verification failed for {{domain}}'
    },

    route53ConnectivityLost: {
      severity: 'critical',
      channels: ['slack', 'email', 'sms'],
      message: 'Lost connectivity to AWS Route 53'
    }
  }
};

// Export for use in main application
export {
  createServer,
  exampleUsage,
  awsSetupInstructions,
  loadBalancerExamples,
  monitoringSetup
};

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer();
}
