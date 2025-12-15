
// controllers/pdfController.js
import pdfService from '../services/pdfService.js';
import Quotation from '../models/Quotation.js';
import Document from '../models/Document.js';

/**
 * Generate PDF for a quotation and optionally upload to S3
 */
export const generateQuotationPdf = async (req, res) => {
  try {
    const { quotationId, saveToS3 = false, options = {} } = req.body;
    
    if (!quotationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'quotationId is required' 
      });
    }
    
    console.log(`Generating PDF for quotation: ${quotationId}`);
    
    // Fetch quotation data from database
    const quotation = await Quotation.findById(quotationId)
      .populate('accountId')
      .populate('contactId', 'firstName lastName email phone');
    
    if (!quotation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Quotation not found' 
      });
    }
    
    // Generate HTML content
    const html = generateQuotationHtml(quotation);
    
    // Generate PDF with increased timeout
    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      timeout: 60000, // Increase timeout to 60 seconds
      ...options
    };
    
    console.log(`Generating PDF with options:`, pdfOptions);
    const pdfBuffer = await pdfService.generatePdf(html, pdfOptions);
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    console.log(`PDF buffer generated: ${pdfBuffer.length} bytes`);
    
    if (saveToS3) {
      const fileName = `Quotation-${quotation.quotationNumber}.pdf`;
      
      console.log(`Uploading to S3: ${fileName}`);
      // Upload to S3
      const uploadResult = await pdfService.uploadToS3(pdfBuffer, fileName);
      
      // Create document reference
      const document = new Document({
        name: fileName,
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileKey,
        fileType: 'application/pdf',
        entityType: 'quotation',
        entityId: quotationId,
        createdBy: req.user ? req.user.userId || req.user.id : 'system',
        metadata: {
          quotationNumber: quotation.quotationNumber,
          accountName: quotation.accountId?.companyName || quotation.accountId?.name,
          issueDate: quotation.issueDate
        }
      });
      
      await document.save();
      console.log(`Document saved with ID: ${document._id}`);
      
      // Return success response
      return res.json({
        success: true,
        message: 'PDF generated and saved successfully',
        document: document
      });
    } else {
      // Return PDF directly with correct headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('ETag');
      res.removeHeader('Connection');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="Quotation-${quotation.quotationNumber}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.end(pdfBuffer);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate PDF',
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * Generate HTML content for the quotation PDF
 * @param {Object} quotation - Quotation document
 * @returns {string} - HTML string
 */
function generateQuotationHtml(quotation) {
  // Function to format currency
  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  
  // Function to safely format address
  const formatAddress = (account) => {
    if (!account) return 'Address not available';
    
    // Check if we have billing address
    const addr = account.billingAddress;
    if (!addr) return account.companyName || account.name || 'Address not available';
    
    const parts = [];
    if (addr.street) parts.push(addr.street);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    // Check for both possible field names
    if (addr.postalCode) parts.push(addr.postalCode);
    else if (addr.zipCode) parts.push(addr.zipCode);
    if (addr.country) parts.push(addr.country);
    
    if (parts.length === 0) return account.companyName || account.name || 'Address not available';
    
    return parts.join(', ');
  };
  
  // Calculate totals
  const subtotal = quotation.items.reduce(
    (sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.unitPrice),
    0
  );
  
  const gstTotal = quotation.items.reduce(
    (sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.unitPrice) * (parseFloat(item.gst || 0) / 100),
    0
  );
  
  const total = subtotal + gstTotal;
  
  // Get account name
  const accountName = quotation.accountId?.companyName || quotation.accountId?.name || 'Customer Name';
  
  // Get contact name
  const contactName = quotation.contactId ? 
    `${quotation.contactId.firstName || ''} ${quotation.contactId.lastName || ''}`.trim() : 
    'Contact Person';
  
  // Get contact email
  const contactEmail = quotation.contactId?.email || 'N/A';
  
  // Format the address
  const formattedAddress = formatAddress(quotation.accountId);
  
  // Generate items table rows
  const itemsHtml = quotation.items.map((item, index) => {
    const itemTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
    const gstAmount = itemTotal * (parseFloat(item.gst || 0) / 100);
    const totalWithGST = itemTotal + gstAmount;
    
    return `
      <tr style="${index % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f9f9f9;'}">
        <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.type || 'Product'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.status || 'New'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.sku || 'N/A'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.quantity}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
          ${formatCurrency(item.unitPrice, quotation.quoteCurrency)}
        </td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
          ${formatCurrency(itemTotal, quotation.quoteCurrency)}
        </td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.gst || 0}%</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
          ${formatCurrency(totalWithGST, quotation.quoteCurrency)}
        </td>
      </tr>
    `;
  }).join('');

  // Generate complete HTML with simpler styling for better compatibility
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quotation ${quotation.quotationNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .header-left {
          float: left;
          width: 50%;
        }
        .header-right {
          float: right;
          width: 50%;
          text-align: right;
        }
        .clearfix:after {
          content: "";
          display: table;
          clear: both;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 10px;
          border: 1px solid #ddd;
        }
        th {
          background-color: #f5f5f5;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          color: #555;
        }
        .totals {
          width: 300px;
          margin-left: auto;
          margin-top: 20px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #777;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header clearfix">
        <div class="header-left">
          <h1 style="font-size: 24px; margin-bottom: 5px;">TECPACT Technology Impact</h1>
          <p style="margin: 2px 0; color: #555;">Tecpact Technologies Pvt. Ltd.</p>
          <p style="margin: 2px 0; color: #555;">20, Okhla Industrial Estate, Phase III</p>
          <p style="margin: 2px 0; color: #555;">New Delhi - 110020</p>
          <p style="margin: 2px 0; color: #555;">GSTIN: 07AAECF7950A1ZF</p>
        </div>
        <div class="header-right">
          <h2 style="font-size: 28px; color: #1a73e8; margin-bottom: 15px;">QUOTATION</h2>
          <p style="margin: 5px 0;"><strong>Quotation #:</strong> ${quotation.quotationNumber}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(quotation.issueDate)}</p>
          <p style="margin: 5px 0;"><strong>Valid Until:</strong> ${formatDate(quotation.validUntil)}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; margin-bottom: 10px;">Customer Information</h2>
        <p><strong>To:</strong> ${accountName}</p>
        <p><strong>Address:</strong> ${formattedAddress}</p>
        <p><strong>Contact:</strong> ${contactName}</p>
        <p><strong>Email:</strong> ${contactEmail}</p>
        ${quotation.contactId?.phone ? `<p><strong>Phone:</strong> ${quotation.contactId.phone}</p>` : ''}
        ${quotation.oem ? `<p><strong>OEM:</strong> ${quotation.oem}</p>` : ''}
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; margin-bottom: 10px;">Quotation Items</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">S. No.</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Type</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Status</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">SKU</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Description</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Unit Price</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total Price</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">GST</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total (Inc. GST)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <div style="width: 300px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
              <span style="font-weight: bold;">Subtotal:</span>
              <span>${formatCurrency(subtotal, quotation.quoteCurrency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
              <span style="font-weight: bold;">GST:</span>
              <span>${formatCurrency(gstTotal, quotation.quoteCurrency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-top: 2px solid #000; margin-top: 5px; font-weight: bold;">
              <span>Total:</span>
              <span>${formatCurrency(total, quotation.quoteCurrency)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; margin-bottom: 10px;">Terms and Conditions</h2>
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 5px;">Prices:</h3>
          <p style="margin: 0; color: #555;">
            ${quotation.terms?.prices || "Doesn't include any octroi, implementation or training."}
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 5px;">BOQ:</h3>
          <p style="margin: 0; color: #555;">
            ${quotation.terms?.boq || "Standard BOQ terms apply."}
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 5px;">Payment Terms:</h3>
          <p style="margin: 0; color: #555;">
            ${quotation.terms?.paymentTerms || "Within 30 days after submission of invoice."}
          </p>
        </div>
        ${quotation.renewalTerm ? `
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 5px;">Renewal Term:</h3>
          <p style="margin: 0; color: #555;">${quotation.renewalTerm}</p>
        </div>
        ` : ''}
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 5px;">Validity:</h3>
          <p style="margin: 0; color: #555;">Quotation is valid till ${formatDate(quotation.validUntil)}</p>
        </div>
        ${quotation.notes ? `
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 5px;">Notes:</h3>
          <p style="margin: 0; color: #555;">${quotation.notes}</p>
        </div>
        ` : ''}
      </div>
      
      <div class="footer">
        <p style="margin: 5px 0;">Purchase order to be placed on Tecpact Technologies Private Limited.</p>
        <p style="margin: 5px 0;">Thank you for your business!</p>
      </div>
    </body>
    </html>
  `;
}

// Export the generateQuotationHtml function so it can be used by other modules
export { generateQuotationHtml };

export default { generateQuotationPdf, generateQuotationHtml };