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
  
  // Create a new PDF document with auto page breaks disabled
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'letter',
    autoFirstPage: true
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
  
  // Set up table constants
  const leftColX = margin;
  const rightMargin = margin;
  
  // Start position for amount column - keep amount column narrower
  const amountColX = pageWidth - rightMargin - 100; 
  
  // Log key layout information for debugging
  console.log(`Page width: ${pageWidth}, Content width: ${contentWidth}, Amount column X: ${amountColX}`);
  
  // COMPLETELY DIFFERENT APPROACH FOR HEADER LAYOUT
  // We'll build the header in REVERSE order in the code, but resulting in the correct 
  // physical order: Logo at top, Title below, Date below that
  
  console.log("=== CREATING NEW PDF WITH STRICT LAYOUT ORDER: LOGO, TITLE, DATE ===");
  
  // Clear all Y position tracking
  let logoHeight = 0;
  let titleHeight = 0;
  let dateHeight = 0;
  
  // Calculate space for all three header elements
  const logoWidth = 250;
  const logoEstimatedHeight = 100;
  
  // STEP 1: TOP ELEMENT - LOGO
  let headerY = margin;
  try {
    if (churchLogoPath && fs.existsSync(churchLogoPath)) {
      console.log(`Drawing logo at Y: ${headerY}`);
      
      // Load logo data
      const logoData = fs.readFileSync(churchLogoPath);
      console.log(`Logo file size: ${logoData.length} bytes`);
      
      // Position logo horizontally in the center
      const centerX = (pageWidth - logoWidth) / 2;
      
      // Add logo to the document at the specified position
      doc.image(logoData, centerX, headerY, { 
        fit: [logoWidth, logoEstimatedHeight],
        align: 'center'
      });
      
      // Add space below logo
      logoHeight = logoEstimatedHeight;
    } 
    else if (churchName && churchName.trim() !== '') {
      console.log(`Drawing church name at Y: ${headerY}`);
      doc.font('Helvetica-Bold').fontSize(24);
      doc.text(churchName, margin, headerY, { 
        align: 'center',
        width: contentWidth
      });
      
      // Estimate the height used
      logoHeight = 30;
    }
  } catch (error) {
    console.error("Error rendering logo/name:", error);
  }
  
  // STEP 2: SECOND ELEMENT - TITLE
  // Provide extra space after logo
  headerY = margin + logoHeight + 15;
  console.log(`Drawing title at Y: ${headerY}`);
  doc.font('Helvetica-Bold').fontSize(18);
  doc.text('Final Count Report', margin, headerY, {
    align: 'center',
    width: contentWidth
  });
  
  titleHeight = 25; // Estimate height of title
  
  // STEP 3: THIRD ELEMENT - DATE
  // Move position down after title
  headerY = margin + logoHeight + 15 + titleHeight + 5;
  console.log(`Drawing date at Y: ${headerY}`);
  doc.font('Helvetica').fontSize(14);
  doc.text(formattedDate, margin, headerY, {
    align: 'center',
    width: contentWidth
  });
  
  dateHeight = 20; // Estimate height of date text
  
  // Set the cursor position for the content section
  // Leave space after the header
  headerY = margin + logoHeight + titleHeight + dateHeight + 40;
  doc.y = headerY;
  console.log(`Final position after header section: ${doc.y}`);
  
  // Lines array to collect all line drawing operations - execute them at the end
  const linesToDraw: Array<{y: number, isDouble?: boolean}> = [];
  
  // Helper function to add a line to be drawn later
  function addLine(y: number, isDouble: boolean = false) {
    linesToDraw.push({ y, isDouble });
    return y + (isDouble ? 5 : 3);
  }
  
  // Summary section
  doc.font('Helvetica').fontSize(12);
  
  // First row - Checks
  let rowY = doc.y;
  doc.text('Checks', leftColX, rowY);
  
  // Use the standard app font (Helvetica) for amount values for consistency
  doc.font('Helvetica');
  const checksAmount = `$${formatCurrency(checkAmount)}`;
  doc.text(checksAmount, amountColX, rowY, { align: 'right' });
  
  doc.moveDown(0.5);
  
  // Second row - Cash
  rowY = doc.y;
  doc.font('Helvetica');
  doc.text('Cash', leftColX, rowY);
  
  // Keep using the standard Helvetica font
  const cashAmountText = `$${formatCurrency(cashAmount)}`;
  doc.text(cashAmountText, amountColX, rowY, { align: 'right' });
  
  doc.moveDown(0.5);
  
  // Add a line before total to the draw list
  addLine(doc.y + 5);
  doc.moveDown(1);
  
  // Total row
  rowY = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('TOTAL', leftColX, rowY);
  
  // Keep consistent with bold app font
  doc.font('Helvetica-Bold');
  const totalAmountText = `$${formatCurrency(totalAmount)}`;
  doc.text(totalAmountText, amountColX, rowY, { align: 'right' });
  
  doc.moveDown(1.5);
  
  // CHECKS section
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('CHECKS', leftColX);
  doc.moveDown(0.5);
  
  // Check table header
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Member / Donor', leftColX);
  doc.text('Check #', leftColX + 225, doc.y - doc.currentLineHeight());
  doc.text('Amount', amountColX, doc.y - doc.currentLineHeight(), { align: 'right' });
  doc.moveDown(0.5);
  
  // Check items
  doc.font('Helvetica').fontSize(12);
  
  checkDonations.forEach(donation => {
    const itemY = doc.y;
    doc.text(donation.memberName, leftColX, itemY);
    if (donation.checkNumber) {
      doc.text(donation.checkNumber, leftColX + 225, itemY);
    }
    
    // Amount with standard app font
    const donationAmount = `$${formatCurrency(donation.amount)}`;
    doc.text(donationAmount, amountColX, itemY, { align: 'right' });
    
    doc.moveDown(0.5);
  });
  
  // Add a line before check subtotal
  addLine(doc.y + 5);
  doc.moveDown(1);
  
  // Check subtotal row
  rowY = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Sub-Total Checks', leftColX, rowY);
  
  // Keep consistent with bold app font
  doc.font('Helvetica-Bold');
  const subTotalChecks = `$${formatCurrency(checkAmount)}`;
  doc.text(subTotalChecks, amountColX, rowY, { align: 'right' });
  
  doc.moveDown(1.5);
  
  // CASH section
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('CASH', leftColX);
  doc.moveDown(0.5);
  
  // Cash table header
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Member / Donor', leftColX);
  doc.text('Amount', amountColX, doc.y - doc.currentLineHeight(), { align: 'right' });
  doc.moveDown(0.5);
  
  // Cash items
  doc.font('Helvetica').fontSize(12);
  
  cashDonations.forEach(donation => {
    const itemY = doc.y;
    doc.text(donation.memberName, leftColX, itemY);
    
    // Amount with standard app font
    const donationAmount = `$${formatCurrency(donation.amount)}`;
    doc.text(donationAmount, amountColX, itemY, { align: 'right' });
    
    doc.moveDown(0.5);
  });
  
  // Add a line before cash subtotal
  addLine(doc.y + 5);
  doc.moveDown(1);
  
  // Cash subtotal row
  rowY = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Sub-Total Cash', leftColX, rowY);
  
  // Keep consistent with bold app font
  doc.font('Helvetica-Bold');
  const subTotalCash = `$${formatCurrency(cashAmount)}`;
  doc.text(subTotalCash, amountColX, rowY, { align: 'right' });
  
  doc.moveDown(2);
  
  // Add line before grand total
  addLine(doc.y - 5);
  doc.moveDown(1);
  
  // Grand total row
  rowY = doc.y;
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('GRAND TOTAL', leftColX, rowY);
  
  // Keep consistent with bold app font
  doc.font('Helvetica-Bold');
  const grandTotal = `$${formatCurrency(totalAmount)}`;
  doc.text(grandTotal, amountColX, rowY, { align: 'right' });
  
  // Add double line after grand total
  addLine(doc.y + 5, true);
  
  // Now draw all the lines AFTER all text has been placed
  // This ensures text positioning doesn't get affected by line drawing operations
  doc.save(); // Save the current state
  
  linesToDraw.forEach(line => {
    if (line.isDouble) {
      // Double line (for Grand Total)
      doc.moveTo(leftColX, line.y).lineTo(pageWidth - rightMargin, line.y).stroke();
      doc.moveTo(leftColX, line.y + 3).lineTo(pageWidth - rightMargin, line.y + 3).stroke();
    } else {
      // Single line
      doc.moveTo(leftColX, line.y).lineTo(pageWidth - rightMargin, line.y).stroke();
    }
  });
  
  doc.restore(); // Restore to the saved state
  
  // Finalize the PDF
  doc.end();
  
  // Return a Promise that resolves when the stream is finished
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`Cleaned up temporary PDF file: ${filename}`);
      resolve(filename);
    });
    stream.on('error', reject);
  });
}