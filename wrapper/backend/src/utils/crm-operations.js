import { CRMAuditLogger } from '../middleware/crm-auth-middleware.js';

/**
 * 🛠️ CRM OPERATIONS UTILITY
 * Provides user-context-aware CRUD operations for all CRM modules
 * Integrates automatic audit logging and permission validation
 */
export class CRMOperations {
  
  /**
   * 📝 CREATE OPERATION
   * Creates a new record with user context and audit logging
   */
  static async create(req, model, data, options = {}) {
    const { module = 'unknown', entityType = 'unknown', skipAudit = false } = options;
    
    if (!req.userContext) {
      throw new Error('User context required for CRM operations');
    }

    try {
      // Ensure tenant isolation
      const recordData = {
        ...data,
        tenantId: req.userContext.tenantId,
        createdBy: req.userContext.userId,
        updatedBy: req.userContext.userId
      };

      // Create the record
      const record = await model.create(recordData);

      // Log the operation
      if (!skipAudit) {
        await CRMAuditLogger.logOperation(req, {
          action: 'create',
          module,
          description: `Created new ${entityType}`
        }, entityType, record._id || record.id, {
          newValues: recordData,
          name: data.name || data.companyName || data.title || data.subject
        });
      }

      console.log(`✅ CRM: Created ${entityType} by ${req.userContext.email}`, {
        id: record._id || record.id,
        tenant: req.userContext.tenantId
      });

      return record;
    } catch (error) {
      console.error(`❌ CRM: Failed to create ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * 📖 READ OPERATION
   * Retrieves records with proper tenant isolation and user permissions
   */
  static async read(req, model, filters = {}, options = {}) {
    const { module = 'unknown', entityType = 'unknown', skipAudit = false, populate = [] } = options;
    
    if (!req.userContext) {
      throw new Error('User context required for CRM operations');
    }

    try {
      // Apply tenant isolation
      const query = {
        ...filters,
        tenantId: req.userContext.tenantId
      };

      // Apply user-based filtering if not admin
      if (!req.userContext.isTenantAdmin) {
        // Check if user has read_all permission for this module
        const hasReadAll = req.userContext.hasPermission(`crm.${module}.read_all`);
        
        if (!hasReadAll) {
          // Restrict to records owned/assigned to user
          query.$or = [
            { createdBy: req.userContext.userId },
            { assignedTo: req.userContext.userId },
            { ownerId: req.userContext.userId }
          ];
        }
      }

      let queryBuilder = model.find(query);
      
      // Apply population if specified
      populate.forEach(field => {
        queryBuilder = queryBuilder.populate(field);
      });

      const records = await queryBuilder.exec();

      // Log the operation (optional for read operations)
      if (!skipAudit && records.length > 0) {
        await CRMAuditLogger.logOperation(req, {
          action: 'read',
          module,
          description: `Retrieved ${records.length} ${entityType} records`
        }, entityType, 'multiple', {
          recordCount: records.length
        });
      }

      return records;
    } catch (error) {
      console.error(`❌ CRM: Failed to read ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * 📝 UPDATE OPERATION
   * Updates a record with user context and change tracking
   */
  static async update(req, model, id, updateData, options = {}) {
    const { module = 'unknown', entityType = 'unknown', skipAudit = false } = options;
    
    if (!req.userContext) {
      throw new Error('User context required for CRM operations');
    }

    try {
      // Find the existing record first
      const existingRecord = await model.findOne({
        _id: id,
        tenantId: req.userContext.tenantId
      });

      if (!existingRecord) {
        throw new Error(`${entityType} not found or access denied`);
      }

      // Check if user can update this record
      if (!req.userContext.isTenantAdmin) {
        const hasUpdateAll = req.userContext.hasPermission(`crm.${module}.update_all`);
        
        if (!hasUpdateAll) {
          // Check if user owns or is assigned to this record
          const canUpdate = existingRecord.createdBy?.toString() === req.userContext.userId ||
                           existingRecord.assignedTo?.toString() === req.userContext.userId ||
                           existingRecord.ownerId?.toString() === req.userContext.userId;
          
          if (!canUpdate) {
            throw new Error('Permission denied: Cannot update this record');
          }
        }
      }

      // Prepare update data
      const finalUpdateData = {
        ...updateData,
        updatedBy: req.userContext.userId,
        updatedAt: new Date()
      };

      // Update the record
      const updatedRecord = await model.findByIdAndUpdate(
        id, 
        finalUpdateData, 
        { new: true, runValidators: true }
      );

      // Track changes for audit
      const changedFields = Object.keys(updateData);
      const oldValues = {};
      changedFields.forEach(field => {
        oldValues[field] = existingRecord[field];
      });

      // Log the operation
      if (!skipAudit) {
        await CRMAuditLogger.logOperation(req, {
          action: 'update',
          module,
          description: `Updated ${entityType}`
        }, entityType, id, {
          oldValues,
          newValues: updateData,
          changedFields,
          name: updatedRecord.name || updatedRecord.companyName || updatedRecord.title
        });
      }

      console.log(`✅ CRM: Updated ${entityType} by ${req.userContext.email}`, {
        id,
        changedFields,
        tenant: req.userContext.tenantId
      });

      return updatedRecord;
    } catch (error) {
      console.error(`❌ CRM: Failed to update ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * 🗑️ DELETE OPERATION
   * Deletes a record with proper permissions and audit logging
   */
  static async delete(req, model, id, options = {}) {
    const { module = 'unknown', entityType = 'unknown', skipAudit = false, softDelete = true } = options;
    
    if (!req.userContext) {
      throw new Error('User context required for CRM operations');
    }

    try {
      // Find the existing record first
      const existingRecord = await model.findOne({
        _id: id,
        tenantId: req.userContext.tenantId
      });

      if (!existingRecord) {
        throw new Error(`${entityType} not found or access denied`);
      }

      // Check if user can delete this record
      if (!req.userContext.isTenantAdmin) {
        const hasDeleteAll = req.userContext.hasPermission(`crm.${module}.delete_all`);
        
        if (!hasDeleteAll) {
          // Check if user owns this record
          const canDelete = existingRecord.createdBy?.toString() === req.userContext.userId;
          
          if (!canDelete) {
            throw new Error('Permission denied: Cannot delete this record');
          }
        }
      }

      let result;
      
      if (softDelete) {
        // Soft delete - mark as deleted
        result = await model.findByIdAndUpdate(id, {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.userContext.userId
        }, { new: true });
      } else {
        // Hard delete
        result = await model.findByIdAndDelete(id);
      }

      // Log the operation
      if (!skipAudit) {
        await CRMAuditLogger.logOperation(req, {
          action: softDelete ? 'soft_delete' : 'delete',
          module,
          description: `${softDelete ? 'Soft deleted' : 'Permanently deleted'} ${entityType}`
        }, entityType, id, {
          oldValues: existingRecord.toObject(),
          name: existingRecord.name || existingRecord.companyName || existingRecord.title
        });
      }

      console.log(`✅ CRM: ${softDelete ? 'Soft deleted' : 'Deleted'} ${entityType} by ${req.userContext.email}`, {
        id,
        tenant: req.userContext.tenantId
      });

      return result;
    } catch (error) {
      console.error(`❌ CRM: Failed to delete ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 ASSIGN OPERATION
   * Assigns a record to a user with proper permissions
   */
  static async assign(req, model, id, assignToUserId, options = {}) {
    const { module = 'unknown', entityType = 'unknown', skipAudit = false } = options;
    
    if (!req.userContext) {
      throw new Error('User context required for CRM operations');
    }

    try {
      // Check assignment permission
      if (!req.userContext.hasPermission(`crm.${module}.assign`)) {
        throw new Error('Permission denied: Cannot assign records');
      }

      // Find the existing record
      const existingRecord = await model.findOne({
        _id: id,
        tenantId: req.userContext.tenantId
      });

      if (!existingRecord) {
        throw new Error(`${entityType} not found or access denied`);
      }

      const oldAssignee = existingRecord.assignedTo;

      // Update assignment
      const updatedRecord = await model.findByIdAndUpdate(id, {
        assignedTo: assignToUserId,
        updatedBy: req.userContext.userId,
        updatedAt: new Date()
      }, { new: true });

      // Log the operation
      if (!skipAudit) {
        await CRMAuditLogger.logOperation(req, {
          action: 'assign',
          module,
          description: `Assigned ${entityType} to user`
        }, entityType, id, {
          oldValues: { assignedTo: oldAssignee },
          newValues: { assignedTo: assignToUserId },
          changedFields: ['assignedTo'],
          name: updatedRecord.name || updatedRecord.companyName || updatedRecord.title
        });
      }

      console.log(`✅ CRM: Assigned ${entityType} by ${req.userContext.email}`, {
        id,
        assignedTo: assignToUserId,
        tenant: req.userContext.tenantId
      });

      return updatedRecord;
    } catch (error) {
      console.error(`❌ CRM: Failed to assign ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * 📊 BULK OPERATIONS
   * Performs bulk operations with proper permissions and audit logging
   */
  static async bulkOperation(req, model, operation, filters, updateData = {}, options = {}) {
    const { module = 'unknown', entityType = 'unknown', skipAudit = false } = options;
    
    if (!req.userContext) {
      throw new Error('User context required for CRM operations');
    }

    try {
      // Check bulk operation permission
      if (!req.userContext.hasPermission('crm.bulk_operations')) {
        throw new Error('Permission denied: Cannot perform bulk operations');
      }

      // Apply tenant isolation to filters
      const query = {
        ...filters,
        tenantId: req.userContext.tenantId
      };

      let result;
      
      switch (operation) {
        case 'update':
          const finalUpdateData = {
            ...updateData,
            updatedBy: req.userContext.userId,
            updatedAt: new Date()
          };
          
          result = await model.updateMany(query, finalUpdateData);
          break;
          
        case 'delete':
          if (options.softDelete !== false) {
            result = await model.updateMany(query, {
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: req.userContext.userId
            });
          } else {
            result = await model.deleteMany(query);
          }
          break;
          
        default:
          throw new Error(`Unsupported bulk operation: ${operation}`);
      }

      // Log the operation
      if (!skipAudit) {
        await CRMAuditLogger.logOperation(req, {
          action: `bulk_${operation}`,
          module,
          description: `Bulk ${operation} operation on ${entityType}`
        }, entityType, 'multiple', {
          affectedCount: result.modifiedCount || result.deletedCount,
          filters
        });
      }

      console.log(`✅ CRM: Bulk ${operation} ${entityType} by ${req.userContext.email}`, {
        affected: result.modifiedCount || result.deletedCount,
        tenant: req.userContext.tenantId
      });

      return result;
    } catch (error) {
      console.error(`❌ CRM: Failed bulk ${operation} ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * 🔍 SEARCH OPERATION
   * Performs search with proper tenant isolation and permissions
   */
  static async search(req, model, searchQuery, searchFields = [], options = {}) {
    const { module = 'unknown', entityType = 'unknown', limit = 50, skip = 0 } = options;
    
    if (!req.userContext) {
      throw new Error('User context required for CRM operations');
    }

    try {
      // Build search filters
      const searchFilters = {
        tenantId: req.userContext.tenantId
      };

      if (searchQuery && searchFields.length > 0) {
        searchFilters.$or = searchFields.map(field => ({
          [field]: { $regex: searchQuery, $options: 'i' }
        }));
      }

      // Apply user-based filtering if not admin
      if (!req.userContext.isTenantAdmin) {
        const hasReadAll = req.userContext.hasPermission(`crm.${module}.read_all`);
        
        if (!hasReadAll) {
          if (searchFilters.$or) {
            searchFilters.$and = [
              { $or: searchFilters.$or },
              {
                $or: [
                  { createdBy: req.userContext.userId },
                  { assignedTo: req.userContext.userId },
                  { ownerId: req.userContext.userId }
                ]
              }
            ];
            delete searchFilters.$or;
          } else {
            searchFilters.$or = [
              { createdBy: req.userContext.userId },
              { assignedTo: req.userContext.userId },
              { ownerId: req.userContext.userId }
            ];
          }
        }
      }

      const results = await model.find(searchFilters)
        .limit(limit)
        .skip(skip)
        .sort({ updatedAt: -1 });

      console.log(`🔍 CRM: Search ${entityType} by ${req.userContext.email}`, {
        query: searchQuery,
        results: results.length,
        tenant: req.userContext.tenantId
      });

      return results;
    } catch (error) {
      console.error(`❌ CRM: Failed to search ${entityType}:`, error);
      throw error;
    }
  }
}

/**
 * 🔧 CRM RESPONSE HELPERS
 * Standard response formatting for CRM operations
 */
export class CRMResponse {
  
  static success(res, data, message = 'Operation successful', metadata = {}) {
    return res.status(200).json({
      success: true,
      message,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }

  static created(res, data, message = 'Resource created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  static error(res, message, statusCode = 400, details = {}) {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  static unauthorized(res, message = 'Authentication required') {
    return res.status(401).json({
      success: false,
      error: message,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  static forbidden(res, message = 'Insufficient permissions') {
    return res.status(403).json({
      success: false,
      error: message,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      error: message,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }
}

export default CRMOperations; 