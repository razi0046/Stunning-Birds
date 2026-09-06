import { Order, Product, UserProfile } from '../types';
import brandLogo from '../assets/images/stunning_birds_dark_text_transparent.png';

// Helper to reliably load image asset as base64 data URL for jsPDF
async function loadImageDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(src);
        }
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Convert numbers into Indian Rupees currency words
export function convertAmountToWords(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigit(n: number): string {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return twoDigits[n - 10];
    const tens = Math.floor(n / 10);
    const units = n % 10;
    return `${tensMultiple[tens]}${units > 0 ? ' ' + singleDigits[units] : ''}`;
  }

  function convertThreeDigit(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += `${singleDigits[hundred]} Hundred`;
      if (rest > 0) res += ' and ';
    }
    if (rest > 0) {
      res += convertTwoDigit(rest);
    }
    return res;
  }

  let num = rounded;
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  if (crore > 0) {
    words += `${convertTwoDigit(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigit(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigit(thousand)} Thousand `;
  }
  if (remainder > 0) {
    words += `${convertThreeDigit(remainder)} `;
  }

  return `Rupees ${words.trim()} Only`;
}

// State GST Codes for place of supply
export const INDIAN_STATE_GST_CODES: Record<string, string> = {
  'Andhra Pradesh': '37',
  'Arunachal Pradesh': '12',
  'Assam': '18',
  'Bihar': '10',
  'Chhattisgarh': '22',
  'Goa': '30',
  'Gujarat': '24',
  'Haryana': '06',
  'Himachal Pradesh': '02',
  'Jharkhand': '20',
  'Karnataka': '29',
  'Kerala': '32',
  'Madhya Pradesh': '23',
  'Maharashtra': '27',
  'Manipur': '14',
  'Meghalaya': '17',
  'Mizoram': '15',
  'Nagaland': '13',
  'Odisha': '21',
  'Punjab': '03',
  'Rajasthan': '08',
  'Sikkim': '11',
  'Tamil Nadu': '33',
  'Telangana': '36',
  'Tripura': '16',
  'Uttar Pradesh': '09',
  'Uttarakhand': '05',
  'West Bengal': '19',
  'Delhi': '07',
  'Chandigarh': '04',
};

export interface InvoiceStoreConfig {
  storeName: string;
  tagline: string;
  registeredName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  pan: string;
  cin: string;
}

export const ATELIER_STORE_CONFIG: InvoiceStoreConfig = {
  storeName: 'STUNNING BIRDS',
  tagline: 'Bespoke Handcrafted Leather Goods & Accessories',
  registeredName: 'Stunning Birds Atelier Private Limited',
  addressLine1: '6E/1B Topsia 2nd Lane',
  addressLine2: 'Topsia',
  city: 'Kolkata',
  state: 'West Bengal',
  pincode: '700039',
  phone: '+91 8582861387',
  email: 'stunningbirds236@gmail.com',
  website: 'www.stunningbirds.com',
  gstin: '19BEIPH0104K1ZQ',
  pan: 'BEIPH0104K',
  cin: 'U19100WB2022PTC158942',
};

