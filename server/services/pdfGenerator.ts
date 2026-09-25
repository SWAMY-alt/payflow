import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatPaise } from '../../shared/types';
import type { Invoice, Business, Client, Payment } from '../../shared/types';

function formatPdfCurrency(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = (absPaise / 100).toFixed(2);
  const parts = rupees.split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  
  if (intPart.length > 3) {
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  
  const prefix = isNegative ? '-INR ' : 'INR ';
  return `${prefix}${intPart}.${decPart}`;
}

function cleanTextForPdf(str: string): string {
  return str
    .replace(/[₹]/g, 'INR ')
    .replace(/[•]/g, '-')
    .replace(/[^\x00-\x7F]/g, ''); // strip non-ascii
}

export async function generateInvoicePdf(
  invoice: Invoice,
  business: Business,
  client: Client,
  payments: Payment[] = []
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points (width x height)
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette
  const colorPrimary = rgb(0.05, 0.58, 0.53); // Teal #0d9488
  const colorDark = rgb(0.06, 0.09, 0.16); // Slate 900
  const colorText = rgb(0.2, 0.25, 0.33); // Slate 700
  const colorMuted = rgb(0.4, 0.45, 0.55); // Slate 500
  const colorBgLight = rgb(0.96, 0.98, 0.98); // Light teal tint
  const colorBorder = rgb(0.85, 0.88, 0.92); // Gray border
  const colorDanger = rgb(0.88, 0.15, 0.25); // Red
  const colorSuccess = rgb(0.08, 0.65, 0.38); // Green

  let y = height - 50;

  // Header Banner / Accent Line
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width: width,
    height: 8,
    color: colorPrimary,
  });

  // Business Name & Title
  page.drawText(business.name.toUpperCase(), {
    x: 40,
    y: y,
    size: 20,
    font: fontBold,
    color: colorDark,
  });

  // Invoice Title Right Aligned
  const invTitle = 'INVOICE';
  const invTitleWidth = fontBold.widthOfTextAtSize(invTitle, 22);
  page.drawText(invTitle, {
    x: width - 40 - invTitleWidth,
    y: y,
    size: 22,
    font: fontBold,
    color: colorPrimary,
  });

  y -= 18;

  // Business Details Left
  if (business.gstNumber) {
    page.drawText(`GSTIN: ${business.gstNumber}`, {
      x: 40,
      y: y,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    y -= 13;
  }

  if (business.contactEmail || business.contactPhone) {
    const contactStr = [business.contactEmail, business.contactPhone].filter(Boolean).join(' | ');
    page.drawText(contactStr, {
      x: 40,
      y: y,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    y -= 13;
  }

  if (business.address) {
    page.drawText(business.address, {
      x: 40,
      y: y,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    y -= 13;
  }

  // Invoice Meta Box (Right Side)
  const metaBoxY = height - 125;
  const metaX = width - 210;

  // Draw Invoice Number
  page.drawText('Invoice No:', {
    x: metaX,
    y: metaBoxY,
    size: 9,
    font: fontBold,
    color: colorDark,
  });
  page.drawText(invoice.invoiceNumber, {
    x: metaX + 70,
    y: metaBoxY,
    size: 9,
    font: fontBold,
    color: colorPrimary,
  });

  // Issue Date
  const issueDateStr = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  page.drawText('Issue Date:', {
    x: metaX,
    y: metaBoxY - 14,
    size: 9,
    font: fontRegular,
    color: colorMuted,
  });
  page.drawText(issueDateStr, {
    x: metaX + 70,
    y: metaBoxY - 14,
    size: 9,
    font: fontRegular,
    color: colorDark,
  });

  // Due Date
  const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  page.drawText('Due Date:', {
    x: metaX,
    y: metaBoxY - 28,
    size: 9,
    font: fontRegular,
    color: colorMuted,
  });
  page.drawText(dueDateStr, {
    x: metaX + 70,
    y: metaBoxY - 28,
    size: 9,
    font: fontBold,
    color: invoice.status === 'Overdue' ? colorDanger : colorDark,
  });

  // Status Badge
  const statusColor =
    invoice.status === 'Paid'
      ? colorSuccess
      : invoice.status === 'Overdue'
      ? colorDanger
      : colorPrimary;

  page.drawRectangle({
    x: metaX,
    y: metaBoxY - 50,
    width: 140,
    height: 18,
    color: colorBgLight,
    borderColor: statusColor,
    borderWidth: 1,
  });
  const statusText = `STATUS: ${invoice.status.toUpperCase()}`;
  page.drawText(statusText, {
    x: metaX + 15,
    y: metaBoxY - 45,
    size: 9,
    font: fontBold,
    color: statusColor,
  });

  // Horizontal divider
  y = Math.min(y, metaBoxY - 60);
  page.drawLine({
    start: { x: 40, y: y },
    end: { x: width - 40, y: y },
    thickness: 1,
    color: colorBorder,
  });

  y -= 25;

  // Bill To Section
  page.drawText('BILLED TO', {
    x: 40,
    y: y,
    size: 10,
    font: fontBold,
    color: colorPrimary,
  });

  y -= 15;
  page.drawText(client.name, {
    x: 40,
    y: y,
    size: 12,
    font: fontBold,
    color: colorDark,
  });

  y -= 14;
  page.drawText(`Phone: ${client.contactPhone}`, {
    x: 40,
    y: y,
    size: 9,
    font: fontRegular,
    color: colorText,
  });

  y -= 13;
  page.drawText(`Email: ${client.contactEmail}`, {
    x: 40,
    y: y,
    size: 9,
    font: fontRegular,
    color: colorText,
  });

  y -= 25;

  // Table Headers
  const tableTop = y;
  const colX = {
    num: 45,
    desc: 75,
    qty: 360,
    rate: 420,
    amount: 495,
  };

  page.drawRectangle({
    x: 40,
    y: tableTop - 4,
    width: width - 80,
    height: 22,
    color: colorBgLight,
  });

  page.drawText('#', { x: colX.num, y: tableTop + 3, size: 9, font: fontBold, color: colorDark });
  page.drawText('ITEM DESCRIPTION', { x: colX.desc, y: tableTop + 3, size: 9, font: fontBold, color: colorDark });
  page.drawText('QTY', { x: colX.qty, y: tableTop + 3, size: 9, font: fontBold, color: colorDark });
  page.drawText('UNIT PRICE', { x: colX.rate, y: tableTop + 3, size: 9, font: fontBold, color: colorDark });
  page.drawText('AMOUNT (INR)', { x: colX.amount, y: tableTop + 3, size: 9, font: fontBold, color: colorDark });

  y = tableTop - 20;

  // Render Line Items
  invoice.lineItems.forEach((item, index) => {
    const itemAmount = (item.quantity || 1) * (item.unitPrice || 0);

    page.drawText(String(index + 1), {
      x: colX.num,
      y: y,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });

    // Truncate description if too long
    const desc = cleanTextForPdf(item.description.length > 45 ? item.description.substring(0, 42) + '...' : item.description);
    page.drawText(desc, {
      x: colX.desc,
      y: y,
      size: 9,
      font: fontRegular,
      color: colorDark,
    });

    page.drawText(String(item.quantity), {
      x: colX.qty + 5,
      y: y,
      size: 9,
      font: fontRegular,
      color: colorDark,
    });

    page.drawText(formatPdfCurrency(item.unitPrice), {
      x: colX.rate,
      y: y,
      size: 9,
      font: fontRegular,
      color: colorDark,
    });

    page.drawText(formatPdfCurrency(itemAmount), {
      x: colX.amount,
      y: y,
      size: 9,
      font: fontBold,
      color: colorDark,
    });

    y -= 18;

    // Row underline
    page.drawLine({
      start: { x: 40, y: y + 8 },
      end: { x: width - 40, y: y + 8 },
      thickness: 0.5,
      color: colorBorder,
    });
  });

  y -= 15;

  // Financial Summary Box (Right Side)
  const summaryX = width - 230;
  const summaryValX = width - 110;

  // Subtotal
  page.drawText('Subtotal:', {
    x: summaryX,
    y: y,
    size: 10,
    font: fontRegular,
    color: colorText,
  });
  page.drawText(formatPdfCurrency(invoice.subtotal), {
    x: summaryValX,
    y: y,
    size: 10,
    font: fontRegular,
    color: colorDark,
  });
  y -= 16;

  // Late Fee (if any)
  if (invoice.lateFeeAmount > 0) {
    page.drawText(`Late Fee (${invoice.lateFeePercent}%):`, {
      x: summaryX,
      y: y,
      size: 10,
      font: fontRegular,
      color: colorDanger,
    });
    page.drawText(`+ ${formatPdfCurrency(invoice.lateFeeAmount)}`, {
      x: summaryValX,
      y: y,
      size: 10,
      font: fontBold,
      color: colorDanger,
    });
    y -= 16;
  }

  // Total Amount
  page.drawLine({
    start: { x: summaryX - 10, y: y + 5 },
    end: { x: width - 40, y: y + 5 },
    thickness: 1,
    color: colorBorder,
  });
  page.drawText('Total Amount:', {
    x: summaryX,
    y: y - 8,
    size: 11,
    font: fontBold,
    color: colorDark,
  });
  page.drawText(formatPdfCurrency(invoice.totalAmount), {
    x: summaryValX,
    y: y - 8,
    size: 11,
    font: fontBold,
    color: colorPrimary,
  });
  y -= 22;

  // Amount Paid
  page.drawText('Amount Paid:', {
    x: summaryX,
    y: y,
    size: 10,
    font: fontRegular,
    color: colorSuccess,
  });
  page.drawText(`- ${formatPdfCurrency(invoice.amountPaid)}`, {
    x: summaryValX,
    y: y,
    size: 10,
    font: fontBold,
    color: colorSuccess,
  });
  y -= 18;

  // Balance Due Box
  const balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  page.drawRectangle({
    x: summaryX - 10,
    y: y - 10,
    width: 200,
    height: 26,
    color: balanceDue > 0 ? rgb(0.99, 0.95, 0.95) : rgb(0.95, 0.99, 0.96),
    borderColor: balanceDue > 0 ? colorDanger : colorSuccess,
    borderWidth: 1,
  });

  page.drawText('BALANCE DUE:', {
    x: summaryX,
    y: y - 3,
    size: 10,
    font: fontBold,
    color: balanceDue > 0 ? colorDanger : colorSuccess,
  });
  page.drawText(formatPdfCurrency(balanceDue), {
    x: summaryValX,
    y: y - 3,
    size: 11,
    font: fontBold,
    color: balanceDue > 0 ? colorDanger : colorSuccess,
  });

  // Payment Instructions (Left Side)
  const payX = 40;
  let payY = y + 45;

  page.drawText('PAYMENT DETAILS', {
    x: payX,
    y: payY,
    size: 10,
    font: fontBold,
    color: colorPrimary,
  });

  payY -= 15;
  page.drawText(`UPI ID: ${cleanTextForPdf(business.upiId)}`, {
    x: payX,
    y: payY,
    size: 9,
    font: fontBold,
    color: colorDark,
  });

  payY -= 14;
  page.drawText('Bank Account / Transfer:', {
    x: payX,
    y: payY,
    size: 9,
    font: fontBold,
    color: colorText,
  });

  payY -= 13;
  // Multi-line bank details
  const bankLines = business.bankDetails.split('\n');
  for (const bl of bankLines) {
    page.drawText(cleanTextForPdf(bl), {
      x: payX,
      y: payY,
      size: 8.5,
      font: fontRegular,
      color: colorMuted,
    });
    payY -= 11;
  }

  // Payment Ledger (Chronological audit history on invoice)
  y = Math.min(y - 30, payY - 20);

  if (payments && payments.length > 0) {
    page.drawText('RECORDED PAYMENT LEDGER', {
      x: 40,
      y: y,
      size: 9,
      font: fontBold,
      color: colorDark,
    });
    y -= 14;

    payments.forEach((p) => {
      const pDate = new Date(p.paidAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const noteStr = p.referenceNote ? ` (${cleanTextForPdf(p.referenceNote)})` : '';
      const ledgerEntry = `- ${pDate} : ${formatPdfCurrency(p.amount)} via ${p.method.toUpperCase()}${noteStr}`;
      page.drawText(ledgerEntry, {
        x: 45,
        y: y,
        size: 8,
        font: fontRegular,
        color: colorMuted,
      });
      y -= 12;
    });
  }

  // Footer Note & Policy
  const footerY = 35;
  page.drawLine({
    start: { x: 40, y: footerY + 18 },
    end: { x: width - 40, y: footerY + 18 },
    thickness: 0.5,
    color: colorBorder,
  });

  const lateFeeNote =
    business.defaultLateFeePercent > 0
      ? `Late-fee policy: A late fee of ${business.defaultLateFeePercent}% is automatically calculated on overdue balances after a ${business.lateFeeGraceDays}-day grace period.`
      : 'Thank you for your business!';

  page.drawText(lateFeeNote, {
    x: 40,
    y: footerY + 6,
    size: 7.5,
    font: fontOblique,
    color: colorMuted,
  });

  page.drawText('Powered by PayFlow — Smart Billing & Collections', {
    x: 40,
    y: footerY - 5,
    size: 7.5,
    font: fontRegular,
    color: colorPrimary,
  });

  return await pdfDoc.save();
}
