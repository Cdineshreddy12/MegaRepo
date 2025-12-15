import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Package, TrendingUp } from 'lucide-react';
import { CostChanges, Application, OperationCost } from './types';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  costChanges: CostChanges;
  applications: Application[];
  globalOperationCosts: OperationCost[];
  mode: 'global' | 'tenant';
  tenantCount?: number;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  costChanges,
  applications,
  globalOperationCosts,
  mode,
  tenantCount = 1
}) => {
  const calculateSummary = () => {
    const summary = {
      appsModified: Object.keys(costChanges).length,
      operationsChanged: 0,
      modulesChanged: 0,
      appCostsChanged: 0
    };

    Object.values(costChanges).forEach(appChanges => {
      if (appChanges.operationCosts) {
        summary.operationsChanged += Object.keys(appChanges.operationCosts).length;
      }
      if (appChanges.moduleCosts) {
        summary.modulesChanged += Object.keys(appChanges.moduleCosts).length;
      }
      if (appChanges.appCost !== undefined) {
        summary.appCostsChanged += 1;
      }
    });

    return summary;
  };

  const summary = calculateSummary();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-blue-500" />
            Configuration Changes Preview
          </DialogTitle>
          <DialogDescription>
            Review your changes before applying them. This shows the difference between current and proposed configurations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary of Changes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-3">Change Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.appsModified}</div>
                <div className="text-blue-700">Apps Modified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.operationsChanged}</div>
                <div className="text-green-700">Operations Changed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.modulesChanged}</div>
                <div className="text-purple-700">Modules Changed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.appCostsChanged}</div>
                <div className="text-orange-700">App Costs Changed</div>
              </div>
            </div>
          </div>

          {/* Detailed Changes */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800">Detailed Changes</h4>

            {Object.entries(costChanges).map(([appCode, changes]) => {
              const app = applications.find(a => a.appCode === appCode);
              return (
                <div key={appCode} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-purple-600" />
                    <h5 className="font-medium text-purple-800">{app?.appName || appCode}</h5>
                    <Badge variant="outline" className="text-xs">{appCode}</Badge>
                  </div>

                  <div className="space-y-3">
                    {/* App-level cost change */}
                    {changes.appCost !== undefined && (
                      <div className="bg-white p-3 rounded border-l-4 border-orange-400">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Application Default Cost</span>
                          <div className="text-sm">
                            <span className="text-red-600 line-through mr-2">
                              {globalOperationCosts.find(op => op.operationCode.startsWith(`${appCode}.`))?.creditCost || 'N/A'}
                            </span>
                            <span className="text-green-600 font-medium">→ {changes.appCost} credits</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Module-level changes */}
                    {changes.moduleCosts && Object.keys(changes.moduleCosts).length > 0 && (
                      <div className="space-y-2">
                        <h6 className="text-sm font-medium text-gray-700">Module Cost Changes:</h6>
                        {Object.entries(changes.moduleCosts).map(([moduleCode, newCost]) => {
                          const module = app?.modules?.find(m => m.moduleCode === moduleCode);
                          const currentCost = globalOperationCosts.find(op =>
                            op.operationCode.startsWith(`${appCode}.${moduleCode}.`)
                          )?.creditCost;

                          return (
                            <div key={moduleCode} className="bg-white p-3 rounded border-l-4 border-purple-400">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">
                                  <span className="font-medium">{module?.moduleName || moduleCode}</span>
                                  <span className="text-gray-500 ml-2">({moduleCode})</span>
                                </span>
                                <div className="text-sm">
                                  <span className="text-red-600 line-through mr-2">{currentCost || 'N/A'}</span>
                                  <span className="text-green-600 font-medium">→ {newCost} credits</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Operation-level changes */}
                    {changes.operationCosts && Object.keys(changes.operationCosts).length > 0 && (
                      <div className="space-y-2">
                        <h6 className="text-sm font-medium text-gray-700">Operation Cost Changes:</h6>
                        {Object.entries(changes.operationCosts).map(([operationCode, newCost]) => {
                          const currentOp = globalOperationCosts.find(op => op.operationCode === operationCode);
                          const currentCost = currentOp?.creditCost;

                          return (
                            <div key={operationCode} className="bg-white p-3 rounded border-l-4 border-green-400">
                              <div className="flex items-center justify-between">
                                <div className="text-sm">
                                  <span className="font-medium">{currentOp?.operationName || operationCode.split('.').pop()}</span>
                                  <div className="text-gray-500 text-xs">{operationCode}</div>
                                </div>
                                <div className="text-sm">
                                  <span className="text-red-600 line-through mr-2">{currentCost || 'N/A'}</span>
                                  <span className="text-green-600 font-medium">→ {newCost} credits/{currentOp?.unit || 'unit'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Impact Assessment */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">Estimated Impact</h4>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>• Changes will affect <strong>{mode === 'global' ? tenantCount : 1}</strong> tenant(s)</p>
                  <p>• New costs will apply to future operations immediately</p>
                  <p>• Existing in-progress operations will continue with current costs</p>
                  <p>• Tenants will be notified of cost changes via email</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
          <Button
            onClick={() => {
              onClose();
              onProceed();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Proceed to Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
