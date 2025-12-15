import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface VolumeTier {
  minVolume: number;
  maxVolume: number | null;
  creditCost: number;
  discountPercentage: number;
}

interface OperationConfig {
  configId?: string;
  operationCode: string;
  creditCost: number;
  unit: string;
  unitMultiplier: number;
  freeAllowance: number;
  freeAllowancePeriod: string;
  volumeTiers: VolumeTier[];
  allowOverage: boolean;
  overageLimit: number | null;
  overagePeriod: string;
  overageCost: number | null;
  scope: string;
  isActive: boolean;
  isCustomized?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface OperationConfigEditorProps {
  tenantId: string;
  operationCode: string;
  currentConfig: OperationConfig | null;
  globalConfig: OperationConfig | null;
  onSave: (config: OperationConfig) => Promise<void>;
  onReset: () => Promise<void>;
  onConfigChange?: () => void;
  onBack?: () => void;
}

const OperationConfigEditor: React.FC<OperationConfigEditorProps> = ({
  tenantId,
  operationCode,
  currentConfig,
  globalConfig,
  onSave,
  onReset,
  onConfigChange,
  onBack
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<OperationConfig | null>(currentConfig);
  const [showComparison, setShowComparison] = useState(false);
  const [editingTier, setEditingTier] = useState<VolumeTier | null>(null);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);

  // Initialize config from current or global
  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    } else if (globalConfig) {
      // Create a copy for editing
      setConfig({
        ...globalConfig,
        configId: undefined,
        isCustomized: true
      });
    } else {
      // Default config
      setConfig({
        operationCode,
        creditCost: 1.0,
        unit: 'operation',
        unitMultiplier: 1,
        freeAllowance: 0,
        freeAllowancePeriod: 'month',
        volumeTiers: [],
        allowOverage: true,
        overageLimit: null,
        overagePeriod: 'day',
        overageCost: null,
        scope: 'organization',
        isActive: true,
        isCustomized: true
      });
    }
  }, [currentConfig, globalConfig, operationCode]);

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await onSave(config);
      toast.success('Operation configuration saved successfully');
      onConfigChange?.();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      await onReset();
      toast.success('Configuration reset to global default');
      onConfigChange?.();
    } catch (error) {
      console.error('Error resetting configuration:', error);
      toast.error('Failed to reset configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: keyof OperationConfig, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      [field]: value,
      isCustomized: true
    });
  };

  const addVolumeTier = () => {
    if (!config) return;

    const newTier: VolumeTier = {
      minVolume: 0,
      maxVolume: null,
      creditCost: config.creditCost,
      discountPercentage: 0
    };

    setEditingTier(newTier);
    setTierDialogOpen(true);
  };

  const editVolumeTier = (tier: VolumeTier, index: number) => {
    setEditingTier({ ...tier, _index: index });
    setTierDialogOpen(true);
  };

  const saveVolumeTier = () => {
    if (!config || !editingTier) return;

    const tiers = [...config.volumeTiers];

    if ('_index' in editingTier) {
      // Edit existing
      const index = editingTier._index;
      delete editingTier._index;
      tiers[index] = editingTier;
    } else {
      // Add new
      tiers.push(editingTier);
    }

    // Sort by minVolume
    tiers.sort((a, b) => a.minVolume - b.minVolume);

    setConfig({
      ...config,
      volumeTiers: tiers,
      isCustomized: true
    });

    setEditingTier(null);
    setTierDialogOpen(false);
  };

  const removeVolumeTier = (index: number) => {
    if (!config) return;

    const tiers = config.volumeTiers.filter((_, i) => i !== index);
    setConfig({
      ...config,
      volumeTiers: tiers,
      isCustomized: true
    });
  };

  const isCustomized = config?.isCustomized;
  const hasChanges = config && JSON.stringify(config) !== JSON.stringify(currentConfig || globalConfig);

  if (!config) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading configuration...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {operationCode}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {isCustomized && <Badge variant="secondary">Customized</Badge>}
              {config.isActive ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showComparison ? 'Hide' : 'Compare'}
          </Button>

          {currentConfig && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={loading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}

          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click Save to apply them.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creditCost">Credit Cost</Label>
                <Input
                  id="creditCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.creditCost}
                  onChange={(e) => handleConfigChange('creditCost', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={config.unit}
                  onValueChange={(value) => handleConfigChange('unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operation">Operation</SelectItem>
                    <SelectItem value="record">Record</SelectItem>
                    <SelectItem value="minute">Minute</SelectItem>
                    <SelectItem value="MB">MB</SelectItem>
                    <SelectItem value="GB">GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitMultiplier">Unit Multiplier</Label>
                <Input
                  id="unitMultiplier"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={config.unitMultiplier}
                  onChange={(e) => handleConfigChange('unitMultiplier', parseFloat(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope">Scope</Label>
                <Select
                  value={config.scope}
                  onValueChange={(value) => handleConfigChange('scope', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={config.isActive}
                onCheckedChange={(checked) => handleConfigChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Free Allowance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Free Allowance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="freeAllowance">Free Operations</Label>
                <Input
                  id="freeAllowance"
                  type="number"
                  min="0"
                  value={config.freeAllowance}
                  onChange={(e) => handleConfigChange('freeAllowance', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeAllowancePeriod">Period</Label>
                <Select
                  value={config.freeAllowancePeriod}
                  onValueChange={(value) => handleConfigChange('freeAllowancePeriod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Per Day</SelectItem>
                    <SelectItem value="week">Per Week</SelectItem>
                    <SelectItem value="month">Per Month</SelectItem>
                    <SelectItem value="year">Per Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overage Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overage Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="allowOverage"
                checked={config.allowOverage}
                onCheckedChange={(checked) => handleConfigChange('allowOverage', checked)}
              />
              <Label htmlFor="allowOverage">Allow Overage</Label>
            </div>

            {config.allowOverage && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="overageLimit">Overage Limit</Label>
                    <Input
                      id="overageLimit"
                      type="number"
                      min="0"
                      placeholder="No limit"
                      value={config.overageLimit || ''}
                      onChange={(e) => handleConfigChange('overageLimit', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="overagePeriod">Period</Label>
                    <Select
                      value={config.overagePeriod}
                      onValueChange={(value) => handleConfigChange('overagePeriod', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Per Hour</SelectItem>
                        <SelectItem value="day">Per Day</SelectItem>
                        <SelectItem value="week">Per Week</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overageCost">Overage Cost (per unit)</Label>
                  <Input
                    id="overageCost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Higher than regular cost"
                    value={config.overageCost || ''}
                    onChange={(e) => handleConfigChange('overageCost', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Volume Tiers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Volume Tiers</CardTitle>
              <Button size="sm" onClick={addVolumeTier}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {config.volumeTiers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No volume tiers configured
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min Volume</TableHead>
                    <TableHead>Max Volume</TableHead>
                    <TableHead>Credit Cost</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.volumeTiers.map((tier, index) => (
                    <TableRow key={index}>
                      <TableCell>{tier.minVolume}</TableCell>
                      <TableCell>{tier.maxVolume ? tier.maxVolume : '∞'}</TableCell>
                      <TableCell>{tier.creditCost}</TableCell>
                      <TableCell>{tier.discountPercentage}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => editVolumeTier(tier, index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeVolumeTier(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Volume Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTier && '_index' in editingTier ? 'Edit Volume Tier' : 'Add Volume Tier'}
            </DialogTitle>
            <DialogDescription>
              Configure volume-based pricing tiers for this operation.
            </DialogDescription>
          </DialogHeader>

          {editingTier && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minVolume">Minimum Volume</Label>
                  <Input
                    id="minVolume"
                    type="number"
                    min="0"
                    value={editingTier.minVolume}
                    onChange={(e) => setEditingTier({ ...editingTier, minVolume: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxVolume">Maximum Volume</Label>
                  <Input
                    id="maxVolume"
                    type="number"
                    min="0"
                    placeholder="No limit"
                    value={editingTier.maxVolume || ''}
                    onChange={(e) => setEditingTier({
                      ...editingTier,
                      maxVolume: e.target.value ? parseInt(e.target.value) : null
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditCost">Credit Cost</Label>
                  <Input
                    id="creditCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingTier.creditCost}
                    onChange={(e) => setEditingTier({ ...editingTier, creditCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountPercentage">Discount (%)</Label>
                  <Input
                    id="discountPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={editingTier.discountPercentage}
                    onChange={(e) => setEditingTier({ ...editingTier, discountPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveVolumeTier}>
              {editingTier && '_index' in editingTier ? 'Update' : 'Add'} Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperationConfigEditor;