// Verify if the active customer owns the requested order
export function verifyOrderOwnership(
  order: Order,
  authenticatedUser?: UserProfile | null
): { allowed: boolean; reason?: string } {
  if (!order) {
    return { allowed: false, reason: 'Order not found.' };
  }

  // If no user is logged in
  if (!authenticatedUser) {
    return {
      allowed: false,
      reason: 'Authentication required. Please sign in to download your order invoice.',
    };
  }

  const userEmail = (authenticatedUser.email || '').trim().toLowerCase();
  const orderEmail = (order?.customer?.email || '').trim().toLowerCase();
  const userName = (authenticatedUser.name || '').trim().toLowerCase();
  const orderCustName = (order?.customer?.name || '').trim().toLowerCase();

  // Allow if emails match or customer names match or explicit ID match
  const matchesEmail = userEmail.length > 0 && orderEmail === userEmail;
  const matchesName = userName.length > 0 && orderCustName === userName;
  const matchesId = Boolean(authenticatedUser.id && (order as any)?.customerId === authenticatedUser.id);

  if (matchesEmail || matchesName || matchesId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Unauthorized: Order ${order.id} belongs to another client account. You may only download invoices for your own orders.`,
  };
}

// Generate and trigger download of dynamic Order Tax Invoice PDF
export async function generateAndDownloadInvoicePDF(
  order: Order,
  productsList: Product[] = [],
  authenticatedUser?: UserProfile | null,
  storeConfig: InvoiceStoreConfig = ATELIER_STORE_CONFIG
): Promise<void> {
  // 1. Security check: Customer can only download their own invoice
  if (authenticatedUser) {
    const authCheck = verifyOrderOwnership(order, authenticatedUser);
    if (!authCheck.allowed) {
      throw new Error(authCheck.reason || 'Unauthorized order access');
    }
  }

  // Initialize jsPDF with A4 portrait
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210mm x 297mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Clean IDs & Dates
  const cleanOrderId = order.id.startsWith('#') ? order.id : `#${order.id}`;
  const rawId = order.id.replace(/[^a-zA-Z0-9-]/g, '');
  const invoiceNumber = order.shippingLabel?.invoiceNumber || `INV-${rawId}`;
  const orderDateStr = order.date || new Date().toLocaleDateString('en-GB');
  const invoiceDateStr = order.shippingLabel?.invoiceDate || orderDateStr;
  const placeOfSupplyCode = INDIAN_STATE_GST_CODES[order.shippingAddress.state] || '29';
  const placeOfSupply = `${placeOfSupplyCode} ${order.shippingAddress.state}`;

  // Palette (Sophisticated High-Contrast Luxury Atelier Colors)
  const primaryBlack = [24, 22, 20]; // #181614
  const accentBrown = [140, 86, 46]; // #8c562e
  const gold = [212, 175, 55]; // #d4af37
  const charcoal = [55, 65, 81]; // #374151
  const lightGrey = [243, 244, 246]; // #f3f4f6
  const borderGrey = [200, 200, 200];

  // Preload logo for PDF render
  const logoDataUrl = await loadImageDataUrl(brandLogo);

  let currentY = margin;

  // ==========================================
  // 1. HEADER SECTION (Store Logo, Brand & Tax Info)
  // ==========================================
  // Header background subtle container
  doc.setFillColor(250, 248, 245);
  doc.rect(margin, currentY, contentWidth, 38, 'F');
  doc.setDrawColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, currentY, contentWidth, 38, 'S');

  // Brand Logo (New Stunning Birds official logo)
  let textStartX = margin + 6;
  if (logoDataUrl) {
    try {
      // Stunning Birds transparent logo aspect ratio (~2.35)
      const logoW = 44;
      const logoH = 18.7;
      doc.addImage(logoDataUrl, 'PNG', margin + 3.5, currentY + 9.5, logoW, logoH);
      textStartX = margin + 50;
    } catch (err) {
      console.warn('Could not draw brand logo into PDF:', err);
    }
  }

  // Store Identity Text
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(storeConfig.storeName, textStartX, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(storeConfig.tagline, textStartX, currentY + 15);
  doc.text(`${storeConfig.addressLine1}, ${storeConfig.addressLine2}`, textStartX, currentY + 19.5);
  doc.text(`${storeConfig.city}, ${storeConfig.state} - ${storeConfig.pincode} | Tel: ${storeConfig.phone}`, textStartX, currentY + 24);
  doc.text(`Email: ${storeConfig.email} | Web: ${storeConfig.website}`, textStartX, currentY + 28.5);

  // Store GSTIN & PAN Badges on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentBrown[0], accentBrown[1], accentBrown[2]);
  doc.text(`GSTIN: ${storeConfig.gstin}`, margin + contentWidth - 4, currentY + 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(`CIN: ${storeConfig.cin}`, margin + contentWidth - 4, currentY + 16, { align: 'right' });
  doc.text(`Place of Dispatch: ${storeConfig.city} (${INDIAN_STATE_GST_CODES[storeConfig.state] || '19'})`, margin + contentWidth - 4, currentY + 21, { align: 'right' });

  currentY += 41;

  // ==========================================
  // 2. INVOICE TITLE BAR & METADATA GRID
  // ==========================================
  doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('TAX INVOICE', margin + 6, currentY + 5.5);
  doc.setFontSize(7.5);
  doc.text('ORIGINAL FOR RECIPIENT', margin + contentWidth - 6, currentY + 5.5, { align: 'right' });

  currentY += 8;

  // Invoice Metadata Strip (4 columns)
  const metaHeight = 16;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, currentY, contentWidth, metaHeight, 'F');
  doc.setDrawColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setLineWidth(0.4);
  doc.rect(margin, currentY, contentWidth, metaHeight, 'S');

  // Vertical dividers
  const colW = contentWidth / 4;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin + colW, currentY, margin + colW, currentY + metaHeight);
  doc.line(margin + colW * 2, currentY, margin + colW * 2, currentY + metaHeight);
  doc.line(margin + colW * 3, currentY, margin + colW * 3, currentY + metaHeight);

  // Metadata 1: Invoice No
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  doc.text('INVOICE NUMBER', margin + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text(invoiceNumber, margin + 4, currentY + 11);

  // Metadata 2: Order ID
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  doc.text('ORDER ID', margin + colW + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text(cleanOrderId, margin + colW + 4, currentY + 11);

  // Metadata 3: Order & Invoice Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  doc.text('INVOICE / ORDER DATE', margin + colW * 2 + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text(invoiceDateStr, margin + colW * 2 + 4, currentY + 11);

  // Metadata 4: Place of Supply
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  doc.text('PLACE OF SUPPLY', margin + colW * 3 + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text(placeOfSupply, margin + colW * 3 + 4, currentY + 11);

  currentY += metaHeight + 3;

  // ==========================================
  // 3. BILLING AND SHIPPING INFORMATION (2-Column Box)
  // ==========================================
  const addrHeight = 36;
  const halfW = (contentWidth - 3) / 2;

  // BILL TO Box (Left)
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, currentY, halfW, addrHeight, 'F');
  doc.setDrawColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setLineWidth(0.4);
  doc.rect(margin, currentY, halfW, addrHeight, 'S');

  // Header strip for BILL TO
  doc.setFillColor(245, 240, 232);
  doc.rect(margin, currentY, halfW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('BILL TO / BUYER DETAILS', margin + 3, currentY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text(order.customer?.name || 'Valued Patron', margin + 3, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  if (order.shippingAddress?.addressLine) {
    doc.text(order.shippingAddress.addressLine, margin + 3, currentY + 17);
  }
  const buyerLocation = [order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ') + 
    (order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : '');
  if (buyerLocation) {
    doc.text(buyerLocation, margin + 3, currentY + 21.5);
  }
  if (order.shippingAddress?.phone) {
    doc.text(`Phone: ${order.shippingAddress.phone}`, margin + 3, currentY + 26);
  }
  if (order.customer?.email) {
    doc.text(`Email: ${order.customer.email}`, margin + 3, currentY + 30.5);
  }

  // SHIP TO Box (Right)
  const rightBoxX = margin + halfW + 3;
  doc.setFillColor(255, 255, 255);
  doc.rect(rightBoxX, currentY, halfW, addrHeight, 'F');
  doc.setDrawColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setLineWidth(0.4);
  doc.rect(rightBoxX, currentY, halfW, addrHeight, 'S');

  // Header strip for SHIP TO
  doc.setFillColor(245, 240, 232);
  doc.rect(rightBoxX, currentY, halfW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('SHIP TO / DELIVERY DESTINATION', rightBoxX + 3, currentY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text(order.customer?.name || 'Valued Patron', rightBoxX + 3, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  if (order.shippingAddress?.addressLine) {
    doc.text(order.shippingAddress.addressLine, rightBoxX + 3, currentY + 17);
  }
  const destLocation = [order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ') + 
    (order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : '');
  if (destLocation) {
    doc.text(destLocation, rightBoxX + 3, currentY + 21.5);
  }
  if (order.shippingAddress?.phone) {
    doc.text(`Phone: ${order.shippingAddress.phone}`, rightBoxX + 3, currentY + 26);
  }
  if (order.shippingMethod) {
    doc.text(`Shipping Method: ${order.shippingMethod}`, rightBoxX + 3, currentY + 30.5);
  }

  currentY += addrHeight + 4;

  // ==========================================
  // 4. PRODUCT TABLE (Itemized GST breakdown)
  // ==========================================
  const safeItems = Array.isArray(order?.items) ? order.items : [];

  // Prepare Table Rows
  const tableData = safeItems.map((item, index) => {
    // Find product matching specs
    const prod = productsList.find(p => p.id === item.productId || p.name === item.productName);
    const skuCode = item.sku || prod?.sku || prod?.skuId || `SB-LTD-${100 + index}`;
    const hsn = '4202'; // Handcrafted Leather Goods HSN
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.price) || 0;
    const grossTotal = unitPrice * qty;
    const taxableVal = grossTotal / 1.18;
    const gstAmount = grossTotal - taxableVal;

    let variantText = '';
    if (item.colorName) variantText += `Color: ${item.colorName}`;
    if (item.monogram) variantText += ` | Monogram: [${item.monogram}] (${item.foilColor || 'Gold'} Foil)`;

    const description = `${item.productName || 'Handcrafted Luxury Leather Good'}\nSKU: ${skuCode}${variantText ? '\n' + variantText : ''}`;

    return [
      (index + 1).toString(),
      description,
      hsn,
      qty.toString(),
      `Rs. ${unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `Rs. ${taxableVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `IGST @18%\nRs. ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Rs. ${grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    ];
  });

  // Calculate items sum
  const itemsTaxableSum = safeItems.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18, 0);
  const itemsTaxSum = safeItems.reduce((acc, it) => acc + (((Number(it.price) || 0) * (Number(it.quantity) || 1)) - ((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18), 0);
  const deliveryCharge = order.shipping || 0;
  const deliveryTaxable = deliveryCharge > 0 ? deliveryCharge / 1.18 : 0;
  const deliveryTax = deliveryCharge > 0 ? deliveryCharge - deliveryTaxable : 0;

  const totalTaxable = itemsTaxableSum + deliveryTaxable;
  const grandGst = itemsTaxSum + deliveryTax;
  const grandTotal = order.total || (order.subtotal + (order.taxes || 0) + (order.shipping || 0));

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        '#',
        'Product Description & SKU',
        'HSN',
        'Qty',
        'Unit Price',
        'Taxable Value',
        'Taxes (GST)',
        'Total Amount',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [24, 22, 20],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left', fontStyle: 'normal' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
      7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      textColor: [24, 22, 20],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [252, 250, 247],
    },
    didDrawPage: (data) => {
      // Optional header on next pages
    },
  });

  const finalTable = (doc as any).lastAutoTable;
  currentY = finalTable.finalY + 3;

  // If table went near bottom, add new page for Totals & Footer
  if (currentY > pageHeight - 70) {
    doc.addPage();
    currentY = margin;
  }

  // ==========================================
  // 5. TOTALS & PAYMENT SUMMARY BLOCK
  // ==========================================
  const summaryBoxHeight = 44;
  const leftSummaryW = contentWidth * 0.55;
  const rightSummaryW = contentWidth - leftSummaryW;

  // Left Block: Payment Method, Transaction Details & Amount in Words
  doc.setFillColor(252, 250, 247);
  doc.rect(margin, currentY, leftSummaryW, summaryBoxHeight, 'F');
  doc.setDrawColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, leftSummaryW, summaryBoxHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('PAYMENT & LOGISTICS DETAILS', margin + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(`Payment Method:`, margin + 3, currentY + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(order.paymentMethod || 'Online Payment', margin + 30, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Status:`, margin + 3, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(order.paymentStatus === 'Paid' ? 22 : 180, order.paymentStatus === 'Paid' ? 101 : 80, 20);
  doc.text((order.paymentStatus || 'Paid').toUpperCase(), margin + 30, currentY + 16);

  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Transaction ID:`, margin + 3, currentY + 21);
  doc.setFont('helvetica', 'bold');
  doc.text(`TXN-${rawId}-8942`, margin + 30, currentY + 21);

  // Amount in Words
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('AMOUNT IN WORDS:', margin + 3, currentY + 28);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  const amountWords = convertAmountToWords(grandTotal);
  doc.text(amountWords, margin + 3, currentY + 33, { maxWidth: leftSummaryW - 6 });

  // Right Block: Subtotal, Shipping, Taxes & Grand Total Table
  const rightX = margin + leftSummaryW;
  doc.setFillColor(255, 255, 255);
  doc.rect(rightX, currentY, rightSummaryW, summaryBoxHeight, 'F');
  doc.setDrawColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setLineWidth(0.3);
  doc.rect(rightX, currentY, rightSummaryW, summaryBoxHeight, 'S');

  // Breakdown rows
  const rowH = 7.5;
  let subY = currentY + 5.5;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text('Taxable Subtotal:', rightX + 3, subY);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Rs. ${totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    rightX + rightSummaryW - 3,
    subY,
    { align: 'right' }
  );

  // Delivery / Shipping
  subY += rowH;
  doc.setFont('helvetica', 'normal');
  doc.text('Delivery Charges:', rightX + 3, subY);
  doc.setFont('helvetica', 'bold');
  doc.text(
    deliveryCharge > 0 ? `Rs. ${deliveryCharge.toFixed(2)}` : 'FREE (Complimentary)',
    rightX + rightSummaryW - 3,
    subY,
    { align: 'right' }
  );

  // Taxes / GST
  subY += rowH;
  doc.setFont('helvetica', 'normal');
  doc.text('Total GST (18.0% IGST):', rightX + 3, subY);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Rs. ${grandGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    rightX + rightSummaryW - 3,
    subY,
    { align: 'right' }
  );

  // Grand Total Banner
  subY += 4;
  doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.rect(rightX, subY, rightSummaryW, summaryBoxHeight - (subY - currentY), 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('GRAND TOTAL:', rightX + 3, subY + 7);
  doc.setFontSize(10.5);
  doc.text(
    `Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    rightX + rightSummaryW - 3,
    subY + 7,
    { align: 'right' }
  );

  currentY += summaryBoxHeight + 4;

  // ==========================================
  // 6. INVOICE FOOTER (Terms, Policy & Computer Generated Disclaimer)
  // ==========================================
  if (currentY > pageHeight - 30) {
    doc.addPage();
    currentY = margin;
  }

  const footerHeight = 22;
  doc.setFillColor(250, 248, 245);
  doc.rect(margin, currentY, contentWidth, footerHeight, 'F');
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, footerHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('TERMS & ATELIER WARRANTY POLICY:', margin + 3, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(
    '1. Tax is not payable on reverse charge basis. 2. All handcrafted pieces include a 14-day atelier craft & inspection warranty.',
    margin + 3,
    currentY + 8
  );
  doc.text(
    `3. For returns, repair care or bespoke inquiries, contact ${storeConfig.email} or call ${storeConfig.phone}.`,
    margin + 3,
    currentY + 12
  );
  doc.text(
    `4. Registered Office: ${storeConfig.registeredName}, ${storeConfig.addressLine1}, ${storeConfig.city}, ${storeConfig.state} ${storeConfig.pincode}, India.`,
    margin + 3,
    currentY + 16
  );

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6);
  doc.setTextColor(accentBrown[0], accentBrown[1], accentBrown[2]);
  doc.text(
    'This is a computer-generated invoice and does not require a physical signature.',
    margin + contentWidth - 3,
    currentY + 19,
    { align: 'right' }
  );

  // Trigger browser download
  const filename = `Invoice-${rawId}.pdf`;
  doc.save(filename);
}
