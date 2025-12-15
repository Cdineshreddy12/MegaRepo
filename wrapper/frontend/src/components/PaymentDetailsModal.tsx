import React from 'react'
import { X, Download, RefreshCw, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaymentDetailsModalProps {
  payment: any
  isOpen: boolean
  onClose: () => void
  onRefund?: (paymentId: string) => void
}

export function PaymentDetailsModal({ payment, isOpen, onClose, onRefund }: PaymentDetailsModalProps) {
  if (!isOpen || !payment) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'canceled':
        return 'bg-gray-100 text-gray-800'
      case 'refunded':
        return 'bg-orange-100 text-orange-800'
      case 'disputed':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Paid'
      case 'failed':
        return 'Failed'
      case 'canceled':
        return 'Canceled'
      case 'refunded':
        return 'Refunded'
      case 'partially_refunded':
        return 'Partial Refund'
      case 'disputed':
        return 'Disputed'
      default:
        return status
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Payment Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Payment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Payment Overview</span>
                <Badge className={getStatusColor(payment.status)}>
                  {getStatusText(payment.status)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {payment.invoiceNumber ? `Invoice #${payment.invoiceNumber}` : 'Payment Record'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(payment.amount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Currency</p>
                  <p className="font-medium">{(payment.currency || 'USD').toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium capitalize">{payment.paymentMethod || 'Card'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Type</p>
                  <p className="font-medium capitalize">{payment.paymentType || 'Subscription'}</p>
                </div>
              </div>
              
              {payment.description && (
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="font-medium">{payment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Breakdown */}
          {(payment.taxAmount > 0 || payment.processingFees > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Financial Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="font-medium">
                      {formatCurrency(payment.netAmount || payment.amount || 0)}
                    </p>
                  </div>
                  {payment.taxAmount > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Tax</p>
                      <p className="font-medium">
                        {formatCurrency(payment.taxAmount || 0)}
                      </p>
                    </div>
                  )}
                  {payment.processingFees > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Processing Fees</p>
                      <p className="font-medium">
                        {formatCurrency(payment.processingFees || 0)}
                      </p>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(payment.amount || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refund Information */}
          {(payment.amountRefunded > 0 || payment.status === 'refunded') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refund Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Refunded Amount</p>
                    <p className="font-medium text-orange-600">
                      {formatCurrency(payment.amountRefunded || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Refund Date</p>
                    <p className="font-medium">
                      {payment.refundedAt ? formatDate(payment.refundedAt) : 'N/A'}
                    </p>
                  </div>
                </div>
                {payment.refundReason && (
                  <div>
                    <p className="text-sm text-gray-600">Refund Reason</p>
                    <p className="font-medium">{payment.refundReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dispute Information */}
          {(payment.amountDisputed > 0 || payment.status === 'disputed') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Dispute Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Disputed Amount</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(payment.amountDisputed || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dispute Status</p>
                    <p className="font-medium capitalize">{payment.disputeStatus || 'Open'}</p>
                  </div>
                </div>
                {payment.disputeReason && (
                  <div>
                    <p className="text-sm text-gray-600">Dispute Reason</p>
                    <p className="font-medium">{payment.disputeReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Payment Date</p>
                  <p className="font-medium">
                    {payment.paidAt ? formatDate(payment.paidAt) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created Date</p>
                  <p className="font-medium">
                    {payment.createdAt ? formatDate(payment.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              {payment.status === 'succeeded' && (
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {payment.status === 'succeeded' && !payment.amountRefunded && onRefund && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-orange-600 hover:text-orange-700"
                  onClick={() => onRefund(payment.id)}
                >
                  Request Refund
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 