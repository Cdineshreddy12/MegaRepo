// React and Router imports
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

// Queries
import { useQuotation, useDeleteQuotation } from '@/queries/QuotationQueries';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import Loader from '@/components/common/Loader';

// Icons

// Utilities
import { formatDate } from '@/utils/format';
import { formatCurrency } from '@/utils/format';
import { toast } from '@/hooks/useToast';

// Modals and Forms
import { FormModal, useModal } from '@/components/common/Modal';
import QuotationForm from '../form';

// Constants
import { ENTITY, ROUTE_PATH } from '@/constants';

// Features
import QuotationPreview from '../QuotationPreview';
import DocumentList from '../documentList';

// External Libraries
import axios from 'axios';
import Page, { PageHeader } from '@/components/Page';
import useRedirect from '@/hooks/useRedirect';
import AiInsightsButton from '@/components/common/AiInsightsButton';

const rootPath = ROUTE_PATH.QUOTATION

const QuotationDetailView = () => {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const redirect = useRedirect()
  const [activeTab, setActiveTab] = useState('details');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Safety check: if quotationId is invalid, show loading
  if (!quotationId || quotationId === '' || quotationId === 'undefined' || quotationId === 'null') {
    return <Loader />;
  }
  
  const { data: quotation, isLoading } = useQuotation(quotationId);
  const deleteQuotationMutation = useDeleteQuotation();

  const {
    modalRef: quotationEditModalRef,
    open: handleQuotationEditOpen,
    close: handleQuotationEditClose,
  } = useModal();

  const {
    modalRef: previewModalRef,
    open: handlePreviewOpen,
    close: handlePreviewClose,
  } = useModal();

  const handleEditQuotation = () => {
    redirect.to(`${rootPath}/${quotationId}/edit`);
    handleQuotationEditOpen();
  };

  const handleDeleteQuotation = async () => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await deleteQuotationMutation.mutateAsync(quotationId);
        toast({
          title: 'Quotation deleted',
          description: 'Quotation has been deleted successfully',
        });
        redirect.to(rootPath);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete quotation',
          status: 'error',
        });
      }
    }
  };

  // New function to directly download PDF
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      
      // Make a direct request to download the PDF
      const response = await axios({
        url: `/api/pdf/quotation/${quotationId}/download`,
        method: 'GET',
        responseType: 'blob', // Important for handling binary data
      });
      
      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quotation-${quotation.quotationNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
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
      setIsGeneratingPdf(false);
    }
  };

  // Function to handle PDF generation and storage
  const handleGeneratePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      
      // Call API to generate and save the PDF
      const response = await axios.post('/api/pdf/quotation', {
        quotationId,
        saveToS3: true,
        options: {
          format: 'A4',
          printBackground: true
        }
      });
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'PDF generated and saved successfully',
        });
        
        // Refresh the documents tab
        setActiveTab('documents');
      } else {
        throw new Error(response.data.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate PDF',
        status: 'error',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!quotation) {
    return (
      <div className="p-4">
        <p className="text-red-500">Quotation not found</p>
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          Back to Quotations
        </Button>
      </div>
    );
  }

  // Helper function to get account and contact names properly
  const getAccountName = () => {
    if (quotation.accountId && typeof quotation.accountId === 'object') {
      return quotation.accountId.companyName || quotation.accountId.name || 'N/A';
    }
    return quotation.account?.name || 'N/A';
  };

  const getContactName = () => {
    if (quotation.contactId && typeof quotation.contactId === 'object') {
      return `${quotation.contactId.firstName || ''} ${quotation.contactId.lastName || ''}`.trim() || 'N/A';
    }
    return quotation.contact?.name || 'N/A';
  };

  return (
      <Page
        removeBackground
        className='px-4'
          header={
            <PageHeader
              title={`Quotation: ${quotation.quotationNumber}`}
              actions={[
                <AiInsightsButton to={`${rootPath}/${quotationId}/${ROUTE_PATH.AI_INSIGHTS}`} key="quotationAiInsights" />,
                <Link to={`${rootPath}/${quotation?._id}/edit`} key="editOpportunity">
                  <Button>Edit</Button>
                </Link>,
              ]}
            />
          }
        >
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Quotation Number</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.quotationNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Account</h3>
                  <p className="mt-1 text-sm text-gray-900">{getAccountName()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.status}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">OEM</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.oem || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contact</h3>
                  <p className="mt-1 text-sm text-gray-900">{getContactName()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Issue Date</h3>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(quotation.issueDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Valid Until</h3>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(quotation.validUntil)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Currency</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.quoteCurrency || 'INR'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Currency Rate</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.currencyRate || '1.00'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GST
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotation.items?.map((item, index) => {
                      const itemTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
                      const gstAmount = itemTotal * (parseFloat(item.gst || 0) / 100);
                      const totalWithGST = itemTotal + gstAmount;

                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.status}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.sku || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {formatCurrency(item.unitPrice, quotation.quoteCurrency || 'INR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {item.gst}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {formatCurrency(totalWithGST.toFixed(2), quotation.quoteCurrency || 'INR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Subtotal:</span>
                    <span>
                      {formatCurrency(
                        quotation.items?.reduce(
                          (sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.unitPrice),
                          0
                        ).toFixed(2),
                        quotation.quoteCurrency || 'INR'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium">GST:</span>
                    <span>
                      {formatCurrency(
                        quotation.items?.reduce(
                          (sum, item) => 
                            sum + 
                            parseFloat(item.quantity) * 
                            parseFloat(item.unitPrice) * 
                            (parseFloat(item.gst || 0) / 100),
                          0
                        ).toFixed(2),
                        quotation.quoteCurrency || 'INR'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-t font-bold">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(
                        quotation.items?.reduce(
                          (sum, item) => 
                            sum + 
                            parseFloat(item.quantity) * 
                            parseFloat(item.unitPrice) * 
                            (1 + parseFloat(item.gst || 0) / 100),
                          0
                        ).toFixed(2),
                        quotation.quoteCurrency || 'INR'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Prices</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.terms?.prices || "Doesn't include any octroi, implementation or training."}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">BOQ</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.terms?.boq || "Standard BOQ terms apply."}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Payment Terms</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.terms?.paymentTerms || "Within 30 days after submission of invoice."}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Renewal Term</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.renewalTerm || "Standard renewal terms apply."}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                  <p className="mt-1 text-sm text-gray-900">{quotation.notes || "No additional notes."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <QuotationPreview 
            onClose={() => {}} 
            isPreview={true}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentList entityType="quotation" entityId={quotationId} />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <FormModal
        ref={quotationEditModalRef}
        entity={ENTITY.QUOTATION}
        onClose={() => navigate(`/quotations/${quotationId}/view`)}
        maxWidth="max-w-6xl"
      >
        <QuotationForm
          onClose={handleQuotationEditClose}
          onSuccess={() => {
            handleQuotationEditClose();
            navigate(`/quotations/${quotationId}/view`);
          }}
        />
      </FormModal>

      {/* Preview Modal for PDF generation */}
      <FormModal
        ref={previewModalRef}
        entity={ENTITY.QUOTATION}
        type="preview"
        maxWidth="max-w-7xl"
      >
        <QuotationPreview
          onClose={handlePreviewClose}
          onGenerate={() => {
            handlePreviewClose();
            setActiveTab('documents');
            toast({
              title: 'Success',
              description: 'Quotation PDF generated and saved successfully',
            });
          }}
          isPreview={true}
        />
      </FormModal>
    </div>
    </Page>
  );
};

export default QuotationDetailView;