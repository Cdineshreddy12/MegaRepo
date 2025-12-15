import { db } from '../../../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

class OnboardingTrackingService {
  // Track onboarding phase completion/progress
  async trackOnboardingPhase(tenantId, phase, status, metadata = {}) {
    try {
      console.log('📊 Tracking onboarding phase:', { tenantId, phase, status });

      const {
        userId,
        sessionId,
        ipAddress,
        userAgent,
        eventData = {}
      } = metadata;

      // Create tracking record
      const trackingId = uuidv4();
      const trackingRecord = {
        trackingId,
        tenantId,
        phase,
        status,
        userId: userId || null,
        sessionId: sessionId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        eventData: JSON.stringify(eventData),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // In a real implementation, you'd save this to a database table
      // For now, just log it
      console.log('✅ Onboarding phase tracked:', {
        trackingId,
        tenantId,
        phase,
        status,
        userId,
        sessionId,
        eventData: Object.keys(eventData)
      });

      // Store in memory for this session (in production, use database)
      this._storeTrackingRecord(trackingRecord);

      return {
        success: true,
        trackingId,
        tenantId,
        phase,
        status
      };

    } catch (error) {
      console.error('❌ Error tracking onboarding phase:', error);
      throw error;
    }
  }

  // Get onboarding progress for a tenant
  async getOnboardingProgress(tenantId) {
    try {
      console.log('📊 Getting onboarding progress for tenant:', tenantId);

      // Get completed phases
      const completedPhases = this._getCompletedPhases(tenantId);

      // Calculate overall progress
      const totalPhases = ['profile', 'payment', 'upgrade', 'trial'];
      const completedCount = completedPhases.length;
      const progressPercentage = (completedCount / totalPhases.length) * 100;

      const progress = {
        tenantId,
        totalPhases: totalPhases.length,
        completedPhases: completedCount,
        progressPercentage: Math.round(progressPercentage),
        completedPhaseList: completedPhases,
        remainingPhases: totalPhases.filter(phase => !completedPhases.includes(phase)),
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Onboarding progress calculated:', progress);
      return progress;

    } catch (error) {
      console.error('❌ Error getting onboarding progress:', error);
      throw error;
    }
  }

  // Get onboarding analytics
  async getOnboardingAnalytics(tenantId, options = {}) {
    try {
      const { startDate, endDate, phase } = options;

      console.log('📊 Getting onboarding analytics:', { tenantId, phase, startDate, endDate });

      // Get tracking records for the tenant
      const records = this._getTrackingRecords(tenantId, { startDate, endDate, phase });

      // Calculate analytics
      const analytics = {
        tenantId,
        totalEvents: records.length,
        phasesCompleted: {},
        averageCompletionTime: 0,
        completionRates: {},
        generatedAt: new Date().toISOString()
      };

      // Group by phase and status
      records.forEach(record => {
        if (!analytics.phasesCompleted[record.phase]) {
          analytics.phasesCompleted[record.phase] = {};
        }
        if (!analytics.phasesCompleted[record.phase][record.status]) {
          analytics.phasesCompleted[record.phase][record.status] = 0;
        }
        analytics.phasesCompleted[record.phase][record.status]++;
      });

      console.log('✅ Onboarding analytics generated:', analytics);
      return analytics;

    } catch (error) {
      console.error('❌ Error getting onboarding analytics:', error);
      throw error;
    }
  }

  // Helper method to store tracking records (in-memory for now)
  _storeTrackingRecord(record) {
    if (!this._trackingRecords) {
      this._trackingRecords = [];
    }
    this._trackingRecords.push(record);
  }

  // Helper method to get completed phases
  _getCompletedPhases(tenantId) {
    if (!this._trackingRecords) {
      return [];
    }

    const tenantRecords = this._trackingRecords.filter(r => r.tenantId === tenantId);
    const completedPhases = new Set();

    tenantRecords.forEach(record => {
      if (record.status === 'completed') {
        completedPhases.add(record.phase);
      }
    });

    return Array.from(completedPhases);
  }

  // Helper method to get tracking records with filters
  _getTrackingRecords(tenantId, filters = {}) {
    if (!this._trackingRecords) {
      return [];
    }

    let records = this._trackingRecords.filter(r => r.tenantId === tenantId);

    if (filters.phase) {
      records = records.filter(r => r.phase === filters.phase);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      records = records.filter(r => new Date(r.createdAt) >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      records = records.filter(r => new Date(r.createdAt) <= end);
    }

    return records;
  }

  // Clear tracking records (for testing)
  _clearRecords() {
    this._trackingRecords = [];
  }
}

export { OnboardingTrackingService };
export default new OnboardingTrackingService();
