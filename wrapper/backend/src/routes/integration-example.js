// Integration Example: How to update existing routes for tenant isolation
import { eq } from 'drizzle-orm';
import { tenantIsolationMiddleware } from '../middleware/tenant-isolation.js';
import { tenantUsers, entities, customRoles } from '../db/schema/index.js';

// Example of how to integrate tenant isolation into existing routes
export function integrateTenantIsolation(app, db) {
  // Apply tenant isolation middleware
  app.use('/api', tenantIsolationMiddleware(db));

  // ============================================================================
  // BEFORE: Routes without tenant isolation (INSECURE)
  // ============================================================================

  /*
  // ❌ INSECURE: No tenant isolation
  app.get('/api/users', async (req, res) => {
    // This would return ALL users from ALL tenants!
    const allUsers = await db.select().from(tenantUsers);
    res.json(allUsers);
  });

  // ❌ INSECURE: Can access other tenants' data
  app.get('/api/users/:id', async (req, res) => {
    const user = await db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, req.params.id))
      .limit(1);

    // This could return a user from another tenant!
    res.json(user[0]);
  });
  */

  // ============================================================================
  // AFTER: Routes with tenant isolation (SECURE)
  // ============================================================================

  // ✅ SECURE: Only returns users from current tenant
  app.get('/api/users', async (req, res) => {
    try {
      // Use tenant-aware query builder
      const tenantUsersQuery = req.tenantQuery(tenantUsers);
      const users = await tenantUsersQuery.findAll({
        isActive: true // Additional filters work normally
      });

      res.json({
        success: true,
        tenant: req.tenant.subdomain,
        count: users.length,
        users: users.map(user => ({
          id: user.userId,
          email: user.email,
          name: user.name,
          isActive: user.isActive
        }))
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // ✅ SECURE: Validates user belongs to current tenant
  app.get('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Method 1: Using tenant query builder
      const tenantUsersQuery = req.tenantQuery(tenantUsers);
      const user = await tenantUsersQuery.findOne({
        userId: id
      });

      if (!user[0]) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Method 2: Using ownership validation (more explicit)
      const ownership = await req.tenantService.validateResourceOwnership(
        tenantUsers,
        id,
        { tenantId: req.tenantId },
        'tenant'
      );

      if (!ownership.valid) {
        return res.status(403).json({
          error: 'Access denied',
          reason: ownership.reason
        });
      }

      res.json({
        success: true,
        user: {
          id: ownership.resource.userId,
          email: ownership.resource.email,
          name: ownership.resource.name,
          isActive: ownership.resource.isActive,
          tenant: req.tenant.subdomain
        }
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // ✅ SECURE: Creates user for current tenant only
  app.post('/api/users', async (req, res) => {
    try {
      const { email, name, role } = req.body;

      // Check if email already exists in this tenant
      const tenantUsersQuery = req.tenantQuery(tenantUsers);
      const existingUser = await tenantUsersQuery.findOne({
        email: email
      });

      if (existingUser[0]) {
        return res.status(400).json({
          error: 'User with this email already exists in your organization'
        });
      }

      // Create user for current tenant
      const newUser = await tenantUsersQuery.create({
        email,
        name,
        isActive: true,
        isTenantAdmin: role === 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser[0].userId,
          email: newUser[0].email,
          name: newUser[0].name,
          tenant: req.tenant.subdomain
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // ✅ SECURE: Updates user (validates ownership)
  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, isActive } = req.body;

      // Validate ownership
      const ownership = await req.tenantService.validateResourceOwnership(
        tenantUsers,
        id,
        { tenantId: req.tenantId },
        'tenant'
      );

      if (!ownership.valid) {
        return res.status(403).json({ error: ownership.reason });
      }

      // Update user
      const tenantUsersQuery = req.tenantQuery(tenantUsers);
      await tenantUsersQuery.update(
        { userId: id }, // WHERE conditions
        {
          name,
          isActive,
          updatedAt: new Date()
        }
      );

      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: ownership.resource.userId,
          email: ownership.resource.email,
          name,
          isActive
        }
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // ✅ SECURE: Deletes user (validates ownership)
  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ownership
      const ownership = await req.tenantService.validateResourceOwnership(
        tenantUsers,
        id,
        { tenantId: req.tenantId },
        'tenant'
      );

      if (!ownership.valid) {
        return res.status(403).json({ error: ownership.reason });
      }

      // Delete user
      const tenantUsersQuery = req.tenantQuery(tenantUsers);
      await tenantUsersQuery.delete({
        userId: id
      });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // ============================================================================
  // ORGANIZATION-LEVEL ISOLATION EXAMPLE
  // ============================================================================

  // Get organizations for current tenant
  app.get('/api/organizations', async (req, res) => {
    try {
      const tenantOrgsQuery = req.tenantQuery(entities);
      const orgs = await tenantOrgsQuery.findAll({
        isActive: true,
        entityType: 'organization'
      });

      res.json({
        success: true,
        tenant: req.tenant.subdomain,
        organizations: orgs.map(org => ({
          id: org.entityId,
          name: org.entityName,
          type: org.organizationType,
          isActive: org.isActive
        }))
      });
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  // Get users within a specific organization
  app.get('/api/organizations/:orgId/users', async (req, res) => {
    try {
      const { orgId } = req.params;

      // First validate organization belongs to tenant
      const orgOwnership = await req.tenantService.validateResourceOwnership(
        entities,
        orgId,
        { tenantId: req.tenantId, entityType: 'organization' },
        'tenant'
      );

      if (!orgOwnership.valid) {
        return res.status(403).json({ error: orgOwnership.reason });
      }

      // Get users for this organization
      const users = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.organizationId, orgId))
        .where(eq(tenantUsers.tenantId, req.tenantId)); // Crucial: tenant filter

      res.json({
        success: true,
        organization: orgOwnership.resource.organizationName,
        users: users.map(user => ({
          id: user.userId,
          email: user.email,
          name: user.name
        }))
      });
    } catch (error) {
      console.error('Error fetching organization users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // ============================================================================
  // DASHBOARD DATA WITH TENANT ISOLATION
  // ============================================================================

  // Get tenant dashboard overview
  app.get('/api/dashboard', async (req, res) => {
    try {
      // Get data from multiple tenant-scoped tables
      const [
        userCount,
        orgCount,
        roleCount
      ] = await Promise.all([
        req.tenantQuery(tenantUsers).count({ isActive: true }),
        req.tenantQuery(entities).count({ isActive: true, entityType: 'organization' }),
        req.tenantQuery(customRoles).count()
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
            totalRoles: roleCount
          },
          recentActivity: [], // Add recent activity from audit logs
          alerts: [] // Add tenant-specific alerts
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // ============================================================================
  // SEARCH WITH TENANT ISOLATION
  // ============================================================================

  // Search users within tenant
  app.get('/api/search/users', async (req, res) => {
    try {
      const { query } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      // Search within tenant only
      const users = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, req.tenantId))
        .where(sql`${tenantUsers.email} ILIKE ${'%' + query + '%'} OR ${tenantUsers.name} ILIKE ${'%' + query + '%'}`)
        .limit(20);

      res.json({
        success: true,
        query,
        tenant: req.tenant.subdomain,
        results: users.map(user => ({
          id: user.userId,
          email: user.email,
          name: user.name,
          type: 'user'
        }))
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });
}
