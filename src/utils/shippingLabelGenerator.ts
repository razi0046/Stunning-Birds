import { Order, ShippingLabel, ShippingLabelSeller, Product } from '../types';
import { INITIAL_PRODUCTS } from '../data/mockData';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const DEFAULT_SELLER_INFO: ShippingLabelSeller = {
  name: 'STUNNING BIRDS ATELIER & LEATHERWORKS',
  addressLine: '6E/1B Topsia 2nd Lane, Topsia',
  city: 'Kolkata',
  state: 'West Bengal',
  pincode: '700039',
  country: 'India',
  phone: '+91 8582861387',
  email: 'stunningbirds236@gmail.com',
  gstin: '19BEIPH0104K1ZQ',
  returnAddress: '6E/1B Topsia 2nd Lane, Topsia, Kolkata, West Bengal, 700039',
};

// Indian state GST code mapping
export const STATE_GST_CODES: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  'punjab': '03',
  'chandigarh': '04',
  'uttarakhand': '05',
  'haryana': '06',
  'delhi': '07',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'bihar': '10',
  'sikkim': '11',
  'arunachal pradesh': '12',
  'nagaland': '13',
  'manipur': '14',
  'mizoram': '15',
  'tripura': '16',
  'meghalaya': '17',
  'assam': '18',
  'west bengal': '19',
  'jharkhand': '20',
  'odisha': '21',
  'chhattisgarh': '22',
  'madhya pradesh': '23',
  'gujarat': '24',
  'daman and diu': '25',
  'dadra and nagar haveli': '26',
  'maharashtra': '27',
  'andhra pradesh': '28',
  'karnataka': '29',
  'goa': '30',
  'lakshadweep': '31',
  'kerala': '32',
  'tamil nadu': '33',
  'puducherry': '34',
  'andaman and nicobar islands': '35',
  'telangana': '36',
  'ladakh': '38',
};

export function getPlaceOfSupply(stateName: string = ''): string {
  const normalized = (stateName || '').toLowerCase().trim();
  const code = STATE_GST_CODES[normalized] || '27';
  return `${code} ${stateName || 'Maharashtra'}`;
}

export function formatToDottedDate(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return `${String(parsed.getDate()).padStart(2, '0')}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${parsed.getFullYear()}`;
  }
  return dateStr;
}

// Routing hub lookup helper based on Indian pincode / state
export function getRoutingHubInfo(pincode: string, state: string, city: string) {
  const pinPrefix = (pincode || '').substring(0, 2);
  let hub = 'BLR/S-HUB';
  let sortCode = 'BLR-01';

  if (['11', '12', '13'].includes(pinPrefix) || /delhi|ncr|haryana/i.test(state)) {
    hub = 'DEL/N-HUB-04';
    sortCode = 'DEL-EXP-11';
  } else if (['40', '41', '42'].includes(pinPrefix) || /mumbai|maharashtra/i.test(state)) {
    hub = 'BOM/W-HUB-02';
    sortCode = 'BOM-AIR-40';
  } else if (['56', '57', '58'].includes(pinPrefix) || /bengaluru|bangalore|karnataka/i.test(state)) {
    hub = 'BLR/S-HUB-01';
    sortCode = 'BLR-LCL-56';
  } else if (['60', '61', '62', '63'].includes(pinPrefix) || /chennai|tamil nadu/i.test(state)) {
    hub = 'MAA/S-HUB-03';
    sortCode = 'MAA-EXP-60';
  } else if (['50', '51', '52', '53'].includes(pinPrefix) || /hyderabad|telangana/i.test(state)) {
    hub = 'HYD/S-HUB-02';
    sortCode = 'HYD-AIR-50';
  } else if (['70', '71', '72', '73'].includes(pinPrefix) || /kolkata|bengal/i.test(state)) {
    hub = 'CCU/E-HUB-01';
    sortCode = 'CCU-EXP-70';
  } else {
    hub = `${(city || 'IND').substring(0, 3).toUpperCase()}/HUB-${pinPrefix || '00'}`;
    sortCode = `EXP-${(state || 'IN').substring(0, 3).toUpperCase()}`;
  }

  return { hub, sortCode };
}

