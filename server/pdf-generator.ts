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
  
  // IMPORTANT: We only want to display EITHER the logo OR the church name, not both
  let startingY = 50; // Default starting Y position
  
  if (churchLogoPath && fs.existsSync(churchLogoPath)) {
    // VERSION 1: With logo only (NO church name)
    const logoWidth = 250;
    doc.image(churchLogoPath, (doc.page.width - logoWidth) / 2, startingY, { width: logoWidth });
    startingY = doc.y + 20; // Move down after logo
  } else {
    // VERSION 2: Without logo, ONLY church name in larger font
    doc.font('Helvetica-Bold').fontSize(24).text(churchName, { align: 'center' });
    startingY = doc.y + 10; // Move down after church name
  }
  
  // Reset Y position to use the correct starting point after either logo OR name
  doc.y = startingY;
  
  // Add report title and date (appears in both versions)
  doc.font('Helvetica-Bold').fontSize(18).text('Finalized Count Report', { align: 'center' });
  doc.fontSize(14).text(formattedDate, { align: 'center' });
  doc.moveDown(2);
  
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
  tableY += 10; // Space below the grand total text
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