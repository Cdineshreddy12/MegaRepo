"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { analyticsService, DashboardView } from "@/services/api/analyticsService";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { DashboardBuilder } from "./DashboardBuilder";
import { DashboardViewer } from "./DashboardViewer";

interface DashboardListProps {
  onSelectDashboard?: (dashboard: DashboardView) => void;
}

export function DashboardList({ onSelectDashboard }: DashboardListProps) {
  const [dashboards, setDashboards] = useState<DashboardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDashboard, setEditingDashboard] = useState<DashboardView | null>(null);
  const [viewingDashboard, setViewingDashboard] = useState<DashboardView | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboardViews();
      setDashboards(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dashboard?")) {
      return;
    }

    try {
      await analyticsService.deleteDashboardView(id);
      toast({
        title: "Success",
        description: "Dashboard deleted successfully",
      });
      loadDashboards();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete dashboard",
        variant: "destructive",
      });
    }
  };

  const handleView = (dashboard: DashboardView) => {
    setViewingDashboard(dashboard);
    setShowViewer(true);
    if (onSelectDashboard) {
      onSelectDashboard(dashboard);
    }
  };

  const handleEdit = (dashboard: DashboardView) => {
    setEditingDashboard(dashboard);
    setShowEditor(true);
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingDashboard(null);
    loadDashboards();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboards</h2>
        <Button onClick={() => {
          setEditingDashboard(null);
          setShowEditor(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No dashboards found. Create your first dashboard!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Widgets</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboards.map((dashboard) => (
                <TableRow key={dashboard.id || dashboard._id}>
                  <TableCell className="font-medium">{dashboard.name}</TableCell>
                  <TableCell className="text-gray-500">
                    {dashboard.description || "-"}
                  </TableCell>
                  <TableCell>{dashboard.widgets?.length || 0}</TableCell>
                  <TableCell>
                    {dashboard.createdAt
                      ? new Date(dashboard.createdAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(dashboard)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(dashboard)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(dashboard.id || dashboard._id || "")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DashboardBuilder
            dashboardId={editingDashboard?.id || editingDashboard?._id}
            onSave={handleSave}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          {viewingDashboard && (
            <DashboardViewer
              dashboard={viewingDashboard}
              onClose={() => setShowViewer(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

