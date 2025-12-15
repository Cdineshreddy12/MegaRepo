import { db } from '../../../db/index.js';
import { tenants, tenantUsers } from '../../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import kindeService from '../services/kinde-service.js';

export default async function simplifiedAuthRoutes(fastify, options) {

  // SINGLE LOGIN ENDPOINT - handles all authentication scenarios
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { email } = request.body;

      // Step 1: Authenticate user with Kinde
      const authUrl = await kindeService.getAuthenticationUrl({
        login_hint: email,
        prompt: 'login'
      });

      return {
        success: true,
        authUrl,
        message: 'Redirect to authentication'
      };

    } catch (error) {
      console.error('❌ Login initiation failed:', error);
      return reply.code(500).send({
        error: 'Authentication failed',
        message: error.message
      });
    }
  });

  // UNIFIED CALLBACK - intelligent organization detection
  fastify.get('/auth/callback', async (request, reply) => {
    try {
      const { code, state } = request.query;

      // Step 1: Exchange code for user info
      const userInfo = await kindeService.exchangeCodeForUser(code);
      const { userId: kindeUserId, email, name } = userInfo;

      console.log('🔍 Processing authenticated user:', { kindeUserId, email });

      // Step 2: Check if user belongs to any organization
      const existingUser = await db
        .select({
          userId: tenantUsers.userId,
          tenantId: tenantUsers.tenantId,
          tenant: {
            tenantId: tenants.tenantId,
            companyName: tenants.companyName,
            subdomain: tenants.subdomain,
            kindeOrgId: tenants.kindeOrgId
          }
        })
        .from(tenantUsers)
        .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
        .where(eq(tenantUsers.kindeUserId, kindeUserId))
        .limit(1);

      if (existingUser.length > 0) {
        // Step 3A: User has organization - direct to dashboard
        const user = existingUser[0];
        
        console.log('✅ Existing user found, redirecting to dashboard');
        
        // Ensure user is in correct Kinde organization
        await kindeService.addUserToOrganization(
          kindeUserId, 
          user.tenant.kindeOrgId, 
          { exclusive: true }
        );

        // Redirect to organization dashboard
        const dashboardUrl = `https://${user.tenant.subdomain}.${process.env.FRONTEND_DOMAIN}/dashboard`;
        return reply.redirect(dashboardUrl);

      } else {
        // Step 3B: New user - quick organization setup
        console.log('👤 New user detected, redirecting to organization setup');
        
        const setupUrl = new URL(`${process.env.FRONTEND_URL}/organization-setup`);
        setupUrl.searchParams.set('email', email);
        setupUrl.searchParams.set('name', name);
        setupUrl.searchParams.set('kinde_user_id', kindeUserId);
        
        return reply.redirect(setupUrl.toString());
      }

    } catch (error) {
      console.error('❌ Authentication callback failed:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=callback_failed`);
    }
  });

  // QUICK ORGANIZATION SETUP - simplified onboarding
  fastify.post('/auth/setup-organization', async (request, reply) => {
    try {
      const {
        companyName,
        subdomain,
        kindeUserId,
        email,
        name
      } = request.body;

      console.log('🏢 Creating organization for user:', { companyName, subdomain, email });

      // Step 1: Create organization in database
      const result = await db.transaction(async (tx) => {
        // Create tenant
        const [tenant] = await tx.insert(tenants).values({
          companyName,
          subdomain,
          adminEmail: email,
          kindeOrgId: '', // Will be updated after Kinde creation
          onboardedAt: new Date()
        }).returning();

        // Create Kinde organization
        const kindeOrg = await kindeService.createOrganization({
          name: companyName,
          external_id: tenant.tenantId
        });

        // Update tenant with Kinde org ID
        const [updatedTenant] = await tx.update(tenants)
          .set({ kindeOrgId: kindeOrg.organization.code })
          .where(eq(tenants.tenantId, tenant.tenantId))
          .returning();

        // Create admin user
        const [adminUser] = await tx.insert(tenantUsers).values({
          tenantId: tenant.tenantId,
          kindeUserId,
          email,
          name,
          isTenantAdmin: true,
          isActive: true,
          onboardingCompleted: true
        }).returning();

        // Add user to Kinde organization
        await kindeService.addUserToOrganization(
          kindeUserId, 
          kindeOrg.organization.code, 
          { exclusive: true }
        );

        return { tenant: updatedTenant, user: adminUser };
      });

      console.log('✅ Organization setup completed successfully');

      return {
        success: true,
        organization: {
          tenantId: result.tenant.tenantId,
          companyName: result.tenant.companyName,
          subdomain: result.tenant.subdomain
        },
        dashboardUrl: `https://${result.tenant.subdomain}.${process.env.FRONTEND_DOMAIN}/dashboard`
      };

    } catch (error) {
      console.error('❌ Organization setup failed:', error);
      return reply.code(500).send({
        error: 'Organization setup failed',
        message: error.message
      });
    }
  });
}