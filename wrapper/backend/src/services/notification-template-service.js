import { db } from '../db/index.js';
import { notificationTemplates, TEMPLATE_CATEGORIES } from '../db/schema/notification-templates.js';
import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../db/schema/notifications.js';
import { notificationCacheService } from './notification-cache-service.js';

class NotificationTemplateService {
  /**
   * Create a notification template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  async createTemplate(templateData) {
    try {
      const {
        name,
        category = TEMPLATE_CATEGORIES.CUSTOM,
        description,
        type = NOTIFICATION_TYPES.SYSTEM_UPDATE,
        priority = NOTIFICATION_PRIORITIES.MEDIUM,
        title,
        message,
        actionUrl,
        actionLabel,
        variables = {},
        metadata = {},
        isActive = true,
        isSystem = false,
        version = '1.0.0',
        createdBy
      } = templateData;

      // Validate createdBy is a valid UUID if provided
      if (createdBy && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(createdBy)) {
        throw new Error(`Invalid createdBy UUID format: ${createdBy}`);
      }

      const [template] = await db
        .insert(notificationTemplates)
        .values({
          name,
          category,
          description,
          type,
          priority,
          title,
          message,
          actionUrl,
          actionLabel,
          variables,
          metadata,
          isActive,
          isSystem,
          version,
          createdBy: createdBy || null
        })
        .returning();

      console.log(`📝 Created notification template: ${name}`);
      return template;
    } catch (error) {
      console.error('Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Get all templates
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Templates
   */
  async getTemplates(options = {}) {
    try {
      // Check cache first
      const cacheKey = { ...options };
      const cached = await notificationCacheService.getTemplateList(cacheKey);
      if (cached) {
        return cached;
      }

      const {
        category,
        type,
        isActive, // Don't default - allow undefined to show all
        search,
        limit = 100,
        offset = 0
      } = options;

      const whereConditions = [];

      // Only filter by isActive if explicitly provided
      // undefined means show all (both active and inactive)
      if (isActive !== undefined && isActive !== null) {
        const activeValue = typeof isActive === 'string' ? isActive === 'true' : isActive;
        whereConditions.push(eq(notificationTemplates.isActive, activeValue));
      }

      if (category) {
        whereConditions.push(eq(notificationTemplates.category, category));
      }

      if (type) {
        whereConditions.push(eq(notificationTemplates.type, type));
      }

      if (search) {
        whereConditions.push(
          or(
            like(notificationTemplates.name, `%${search}%`),
            like(notificationTemplates.title, `%${search}%`),
            like(notificationTemplates.description, `%${search}%`)
          )
        );
      }

      const templates = await db
        .select()
        .from(notificationTemplates)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(notificationTemplates.createdAt))
        .limit(limit)
        .offset(offset);

      // Cache results
      await notificationCacheService.cacheTemplateList(cacheKey, templates);

      return templates;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Template
   */
  async getTemplate(templateId) {
    try {
      // Check cache first
      const cached = await notificationCacheService.getTemplate(templateId);
      if (cached) {
        return cached;
      }

      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.templateId, templateId))
        .limit(1);

      if (!template) {
        throw new Error('Template not found');
      }

      // Cache template
      await notificationCacheService.cacheTemplate(templateId, template);

      return template;
    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    }
  }

  /**
   * Update template
   * @param {string} templateId - Template ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated template
   */
  async updateTemplate(templateId, updateData) {
    try {
      // Check if template exists and is not a system template
      const [existing] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.templateId, templateId))
        .limit(1);

      if (!existing) {
        throw new Error('Template not found');
      }

      if (existing.isSystem && updateData.isSystem === false) {
        throw new Error('Cannot modify system template');
      }

      const [template] = await db
        .update(notificationTemplates)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(notificationTemplates.templateId, templateId))
        .returning();

      console.log(`✅ Updated notification template: ${templateId}`);
      
      // Invalidate cache
      await notificationCacheService.invalidateTemplate(templateId);
      
      return template;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   * @param {string} templateId - Template ID
   * @returns {Promise<boolean>} Success
   */
  async deleteTemplate(templateId) {
    try {
      // Check if template is system template
      const [existing] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.templateId, templateId))
        .limit(1);

      if (!existing) {
        throw new Error('Template not found');
      }

      if (existing.isSystem) {
        throw new Error('Cannot delete system template');
      }

      await db
        .delete(notificationTemplates)
        .where(eq(notificationTemplates.templateId, templateId));

      console.log(`🗑️ Deleted notification template: ${templateId}`);
      
      // Invalidate cache
      await notificationCacheService.invalidateTemplate(templateId);
      
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Render template with variables
   * @param {string} templateId - Template ID
   * @param {Object} variables - Variables to substitute
   * @returns {Promise<Object>} Rendered notification data
   */
  async renderTemplate(templateId, variables = {}) {
    try {
      const template = await this.getTemplate(templateId);

      // Simple variable substitution
      let title = template.title;
      let message = template.message;
      let actionUrl = template.actionUrl;
      let actionLabel = template.actionLabel;

      // Replace variables in title and message
      Object.keys(variables).forEach(key => {
        const value = variables[key];
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        title = title.replace(regex, value);
        message = message.replace(regex, value);
        if (actionUrl) {
          actionUrl = actionUrl.replace(regex, value);
        }
        if (actionLabel) {
          actionLabel = actionLabel.replace(regex, value);
        }
      });

      // Update last used timestamp
      await db
        .update(notificationTemplates)
        .set({
          lastUsedAt: new Date()
        })
        .where(eq(notificationTemplates.templateId, templateId));

      return {
        type: template.type,
        priority: template.priority,
        title,
        message,
        actionUrl,
        actionLabel,
        metadata: {
          ...template.metadata,
          templateId: template.templateId,
          templateName: template.name,
          variables
        }
      };
    } catch (error) {
      console.error('Error rendering template:', error);
      throw error;
    }
  }

  /**
   * Get template categories
   * @returns {Object} Categories
   */
  getCategories() {
    return TEMPLATE_CATEGORIES;
  }
}

export { NotificationTemplateService };
export default NotificationTemplateService;
