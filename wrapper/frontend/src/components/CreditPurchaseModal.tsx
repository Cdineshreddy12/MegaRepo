import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Coins, CheckCircle, AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { creditAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage?: string;
  onPurchaseComplete?: (data: any) => void;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  validityMonths: number;
  features: string[];
  recommended?: boolean;
}

const customPackageLimits = {
  minCredits: 100,
  maxCredits: 100000,
  minPrice: 10,
  maxPrice: 10000
};

export function CreditPurchaseModal({
  isOpen,
  onClose,
  selectedPackage,
  onPurchaseComplete
}: CreditPurchaseModalProps) {
  const [purchaseMode, setPurchaseMode] = useState<'package' | 'custom'>('package');
  const [selectedPackageId, setSelectedPackageId] = useState(selectedPackage || '');
  const [customCredits, setCustomCredits] = useState(1000);
  const [customPrice, setCustomPrice] = useState(50);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'bank_transfer' | 'check'>('stripe');

  const queryClient = useQueryClient();

  // Fetch available credit packages
  const {
    data: packagesData,
    isLoading: packagesLoading
  } = useQuery({
    queryKey: ['credit', 'packages'],
    queryFn: async () => {
      const response = await creditAPI.getAvailablePackages();
      return response.data.data;
    },
    enabled: isOpen
  });

  const packages = packagesData || [];

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (purchaseData: {
      creditAmount: number;
      paymentMethod: string;
      currency: string;
      notes: string;
    }) => {
      return await creditAPI.purchaseCredits(purchaseData);
    },
    onSuccess: (response) => {
      if (response.data.data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = response.data.data.checkoutUrl;
      } else {
        // Handle direct credit addition
        toast.success('Credits purchased successfully!');
        queryClient.invalidateQueries({ queryKey: ['credit'] });
        onPurchaseComplete?.(response.data.data);
        onClose();
      }
    },
    onError: (error: any) => {
      console.error('Purchase error:', error);
      toast.error(error.response?.data?.message || 'Failed to purchase credits');
    }
  });

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackageId(packageId);
    setPurchaseMode('package');
  };

  const handleCustomPurchase = () => {
    if (customCredits < customPackageLimits.minCredits || customCredits > customPackageLimits.maxCredits) {
      toast.error(`Credits must be between ${customPackageLimits.minCredits} and ${customPackageLimits.maxCredits}`);
      return;
    }

    if (customPrice < customPackageLimits.minPrice || customPrice > customPackageLimits.maxPrice) {
      toast.error(`Price must be between $${customPackageLimits.minPrice} and $${customPackageLimits.maxPrice}`);
      return;
    }

    purchaseMutation.mutate({
      creditAmount: customCredits,
      paymentMethod,
      currency: 'USD',
      notes: `Custom purchase: ${customCredits} credits for $${customPrice}`
    });
  };

  const handlePackagePurchase = () => {
    const selectedPkg = packages.find((pkg: CreditPackage) => pkg.id === selectedPackageId);
    if (!selectedPkg) {
      toast.error('Please select a credit package');
      return;
    }

    purchaseMutation.mutate({
      creditAmount: selectedPkg.credits,
      paymentMethod,
      currency: selectedPkg.currency,
      notes: `Purchase of ${selectedPkg.name} package`
    });
  };

  const calculateUnitPrice = (credits: number, price: number) => {
    return (price / credits).toFixed(4);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-amber-500" />
              <h2 className="text-2xl font-bold text-gray-900">Purchase Credits</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Purchase Mode Selection */}
          <div className="flex gap-4 mb-6">
            <Button
              variant={purchaseMode === 'package' ? 'default' : 'outline'}
              onClick={() => setPurchaseMode('package')}
              className="flex-1"
            >
              Credit Packages
            </Button>
            <Button
              variant={purchaseMode === 'custom' ? 'default' : 'outline'}
              onClick={() => setPurchaseMode('custom')}
              className="flex-1"
            >
              Custom Amount
            </Button>
          </div>

          {/* Package Selection */}
          {purchaseMode === 'package' && (
            <div className="space-y-6">
              {packagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages.map((pkg: CreditPackage) => (
                    <Card
                      key={pkg.id}
                      className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedPackageId === pkg.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handlePackageSelect(pkg.id)}
                    >
                      {pkg.recommended && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            RECOMMENDED
                          </div>
                        </div>
                      )}

                      <CardHeader className="text-center pb-4">
                        <CardTitle className="flex items-center justify-center gap-2">
                          <Coins className="h-5 w-5 text-amber-500" />
                          {pkg.name}
                        </CardTitle>
                        <div className="text-3xl font-bold text-gray-900">
                          ${pkg.price}
                          <span className="text-sm font-normal text-gray-500">/{pkg.currency}</span>
                        </div>
                        <CardDescription className="text-center">
                          {pkg.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-blue-600">
                            {pkg.credits.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Credits Included</div>
                          <div className="text-xs text-gray-500 mt-1">
                            ${(pkg.price / pkg.credits).toFixed(4)} per credit
                          </div>
                        </div>

                        <Separator />

                        <ul className="space-y-2">
                          {pkg.features.slice(0, 3).map((feature: string, index: number) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        {selectedPackageId === pkg.id && (
                          <div className="flex items-center justify-center pt-2">
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                            <span className="ml-2 text-sm font-medium text-blue-600">Selected</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {selectedPackageId && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Selected Package:</strong> {packages.find((p: CreditPackage) => p.id === selectedPackageId)?.name} -
                    {packages.find((p: CreditPackage) => p.id === selectedPackageId)?.credits.toLocaleString()} credits for $
                    {packages.find((p: CreditPackage) => p.id === selectedPackageId)?.price}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Custom Amount */}
          {purchaseMode === 'custom' && (
            <div className="space-y-6">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Enter custom credit amount and price. Minimum {customPackageLimits.minCredits} credits, maximum {customPackageLimits.maxCredits} credits.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customCredits">Number of Credits</Label>
                  <Input
                    id="customCredits"
                    type="number"
                    min={customPackageLimits.minCredits}
                    max={customPackageLimits.maxCredits}
                    value={customCredits}
                    onChange={(e) => setCustomCredits(parseInt(e.target.value) || 0)}
                    placeholder="Enter credit amount"
                  />
                  <p className="text-xs text-gray-500">
                    {customPackageLimits.minCredits} - {customPackageLimits.maxCredits} credits
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customPrice">Total Price (USD)</Label>
                  <Input
                    id="customPrice"
                    type="number"
                    min={customPackageLimits.minPrice}
                    max={customPackageLimits.maxPrice}
                    step="0.01"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Enter total price"
                  />
                  <p className="text-xs text-gray-500">
                    ${customPackageLimits.minPrice} - ${customPackageLimits.maxPrice}
                  </p>
                </div>
              </div>

              {customCredits > 0 && customPrice > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {customCredits.toLocaleString()} credits for ${customPrice}
                    </div>
                    <div className="text-sm text-gray-600">
                      ${(customPrice / customCredits).toFixed(4)} per credit
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Credit/Debit Card (Stripe)
                  </div>
                </SelectItem>
                <SelectItem value="bank_transfer">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-blue-500"></div>
                    Bank Transfer
                  </div>
                </SelectItem>
                <SelectItem value="check">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-green-500"></div>
                    Check Payment
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={purchaseMode === 'package' ? handlePackagePurchase : handleCustomPurchase}
              disabled={
                purchaseMutation.isPending ||
                (purchaseMode === 'package' && !selectedPackageId) ||
                (purchaseMode === 'custom' && (customCredits < customPackageLimits.minCredits || customPrice < customPackageLimits.minPrice))
              }
              className="flex-1"
            >
              {purchaseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Purchase Credits
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