// Generate complete Shipping Label & Tax Invoice data from an Order using true DB product properties
export function generateShippingLabelData(
  order: Order, 
  customSeller?: Partial<ShippingLabelSeller>,
  allProducts: Product[] = INITIAL_PRODUCTS
): ShippingLabel {
  const seller = { ...DEFAULT_SELLER_INFO, ...(customSeller || {}) };
  const rawOrderId = order?.id || 'ORD-1001';
  const cleanId = rawOrderId.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000).toString();
  
  // Format numeric AWB number (matching 14-15 digit courier format like Delhivery in reference image)
  const awbNumber = rawOrderId.startsWith('#') && cleanId.length >= 4 
    ? `14908${cleanId}${Math.floor(100000 + Math.random() * 900000)}`.slice(0, 15)
    : `1490857982${cleanId}`.slice(0, 15);
    
  const labelId = `LBL-${cleanId}-${Date.now().toString().slice(-4)}`;
  const invoiceNumber = `gemt${cleanId}${Math.floor(1000 + Math.random() * 9000)}`;
  const purchaseOrderNo = rawOrderId.replace(/[^0-9a-zA-Z]/g, '') || `6439992${cleanId}`;

  const { hub, sortCode } = getRoutingHubInfo(
    order?.shippingAddress?.pincode || '',
    order?.shippingAddress?.state || '',
    order?.shippingAddress?.city || ''
  );

  const destinationCode = `${hub}`;
  const returnCode = `${seller.pincode},800999`;
  const placeOfSupply = getPlaceOfSupply(order?.shippingAddress?.state);

  const orderDateFormatted = formatToDottedDate(order?.date);
  const invoiceDate = formatToDottedDate();

  const isCod = order?.paymentMethod?.toLowerCase().includes('cash on delivery') || 
                order?.paymentMethod?.toLowerCase().includes('cod');

  const safeItems = Array.isArray(order?.items) ? order.items : [];
  const totalPieces = safeItems.reduce((sum, it) => sum + (Number(it?.quantity) || 1), 0);
  const calculatedWeight = Math.max(0.35, Math.round((totalPieces * 0.38 + 0.15) * 100) / 100).toFixed(2);

  // Map each item using true product details from the product database
  const labelItems = safeItems.map((it, idx) => {
    if (!it) return null as any;
    // Lookup product in database
    const dbProduct = (allProducts || []).find(p => 
      (p && it.productId && p.id === it.productId) || 
      (it.sku && p && (p.sku === it.sku || p.skuId === it.sku)) ||
      (it.productName && p && p.name && p.name.toLowerCase() === it.productName.toLowerCase())
    );

    const sku = it.sku || it.skuId || dbProduct?.sku || dbProduct?.skuId || `SB-SKU-${idx + 1}`;
    const qty = Number(it.quantity) || 1;
    const price = Number(it.price) || dbProduct?.price || 0;
    const color = it.colorName || dbProduct?.colorName || 'Classic';
    
    // Extract size or default to standard/free size
    let size = 'Standard';
    if (dbProduct?.category === 'Bifold Wallets' || dbProduct?.category === 'Cardholders') {
      size = 'S';
    } else if (dbProduct?.category === 'Bags & Totes' || dbProduct?.category === 'Travel Wallets') {
      size = 'Standard';
    } else if (dbProduct?.dimensions) {
      size = dbProduct.dimensions.split('x')[0]?.trim() || 'Standard';
    }

    const orderItemNo = `${purchaseOrderNo}_${idx + 1}`;
    const grossAmount = price * qty;
    const discount = 0;
    const taxRate = 18.0; // 18% standard GST rate for leather & lifestyle goods
    const taxableValue = Math.round((grossAmount / 1.18) * 100) / 100;
    const taxAmount = Math.round((grossAmount - taxableValue) * 100) / 100;

    return {
      productName: it.productName || dbProduct?.name || 'Handcrafted Luxury Leather Good',
      sku,
      size,
      color,
      orderItemNo,
      quantity: qty,
      price: price,
      grossAmount,
      discount,
      taxableValue,
      hsn: '4202', // GST HSN code for Handbags, Wallets, Leather Cases & Pouches
      taxRate,
      taxAmount,
      total: grossAmount,
    };
  }).filter(Boolean);

  const barcodeData = awbNumber;
  const qrData = JSON.stringify({
    orderId: rawOrderId,
    awb: awbNumber,
    po: purchaseOrderNo,
    customer: order?.customer?.name || 'Customer',
    city: order?.shippingAddress?.city || 'City',
    state: order?.shippingAddress?.state || 'State',
    pin: order?.shippingAddress?.pincode || '000000',
    total: order?.total || 0,
    isCod,
  });

  return {
    labelId,
    awbNumber,
    orderId: rawOrderId,
    purchaseOrderNo,
    orderDate: order?.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    orderDateFormatted,
    invoiceDate,
    generatedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    courierPartner: 'Delhivery',
    serviceType: isCod ? 'EXPRESS AIR - COD' : 'EXPRESS AIR - PREPAID',
    routingHub: hub,
    destinationCode,
    returnCode,
    sortCode,
    paymentMethod: order?.paymentMethod || 'Razorpay',
    paymentStatus: order?.paymentStatus || 'Paid',
    isCod,
    collectibleAmount: isCod ? (order?.total || 0) : 0,
    placeOfSupply,
    shipTo: {
      name: order?.customer?.name || 'Recipient',
      phone: order?.shippingAddress?.phone || 'Not Specified',
      email: order?.customer?.email || undefined,
      addressLine: order?.shippingAddress?.addressLine || 'Address Not Provided',
      landmark: order?.shippingAddress?.landmark || undefined,
      city: order?.shippingAddress?.city || 'City',
      state: order?.shippingAddress?.state || 'State',
      pincode: order?.shippingAddress?.pincode || '000000',
      country: 'India',
    },
    seller,
    packageInfo: {
      weightKg: `${calculatedWeight} KG`,
      dimensionsCm: '26 x 20 x 8 CM',
      packageType: 'Luxury Hardboard Presentation Box',
      piecesCount: totalPieces,
    },
    items: labelItems,
    subtotal: order?.subtotal || order?.total || 0,
    taxAmount: order?.taxes || Math.round((order?.total || 0) * 0.18 / 1.18),
    shippingCharge: order?.shipping || 0,
    totalAmount: order?.total || 0,
    invoiceNumber,
    barcodeData,
    qrData,
  };
}

