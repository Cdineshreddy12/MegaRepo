import React, { useState, useEffect } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import api from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Payment {
  paymentId: string
  amount: string
  currency: string
  status: string
  paymentMethod: string
  planName: string
  planType: string
  description: string
  paidAt: string
  isRefunded: boolean
  refundAmount?: string
  createdAt: string
}

interface PaymentStats {
  totalPaid: number
  totalRefunded: number
  successfulPayments: number
  failedPayments: number
  monthlySpend: number
  lastPayment: Payment | null
}

export function PaymentHistory() {
  const { getToken } = useKindeAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const makeRequest = async (endpoint: string) => {
    try {
      // Create a custom axios instance for the external payment API
      const paymentApi = api.create({
        baseURL: 'https://wrapper.zopkit.com',
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await paymentApi(endpoint);
      return response.data;
    } catch (error) {
      console.error(`API Error ${endpoint}:`, error)
      throw error
    }
  }

  const loadPaymentData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load payment history and stats in parallel
      const [historyData, statsData] = await Promise.all([
        makeRequest('/payments/history'),
        makeRequest('/payments/stats')
      ])

      setPayments(historyData.data || [])
      setStats(statsData.data || null)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPaymentData()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      succeeded: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      refunded: 'bg-purple-100 text-purple-800'
    }

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load payment data: {error}</span>
          </div>
          <Button 
            onClick={loadPaymentData} 
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600">View your billing history and payment details</p>
        </div>
        <Button variant="outline" onClick={loadPaymentData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Payment Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalPaid)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.monthlySpend)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.successfulPayments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>
            Your payment history and transaction details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No payment history found</p>
              <p className="text-sm">Your transactions will appear here once you make a payment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div 
                  key={payment.paymentId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payment.status)}
                      <div>
                        <div className="font-medium">{payment.description || payment.planName}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(payment.paidAt || payment.createdAt)} • {payment.paymentMethod}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(parseFloat(payment.amount))}
                      </div>
                      {payment.isRefunded && (
                        <div className="text-sm text-purple-600">
                          Refunded: {formatCurrency(parseFloat(payment.refundAmount || '0'))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      {getStatusBadge(payment.isRefunded ? 'refunded' : payment.status)}
                      {payment.planType && (
                        <Badge variant="outline" className="text-xs">
                          {payment.planType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Options */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>
              Download your payment history for accounting purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 