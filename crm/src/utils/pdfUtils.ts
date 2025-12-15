import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures an HTML element and converts it to a PDF blob
 * @param {HTMLElement} element - The HTML element to capture
 * @param {Object} options - Options for PDF generation
 * @returns {Promise<Blob>} - PDF blob
 */
export const generatePdfFromElement = async (element, options = {}) => {
  const defaults = {
    scale: 2,
    useCORS: true,
    quality: 0.98,
    filename: 'document.pdf',
    pageFormat: 'a4',
    orientation: 'portrait',
    margin: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
  };

  const settings = { ...defaults, ...options };

  try {
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: settings.scale,
      useCORS: settings.useCORS,
      logging: process.env.NODE_ENV === 'development',
    });

    // Calculate PDF dimensions
    const imgData = canvas.toDataURL('image/png', settings.quality);
    const imgWidth = 210; // A4 width in mm (portrait)
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF(settings.orientation, 'mm', settings.pageFormat);
    let position = settings.margin.top;

    // Handle multi-page content
    if (imgHeight > pageHeight - (settings.margin.top + settings.margin.bottom)) {
      // Content exceeds one page
      let heightLeft = imgHeight;
      
      while (heightLeft > 0) {
        pdf.addImage(imgData, 'PNG', settings.margin.left, position, imgWidth - (settings.margin.left + settings.margin.right), 0);
        heightLeft -= (pageHeight - settings.margin.top - settings.margin.bottom);
        
        if (heightLeft > 0) {
          position = settings.margin.top;
          pdf.addPage();
        }
      }
    } else {
      // Content fits in one page
      pdf.addImage(imgData, 'PNG', settings.margin.left, position, imgWidth - (settings.margin.left + settings.margin.right), imgHeight);
    }

    // Return as blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Gets a datestamp string for filenames
 * @returns {string} - Formatted date string (YYYYMMDD-HHMMSS)
 */
export const getDateStamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};