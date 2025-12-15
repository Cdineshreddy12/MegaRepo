import { useState, useCallback, useEffect, useMemo } from "react";
import { applicationAssignmentAPI } from "@/lib/api";
import useOrganizationAuth from "./useOrganizationAuth";
import { Application } from "@/types/application";
import toast from "react-hot-toast";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showAppDetails, setShowAppDetails] = useState(false);

  const { tenantId, isAuthenticated } = useOrganizationAuth();

  /**
   * Fetch tenant-specific applications from the API
   */
  const fetchApplications = useCallback(async () => {
    if (!tenantId) {
      setApplications([]);
      setIsLoading(false);
      return;
    }

    if (isAuthenticated === false) {
      setApplications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await applicationAssignmentAPI.getTenantApplications(tenantId);
      const data = response.data?.data?.applications || response.data?.applications || [];

      // Normalize API response so components can rely on `baseUrl`
      const normalized = (data || []).map((app: any) => ({
        ...app,
        baseUrl: app.baseUrl || app.base_url || app.baseurl || "",
      }));

      setApplications(normalized);
    } catch (error: any) {
      toast.error(`Failed to load applications: ${error?.message || "Unknown error"}`);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, isAuthenticated]);

  /**
   * Refresh applications data
   */
  const handleRefresh = useCallback(async () => {
    await fetchApplications();
    toast.success("Applications refreshed successfully");
  }, [fetchApplications]);

  /**
   * Handle viewing application details in modal
   */
  const handleViewApp = useCallback((app: Application) => {
    setSelectedApp(app);
    setShowAppDetails(true);
  }, []);

  /**
   * Close application details modal
   */
  const handleCloseAppDetails = useCallback(() => {
    setShowAppDetails(false);
    setSelectedApp(null);
  }, []);

  /**
   * Load applications on component mount and when tenant changes
   */
  useEffect(() => {
    if (tenantId && isAuthenticated !== false) {
      fetchApplications();
    }
  }, [fetchApplications, tenantId, isAuthenticated]);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    applications,
    isLoading,
    selectedApp,
    showAppDetails,
    fetchApplications,
    handleRefresh,
    handleViewApp,
    handleCloseAppDetails,
  }), [
    applications,
    isLoading,
    selectedApp,
    showAppDetails,
    fetchApplications,
    handleRefresh,
    handleViewApp,
    handleCloseAppDetails,
  ]);

  return returnValue;
}