// Standalone CSS for html2canvas to render courier labels & tax invoices without Tailwind v4 oklch color parsing errors
const LABEL_STANDALONE_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
    font-family: Arial, Helvetica, sans-serif, ui-sans-serif, system-ui;
  }
  body, html {
    background: #ffffff;
    color: #000000;
    padding: 0;
    margin: 0;
  }
  .flex { display: flex; }
  .inline-flex { display: inline-flex; }
  .flex-col { flex-direction: column; }
  .flex-1 { flex: 1 1 0%; }
  .flex-wrap { flex-wrap: wrap; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .items-stretch { align-items: stretch; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .justify-end { justify-content: flex-end; }
  .grid { display: grid; }
  .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .col-span-3 { grid-column: span 3 / span 3; }
  .col-span-4 { grid-column: span 4 / span 4; }
  .col-span-5 { grid-column: span 5 / span 5; }
  .col-span-6 { grid-column: span 6 / span 6; }
  .col-span-7 { grid-column: span 7 / span 7; }
  .col-span-8 { grid-column: span 8 / span 8; }
  .col-span-12 { grid-column: span 12 / span 12; }
  .gap-0\\.5 { gap: 2px; }
  .gap-1 { gap: 4px; }
  .gap-1\\.5 { gap: 6px; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .gap-x-1 { column-gap: 4px; }
  .gap-x-2 { column-gap: 8px; }
  .gap-y-0\\.5 { row-gap: 2px; }
  .gap-y-1 { row-gap: 4px; }
  .space-y-0\\.5 > * + * { margin-top: 2px; }
  .space-y-1 > * + * { margin-top: 4px; }
  .w-full { width: 100%; }
  .max-w-\\[520px\\] { max-width: 520px; }
  .max-w-\\[500px\\] { max-width: 500px; }
  .max-w-\\[440px\\] { max-width: 440px; }
  .max-w-full { max-width: 100%; }
  .w-24 { width: 96px; }
  .h-24 { height: 96px; }
  .w-20 { width: 80px; }
  .h-20 { height: 80px; }
  .max-h-11 { max-height: 44px; }
  .max-h-12 { max-height: 48px; }
  .bg-white { background-color: #ffffff; }
  .bg-black { background-color: #000000; }
  .bg-gray-50 { background-color: #f9fafb; }
  .bg-gray-100 { background-color: #f3f4f6; }
  .bg-gray-200 { background-color: #e5e7eb; }
  .text-white { color: #ffffff; }
  .text-black { color: #000000; }
  .text-gray-900 { color: #111827; }
  .text-gray-800 { color: #1f2937; }
  .text-gray-700 { color: #374151; }
  .text-gray-600 { color: #4b5563; }
  .text-gray-500 { color: #6b7280; }
  .border { border-width: 1px; border-style: solid; border-color: #000000; }
  .border-2 { border-width: 2px; border-style: solid; }
  .border-black { border-color: #000000; }
  .border-gray-200 { border-color: #e5e7eb; }
  .border-gray-300 { border-color: #d1d5db; }
  .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
  .border-b-2 { border-bottom-width: 2px; border-bottom-style: solid; }
  .border-t { border-top-width: 1px; border-top-style: solid; }
  .border-t-2 { border-top-width: 2px; border-top-style: solid; }
  .border-l { border-left-width: 1px; border-left-style: solid; }
  .border-l-2 { border-left-width: 2px; border-left-style: solid; }
  .border-r { border-right-width: 1px; border-right-style: solid; }
  .border-r-2 { border-right-width: 2px; border-right-style: solid; }
  .border-dashed { border-style: dashed; }
  .divide-x-2 > * + * { border-left-width: 2px; border-left-style: solid; border-left-color: #000000; }
  .divide-y > * + * { border-top-width: 1px; border-top-style: solid; border-top-color: #e5e7eb; }
  .divide-gray-200 > * + * { border-top-width: 1px; border-top-style: solid; border-top-color: #e5e7eb; }
  .divide-gray-300 > * + * { border-top-width: 1px; border-top-style: solid; border-top-color: #d1d5db; }
  .p-0\\.5 { padding: 2px; }
  .p-1 { padding: 4px; }
  .p-1\\.5 { padding: 6px; }
  .p-2 { padding: 8px; }
  .p-2\\.5 { padding: 10px; }
  .px-1 { padding-left: 4px; padding-right: 4px; }
  .px-1\\.5 { padding-left: 6px; padding-right: 6px; }
  .px-2 { padding-left: 8px; padding-right: 8px; }
  .px-2\\.5 { padding-left: 10px; padding-right: 10px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .pr-1 { padding-right: 4px; }
  .pr-2 { padding-right: 8px; }
  .pl-1 { padding-left: 4px; }
  .pl-2 { padding-left: 8px; }
  .pt-0\\.5 { padding-top: 2px; }
  .pt-1 { padding-top: 4px; }
  .pb-0\\.5 { padding-bottom: 2px; }
  .pb-1 { padding-bottom: 4px; }
  .pb-1\\.5 { padding-bottom: 6px; }
  .mb-0\\.5 { margin-bottom: 2px; }
  .mb-1 { margin-bottom: 4px; }
  .mb-1\\.5 { margin-bottom: 6px; }
  .mb-2 { margin-bottom: 8px; }
  .mt-0\\.5 { margin-top: 2px; }
  .mt-1 { margin-top: 4px; }
  .mt-1\\.5 { margin-top: 6px; }
  .mt-2 { margin-top: 8px; }
  .my-1 { margin-top: 4px; margin-bottom: 4px; }
  .my-1\\.5 { margin-top: 6px; margin-bottom: 6px; }
  .my-2 { margin-top: 8px; margin-bottom: 8px; }
  .text-xs { font-size: 12px; line-height: 16px; }
  .text-\\[7\\.5px\\] { font-size: 7.5px; line-height: 9.5px; }
  .text-\\[8px\\] { font-size: 8px; line-height: 10px; }
  .text-\\[8\\.5px\\] { font-size: 8.5px; line-height: 11px; }
  .text-\\[9px\\] { font-size: 9px; line-height: 12px; }
  .text-\\[9\\.5px\\] { font-size: 9.5px; line-height: 12.5px; }
  .text-\\[10px\\] { font-size: 10px; line-height: 13px; }
  .text-\\[10\\.5px\\] { font-size: 10.5px; line-height: 13.5px; }
  .text-\\[11px\\] { font-size: 11px; line-height: 14px; }
  .text-\\[12px\\] { font-size: 12px; line-height: 15px; }
  .text-\\[15px\\] { font-size: 15px; line-height: 18px; }
  .text-\\[17px\\] { font-size: 17px; line-height: 20px; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .font-sans { font-family: Arial, Helvetica, sans-serif, ui-sans-serif, system-ui; }
  .font-black { font-weight: 900; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .uppercase { text-transform: uppercase; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .whitespace-nowrap { white-space: nowrap; }
  .block { display: block; }
  .inline-block { display: inline-block; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; }
  .leading-tight { line-height: 1.25; }
  .leading-snug { line-height: 1.375; }
  .leading-none { line-height: 1; }
  .tracking-tight { letter-spacing: -0.025em; }
  .tracking-wide { letter-spacing: 0.025em; }
  .tracking-wider { letter-spacing: 0.05em; }
  .tracking-widest { letter-spacing: 0.1em; }
  .shrink-0 { flex-shrink: 0; }
  .overflow-hidden { overflow: hidden; }
  .relative { position: relative; }
`;

async function renderCleanLabelCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  return await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth || 520,
    windowHeight: element.scrollHeight || 750,
    onclone: (clonedDoc: Document) => {
      // 1. Remove all existing styles that may contain Tailwind v4 oklch color rules
      const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(s => s.remove());

      // 2. Inject dedicated CSS stylesheet with standard hex / rgb colors
      const styleEl = clonedDoc.createElement('style');
      styleEl.textContent = LABEL_STANDALONE_CSS;
      clonedDoc.head.appendChild(styleEl);
    },
  });
}

// Client-side crisp PDF generation from the rendered DOM label container
export async function downloadShippingLabelPDF(
  element: HTMLElement,
  filename: string = 'shipping-label.pdf'
): Promise<void> {
  try {
    // Render high DPI canvas safely without oklch parsing errors
    const canvas = await renderCleanLabelCanvas(element);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Standard 4x6 courier label & tax invoice combo dimensions in mm: 105mm x 165mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 165],
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Render cleanly onto PDF canvas
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to generate shipping label PDF:', error);
    throw error;
  }
}

// Batch download shipping labels for multiple orders into a single multi-page PDF
export async function downloadBatchShippingLabelsPDF(
  orders: Order[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!orders || orders.length === 0) {
    throw new Error('No orders provided for batch shipping label download');
  }

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 165],
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (onProgress) {
        onProgress(i + 1, orders.length);
      }

      const elementId = `batch-shipping-label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}`;
      let element = document.getElementById(elementId);

      // Fallback check for overview element ID
      if (!element) {
        element = document.getElementById(`overview-shipping-label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}`);
      }

      if (!element) {
        console.warn(`Element #${elementId} not found in DOM, skipping`);
        continue;
      }

      const canvas = await renderCleanLabelCanvas(element);
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      if (i > 0) {
        pdf.addPage([105, 165], 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Stunning-Birds-All-Shipping-Labels-Batch-${orders.length}-Orders-${timestamp}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to generate batch shipping labels PDF:', error);
    throw error;
  }
}

