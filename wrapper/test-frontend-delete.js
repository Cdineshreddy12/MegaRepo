#!/usr/bin/env node

/**
 * Test script to simulate frontend role deletion with force=true
 */

// Redis URL should be set via environment variable
if (!process.env.REDIS_URL) {
  console.error('❌ REDIS_URL environment variable is required');
  process.exit(1);
}

// Mock the request and reply objects
class MockRequest {
  constructor(params = {}, query = {}, userContext = {}) {
    this.params = params;
    this.query = query;
    this.userContext = userContext;
    this.log = { error: console.error };
  }
}

class MockReply {
  constructor() {
    this.responses = [];
  }

  code(statusCode) {
    this.statusCode = statusCode;
    return this;
  }

  send(data) {
    this.responses.push({ statusCode: this.statusCode || 200, data });
    console.log('Response:', JSON.stringify(data, null, 2));
    return this;
  }
}

// Test the DELETE route logic
async function testFrontendDelete() {
  console.log('🧪 Testing frontend role deletion simulation...\n');

  try {
    // Import the required modules
    const { db } = await import('./backend/src/db/index.js');
    const { customRoles, userRoleAssignments, organizationMemberships, tenantUsers } = await import('./backend/src/db/schema/index.js');
    const { eq, and } = await import('drizzle-orm');

    // Mock request with force=true
    const mockRequest = new MockRequest(
      { roleId: '567e8b31-104f-488f-8ce5-453c02a052b6' },
      { force: true },
      {
        internalUserId: 'a5c53dc2-fd8a-40ae-8704-59add9cf5d93',
        tenantId: 'b0a6e370-c1e5-43d1-94e0-55ed792274c4',
        email: 'test@example.com'
      }
    );

    const mockReply = new MockReply();

    // Simulate the route logic
    const { roleId } = mockRequest.params;
    const { force, transferUsersTo } = mockRequest.query;
    const tenantId = mockRequest.userContext.tenantId;

    console.log('🗑️ Simulating DELETE role:', roleId, 'force:', force);

    // Get role data
    const [roleToDelete] = await db
      .select()
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      )
      .limit(1);

    console.log('Role found:', !!roleToDelete);

    if (!roleToDelete) {
      mockReply.code(404).send({ error: 'Role not found' });
      return;
    }

    // Check affected users
    const userAssignments = await db
      .select({
        userId: userRoleAssignments.userId,
        userEmail: tenantUsers.email
      })
      .from(userRoleAssignments)
      .innerJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
      .where(eq(userRoleAssignments.roleId, roleId));

    const organizationAssignments = await db
      .select({
        membershipId: organizationMemberships.membershipId,
        userId: organizationMemberships.userId,
        userEmail: tenantUsers.email
      })
      .from(organizationMemberships)
      .innerJoin(tenantUsers, eq(organizationMemberships.userId, tenantUsers.userId))
      .where(eq(organizationMemberships.roleId, roleId));

    const affectedUsers = [
      ...userAssignments.map(ua => ({ userId: ua.userId, email: ua.userEmail, type: 'direct' })),
      ...organizationAssignments.map(oa => ({ userId: oa.userId, email: oa.userEmail, type: 'organization' }))
    ];

    const uniqueAffectedUsers = affectedUsers.filter((user, index, self) =>
      index === self.findIndex(u => u.userId === user.userId)
    );

    console.log('Affected users:', uniqueAffectedUsers.length, uniqueAffectedUsers);

    // Should proceed with deletion since force=true
    console.log('Force=true, proceeding with deletion...');

    // Import permissionService
    const permissionService = await import('./backend/src/services/permissionService.js');

    console.log('Calling permissionService.deleteRole...');
    const result = await permissionService.default.deleteRole(
      tenantId,
      roleId,
      {
        force: force || false,
        transferUsersTo,
        deletedBy: mockRequest.userContext.internalUserId
      }
    );
    console.log('Delete result:', result);

    // Mock activity logging and event publishing
    console.log('Mocking activity logging and event publishing...');

    mockReply.code(200).send({
      success: true,
      data: result,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in simulation:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testFrontendDelete().catch(console.error);
