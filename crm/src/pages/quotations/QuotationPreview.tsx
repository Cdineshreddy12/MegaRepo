// React and related hooks
import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';

// UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Loader from '@/components/common/Loader';

// Utilities
import { formatCurrency, formatDate } from '@/utils/format';

// Queries and hooks
import { useQuotation } from '@/queries/QuotationQueries';
import { useAccount } from '@/queries/AccountQueries';
import { useContact } from '@/queries/ContactQueries';
import { useQueryClient } from '@tanstack/react-query';

// Services
import { pdfService } from '@/services/api/pdfService';

// Routing
import { useParams } from 'react-router-dom';

// Toast notifications
import { toast } from '@/hooks/useToast';
import { TenantConfig } from '../../lib/app-config';

// Icons

// Helper function to calculate totals
export const calculateTotals = (items) => {
  if (!items || items.length === 0) return { total: 0, subtotal: 0, totalGST: 0 };
  
  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    0
  );
  const totalGST = items.reduce(
    (sum, item) => 
      sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0) * ((parseFloat(item.gst) || 0) / 100),
    0
  );
  const total = subtotal + totalGST;
  return {
    total,
    subtotal,
    totalGST
  };
};



// QuotationDocument component - the actual document to be rendered and printed
const QuotationDocument = ({ quotation, accountData, contactData, componentRef }) => {
  // Calculate totals based on items
  const { total, subtotal, totalGST } = calculateTotals(quotation?.items || []);


  
  
  // Improved Customer Information section
  const CustomerInformation = ({ quotation, accountData, contactData }) => {
    // Get account name with proper fallbacks
    const getAccountName = () => {
      if (accountData?.companyName) {
        return accountData.companyName;
      }
      
      if (quotation?.accountId?.companyName) {
        return quotation.accountId.companyName;
      }
      
      return 'Customer TBD';
    };
    
    // Get contact name with proper fallbacks
    const getContactName = () => {
      if (contactData?.firstName) {
        return `${contactData.firstName} ${contactData.lastName || ''}`.trim();
      }
      
      if (quotation?.contactId?.firstName) {
        return `${quotation.contactId.firstName} ${quotation.contactId.lastName || ''}`.trim();
      }
      
      return 'Contact TBD';
    };
    
    // Format address based on your ACTUAL schema (using both postalCode and zipCode for compatibility)
    const formatAddress = (address) => {
      if (!address) return null;
      
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      // Check for both zipCode and postalCode to handle schema mismatch
      if (address.postalCode) parts.push(address.postalCode);
      else if (address.zipCode) parts.push(address.zipCode);
      if (address.country) parts.push(address.country);
      
      return parts.length > 0 ? parts.join(', ') : null;
    };
    
    // Get address with proper fallbacks
    const getAddress = () => {
      // Log what we're working with for debugging
      console.log('Address debug - accountData:', accountData);
      console.log('Address debug - quotation.accountId:', quotation?.accountId);
      
      // Try billing address from accountData
      const billingAddress = formatAddress(accountData?.billingAddress);
      if (billingAddress) return billingAddress;
      
      // Try shipping address from accountData as fallback
      const shippingAddress = formatAddress(accountData?.shippingAddress);
      if (shippingAddress) return shippingAddress;
      
      // Try billing address from populated accountId in quotation
      const quotationBillingAddress = formatAddress(quotation?.accountId?.billingAddress);
      if (quotationBillingAddress) return quotationBillingAddress;
      
      // Try shipping address from populated accountId in quotation
      const quotationShippingAddress = formatAddress(quotation?.accountId?.shippingAddress);
      if (quotationShippingAddress) return quotationShippingAddress;
      
      // Use company name if available for a professional fallback
      const company = getAccountName();
      if (company && company !== 'Customer TBD') {
        return `${company} headquarters`;
      }
      
      // Last resort
      return 'Address will be provided separately';
    };
    
    return (
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold mb-2">Customer Information</h2>
        
        <p>
          <span className="font-medium">To: </span>
          {getAccountName()}
        </p>
        
        <p>
          <span className="font-medium">Address: </span>
          {getAddress()}
        </p>
        
        <p>
          <span className="font-medium">Contact: </span>
          {getContactName()}
        </p>
        
        <p>
          <span className="font-medium">Email: </span>
          {contactData?.email || 
           quotation?.contactId?.email || 
           'N/A'}
        </p>
        
        <p>
          <span className="font-medium">Phone: </span>
          {contactData?.phone || 
           quotation?.contactId?.phone || 
           'N/A'}
        </p>
        
        {quotation?.oem && (
          <p>
            <span className="font-medium">OEM: </span>
            {quotation.oem}
          </p>
        )}
      </div>
    );
  };

  
  return (
    <div className="quotation-document" ref={componentRef}>
      {/* Quotation Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-1">{TenantConfig.name}</h1>
            {/* <p className="text-sm text-gray-500">{TenantConfig.name}</p> */}
            <p className="text-sm text-gray-500">{TenantConfig.profile?.address}</p>
            <p className="text-sm text-gray-500">{TenantConfig.profile?.headquarters}</p>
            <p className="text-sm text-gray-500">{TenantConfig.profile?.GSTIN}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              <span className="font-medium">Ref No: </span>
              {quotation?.quotationNumber || 'Draft'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Date: </span>
              {quotation?.issueDate ? formatDate(quotation.issueDate) : 'TBD'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Valid Until: </span>
              {quotation?.validUntil ? formatDate(quotation.validUntil) : 'TBD'}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <CustomerInformation 
          quotation={quotation}
          accountData={accountData} 
          contactData={contactData}
        />

      {/* Quotation Items */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold mb-4">Quotation Items</h2>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="py-2 px-3 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                S. No.
              </th>
              <th className="py-2 px-3 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="py-2 px-3 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="py-2 px-3 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU / Part Code
              </th>
              <th className="py-2 px-3 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Description
              </th>
              <th className="py-2 px-3 border text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="py-2 px-3 border text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="py-2 px-3 border text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Price
              </th>
              <th className="py-2 px-3 border text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                GST
              </th>
              <th className="py-2 px-3 border text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total (Inc. GST)
              </th>
            </tr>
          </thead>
          <tbody>
            {(quotation?.items || []).map((item, index) => {
              const quantity = parseFloat(item.quantity) || 0;
              const unitPrice = parseFloat(item.unitPrice) || 0;
              const gst = parseFloat(item.gst) || 0;
              const itemTotal = quantity * unitPrice;
              const gstAmount = itemTotal * (gst / 100);
              const totalWithGST = itemTotal + gstAmount;
              
              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 border text-sm text-gray-500">{index + 1}</td>
                  <td className="py-2 px-3 border text-sm text-gray-500">{item.type || 'Product'}</td>
                  <td className="py-2 px-3 border text-sm text-gray-500">{item.status || 'New'}</td>
                  <td className="py-2 px-3 border text-sm text-gray-500">{item.sku || 'N/A'}</td>
                  <td className="py-2 px-3 border text-sm text-gray-500">{item.description}</td>
                  <td className="py-2 px-3 border text-sm text-gray-500 text-right">{item.quantity}</td>
                  <td className="py-2 px-3 border text-sm text-gray-500 text-right">
                    {formatCurrency(item.unitPrice, quotation?.quoteCurrency || 'INR')}
                  </td>
                  <td className="py-2 px-3 border text-sm text-gray-500 text-right">
                    {formatCurrency(itemTotal.toFixed(2), quotation?.quoteCurrency || 'INR')}
                  </td>
                  <td className="py-2 px-3 border text-sm text-gray-500 text-right">{item.gst || 0}%</td>
                  <td className="py-2 px-3 border text-sm text-gray-500 text-right">
                    {formatCurrency(totalWithGST.toFixed(2), quotation?.quoteCurrency || 'INR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="p-6 border-b">
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span className="font-medium">Subtotal:</span>
              <span>
                {formatCurrency(subtotal.toFixed(2), quotation?.quoteCurrency || 'INR')}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">GST:</span>
              <span>
                {formatCurrency(totalGST.toFixed(2), quotation?.quoteCurrency || 'INR')}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t font-bold">
              <span>Total:</span>
              <span>
                {formatCurrency(total.toFixed(2), quotation?.quoteCurrency || 'INR')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Terms and Conditions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Prices:</h3>
            <p className="text-sm text-gray-600">{quotation?.terms?.prices || "Doesn't include any octroi, implementation or training."}</p>
          </div>
          <div>
            <h3 className="font-medium">BOQ:</h3>
            <p className="text-sm text-gray-600">{quotation?.terms?.boq || "Standard BOQ terms apply."}</p>
          </div>
          <div>
            <h3 className="font-medium">Payment Terms:</h3>
            <p className="text-sm text-gray-600">{quotation?.terms?.paymentTerms || "Within 30 days after submission of invoice."}</p>
          </div>
          {quotation?.renewalTerm && (
            <div>
              <h3 className="font-medium">Renewal Term:</h3>
              <p className="text-sm text-gray-600">{quotation.renewalTerm}</p>
            </div>
          )}
          {quotation?.validUntil && (
            <div>
              <h3 className="font-medium">Validity:</h3>
              <p className="text-sm text-gray-600">Quotation is valid till {formatDate(quotation.validUntil)}</p>
            </div>
          )}
          {quotation?.notes && (
            <div>
              <h3 className="font-medium">Notes:</h3>
              <p className="text-sm text-gray-600">{quotation.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t mt-6">
        <p className="text-sm text-center text-gray-500">
          Purchase order to be placed on Tecpact Technologies Private Limited.
        </p>
        <p className="text-sm text-center text-gray-500 mt-2">
          Thank you for your business!
        </p>
      </div>
    </div>
  );
};

// Main QuotationPreview component
const QuotationPreview = ({ onClose, onGenerate, isPreview = true, formValues = null }) => {
  const { quotationId } = useParams();
  const { data: quotation, isLoading } = useQuotation(quotationId);
  
  const componentRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Determine which data to use - either from props (form preview) or from API (existing quotation)
  const quotationData = formValues || quotation;
  
  // Get account and contact data for detailed information
  // Handle both populated and unpopulated references
  const accountId = quotationData?.accountId?._id || 
                   (typeof quotationData?.accountId === 'string' ? quotationData.accountId : undefined);
                   
  const contactId = quotationData?.contactId?._id || 
                   (typeof quotationData?.contactId === 'string' ? quotationData.contactId : undefined);
  
  // Debug log for troubleshooting
  useEffect(() => {
    console.log("Account ID:", accountId);
    console.log("Contact ID:", contactId);
    console.log("Quotation Data:", quotationData);
  }, [quotationData, accountId, contactId]);
  
  // Fetch account and contact data if IDs are available
  const { data: accountData } = useAccount(accountId, !!accountId);
  const { data: contactData } = useContact(contactId, !!contactId);

  // Log fetched data for debugging
  useEffect(() => {
    console.log("Fetched Account Data:", accountData);
    console.log("Fetched Contact Data:", contactData);
  }, [accountData, contactData]);

  // Function to handle PDF generation and S3 upload
  const handleGenerateAndUpload = async () => {
    try {
      setIsGenerating(true);
      
      // Call our PDF service to generate PDF and save to S3
      const result = await pdfService.generateAndSaveQuotationPdf(quotationId, {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });
      
      // Show success message
      toast({
        title: 'Success',
        description: 'Quotation PDF generated and stored successfully',
      });
      
      // Invalidate queries to refresh document list
      queryClient.invalidateQueries(['documents', 'quotation', quotationId]);
      
      // Call onGenerate callback if provided
      if (onGenerate) {
        onGenerate({
          ...quotation,
          document: result.document
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate and save PDF',
        status: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to download PDF without saving to S3
  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      
      // Download PDF directly
      await pdfService.downloadQuotationPdf(
        quotationId, 
        `Quotation-${quotation.quotationNumber}.pdf`,
        {
          format: 'A4',
          printBackground: true
        }
      );
      
      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        status: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Fallback to original print method for preview
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Quotation-${quotationData?.quotationNumber || 'Preview'}`
  });

  // Show loading state
  if (isLoading && !formValues) {
    return <Loader />;
  }

  // Show error state
  if (!quotationData && !formValues) {
    return <div className="p-4">Quotation not found</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {isPreview && (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Quotation Preview</h2>
          <div className="space-x-2">
            {/* <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Close
            </Button>
            <Button onClick={handlePrint} variant="outline" disabled={isGenerating}>
              <FileText className="h-4 w-4 mr-2" />
              Print Preview
            </Button> */}
            {!formValues && ( // Only show these buttons for existing quotations, not in form preview
              <>
                <Button onClick={handleDownloadPdf} variant="outline" disabled={isGenerating}>
                  Download PDF
                </Button>
                <Button 
                  onClick={handleGenerateAndUpload} 
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate & Save PDF'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Card className="w-full bg-white">
        <CardContent className="p-0">
          <QuotationDocument 
            quotation={quotationData} 
            accountData={accountData} 
            contactData={contactData} 
            componentRef={componentRef} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotationPreview;