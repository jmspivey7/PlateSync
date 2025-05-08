import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// Helper function to format currency with thousands separators
function formatCurrency(amount: string | number): string {
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format with thousands separator and 2 decimal places
  // Use a simpler approach that won't cause formatting issues
  const numStr = numAmount.toFixed(2);
  
  // Format with commas for thousands
  const parts = numStr.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${integerPart}.${parts[1]}`;
}

interface CountReportPDFParams {
  churchName: string;
  churchLogoPath?: string;
  date: Date;
  totalAmount: string;
  cashAmount: string;
  checkAmount: string;
  donations: Array<{
    memberId: number | null;
    memberName: string;
    donationType: string;
    amount: string;
    checkNumber?: string;
  }>;
}

/**
 * Generates a PDF for a count report
 * 
 * @param params Parameters for the count report PDF
 * @returns The path to the generated PDF file
 */
export async function generateCountReportPDF(params: CountReportPDFParams): Promise<string> {
  const { churchName, churchLogoPath, date, totalAmount, cashAmount, checkAmount, donations } = params;
  
  // Create the output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'temp-files');
  console.log(`Creating PDF output directory at: ${outputDir}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
  
  // Format the date for the filename and report
  const formattedDate = format(date, 'MMMM d, yyyy');
  const filenameDateFormat = format(date, 'yyyy-MM-dd');
  
  // Create a unique filename for this report
  const filename = path.join(outputDir, `${filenameDateFormat} - Count Report - Detail.pdf`);
  
  // Create a new PDF document
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'letter'
  });
  
  // Pipe the PDF to a file
  const stream = fs.createWriteStream(filename);
  doc.pipe(stream);
  
  // Get check and cash donations
  const checkDonations = donations.filter(d => d.donationType === 'CHECK');
  const cashDonations = donations.filter(d => d.donationType === 'CASH');
  
  // Set up constants for layout
  const pageWidth = doc.page.width;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);
  
  // Render church name or logo
  console.log("PDF GENERATION - CONDITIONAL HEADER RENDERING");
  console.log(`Church logo path: ${churchLogoPath ? churchLogoPath : 'none'}`);
  console.log(`Church name: ${churchName ? churchName : 'none'}`);
  
  try {
    if (churchLogoPath && fs.existsSync(churchLogoPath)) {
      console.log("RENDERING LOGO");
      
      // Draw logo centered
      const logoData = fs.readFileSync(churchLogoPath);
      console.log(`Logo file size: ${logoData.length} bytes`);
      
      const logoWidth = 250;
      const centerX = (pageWidth - logoWidth) / 2;
      
      doc.image(logoData, centerX, margin, { 
        fit: [logoWidth, 100]
      });
      
      // Add spacer after logo
      doc.moveDown(3);
    } 
    else if (churchName && churchName.trim() !== '') {
      console.log("RENDERING CHURCH NAME HEADER");
      doc.font('Helvetica-Bold').fontSize(24);
      doc.text(churchName, margin, margin, { 
        align: 'center',
        width: contentWidth
      });
      doc.moveDown(1);
    }
  } catch (error) {
    console.error("Error rendering header:", error);
  }
  
  // Report title and date
  doc.font('Helvetica-Bold').fontSize(18);
  doc.text('Count Report', {
    align: 'center',
    width: contentWidth
  });
  
  doc.fontSize(14);
  doc.text(formattedDate, {
    align: 'center',
    width: contentWidth
  });
  
  doc.moveDown(2);
  
  // Set up table constants - using a simpler two column layout
  const leftColX = margin;
  const amountColX = pageWidth - margin - 150; // Fixed position for amount column
  const amountWidth = 150;
  
  // Helper function to render a row consistently
  function renderRow(label: string, amount: string, isBold: boolean = false) {
    const y = doc.y;
    
    // Set font for the label
    if (isBold) doc.font('Helvetica-Bold');
    else doc.font('Helvetica');
    
    // Left column (label)
    doc.text(label, leftColX, y);
    
    // Switch to Courier (monospaced font) for the amount
    if (isBold) doc.font('Courier-Bold');
    else doc.font('Courier');
    
    // Create the formatted amount text with a dollar sign
    const amountText = `$${formatCurrency(amount)}`;
    
    // Calculate the exact width of the amount text in this font
    const amountTextWidth = doc.widthOfString(amountText);
    
    // Position the text so it ends exactly at the right margin
    const startX = (amountColX + amountWidth) - amountTextWidth;
    
    // Draw the amount directly at the calculated position
    doc.text(amountText, startX, y);
    
    // Reset to regular font
    if (isBold) doc.font('Helvetica-Bold');
    else doc.font('Helvetica');
    
    return doc.y; // Return current Y position
  }
  
  // Helper function to draw a line
  function drawLine(y: number, isDouble: boolean = false) {
    doc.moveTo(leftColX, y).lineTo(amountColX + amountWidth, y).stroke();
    if (isDouble) {
      doc.moveTo(leftColX, y + 3).lineTo(amountColX + amountWidth, y + 3).stroke();
    }
    return y + (isDouble ? 5 : 3);
  }
  
  // Summary section
  doc.font('Helvetica').fontSize(12);
  renderRow('Checks', checkAmount);
  renderRow('Cash', cashAmount);
  
  // Draw line before total
  let currentY = drawLine(doc.y + 5);
  doc.y = currentY;
  
  // Render total
  renderRow('TOTAL', totalAmount, true);
  doc.moveDown(1.5);
  
  // CHECKS section
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('CHECKS', leftColX);
  doc.moveDown(0.5);
  
  // Check table header
  doc.font('Helvetica-Bold').fontSize(12);
  let headerY = doc.y;
  doc.text('Member / Donor', leftColX, headerY);
  doc.text('Check #', leftColX + 225, headerY);
  doc.text('Amount', amountColX, headerY, { width: amountWidth, align: 'right' });
  doc.moveDown(0.5);
  
  // Check items
  doc.font('Helvetica').fontSize(12);
  
  checkDonations.forEach(donation => {
    const itemY = doc.y;
    doc.text(donation.memberName, leftColX, itemY);
    if (donation.checkNumber) {
      doc.text(donation.checkNumber, leftColX + 225, itemY);
    }
    
    // Use Courier (monospaced font) for the amount
    doc.font('Courier');
    
    // Create the formatted amount text with a dollar sign
    const amountText = `$${formatCurrency(donation.amount)}`;
    
    // Calculate the exact width of the amount text in this font
    const amountTextWidth = doc.widthOfString(amountText);
    
    // Position the text so it ends exactly at the right margin
    const startX = (amountColX + amountWidth) - amountTextWidth;
    
    // Draw the amount directly at the calculated position
    doc.text(amountText, startX, itemY);
    
    // Reset to regular font
    doc.font('Helvetica');
    
    doc.moveDown(0.5);
  });
  
  // Draw line before check subtotal
  currentY = drawLine(doc.y + 5);
  doc.y = currentY;
  
  // Check subtotal
  renderRow('Sub-Total Checks', checkAmount, true);
  doc.moveDown(1.5);
  
  // CASH section
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('CASH', leftColX);
  doc.moveDown(0.5);
  
  // Cash table header
  doc.font('Helvetica-Bold').fontSize(12);
  headerY = doc.y;
  doc.text('Member / Donor', leftColX, headerY);
  doc.text('Amount', amountColX, headerY, { width: amountWidth, align: 'right' });
  doc.moveDown(0.5);
  
  // Cash items
  doc.font('Helvetica').fontSize(12);
  
  cashDonations.forEach(donation => {
    const itemY = doc.y;
    doc.text(donation.memberName, leftColX, itemY);
    
    // Use Courier (monospaced font) for the amount
    doc.font('Courier');
    
    // Create the formatted amount text with a dollar sign
    const amountText = `$${formatCurrency(donation.amount)}`;
    
    // Calculate the exact width of the amount text in this font
    const amountTextWidth = doc.widthOfString(amountText);
    
    // Position the text so it ends exactly at the right margin
    const startX = (amountColX + amountWidth) - amountTextWidth;
    
    // Draw the amount directly at the calculated position
    doc.text(amountText, startX, itemY);
    
    // Reset to regular font
    doc.font('Helvetica');
    
    doc.moveDown(0.5);
  });
  
  // Draw line before cash subtotal
  currentY = drawLine(doc.y + 5);
  doc.y = currentY;
  
  // Cash subtotal
  renderRow('Sub-Total Cash', cashAmount, true);
  doc.moveDown(2);
  
  // Draw line before grand total
  currentY = drawLine(doc.y - 5);
  doc.y = currentY + 10;
  
  // Grand total
  doc.fontSize(14);
  renderRow('GRAND TOTAL', totalAmount, true);
  
  // Double line after grand total
  drawLine(doc.y + 5, true);
  
  // Finalize the PDF
  doc.end();
  
  // Return a Promise that resolves when the stream is finished
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}