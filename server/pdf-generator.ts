import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// Helper function to format currency with thousands separators
function formatCurrency(amount: string | number): string {
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format with thousands separator and 2 decimal places
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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
  // Use process.cwd() instead of __dirname which is not available in ES modules
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
  
  // COMPLETE REDESIGN FOR HEADER RENDERING
  // This is a critical fix to ensure ONLY ONE header element is shown
  let startingY = 50;
  
  console.log("PDF GENERATION - HEADER CHOICE");
  console.log(`Church logo path: ${churchLogoPath ? churchLogoPath : 'none'}`);
  console.log(`Church name: ${churchName ? churchName : 'none'}`);
  
  try {
    // MUTUALLY EXCLUSIVE HEADER OPTIONS - Logo takes precedence if valid
    
    // Option 1: LOGO ONLY (if logo path exists and is valid)
    if (churchLogoPath && fs.existsSync(churchLogoPath)) {
      console.log("HEADER CHOICE: LOGO ONLY");
      
      // Get the page dimensions
      const pageWidth = doc.page.width;
      const logoWidth = 250; // Fixed width for consistency
      
      // Center the logo
      const logoX = (pageWidth - logoWidth) / 2;
      
      // Draw the logo using precise placement
      doc.image(churchLogoPath, logoX, 50, { width: logoWidth });
      
      // Allow space after the logo
      doc.moveDown(2);
    } 
    // Option 2: CHURCH NAME ONLY (if no logo but name exists)
    else if (churchName && churchName.trim() !== '') {
      console.log("HEADER CHOICE: CHURCH NAME ONLY");
      
      // Add the church name as header
      doc.font('Helvetica-Bold').fontSize(24).text(churchName, { align: 'center' });
      doc.moveDown(1);
    }
    // Option 3: NO HEADER (if neither logo nor name is available)
    else {
      console.log("HEADER CHOICE: MINIMAL HEADER");
      // No header content, just add some space
      doc.y = 70;
    }
    
    // Common report title for all options - rendered AFTER the conditional header
    doc.font('Helvetica-Bold').fontSize(18).text('Finalized Count Report', { align: 'center' });
    doc.fontSize(14).text(formattedDate, { align: 'center' });
    doc.moveDown(2);
  } catch (error) {
    console.error("ERROR IN HEADER RENDERING:", error);
    
    // Fallback to minimal header
    doc.y = 80;
    doc.font('Helvetica-Bold').fontSize(20).text('Finalized Count Report', { align: 'center' });
    doc.fontSize(14).text(formattedDate, { align: 'center' });
    doc.moveDown(2);
  }
  
  // Set position for table content
  startingY = doc.y;
  
  // Add summary totals
  const tableWidth = 400;
  const leftColumnWidth = 300;
  const rightColumnWidth = 100;
  const tableX = (doc.page.width - tableWidth) / 2;
  let tableY = doc.y;
  
  // Draw summary table
  doc.font('Helvetica').fontSize(12);
  
  // Checks row
  doc.text('Checks', tableX, tableY);
  doc.text(`$${formatCurrency(checkAmount)}`, tableX + leftColumnWidth, tableY, { align: 'right' });
  tableY += 20;
  
  // Cash row
  doc.text('Cash', tableX, tableY);
  doc.text(`$${formatCurrency(cashAmount)}`, tableX + leftColumnWidth, tableY, { align: 'right' });
  tableY += 20;
  
  // Ensure lines extend completely past the right edge of numbers
  // Calculate the width needed to extend the line past the rightmost text
  const textWidth = doc.widthOfString(`$${formatCurrency(totalAmount)}`);
  const fullTableWidth = tableWidth + textWidth; // Add enough width to fully cover the amount column
  
  // Draw horizontal line above TOTAL row
  doc.moveTo(tableX, tableY).lineTo(tableX + fullTableWidth, tableY).stroke();
  tableY += 5;
  
  // Total row
  doc.font('Helvetica-Bold');
  doc.text('TOTAL', tableX, tableY);
  doc.text(`$${formatCurrency(totalAmount)}`, tableX + leftColumnWidth, tableY, { align: 'right' });
  tableY += 30;
  
  // CHECKS section
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('CHECKS', tableX, tableY);
  tableY += 20;
  
  // Draw check table header
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Member / Donor', tableX, tableY);
  doc.text('Check #', tableX + 225, tableY);
  doc.text('Amount', tableX + leftColumnWidth, tableY, { align: 'right' });
  tableY += 20;
  
  // Draw check items
  doc.font('Helvetica').fontSize(12);
  let checkTotal = 0;
  
  checkDonations.forEach(donation => {
    doc.text(donation.memberName, tableX, tableY);
    if (donation.checkNumber) {
      doc.text(donation.checkNumber, tableX + 225, tableY);
    }
    doc.text(`$${formatCurrency(donation.amount)}`, tableX + leftColumnWidth, tableY, { align: 'right' });
    tableY += 20;
    checkTotal += parseFloat(donation.amount);
  });
  
  // Draw horizontal line - extend to cover full width including amount column
  doc.moveTo(tableX, tableY).lineTo(tableX + fullTableWidth, tableY).stroke();
  tableY += 5;
  
  // Check subtotal
  doc.font('Helvetica-Bold');
  doc.text('Sub-Total Checks', tableX, tableY);
  doc.text(`$${formatCurrency(checkAmount)}`, tableX + leftColumnWidth, tableY, { align: 'right' });
  tableY += 30;
  
  // CASH section
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('CASH', tableX, tableY);
  tableY += 20;
  
  // Draw cash table header
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Member / Donor', tableX, tableY);
  doc.text('Amount', tableX + leftColumnWidth, tableY, { align: 'right' });
  tableY += 20;
  
  // Draw cash items
  doc.font('Helvetica').fontSize(12);
  let cashTotal = 0;
  
  cashDonations.forEach(donation => {
    doc.text(donation.memberName, tableX, tableY);
    doc.text(`$${formatCurrency(donation.amount)}`, tableX + leftColumnWidth, tableY, { align: 'right' });
    tableY += 20;
    cashTotal += parseFloat(donation.amount);
  });
  
  // Draw horizontal line - extend to cover full width including amount column
  doc.moveTo(tableX, tableY).lineTo(tableX + fullTableWidth, tableY).stroke();
  tableY += 5;
  
  // Cash subtotal
  doc.font('Helvetica-Bold');
  doc.text('Sub-Total Cash', tableX, tableY);
  doc.text(`$${formatCurrency(cashAmount)}`, tableX + leftColumnWidth, tableY, { align: 'right' });
  tableY += 50;
  
  // Draw SINGLE horizontal line ABOVE grand total - extend to cover full width including amount column
  doc.moveTo(tableX, tableY - 20).lineTo(tableX + fullTableWidth, tableY - 20).stroke();
  
  // Grand total
  doc.fontSize(14);
  doc.text('GRAND TOTAL', tableX, tableY);
  doc.text(`$${formatCurrency(totalAmount)}`, tableX + leftColumnWidth, tableY, { align: 'right' });
  
  // Draw DOUBLE horizontal line BELOW grand total - extend to cover full width including amount column
  tableY += 15; // Increased spacing below the grand total text to avoid touching the numbers
  doc.moveTo(tableX, tableY).lineTo(tableX + fullTableWidth, tableY).stroke();
  doc.moveTo(tableX, tableY + 3).lineTo(tableX + fullTableWidth, tableY + 3).stroke();
  
  // Finalize the PDF
  doc.end();
  
  // Return a Promise that resolves when the stream is finished
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}