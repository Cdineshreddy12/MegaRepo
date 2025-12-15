import mongoose from 'mongoose';
import connectDB from './config/db.js';

/**
 * Comprehensive script to fix and standardize all role permissions in the database
 * Ensures all roles have consistent permission structures
 */

async function fixRolePermissions() {
  try {
    console.log('🔧 Starting comprehensive role permissions fix...\n');

    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Import the CrmRole model
    const CrmRole = (await import('./models/CrmRole.js')).default;

    // Get all roles
    const allRoles = await CrmRole.find({}).lean();
    console.log(`📊 Found ${allRoles.length} total roles in database\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Permission conversion functions
    function convertFlatPermissionsToStructure(flatPermissions) {
      const structure = {};

      if (!Array.isArray(flatPermissions)) {
        return structure;
      }

      flatPermissions.forEach(permission => {
        if (typeof permission === 'string') {
          const parts = permission.split('.');
          if (parts.length >= 2) {
            const module = parts[0];
            const resource = parts[1];
            const action = parts.slice(2).join('.') || resource;

            if (!structure[module]) {
              structure[module] = {};
            }

            if (!structure[module][resource]) {
              structure[module][resource] = [];
            }

            // Avoid duplicates
            if (!structure[module][resource].includes(action)) {
              structure[module][resource].push(action);
            }
          }
        }
      });

      return structure;
    }

    function flattenPermissions(permissions) {
      const flattened = [];

      if (!permissions) return flattened;

      if (Array.isArray(permissions)) {
        return permissions;
      }

      for (const [module, config] of Object.entries(permissions)) {
        if (typeof config === 'object' && config !== null) {
          const hasNestedResources = Object.values(config).some(value =>
            Array.isArray(value) && value.every(item => typeof item === 'string')
          );

          if (hasNestedResources) {
            for (const [resource, operations] of Object.entries(config)) {
              if (Array.isArray(operations)) {
                operations.forEach(operation => {
                  flattened.push(`${module}.${resource}.${operation}`);
                });
              }
            }
          }
        }
      }

      return [...new Set(flattened)];
    }

    // Process each role
    for (const role of allRoles) {
      try {
        console.log(`🔍 Processing role: ${role.roleName} (${role.roleId}) - Tenant: ${role.tenantId}`);

        let needsUpdate = false;
        const updateData = {};

        // Check permissions structure
        const hasFlatPermissions = Array.isArray(role.permissions) && role.permissions.length > 0;
        const hasPermissionsStructure = role.permissionsStructure &&
          typeof role.permissionsStructure === 'object' &&
          Object.keys(role.permissionsStructure).length > 0;

        console.log(`   📋 Current state - Flat permissions: ${role.permissions?.length || 0}, Structure: ${Object.keys(role.permissionsStructure || {}).length} modules`);

        // Case 1: Role has permissionsStructure but empty or missing flat permissions
        if (hasPermissionsStructure && (!hasFlatPermissions || role.permissions.length === 0)) {
          const flatPermissions = flattenPermissions(role.permissionsStructure);
          if (flatPermissions.length > 0) {
            updateData.permissions = flatPermissions;
            needsUpdate = true;
            console.log(`   ✅ Generated ${flatPermissions.length} flat permissions from structure`);
          }
        }

        // Case 2: Role has flat permissions but missing or empty permissionsStructure
        else if (hasFlatPermissions && !hasPermissionsStructure) {
          const permissionsStructure = convertFlatPermissionsToStructure(role.permissions);
          if (Object.keys(permissionsStructure).length > 0) {
            updateData.permissionsStructure = permissionsStructure;
            needsUpdate = true;
            console.log(`   ✅ Generated permissions structure with ${Object.keys(permissionsStructure).length} modules`);
          }
        }

        // Case 3: Role has both but they might be inconsistent
        else if (hasFlatPermissions && hasPermissionsStructure) {
          const expectedFlat = flattenPermissions(role.permissionsStructure);
          const currentFlat = role.permissions || [];

          // Check if they match
          const flatMatch = expectedFlat.length === currentFlat.length &&
            expectedFlat.sort().every((perm, index) => perm === currentFlat.sort()[index]);

          if (!flatMatch) {
            console.log(`   ⚠️ Permission mismatch detected`);
            console.log(`     Expected flat: ${expectedFlat.length} permissions`);
            console.log(`     Current flat: ${currentFlat.length} permissions`);

            // Use the structure as source of truth and regenerate flat permissions
            const correctedFlat = flattenPermissions(role.permissionsStructure);
            if (correctedFlat.length > 0) {
              updateData.permissions = correctedFlat;
              needsUpdate = true;
              console.log(`   ✅ Corrected flat permissions to ${correctedFlat.length} items`);
            }
          }
        }

        // Case 4: Role has neither permissions nor structure (shouldn't happen but handle it)
        else if (!hasFlatPermissions && !hasPermissionsStructure) {
          console.log(`   ⚠️ Role has no permissions at all - this might be intentional for system roles`);
          // Don't update - might be a system role with no permissions
        }

        // Ensure restrictions and metadata are properly formatted
        if (role.restrictions) {
          if (typeof role.restrictions === 'string') {
            try {
              const parsed = JSON.parse(role.restrictions);
              updateData.restrictions = parsed;
              needsUpdate = true;
              console.log(`   ✅ Parsed restrictions from string`);
            } catch (error) {
              console.log(`   ⚠️ Failed to parse restrictions JSON: ${error.message}`);
              updateData.restrictions = {};
              needsUpdate = true;
            }
          }
        } else if (role.restrictions === undefined || role.restrictions === null) {
          updateData.restrictions = {};
          needsUpdate = true;
          console.log(`   ✅ Set default empty restrictions`);
        }

        if (role.metadata) {
          if (typeof role.metadata === 'string') {
            try {
              const parsed = JSON.parse(role.metadata);
              updateData.metadata = parsed;
              needsUpdate = true;
              console.log(`   ✅ Parsed metadata from string`);
            } catch (error) {
              console.log(`   ⚠️ Failed to parse metadata JSON: ${error.message}`);
              updateData.metadata = {};
              needsUpdate = true;
            }
          }
        } else if (role.metadata === undefined || role.metadata === null) {
          updateData.metadata = {};
          needsUpdate = true;
          console.log(`   ✅ Set default empty metadata`);
        }

        // Apply updates if needed
        if (needsUpdate) {
          updateData.updatedAt = new Date();

          await CrmRole.findByIdAndUpdate(role._id, updateData);
          console.log(`   🎉 Role updated successfully`);
          fixedCount++;
        } else {
          console.log(`   ⏭️ No updates needed for this role`);
          skippedCount++;
        }

        console.log(''); // Empty line for readability

      } catch (error) {
        console.error(`❌ Failed to process role ${role.roleId}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('🎯 FIX SUMMARY:');
    console.log(`✅ Roles fixed: ${fixedCount}`);
    console.log(`⏭️ Roles skipped: ${skippedCount}`);
    console.log(`❌ Roles with errors: ${errorCount}`);
    console.log(`📊 Total roles processed: ${allRoles.length}`);

    // Verification
    console.log('\n🔍 VERIFICATION:');
    const verificationResults = await CrmRole.aggregate([
      {
        $group: {
          _id: null,
          totalRoles: { $sum: 1 },
          withFlatPermissions: {
            $sum: {
              $cond: {
                if: { $and: [{ $isArray: '$permissions' }, { $gt: [{ $size: '$permissions' }, 0] }] },
                then: 1,
                else: 0
              }
            }
          },
          withPermissionsStructure: {
            $sum: {
              $cond: {
                if: { $and: [{ $type: '$permissionsStructure' }, { $ne: ['$permissionsStructure', {}] }] },
                then: 1,
                else: 0
              }
            }
          },
          withBoth: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $isArray: '$permissions' },
                    { $gt: [{ $size: '$permissions' }, 0] },
                    { $type: '$permissionsStructure' },
                    { $ne: ['$permissionsStructure', {}] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      }
    ]);

    if (verificationResults.length > 0) {
      const stats = verificationResults[0];
      console.log(`📊 Total roles: ${stats.totalRoles}`);
      console.log(`📊 Roles with flat permissions: ${stats.withFlatPermissions}`);
      console.log(`📊 Roles with permissions structure: ${stats.withPermissionsStructure}`);
      console.log(`📊 Roles with both formats: ${stats.withBoth}`);
      console.log(`📊 Consistency rate: ${((stats.withBoth / stats.totalRoles) * 100).toFixed(1)}%`);
    }

    // Show sample of fixed roles
    if (fixedCount > 0) {
      console.log('\n📋 SAMPLE FIXED ROLES:');
      const sampleRoles = await CrmRole.find({
        permissions: { $exists: true, $ne: [] },
        permissionsStructure: { $exists: true, $ne: {} }
      }).select('roleName roleId permissions permissionsStructure').limit(2).lean();

      sampleRoles.forEach((role, index) => {
        console.log(`${index + 1}. ${role.roleName} (${role.roleId})`);
        console.log(`   Flat permissions: ${role.permissions?.length || 0}`);
        console.log(`   Structure modules: ${Object.keys(role.permissionsStructure || {}).length}`);
        console.log(`   Sample permissions: ${(role.permissions || []).slice(0, 3).join(', ')}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Fix script failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the fix
fixRolePermissions();
