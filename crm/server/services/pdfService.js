// services/pdfService.js
import puppeteer from 'puppeteer';
import { Upload } from '@aws-sdk/lib-storage';
import { S3 } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS
const s3 = new S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  region: process.env.AWS_REGION,
});

/**
 * Generate PDF from HTML
 * @param {string} html - HTML content
 * @param {Object} options - PDF options
 * @returns {Promise<Buffer>} - PDF buffer
 */
// Enhanced PDF generation with more robust configuration
export const generatePdf = async (html, options = {}) => {
  let browser = null;
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-features=site-per-process',
        '--disable-accelerated-2d-canvas'
      ],
      timeout: options.timeout || 30000
    });
    
    console.log('Creating page...');
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1,
    });
    
    // Intercept console messages from the page
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    
    // Set content with proper timeout
    console.log('Setting HTML content...');
    await page.setContent(html, { 
      waitUntil: ['load', 'networkidle0'],
      timeout: options.timeout || 30000
    });
    
    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      margin: options.margin || {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      timeout: options.timeout || 30000
    });
    
    console.log(`PDF generated successfully: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    console.error('Error in generatePdf:', error);
    throw error;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
};

/**
 * Upload PDF to S3
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {string} fileName - File name
 * @returns {Promise<Object>} - Upload result
 */
export const uploadToS3 = async (pdfBuffer, fileName) => {
  try {
    const fileKey = `quotations/${uuidv4()}-${fileName}`;
    
    console.log(`Uploading to S3: ${fileKey}`);
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ACL: 'private'
    };
    
    const uploadResult = await new Upload({
      client: s3,
      params,
    }).done();
    console.log('Upload successful:', uploadResult.Location);
    
    return {
      fileUrl: uploadResult.Location,
      fileKey: fileKey
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

/**
 * Download PDF for a quotation
 * @param {string} quotationId - Quotation ID
 * @param {string} fileName - File name
 * @param {Object} options - PDF options
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const downloadQuotationPdf = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const options = req.query.options ? JSON.parse(req.query.options) : {};
    
    console.log(`Downloading PDF for quotation ${quotationId}`);
    
    // Fetch quotation data
    const Quotation = require('../models/Quotation');
    const quotation = await Quotation.findById(quotationId)
      .populate('accountId')
      .populate('contactId', 'firstName lastName email phone');
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Generate HTML
    const pdfController = require('../controllers/pdfController');
    const html = pdfController.generateQuotationHtml(quotation);
    
    // Generate PDF
    const pdfBuffer = await generatePdf(html, options);
    
    // Set headers and send response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quotation-${quotation.quotationNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
};

/**
 * Generate and save quotation PDF to S3
 * @param {string} quotationId - Quotation ID
 * @param {Object} options - PDF options
 * @returns {Promise<Object>} - Document object
 */
export const generateAndSaveQuotationPdf = async (quotationId, options = {}) => {
  try {
    console.log(`Generating and saving PDF for quotation ${quotationId}`);

    // Fetch quotation data
    const Quotation = (await import('../models/Quotation.js')).default;
    const Document = (await import('../models/Document.js')).default;
    
    const quotation = await Quotation.findById(quotationId)
      .populate('accountId')
      .populate('contactId', 'firstName lastName email phone');
    
    if (!quotation) {
      throw new Error('Quotation not found');
    }
    
    // Generate HTML
    const pdfController = require('../controllers/pdfController');
    const html = pdfController.generateQuotationHtml(quotation);
    
    // Generate PDF
    const pdfBuffer = await generatePdf(html, options);
    
    // Upload to S3
    const fileName = `Quotation-${quotation.quotationNumber}.pdf`;
    const uploadResult = await uploadToS3(pdfBuffer, fileName);
    
    // Save document reference
    const document = new Document({
      name: fileName,
      fileUrl: uploadResult.fileUrl,
      fileKey: uploadResult.fileKey,
      fileType: 'application/pdf',
      entityType: 'quotation',
      entityId: quotationId,
      createdBy: 'system', // This should ideally be the user ID
      metadata: {
        quotationNumber: quotation.quotationNumber,
        accountName: quotation.accountId?.companyName || quotation.accountId?.name,
        issueDate: quotation.issueDate
      }
    });
    
    await document.save();
    console.log(`Document saved with ID: ${document._id}`);
    
    return { document };
  } catch (error) {
    console.error('Error generating and saving PDF:', error);
    throw error;
  }
};

export default { generatePdf, uploadToS3, downloadQuotationPdf, generateAndSaveQuotationPdf };