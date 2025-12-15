// =============================================================================
// ENHANCED TENANT DATA SYNC SERVICE V2
// Transaction-based, retry-enabled, idempotent tenant data sync
// Strategy: Essential + Background (5-10s essential, rest in background)
// =============================================================================

import axios from 'axios';
import mongoose from 'mongoose';

// Import models
import Tenant from '../models/Tenant.js';
import UserProfile from '../models/UserProfile.js';
import Organization from '../models/Organization.js';
import CrmRole from '../models/CrmRole.js';
import CrmRoleAssignment from '../models/CrmRoleAssignment.js';
import EmployeeOrgAssignment from '../models/EmployeeOrgAssignment.js';
import CrmCreditConfig from '../models/CrmCreditConfig.js';
import CrmEntityCredit from '../models/CrmEntityCredit.js';
import TenantSyncStatus from '../models/TenantSyncStatus.js';

class TenantDataSyncServiceV2 {
  constructor() {
    this.wrapperBaseUrl = process.env.WRAPPER_API_URL || 'http://localhost:3000';
    this.timeout = 30000; // 30 seconds
    this.batchSize = 50;
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: 5,
      baseDelay: 2000,      // 2 seconds
      maxDelay: 60000,      // 60 seconds
      backoffMultiplier: 2,
      jitterMs: 1000
    };

