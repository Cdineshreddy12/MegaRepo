// RLS-based Tenant Isolation Examples
// With RLS, queries are automatically filtered by tenant - no manual filtering needed!

import { eq, and, sql } from 'drizzle-orm';
import { RLSTenantIsolationService } from '../middleware/rls-tenant-isolation.js';
import {
  tenantUsers,
  organizations,
  customRoles,
  userRoleAssignments,
  credits,
  creditTransactions,
  auditLogs
} from '../db/schema/index.js';

export function createRLSRoutes(app, db, connectionString) {
  const rlsService = new RLSTenantIsolationService(db, connectionString);

  // For Fastify, we register routes directly instead of using middleware
  // The RLS service middleware will be applied per route

  // ============================================================================
  // RLS AUTOMATIC ISOLATION EXAMPLES
  // ============================================================================

  // Get all users - AUTOMATICALLY filtered by tenant RLS policy
  app.get('/api/rls/users', async (req, res) => {
    try {
      console.log('Tenant context:', await rlsService.getTenantContext());

      // No manual tenant filtering needed!
      // RLS automatically applies: WHERE tenant_id = current_tenant()
      const users = await db.select().from(tenantUsers);

      res.json({
        success: true,
        tenant: req.tenant.subdomain,
        users: users.map(user => ({
          id: user.userId,
          email: user.email,
          name: user.name,
          isActive: user.isActive
        })),
        queryType: 'RLS-automatic'
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get specific user - RLS prevents cross-tenant access automatically
  app.get('/api/rls/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // This query will only return users from the current tenant
      // If the user belongs to another tenant, it will return empty
      const user = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, id))
        .limit(1);

      if (!user[0]) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: user[0].userId,
          email: user[0].email,
          name: user[0].name,
          tenant: req.tenant.subdomain
        },
        security: 'RLS-protected'
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Create user - automatically assigned to current tenant
  app.post('/api/rls/users', async (req, res) => {
    try {
      const { email, name } = req.body;

      // Check for duplicate email within tenant (RLS handles this automatically)
      const existingUser = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.email, email))
        .limit(1);

      if (existingUser[0]) {
        return res.status(400).json({
          error: 'User with this email already exists in your organization'
        });
      }

      // Create user - RLS will automatically set the tenant_id
      const newUser = await db
        .insert(tenantUsers)
        .values({
          email,
          name,
          isActive: true,
          isTenantAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser[0].userId,
          email: newUser[0].email,
          name: newUser[0].name
        },
        tenant: req.tenant.subdomain,
        security: 'RLS-isolated'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Update user - RLS ensures only tenant's users can be updated
  app.put('/api/rls/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, isActive } = req.body;

      // This will only update if the user belongs to the current tenant
      const updatedUser = await db
        .update(tenantUsers)
        .set({
          name,
          isActive,
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, id))
        .returning();

      if (!updatedUser[0]) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser[0].userId,
          email: updatedUser[0].email,
          name: updatedUser[0].name,
          isActive: updatedUser[0].isActive
        },
        security: 'RLS-protected'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Delete user - RLS ensures only tenant's users can be deleted
  app.delete('/api/rls/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // This will only delete if the user belongs to the current tenant
      const deletedUser = await db
        .delete(tenantUsers)
        .where(eq(tenantUsers.userId, id))
        .returning();

      if (!deletedUser[0]) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'User deleted successfully',
        security: 'RLS-protected'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // ============================================================================
  // ORGANIZATIONS WITH RLS
  // ============================================================================

  // Get all organizations for current tenant
  app.get('/api/rls/organizations', async (req, res) => {
    try {
      // RLS automatically filters to current tenant's organizations
      const orgs = await db.select().from(organizations);

      res.json({
        success: true,
        organizations: orgs.map(org => ({
          id: org.organizationId,
          name: org.organizationName,
          type: org.organizationType,
          isActive: org.isActive
        })),
        tenant: req.tenant.subdomain,
        security: 'RLS-automatic'
      });
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  // Get users within an organization (cross-table RLS)
  app.get('/api/rls/organizations/:orgId/users', async (req, res) => {
    try {
      const { orgId } = req.params;

      // First check if organization exists and belongs to tenant
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.organizationId, orgId))
        .limit(1);

      if (!org[0]) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get users in this organization (RLS protects both tables)
      const users = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.organizationId, orgId));

      res.json({
        success: true,
        organization: org[0].organizationName,
        users: users.map(user => ({
          id: user.userId,
          email: user.email,
          name: user.name
        })),
        security: 'RLS-cross-table'
      });
    } catch (error) {
      console.error('Error fetching organization users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // ============================================================================
  // CREDITS AND BILLING WITH RLS
  // ============================================================================

  // Get tenant credits
  app.get('/api/rls/credits', async (req, res) => {
    try {
      // RLS automatically filters to current tenant's credits
      const tenantCredits = await db.select().from(credits);

      // Get recent transactions for current tenant
      const transactions = await db
        .select()
        .from(creditTransactions)
        .orderBy(sql`${creditTransactions.createdAt} DESC`)
        .limit(10);

      res.json({
        success: true,
        credits: tenantCredits[0] || { availableCredits: 0, totalCredits: 0 },
        recentTransactions: transactions,
        tenant: req.tenant.subdomain,
        security: 'RLS-protected'
      });
    } catch (error) {
      console.error('Error fetching credits:', error);
      res.status(500).json({ error: 'Failed to fetch credit information' });
    }
  });

  // ============================================================================
  // ROLES AND PERMISSIONS WITH RLS
  // ============================================================================

  // Get tenant roles and assignments
  app.get('/api/rls/roles', async (req, res) => {
    try {
      // Get roles for current tenant
      const roles = await db.select().from(customRoles);

      // Get role assignments (RLS protects the relationship)
      const assignments = await db
        .select({
          assignmentId: userRoleAssignments.id,
          userId: tenantUsers.userId,
          userEmail: tenantUsers.email,
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          assignedAt: userRoleAssignments.assignedAt
        })
        .from(userRoleAssignments)
        .innerJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId));

      res.json({
        success: true,
        roles,
        assignments,
        tenant: req.tenant.subdomain,
        security: 'RLS-relationship'
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  // ============================================================================
  // DASHBOARD WITH RLS AGGREGATION
  // ============================================================================

  // Get tenant dashboard data
  app.get('/api/rls/dashboard', async (req, res) => {
    try {
      // All these queries are automatically filtered by RLS!
      const [
        userCount,
        orgCount,
        roleCount,
        creditBalance
      ] = await Promise.all([
        db.$count(tenantUsers, eq(tenantUsers.isActive, true)),
        db.$count(organizations, eq(organizations.isActive, true)),
        db.$count(customRoles),
        db.select().from(credits).limit(1)
      ]);

      res.json({
        success: true,
        dashboard: {
          tenant: {
            id: req.tenantId,
            subdomain: req.tenant.subdomain,
            name: req.tenant.companyName
          },
          stats: {
            totalUsers: userCount,
            totalOrganizations: orgCount,
            totalRoles: roleCount,
            creditBalance: creditBalance[0]?.availableCredits || 0
          },
          security: 'RLS-automatic',
          isolation: 'database-level'
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // ============================================================================
  // SEARCH WITH RLS
  // ============================================================================

  // Search users within tenant
  app.get('/api/rls/search/users', async (req, res) => {
    try {
      const { query } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      // RLS automatically limits search to current tenant
      const users = await db
        .select()
        .from(tenantUsers)
        .where(sql`${tenantUsers.email} ILIKE ${'%' + query + '%'} OR ${tenantUsers.name} ILIKE ${'%' + query + '%'}`)
        .limit(20);

      res.json({
        success: true,
        query,
        results: users.map(user => ({
          id: user.userId,
          email: user.email,
          name: user.name,
          type: 'user'
        })),
        tenant: req.tenant.subdomain,
        security: 'RLS-search-isolated'
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // ============================================================================
  // RLS HEALTH CHECK
  // ============================================================================

  // Check RLS status
  app.get('/api/rls/health', async (req, res) => {
    try {
      const healthCheck = await rlsService.healthCheck();
      const tenantContext = await rlsService.getTenantContext();

      res.json({
        success: true,
        rls: healthCheck,
        tenant: {
          id: req.tenantId,
          subdomain: req.tenant.subdomain,
          context: tenantContext
        },
        security: 'RLS-enabled'
      });
    } catch (error) {
      console.error('Error checking RLS health:', error);
      res.status(500).json({ error: 'RLS health check failed' });
    }
  });

  // ============================================================================
  // AUDIT LOGS WITH RLS
  // ============================================================================

  // Get audit logs for current tenant
  app.get('/api/rls/audit', async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      // RLS automatically filters to current tenant's audit logs
      const logs = await db
        .select()
        .from(auditLogs)
        .orderBy(sql`${auditLogs.createdAt} DESC`)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      res.json({
        success: true,
        logs,
        tenant: req.tenant.subdomain,
        security: 'RLS-audit-isolated'
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });
}