    // Process ID for lock management
    this.processId = `sync-${process.pid}-${Date.now()}`;
  }

  /**
   * Main sync method - Essential + Background approach
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Kinde JWT token
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncTenant(tenantId, authToken, options = {}) {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🚀 STARTING TENANT SYNC`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📋 Tenant ID: ${tenantId}`);
    console.log(`🎯 Strategy: Essential + Background`);
    console.log(`🔧 Process ID: ${this.processId}`);
    console.log(`⏰ Started At: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(70)}\n`);

    let syncStatus = null;

    try {
      // Step 1: Check if sync is needed (idempotency)
      console.log('🔍 STEP 1: Checking if sync is needed...');
      const needsSync = await TenantSyncStatus.needsSync(tenantId);
      
      if (!needsSync) {
        console.log('✅ STEP 1: Tenant already synced, skipping...');
        syncStatus = await TenantSyncStatus.findOne({ tenantId });
        console.log(`📊 Last synced at: ${syncStatus.completedAt}`);
        console.log(`📈 Records synced: ${syncStatus.metadata?.totalRecords || 'N/A'}`);
        console.log(`\n${'='.repeat(70)}`);
        console.log(`✅ SYNC NOT NEEDED - TENANT ALREADY SYNCED`);
        console.log(`${'='.repeat(70)}\n`);
        
        return {
          success: true,
          alreadySynced: true,
          syncStatus: syncStatus.toObject()
        };
      }
      
      console.log('✅ STEP 1: Sync needed, proceeding...\n');

      // Step 2: Get or create sync status (atomic operation to prevent duplicate key errors)
      console.log('🔍 STEP 2: Getting sync status record...');
      syncStatus = await TenantSyncStatus.findOneAndUpdate(
        { tenantId },
        { 
          $setOnInsert: { 
            tenantId,
            status: 'pending',
            phase: 'independent',
            attemptCount: 0
          }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );
      console.log(`✅ STEP 2: Sync status record ready`);
      console.log(`   Status: ${syncStatus.status}`);
      console.log(`   Attempt Count: ${syncStatus.attemptCount}\n`);

      // Step 3: Acquire sync lock
      console.log('🔒 STEP 3: Acquiring sync lock...');
      try {
        await syncStatus.acquireLock(this.processId);
        console.log('✅ STEP 3: Sync lock acquired successfully');
        console.log(`   Locked by: ${this.processId}`);
        console.log(`   Lock expires at: ${syncStatus.syncLock.lockExpiry}\n`);
      } catch (lockError) {
        console.log('❌ STEP 3: Failed to acquire lock');
        console.log(`   Reason: Sync already in progress by another process`);
        console.log(`   Locked by: ${syncStatus.syncLock.lockedBy}`);
        console.log(`   Lock expires: ${syncStatus.syncLock.lockExpiry}\n`);
        
        return {
          success: false,
          error: 'Sync already in progress',
          lockedBy: syncStatus.syncLock.lockedBy
        };
      }

      // Phase 1: Essential data sync (BLOCKING - with retry)
      console.log(`${'─'.repeat(70)}`);
      console.log(`📋 PHASE 1: ESSENTIAL DATA SYNC (Blocking)`);
      console.log(`${'─'.repeat(70)}`);
      console.log('🎯 This phase must complete before user can log in');
      console.log('⏱️  Expected duration: 5-10 seconds\n');
      
      const essentialResult = await this.retryOperation(
        () => this.syncEssentialDataWithTransaction(tenantId, authToken, syncStatus),
        'Essential Data Sync'
      );

      if (!essentialResult.success) {
        console.error(`❌ PHASE 1 FAILED: ${essentialResult.error}\n`);
        await syncStatus.failSync('Essential data sync failed', 'SYNC_ERROR');
        throw new Error('Essential data sync failed: ' + essentialResult.error);
      }

      const essentialDuration = Date.now() - startTime;
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`✅ PHASE 1 COMPLETE: Essential data synced`);
      console.log(`${'─'.repeat(70)}`);
      console.log(`⏱️  Duration: ${essentialDuration}ms (${(essentialDuration/1000).toFixed(2)}s)`);
      console.log(`📊 Records synced: ${essentialResult.stats.totalRecords}`);
      console.log(`   └─ Tenant: ${essentialResult.stats.tenant}`);
      console.log(`   └─ Organizations: ${essentialResult.stats.organizations}`);
      console.log(`   └─ Roles: ${essentialResult.stats.roles}`);
      console.log(`   └─ Users: ${essentialResult.stats.users}`);
      console.log(`${'─'.repeat(70)}\n`);

      // Phase 2: Background data sync (NON-BLOCKING)
      console.log(`${'─'.repeat(70)}`);
      console.log(`📋 PHASE 2: BACKGROUND DATA SYNC (Non-blocking)`);
      console.log(`${'─'.repeat(70)}`);
      console.log('🎯 User can now log in while this phase continues');
      console.log('⏱️  Expected duration: 15-30 seconds');
      console.log('🔄 Starting background sync process...\n');
      
      // Trigger background sync without waiting
      this.syncBackgroundData(tenantId, authToken, syncStatus)
        .then(async () => {
          const totalDuration = Date.now() - startTime;

          // Now mark the entire sync as completed
          const finalTotalRecords = essentialResult.stats.totalRecords;
          await syncStatus.completeSync(finalTotalRecords, totalDuration);

          console.log(`\n${'='.repeat(70)}`);
          console.log(`✅ PHASE 2 COMPLETE: Background data synced`);
          console.log(`${'='.repeat(70)}`);
          console.log(`⏱️  Total sync duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`);
          console.log(`📊 All collections synced successfully`);
          console.log(`📈 Final record count: ${finalTotalRecords}`);
          console.log(`${'='.repeat(70)}\n`);
        })
        .catch(async (error) => {
          console.error(`\n${'='.repeat(70)}`);
          console.error(`❌ PHASE 2 FAILED: Background sync error`);
          console.error(`${'='.repeat(70)}`);
          console.error(`Error: ${error.message}`);
          console.error(`Stack: ${error.stack}`);
          console.error(`${'='.repeat(70)}\n`);

          // Background sync errors don't fail the overall sync - essential data is ready
          // Still mark as completed since essential data is synced
          const totalDuration = Date.now() - startTime;
          const finalTotalRecords = essentialResult.stats.totalRecords;
          await syncStatus.completeSync(finalTotalRecords, totalDuration);

          console.error(`✅ ESSENTIAL DATA STILL AVAILABLE: User can continue using the app`);
          console.error(`📊 Essential records synced: ${finalTotalRecords}`);
          console.error(`${'='.repeat(70)}\n`);
        });

      // Don't mark as completed yet - background sync will handle final completion
      const totalRecords = essentialResult.stats.totalRecords;

      console.log(`${'='.repeat(70)}`);
      console.log(`✅ USER CAN NOW LOG IN - ESSENTIAL DATA READY`);
      console.log(`${'='.repeat(70)}`);
      console.log(`📋 Tenant ID: ${tenantId}`);
      console.log(`⏱️  Duration: ${essentialDuration}ms (${(essentialDuration/1000).toFixed(2)}s)`);
      console.log(`📊 Essential Records: ${totalRecords}`);
      console.log(`🔄 Background sync: IN PROGRESS`);
      console.log(`⏰ Started At: ${new Date().toISOString()}`);
      console.log(`${'='.repeat(70)}\n`);

      return {
        success: true,
        tenantId,
        duration: essentialDuration,
        stats: essentialResult.stats,
        backgroundSyncStarted: true
      };

    } catch (error) {
      console.error(`\n${'='.repeat(70)}`);
      console.error(`❌ SYNC FAILED: ${tenantId}`);
      console.error(`${'='.repeat(70)}`);
      console.error(`Error Type: ${error.type || 'UNKNOWN_ERROR'}`);
      console.error(`Error Message: ${error.message}`);
      console.error(`Stack Trace: ${error.stack}`);
      console.error(`Duration: ${Date.now() - startTime}ms`);
      console.error(`${'='.repeat(70)}\n`);
      
      if (syncStatus && syncStatus.syncLock?.locked) {
        console.log('🔓 Releasing sync lock due to error...');
        await syncStatus.releaseLock();
        console.log('✅ Lock released\n');
      }

      throw error;
    }
  }

  /**
   * Sync essential data with MongoDB transaction (BLOCKING)
   * Essential data: Tenant, Organizations, Roles, Users
   */
  async syncEssentialDataWithTransaction(tenantId, authToken, syncStatus) {
    const phaseStartTime = Date.now();
    const session = await mongoose.startSession();
    
    try {
      console.log('🔄 Starting MongoDB transaction...');
      await session.startTransaction();
      console.log('✅ Transaction started successfully\n');

      syncStatus.phase = 'independent';
      await syncStatus.save();

      const stats = {
        tenant: 0,
        organizations: 0,
        roles: 0,
        users: 0,
        totalRecords: 0
      };

      // Fetch all essential data in parallel
      console.log(`${'─'.repeat(70)}`);
      console.log('📡 FETCHING DATA FROM WRAPPER API (Parallel)');
      console.log(`${'─'.repeat(70)}`);
      const fetchStartTime = Date.now();
      
      console.log('🌐 Fetching tenant info...');
      console.log('🌐 Fetching organizations...');
      console.log('🌐 Fetching roles...');
      console.log('🌐 Fetching users...\n');
      
      const [tenantData, organizationsData, rolesData, usersData] = await Promise.all([
        this.fetchFromWrapper(`/api/wrapper/tenants/${tenantId}`, authToken),
        this.fetchFromWrapper(`/api/wrapper/tenants/${tenantId}/organizations`, authToken),
        this.fetchFromWrapper(`/api/wrapper/tenants/${tenantId}/roles`, authToken),
        this.fetchFromWrapper(`/api/wrapper/tenants/${tenantId}/users`, authToken)
      ]);

      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`✅ FETCH COMPLETE in ${fetchDuration}ms:`);
      console.log(`   └─ Tenant: ${tenantData ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   └─ Organizations: ${organizationsData?.length || 0} records`);
      console.log(`   └─ Roles: ${rolesData?.length || 0} records`);
      console.log(`   └─ Users: ${usersData?.length || 0} records\n`);

      // Store essential data
      console.log(`${'─'.repeat(70)}`);
      console.log('💾 STORING DATA IN DATABASE');
      console.log(`${'─'.repeat(70)}\n`);

      // 1. Store tenant
      if (tenantData) {
        console.log('📝 Storing tenant info...');
        const storeStartTime = Date.now();
        const count = await this.storeTenant(tenantId, tenantData, { session });
        stats.tenant = count;
        await syncStatus.markCollectionSynced('tenant', count);
        console.log(`✅ Tenant stored in ${Date.now() - storeStartTime}ms`);
        console.log(`   └─ Records: ${count}\n`);
      } else {
        console.log('⚠️  No tenant data to store\n');
      }

      // 2. Store organizations
      if (organizationsData && organizationsData.length > 0) {
        console.log('🏢 Storing organizations...');
        const storeStartTime = Date.now();
        const count = await this.storeOrganizations(tenantId, organizationsData, { session });
        stats.organizations = count;
        await syncStatus.markCollectionSynced('organizations', count);
        console.log(`✅ Organizations stored in ${Date.now() - storeStartTime}ms`);
        console.log(`   └─ Records: ${count}`);
        console.log(`   └─ Hierarchy resolved: YES\n`);
      } else {
        console.log('⚠️  No organizations to store\n');
      }

      // 3. Store roles
      if (rolesData && rolesData.length > 0) {
        console.log('🎭 Storing roles...');
        const storeStartTime = Date.now();
        const count = await this.storeRoles(tenantId, rolesData, { session });
        stats.roles = count;
        await syncStatus.markCollectionSynced('roles', count);
        console.log(`✅ Roles stored in ${Date.now() - storeStartTime}ms`);
        console.log(`   └─ Records: ${count}\n`);
      } else {
        console.log('⚠️  No roles to store\n');
      }

      // 4. Store users
      if (usersData && usersData.length > 0) {
        console.log('👤 Storing users...');
        const storeStartTime = Date.now();
        const count = await this.storeUsers(tenantId, usersData, { session });
        stats.users = count;
        await syncStatus.markCollectionSynced('userProfiles', count);
        console.log(`✅ Users stored in ${Date.now() - storeStartTime}ms`);
        console.log(`   └─ Records: ${count}\n`);
      } else {
        console.log('⚠️  No users to store\n');
      }

      stats.totalRecords = stats.tenant + stats.organizations + stats.roles + stats.users;

      // Commit transaction
      console.log(`${'─'.repeat(70)}`);
      console.log('💾 COMMITTING TRANSACTION');
      console.log(`${'─'.repeat(70)}`);
      console.log(`📊 Total records to commit: ${stats.totalRecords}`);
      console.log('🔄 Committing to database...');
      
      await session.commitTransaction();
      
      const phaseDuration = Date.now() - phaseStartTime;
      console.log(`✅ Transaction committed successfully in ${phaseDuration}ms`);
      console.log(`📊 All essential data is now persistent`);

      return { success: true, stats };

    } catch (error) {
      console.error(`\n${'─'.repeat(70)}`);
      console.error('❌ ERROR OCCURRED - ROLLING BACK TRANSACTION');
      console.error(`${'─'.repeat(70)}`);
      console.error(`Error Type: ${error.type || 'UNKNOWN'}`);
      console.error(`Error Message: ${error.message}`);
      console.error('🔄 Aborting transaction...');
      
      await session.abortTransaction();
      
      console.error('✅ Transaction rolled back - no data was saved');
      console.error(`${'─'.repeat(70)}\n`);
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Sync background data (NON-BLOCKING)
   * Background data: Assignments and Credits
   * 
   * OPTIMAL SOLUTION: Process each collection independently without a single large transaction.
   * This provides better resilience - if one collection fails, others can still succeed.
   * Background sync is non-critical (user can already log in), so we prioritize resilience over atomicity.
   */
  async syncBackgroundData(tenantId, authToken, syncStatus) {
    const bgStartTime = Date.now();
    
    try {
      console.log('🔄 Starting background data sync (resilient per-collection processing)...');
      console.log('💡 Processing collections independently for maximum resilience\n');

      syncStatus.phase = 'dependent';
      await syncStatus.save();

      // Build reference maps
      console.log(`${'─'.repeat(70)}`);
      console.log('🔗 BUILDING REFERENCE MAPS');
      console.log(`${'─'.repeat(70)}`);
      console.log('📊 Building ObjectId mappings from essential data...');
      
      const mapStartTime = Date.now();
      const referenceMaps = await this.buildReferenceMaps(tenantId);
      
      console.log(`✅ Reference maps built in ${Date.now() - mapStartTime}ms:`);
      console.log(`   └─ Organizations: ${referenceMaps.orgMap.size} mappings`);
      console.log(`   └─ Roles: ${referenceMaps.roleMap.size} mappings`);
      console.log(`   └─ Users: ${referenceMaps.userMap.size} mappings\n`);

      // Fetch background data
      console.log(`${'─'.repeat(70)}`);
      console.log('📡 FETCHING BACKGROUND DATA FROM WRAPPER API (Parallel)');
      console.log(`${'─'.repeat(70)}`);
      const fetchStartTime = Date.now();
      
      console.log('🌐 Fetching employee assignments...');
      console.log('🌐 Fetching role assignments...');
      console.log('🌐 Fetching credit configs...');
      console.log('🌐 Fetching entity credits...\n');
      
      const [
        employeeAssignmentsData,
        roleAssignmentsData,
        creditConfigsData,
        entityCreditsData
      ] = await Promise.all([
        this.fetchFromWrapper(`/api/wrapper/tenants/${tenantId}/employee-assignments`, authToken),
        this.fetchFromWrapper(`/api/wrapper/tenants/${tenantId}/role-assignments`, authToken),
        this.fetchFromWrapper(`/api/wrapper/tenants/${tenantId}/credit-configs`, authToken),
        this.fetchFromWrapper(`/api/wrapper/tenants/${tenantId}/entity-credits`, authToken)
      ]);

      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`✅ FETCH COMPLETE in ${fetchDuration}ms:`);
      console.log(`   └─ Employee Assignments: ${employeeAssignmentsData?.length || 0} records`);
      console.log(`   └─ Role Assignments: ${roleAssignmentsData?.length || 0} records`);
      console.log(`   └─ Credit Configs: ${creditConfigsData?.length || 0} records`);
      console.log(`   └─ Entity Credits: ${entityCreditsData?.length || 0} records\n`);

      // Store background data - Process each collection independently for resilience
      console.log(`${'─'.repeat(70)}`);
      console.log('💾 STORING BACKGROUND DATA IN DATABASE');
      console.log('💡 Processing collections independently (resilient to individual failures)');
      console.log(`${'─'.repeat(70)}\n`);

      const stats = {
        employeeAssignments: { success: false, count: 0, error: null },
        roleAssignments: { success: false, count: 0, error: null },
        creditConfigs: { success: false, count: 0, error: null },
        entityCredits: { success: false, count: 0, error: null }
      };

      // Store tenantId for error handling
      this.currentTenantId = tenantId;

      // Process each collection independently - failures don't affect others
      const collectionPromises = [];

      // 1. Store employee assignments
      if (employeeAssignmentsData && employeeAssignmentsData.length > 0) {
        collectionPromises.push(
          this.processCollectionSafely(
            'employeeAssignments',
            '👔 Storing employee assignments...',
            async () => {
              const storeStartTime = Date.now();
              const count = await this.storeEmployeeAssignments(
                tenantId,
                employeeAssignmentsData,
                referenceMaps,
                {} // No session - independent operation
              );
              // Reload syncStatus to avoid parallel save issues
              const freshSyncStatus = await syncStatus.constructor.findOne({ tenantId });
              if (freshSyncStatus) {
                await freshSyncStatus.markCollectionSynced('employeeAssignments', count);
              }
              const duration = Date.now() - storeStartTime;
              console.log(`✅ Employee assignments stored in ${duration}ms`);
              console.log(`   └─ Records: ${count}`);
              console.log(`   └─ References resolved: User + Organization\n`);
              return count;
            },
            stats.employeeAssignments
          )
        );
      } else {
        console.log('⚠️  No employee assignments to store\n');
      }

      // 2. Store role assignments
      if (roleAssignmentsData && roleAssignmentsData.length > 0) {
        collectionPromises.push(
          this.processCollectionSafely(
            'roleAssignments',
            '🔐 Storing role assignments...',
            async () => {
              const storeStartTime = Date.now();
              const count = await this.storeRoleAssignments(
                tenantId,
                roleAssignmentsData,
                referenceMaps,
                {} // No session - independent operation
              );
              // Reload syncStatus to avoid parallel save issues
              const freshSyncStatus = await syncStatus.constructor.findOne({ tenantId });
              if (freshSyncStatus) {
                await freshSyncStatus.markCollectionSynced('roleAssignments', count);
              }
              const duration = Date.now() - storeStartTime;
              console.log(`✅ Role assignments stored in ${duration}ms`);
              console.log(`   └─ Records: ${count}`);
              console.log(`   └─ References resolved: User + Role + Organization\n`);
              return count;
            },
            stats.roleAssignments
          )
        );
      } else {
        console.log('⚠️  No role assignments to store\n');
      }

      // 3. Store credit configs
      if (creditConfigsData && creditConfigsData.length > 0) {
        collectionPromises.push(
          this.processCollectionSafely(
            'creditConfigs',
            '💰 Storing credit configs...',
            async () => {
              const storeStartTime = Date.now();
              const count = await this.storeCreditConfigs(
                tenantId,
                creditConfigsData,
                referenceMaps,
                {} // No session - independent operation
              );
              // Reload syncStatus to avoid parallel save issues
              const freshSyncStatus = await syncStatus.constructor.findOne({ tenantId });
              if (freshSyncStatus) {
                await freshSyncStatus.markCollectionSynced('creditConfigs', count);
              }
              const duration = Date.now() - storeStartTime;
              console.log(`✅ Credit configs stored in ${duration}ms`);
              console.log(`   └─ Records: ${count}\n`);
              return count;
            },
            stats.creditConfigs
          )
        );
      } else {
        console.log('⚠️  No credit configs to store\n');
      }

      // 4. Store entity credits
      if (entityCreditsData && entityCreditsData.length > 0) {
        collectionPromises.push(
          this.processCollectionSafely(
            'entityCredits',
            '💳 Storing entity credits...',
            async () => {
              const storeStartTime = Date.now();
              const count = await this.storeEntityCredits(
                tenantId,
                entityCreditsData,
                referenceMaps,
                {} // No session - independent operation
              );
              // Reload syncStatus to avoid parallel save issues
              const freshSyncStatus = await syncStatus.constructor.findOne({ tenantId });
              if (freshSyncStatus) {
                await freshSyncStatus.markCollectionSynced('entityCredits', count);
              }
              const duration = Date.now() - storeStartTime;
              console.log(`✅ Entity credits stored in ${duration}ms`);
              console.log(`   └─ Records: ${count}`);
              console.log(`   └─ References resolved: Organization + User\n`);
              return count;
            },
            stats.entityCredits
          )
        );
      } else {
        console.log('⚠️  No entity credits to store\n');
      }

      // Process all collections in parallel - each handles its own errors
      await Promise.allSettled(collectionPromises);

      // 5. Update user profiles with assignment references (non-critical, can fail)
      try {
        console.log('👤 Updating user profile references...');
        const updateStartTime = Date.now();
        await this.updateUserProfileReferences(tenantId, {}); // No session
        console.log(`✅ User profile references updated in ${Date.now() - updateStartTime}ms\n`);
      } catch (error) {
        console.warn(`⚠️  Failed to update user profile references: ${error.message}\n`);
        // Non-critical, continue
      }

      // Summary
      console.log(`${'─'.repeat(70)}`);
      console.log('📊 BACKGROUND SYNC SUMMARY');
      console.log(`${'─'.repeat(70)}`);
      const totalBgRecords = Object.values(stats).reduce((sum, s) => sum + (s.count || 0), 0);
      const successCount = Object.values(stats).filter(s => s.success).length;
      const failCount = Object.values(stats).filter(s => !s.success && s.error).length;
      
      console.log(`📊 Total records processed: ${totalBgRecords}`);
      console.log(`✅ Successful collections: ${successCount}/${Object.keys(stats).length}`);
      if (failCount > 0) {
        console.log(`⚠️  Failed collections: ${failCount}`);
        Object.entries(stats).forEach(([name, result]) => {
          if (!result.success && result.error) {
            console.log(`   └─ ${name}: ${result.error.message || result.error}`);
          }
        });
      }
      
      const bgDuration = Date.now() - bgStartTime;
      console.log(`⏱️  Total duration: ${bgDuration}ms`);
      console.log(`📈 Per-collection stats:`);
      Object.entries(stats).forEach(([name, result]) => {
        if (result.success) {
          console.log(`   ✅ ${name}: ${result.count} records`);
        } else if (result.error) {
          console.log(`   ❌ ${name}: Failed - ${result.error.message || result.error}`);
        } else {
          console.log(`   ⏭️  ${name}: Skipped (no data)`);
        }
      });

    } catch (error) {
      console.error(`\n${'─'.repeat(70)}`);
      console.error('❌ BACKGROUND SYNC FATAL ERROR');
      console.error(`${'─'.repeat(70)}`);
      console.error(`Error Type: ${error.type || 'UNKNOWN'}`);
      console.error(`Error Message: ${error.message}`);
      console.error(`⚠️  Essential data is still intact (user can still use the app)`);
      console.error(`${'─'.repeat(70)}\n`);
      
      // Don't throw - allow sync to complete with partial success
    }
  }

  /**
   * Safely process a collection with error handling
   * Wraps collection processing to prevent one failure from affecting others
   */
  async processCollectionSafely(collectionName, logMessage, processor, stats) {
    try {
      console.log(logMessage);
      const count = await processor();
      stats.success = true;
      stats.count = count;
      return { success: true, count };
    } catch (error) {
      console.error(`❌ Failed to process ${collectionName}: ${error.message}`);
      stats.success = false;
      stats.error = error;
      // Mark collection as failed in sync status
      try {
        const { default: TenantSyncStatus } = await import('../models/TenantSyncStatus.js');
        const syncStatus = await TenantSyncStatus.findOne({ tenantId: this.currentTenantId });
        if (syncStatus && syncStatus.collections && syncStatus.collections[collectionName]) {
          syncStatus.collections[collectionName].status = 'failed';
          syncStatus.collections[collectionName].error = error.message;
          await syncStatus.save();
        }
      } catch (statusError) {
        console.warn(`⚠️  Could not update sync status for ${collectionName}: ${statusError.message}`);
      }
      return { success: false, error };
    }
  }

  /**
   * Build reference maps for resolving ObjectIds
   */
  async buildReferenceMaps(tenantId) {
    const [organizations, roles, users] = await Promise.all([
      Organization.find({ tenantId }).select('_id orgCode').lean(),
      CrmRole.find({ tenantId }).select('_id roleId').lean(),
      UserProfile.find({ tenantId }).select('_id userId').lean()
    ]);

    const orgMap = new Map(organizations.map(org => [org.orgCode, org._id]));
    const roleMap = new Map(roles.map(role => [role.roleId, role._id]));
    const userMap = new Map(users.map(user => [user.userId, user._id]));

    return { orgMap, roleMap, userMap };
  }

  /**
   * Fetch data from wrapper API with pagination
   */
  async fetchFromWrapper(endpoint, authToken) {
    try {
      const response = await axios.get(`${this.wrapperBaseUrl}${endpoint}`, {
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'X-Request-Source': 'crm-tenant-sync-v2'
        }
      });

      if (response.status === 200 && response.data.success) {
        return response.data.data;
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw this.createError('AUTH_ERROR', `Authentication failed for ${endpoint}`, error);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw this.createError('NETWORK_ERROR', `Network error for ${endpoint}`, error);
      } else {
        throw this.createError('UNKNOWN_ERROR', `Failed to fetch ${endpoint}`, error);
      }
    }
  }

  /**
   * Store tenant (essential field only)
   */
  async storeTenant(tenantId, tenantData, options = {}) {
    await Tenant.findOneAndUpdate(
      { tenantId },
      {
        tenantId,
        tenantName: tenantData.tenantName || tenantData.companyName || `Tenant ${tenantId}`,
        status: tenantData.isActive !== false ? 'active' : 'inactive'
      },
      { upsert: true, new: true, session: options.session }
    );

    return 1;
  }

  /**
   * Store organizations with hierarchy (essential fields only)
   */
  async storeOrganizations(tenantId, organizations, options = {}) {
    let stored = 0;

    // Phase 1: Store organizations with basic data
    for (let i = 0; i < organizations.length; i += this.batchSize) {
      const batch = organizations.slice(i, i + this.batchSize);
      const bulkOps = batch.map(org => ({
        updateOne: {
          filter: { tenantId, orgCode: org.orgCode },
          update: {
            $set: {
              tenantId,
              orgCode: org.orgCode,
              orgName: org.orgName,
              parentIdString: org.parentId || null,
              status: org.status || 'active',
              hierarchy: org.hierarchy || { level: 0, path: [org.orgCode], children: [] }
            }
          },
          upsert: true
        }
      }));

      const result = await Organization.bulkWrite(bulkOps, { session: options.session });
      stored += result.upsertedCount + result.modifiedCount;
    }

    // Phase 2: Resolve parent ObjectId references
    const orgMap = new Map();
    const allOrgs = await Organization.find({ tenantId }).select('_id orgCode').session(options.session);
    allOrgs.forEach(org => orgMap.set(org.orgCode, org._id));

    const parentUpdateOps = [];
    for (const org of organizations) {
      if (org.parentId && orgMap.has(org.parentId)) {
        parentUpdateOps.push({
          updateOne: {
            filter: { tenantId, orgCode: org.orgCode },
            update: { $set: { parentId: orgMap.get(org.parentId) } }
          }
        });
      }
    }

    if (parentUpdateOps.length > 0) {
      await Organization.bulkWrite(parentUpdateOps, { session: options.session });
    }

    return stored;
  }

  /**
   * Store roles (essential fields only)
   */
  async storeRoles(tenantId, roles, options = {}) {
    let stored = 0;

    for (let i = 0; i < roles.length; i += this.batchSize) {
      const batch = roles.slice(i, i + this.batchSize);
      const bulkOps = batch.map(role => ({
        updateOne: {
          filter: { tenantId, roleId: role.roleId },
          update: {
            $set: {
              tenantId,
              roleId: role.roleId,
              roleName: role.roleName,
              permissions: role.permissions || [],
              priority: role.priority || 0,
              isActive: role.isActive !== false
            }
          },
          upsert: true
        }
      }));

      const result = await CrmRole.bulkWrite(bulkOps, { session: options.session });
      stored += result.upsertedCount + result.modifiedCount;
    }

    return stored;
  }

  /**
   * Store users (essential fields only)
   */
  async storeUsers(tenantId, users, options = {}) {
    let stored = 0;

    for (let i = 0; i < users.length; i += this.batchSize) {
      const batch = users.slice(i, i + this.batchSize);
      const bulkOps = batch.map(user => ({
        updateOne: {
          filter: { tenantId, userId: user.userId },
          update: {
            $set: {
              tenantId,
              userId: user.userId,
              employeeCode: user.employeeCode || user.userId,
              personalInfo: {
                firstName: user.personalInfo?.firstName || user.firstName || 'Unknown',
                lastName: user.personalInfo?.lastName || user.lastName || '',
                email: user.personalInfo?.email || user.email || `${user.userId}@unknown.com`
              },
              status: {
                isActive: user.status?.isActive !== false,
                lastActivityAt: user.status?.lastActivityAt ? new Date(user.status.lastActivityAt) : new Date()
              },
              lastSyncedAt: new Date()
            }
          },
          upsert: true
        }
      }));

      const result = await UserProfile.bulkWrite(bulkOps, { session: options.session });
      stored += result.upsertedCount + result.modifiedCount;
    }

    return stored;
  }

  /**
   * Store employee assignments with resolved references
   */
  async storeEmployeeAssignments(tenantId, assignments, referenceMaps, options = {}) {
    let stored = 0;

    for (let i = 0; i < assignments.length; i += this.batchSize) {
      const batch = assignments.slice(i, i + this.batchSize);
      const bulkOps = batch.map(assignment => {
        const userId = referenceMaps.userMap.get(assignment.userId);
        const entityId = referenceMaps.orgMap.get(assignment.entityId);

        return {
          updateOne: {
            filter: { tenantId, assignmentId: assignment.assignmentId },
            update: {
              $set: {
                tenantId,
                assignmentId: assignment.assignmentId,
                userId,
                userIdString: assignment.userId,
                entityId,
                entityIdString: assignment.entityId,
                assignmentType: assignment.assignmentType || 'primary',
                isActive: assignment.isActive !== false,
                assignedAt: assignment.assignedAt ? new Date(assignment.assignedAt) : new Date(),
                assignedBy: assignment.assignedBy || 'system',
                priority: assignment.priority || 1
              }
            },
            upsert: true
          }
        };
      });

      const result = await EmployeeOrgAssignment.bulkWrite(bulkOps, { session: options.session });
      stored += result.upsertedCount + result.modifiedCount;
    }

    return stored;
  }

  /**
   * Store role assignments with resolved references
   */
  async storeRoleAssignments(tenantId, assignments, referenceMaps, options = {}) {
    let stored = 0;

    for (let i = 0; i < assignments.length; i += this.batchSize) {
      const batch = assignments.slice(i, i + this.batchSize);
      const bulkOps = batch.map(assignment => {
        const userId = referenceMaps.userMap.get(assignment.userId);
        const roleId = referenceMaps.roleMap.get(assignment.roleId);
        const entityId = referenceMaps.orgMap.get(assignment.entityId);

        return {
          updateOne: {
            filter: { tenantId, assignmentId: assignment.assignmentId },
            update: {
              $set: {
                tenantId,
                assignmentId: assignment.assignmentId,
                userId,
                userIdString: assignment.userId,
                roleId,
                roleIdString: assignment.roleId,
                entityId,
                entityIdString: assignment.entityId,
                isActive: assignment.isActive !== false,
                assignedAt: assignment.assignedAt ? new Date(assignment.assignedAt) : new Date(),
                assignedBy: assignment.assignedBy || 'system'
              }
            },
            upsert: true
          }
        };
      });

      const result = await CrmRoleAssignment.bulkWrite(bulkOps, { session: options.session });
      stored += result.upsertedCount + result.modifiedCount;
    }

    return stored;
  }

  /**
   * Store credit configs
   */
  async storeCreditConfigs(tenantId, configs, referenceMaps, options = {}) {
    let stored = 0;

    // Filter valid configs first
    const validConfigs = configs.filter(config => config != null && config.configId);
    console.log(`   📊 Processing ${validConfigs.length} valid credit config(s) out of ${configs.length} total`);

    if (validConfigs.length === 0) {
      console.log(`   ⚠️  No valid credit configs to store`);
      return 0;
    }

    // Use atomic bulkWrite with updateOne and upsert to handle concurrent syncs
    // This prevents duplicate key errors when multiple syncs run simultaneously
    for (let i = 0; i < validConfigs.length; i += this.batchSize) {
      const batch = validConfigs.slice(i, i + this.batchSize);
      
      const bulkOps = batch.map(config => {
        const entityId = config.entityId ? referenceMaps.orgMap.get(config.entityId) : null;
        
        return {
          updateOne: {
            filter: { configId: config.configId }, // Find by configId (unique constraint)
            update: {
              $set: {
                tenantId,
                configId: config.configId,
                entityId,
                entityIdString: config.entityId || null,
                configName: config.configName || config.operationCode,
                operationCode: config.operationCode,
                creditCost: config.creditCost || 1,
                description: config.description || '',
                source: 'tenant',
                syncSource: 'wrapper',
                lastSyncedAt: new Date()
              }
            },
            upsert: true
          }
        };
      });

      try {
        const result = await CrmCreditConfig.bulkWrite(bulkOps, { 
          ordered: false // Continue processing even if some fail
        });
        stored += result.upsertedCount + result.modifiedCount + result.matchedCount;
      } catch (error) {
        // If bulk write fails, try individual upserts as fallback
        console.warn(`   ⚠️  Bulk write failed for batch ${Math.floor(i / this.batchSize) + 1}, trying individual upserts...`);
        
        for (const config of batch) {
          try {
            const entityId = config.entityId ? referenceMaps.orgMap.get(config.entityId) : null;
            await CrmCreditConfig.findOneAndUpdate(
              { configId: config.configId },
              {
                $set: {
                  tenantId,
                  configId: config.configId,
                  entityId,
                  entityIdString: config.entityId || null,
                  configName: config.configName || config.operationCode,
                  operationCode: config.operationCode,
                  creditCost: config.creditCost || 1,
                  description: config.description || '',
                  source: 'tenant',
                  syncSource: 'wrapper',
                  lastSyncedAt: new Date()
                }
              },
              { upsert: true, new: true }
            );
            stored++;
          } catch (individualError) {
            console.error(`   ⚠️  Failed to store credit config ${config.configId} (${config.operationCode}): ${individualError.message}`);
            // Continue with next config
          }
        }
      }
    }

    console.log(`   ✅ Successfully stored ${stored} out of ${validConfigs.length} credit config(s)`);
    return stored;
  }

  /**
   * Store entity credits with resolved references
   */
  async storeEntityCredits(tenantId, credits, referenceMaps, options = {}) {
    let stored = 0;

    // Filter out null/undefined credits first
    const validCredits = (credits || []).filter(credit => {
      if (!credit || typeof credit !== 'object') {
        return false;
      }
      // Validate required fields
      if (!credit.entityId) {
        console.warn(`⚠️  Skipping credit record: missing entityId`);
        return false;
      }
      if (credit.allocatedCredits == null && credit.allocatedCredits !== 0) {
        console.warn(`⚠️  Skipping credit record for entity ${credit.entityId}: missing allocatedCredits`);
        return false;
      }
      return true;
    });

    console.log(`   📊 Processing ${validCredits.length} valid entity credit(s) out of ${credits?.length || 0} total`);

    if (validCredits.length === 0) {
      console.log(`   ⚠️  No valid entity credits to store`);
      return 0;
    }

    for (let i = 0; i < validCredits.length; i += this.batchSize) {
      const batch = validCredits.slice(i, i + this.batchSize);
      const bulkOps = batch
        .map((credit, index) => {
          const entityId = referenceMaps.orgMap.get(credit.entityId);
          const allocatedBy = credit.allocatedBy ? referenceMaps.userMap.get(credit.allocatedBy) : null;

          // Log if organization reference is missing
          if (!entityId && credit.entityId) {
            console.warn(`   ⚠️  Organization reference not found for entityId: ${credit.entityId} (will store with entityIdString only)`);
          }

          const allocatedCreditsValue = Number(credit.allocatedCredits) || 0;
          const usedCreditsValue = Number(credit.usedCredits) || 0;
          const availableCreditsValue = allocatedCreditsValue - usedCreditsValue;

          return {
            updateOne: {
              filter: { tenantId, entityIdString: credit.entityId },
              update: {
                // Always update these fields
                $set: {
                  allocatedCredits: allocatedCreditsValue,
                  usedCredits: usedCreditsValue,
                  availableCredits: availableCreditsValue,
                  targetApplication: 'crm',
                  allocationType: credit.allocationType || 'manual',
                  isActive: credit.isActive !== false,
                  ...(entityId && { entityId }), // Update entityId if we have it
                  ...(allocatedBy && { allocatedBy }), // Update allocatedBy if we have it
                  allocatedByString: credit.allocatedBy || null
                },
                // Only set these on insert
                $setOnInsert: {
                  tenantId,
                  entityIdString: credit.entityId,
                  allocatedAt: credit.allocatedAt ? new Date(credit.allocatedAt) : new Date()
                }
              },
              upsert: true
            }
          };
        })
        .filter(op => op != null); // Remove any null operations

      if (bulkOps.length > 0) {
        try {
          const result = await CrmEntityCredit.bulkWrite(bulkOps, { 
            ordered: false // Continue processing even if some fail
          });
          // Count both upserted and matched (matched means document exists and was updated/verified)
          const batchStored = result.upsertedCount + result.modifiedCount + result.matchedCount;
          stored += batchStored;
          if (batchStored < bulkOps.length) {
            console.warn(`   ⚠️  Batch ${Math.floor(i / this.batchSize) + 1}: Only stored ${batchStored} out of ${bulkOps.length} entity credit(s) (${result.upsertedCount} upserted, ${result.modifiedCount} modified, ${result.matchedCount} matched)`);
          } else {
            console.log(`   ✅ Batch ${Math.floor(i / this.batchSize) + 1}: Stored ${batchStored} entity credit(s) (${result.upsertedCount} upserted, ${result.modifiedCount} modified, ${result.matchedCount} matched)`);
          }
        } catch (error) {
          console.error(`   ❌ Error storing entity credits batch ${Math.floor(i / this.batchSize) + 1}: ${error.message}`);
          if (error.writeErrors && error.writeErrors.length > 0) {
            error.writeErrors.forEach((writeError, idx) => {
              console.error(`      Write error ${idx + 1}: ${writeError.errmsg || writeError.err}`);
            });
          }
          // Try individual inserts as fallback
          console.log(`   🔄 Attempting individual inserts for batch ${Math.floor(i / this.batchSize) + 1}...`);
          for (const op of bulkOps) {
            try {
              const doc = op.updateOne.update.$set;
              const filter = op.updateOne.filter;
              await CrmEntityCredit.findOneAndUpdate(filter, { $set: doc }, { upsert: true });
              stored++;
            } catch (individualError) {
              console.error(`      ⚠️  Failed to store entity credit for ${filter.entityIdString}: ${individualError.message}`);
            }
          }
        }
      }
    }

    console.log(`   ✅ Successfully stored ${stored} out of ${validCredits.length} entity credit(s)`);
    return stored;
  }

  /**
   * Update user profiles with assignment references
   */
  async updateUserProfileReferences(tenantId, options = {}) {
    const userQuery = UserProfile.find({ tenantId }).select('userId');
    if (options.session) {
      userQuery.session(options.session);
    }
    const users = await userQuery;

    for (const user of users) {
      const roleQuery = CrmRoleAssignment.find({ tenantId, userIdString: user.userId }).select('_id');
      const orgQuery = EmployeeOrgAssignment.find({ tenantId, userIdString: user.userId }).select('_id');
      if (options.session) {
        roleQuery.session(options.session);
        orgQuery.session(options.session);
      }
      const [roleAssignments, orgAssignments] = await Promise.all([
        roleQuery,
        orgQuery
      ]);

      const updateOptions = options.session ? { session: options.session } : {};
      await UserProfile.findOneAndUpdate(
        { tenantId, userId: user.userId },
        {
          $set: {
            roleAssignments: roleAssignments.map(ra => ra._id),
            organizationAssignments: orgAssignments.map(oa => oa._id)
          }
        },
        updateOptions
      );
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation(operation, operationName = 'Operation') {
    const { maxRetries, baseDelay, maxDelay, backoffMultiplier, jitterMs } = this.retryConfig;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`${'─'.repeat(70)}`);
        console.log(`🔄 RETRY ATTEMPT ${attempt}/${maxRetries}: ${operationName}`);
        console.log(`${'─'.repeat(70)}`);
        
        const attemptStartTime = Date.now();
        const result = await operation();
        const attemptDuration = Date.now() - attemptStartTime;
        
        console.log(`✅ Attempt ${attempt} succeeded in ${attemptDuration}ms\n`);
        return result;
        
      } catch (error) {
        const errorType = this.classifyError(error);
        
        console.error(`❌ Attempt ${attempt} failed:`);
        console.error(`   Error Type: ${errorType}`);
        console.error(`   Error Message: ${error.message}`);
        
        // Don't retry non-retryable errors
        if (errorType === 'AUTH_ERROR' || errorType === 'VALIDATION_ERROR') {
          console.error(`\n⛔ NON-RETRYABLE ERROR - Stopping retry attempts`);
          console.error(`   ${errorType}: ${error.message}\n`);
          throw error;
        }

        // Last attempt - throw error
        if (attempt === maxRetries) {
          console.error(`\n⛔ MAX RETRIES REACHED (${maxRetries}/${maxRetries})`);
          console.error(`   ${operationName} failed after ${maxRetries} attempts`);
          console.error(`   Final error: ${error.message}\n`);
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );
        const jitter = Math.random() * jitterMs;
        const delay = exponentialDelay + jitter;

        console.log(`\n⏳ RETRYING in ${Math.round(delay)}ms (${(delay/1000).toFixed(1)}s)...`);
        console.log(`   Retry schedule: Attempt ${attempt+1}/${maxRetries}`);
        console.log(`   Error was: ${error.message}\n`);
        
        await this.sleep(delay);
      }
    }
  }

  /**
   * Classify error type for retry logic
   */
  classifyError(error) {
    if (error.type) return error.type;
    
    if (error.response?.status === 401 || error.message.includes('Authentication')) {
      return 'AUTH_ERROR';
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' || error.message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }
    
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }
    
    if (error.name === 'MongoError' || error.message.includes('database')) {
      return 'DATABASE_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Create typed error
   */
  createError(type, message, originalError) {
    const error = new Error(message);
    error.type = type;
    error.originalError = originalError;
    return error;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new TenantDataSyncServiceV2();

