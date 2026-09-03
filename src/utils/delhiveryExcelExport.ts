import { Order, Product } from '../types';
import { DEFAULT_SELLER_INFO } from './shippingLabelGenerator';

export interface DelhiveryExportRow {
  // Order Identification
  'Order ID': string;
  'Order Date': string;

  // Customer / Consignee Details
  'Customer / Consignee Name': string;
  'Customer Phone': string;
  'Customer Email': string;
  'Complete Delivery Address': string;
  'Landmark': string;
  'City': string;
  'State': string;
  'PIN Code': string;
  'Country': string;

  // Product & Item Shipment Details
  'Product Name': string;
  'SKU / Item Code': string;
  'Quantity': number;
  'Unit Price (INR)': number;
  'Item Total Value (INR)': number;
  'Personalization / Monogram': string;

  // Payment & COD Logistics
  'Payment Mode': string;
  'COD Collectible Amount (INR)': number;

  // Package Dimensions & Weight
  'Package Weight (Kg)': number;
  'Length (cm)': number;
  'Width / Breadth (cm)': number;
  'Height (cm)': number;

  // Seller Details, Invoice & Taxation
  'Seller Name': string;
  'Seller Address': string;
  'Seller GSTIN': string;
  'Invoice Number': string;
  'HSN Code': string;
  'Tax Rate / Tax Type': string;
}

/**
 * Generate Delhivery bulk shipping Excel (.xlsx) file for selected orders
 */
export function generateDelhiveryShipmentRows(orders: Order[], allProducts: Product[] = []): DelhiveryExportRow[] {
  const rows: DelhiveryExportRow[] = [];

  for (const order of orders) {
    if (!order) continue;

    const rawId = order.id || 'ORD-1001';
    const cleanId = rawId.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000).toString();

    const isCod = Boolean(
      (order.paymentMethod && order.paymentMethod.toLowerCase().includes('cash on delivery')) ||
      (order.paymentMethod && order.paymentMethod.toLowerCase().includes('cod'))
    );

    const paymentMode = isCod ? 'COD' : 'Pre-paid';
    const codAmount = isCod ? (Number(order.total) || 0) : 0;

    const customerName = order.customer?.name || 'Customer';
    const customerPhone = order.shippingAddress?.phone || '';
    const customerEmail = order.customer?.email || '';
    const addressLine = order.shippingAddress?.addressLine || '';
    const landmark = order.shippingAddress?.landmark || '';
    const fullAddress = landmark ? `${addressLine}, Landmark: ${landmark}` : addressLine;
    const city = order.shippingAddress?.city || '';
    const state = order.shippingAddress?.state || '';
    const pincode = order.shippingAddress?.pincode || '';
    const country = 'India';

    const invoiceNumber = order.shippingLabel?.invoiceNumber || `gemt${cleanId}${Math.floor(1000 + Math.random() * 9000)}`;

    const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [
      {
        productId: 'item-1',
        productName: 'Atelier Leather Goods',
        productImage: '',
        sku: 'SB-ATELIER-01',
        colorName: 'Classic',
        price: order.total || 0,
        quantity: 1,
      }
    ];

    const totalPiecesInOrder = items.reduce((sum, it) => sum + (Number(it?.quantity) || 1), 0);
    const orderWeight = Math.max(0.35, Math.round((totalPiecesInOrder * 0.38 + 0.15) * 100) / 100);

    // Each order item represents one shipment product row with full consignee & order reference
    items.forEach((item, itemIdx) => {
      const dbProduct = allProducts.find(p => 
        (p && item.productId && p.id === item.productId) ||
        (item.sku && p && (p.sku === item.sku || p.skuId === item.sku)) ||
        (item.productName && p && p.name && p.name.toLowerCase() === item.productName.toLowerCase())
      );

      const sku = item.sku || item.skuId || dbProduct?.sku || dbProduct?.skuId || `SB-SKU-${itemIdx + 1}`;
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.price) || dbProduct?.price || 0;
      const itemTotal = unitPrice * qty;

      const monogram = item.monogram 
        ? `${item.monogram} (${item.foilColor || 'Gold'})` 
        : 'None';

      // Item proportional weight or order weight
      const itemWeight = Math.round((orderWeight * (qty / Math.max(totalPiecesInOrder, 1))) * 100) / 100;

      rows.push({
        'Order ID': rawId,
        'Order Date': order.date || new Date().toISOString().split('T')[0],

        'Customer / Consignee Name': customerName,
        'Customer Phone': customerPhone,
        'Customer Email': customerEmail,
        'Complete Delivery Address': fullAddress,
        'Landmark': landmark,
        'City': city,
        'State': state,
        'PIN Code': pincode,
        'Country': country,

        'Product Name': item.productName || dbProduct?.name || 'Atelier Leathercraft Piece',
        'SKU / Item Code': sku,
        'Quantity': qty,
        'Unit Price (INR)': unitPrice,
        'Item Total Value (INR)': itemTotal,
        'Personalization / Monogram': monogram,

        'Payment Mode': paymentMode,
        'COD Collectible Amount (INR)': codAmount,

        'Package Weight (Kg)': itemWeight,
        'Length (cm)': 26,
        'Width / Breadth (cm)': 20,
        'Height (cm)': 8,

        'Seller Name': DEFAULT_SELLER_INFO.name,
        'Seller Address': DEFAULT_SELLER_INFO.returnAddress,
        'Seller GSTIN': DEFAULT_SELLER_INFO.gstin,
        'Invoice Number': invoiceNumber,
        'HSN Code': '4202',
        'Tax Rate / Tax Type': '18% GST',
      });
    });
  }

  return rows;
}

/**
 * Main export function: generates and downloads a real .xlsx Excel file
 */
export async function exportOrdersToDelhiveryExcel(
  ordersToExport: Order[],
  allProducts: Product[] = [],
  customFilename?: string
): Promise<boolean> {
  if (!ordersToExport || ordersToExport.length === 0) {
    return false;
  }

  const shipmentRows = generateDelhiveryShipmentRows(ordersToExport, allProducts);
  if (shipmentRows.length === 0) {
    return false;
  }

  // Dynamically load XLSX on-demand so it doesn't inflate initial bundle
  const XLSX = await import('xlsx');

  // 1. Create main shipments worksheet
  const worksheet = XLSX.utils.json_to_sheet(shipmentRows);

  // 2. Set optimized column widths for Delhivery portal readability
  worksheet['!cols'] = [
    { wch: 14 }, // Order ID
    { wch: 12 }, // Order Date
    { wch: 24 }, // Customer / Consignee Name
    { wch: 15 }, // Customer Phone
    { wch: 28 }, // Customer Email
    { wch: 38 }, // Complete Delivery Address
    { wch: 18 }, // Landmark
    { wch: 16 }, // City
    { wch: 18 }, // State
    { wch: 12 }, // PIN Code
    { wch: 10 }, // Country
    { wch: 32 }, // Product Name
    { wch: 18 }, // SKU / Item Code
    { wch: 10 }, // Quantity
    { wch: 16 }, // Unit Price (INR)
    { wch: 18 }, // Item Total Value (INR)
    { wch: 24 }, // Personalization / Monogram
    { wch: 14 }, // Payment Mode
    { wch: 24 }, // COD Collectible Amount (INR)
    { wch: 18 }, // Package Weight (Kg)
    { wch: 12 }, // Length (cm)
    { wch: 18 }, // Width / Breadth (cm)
    { wch: 12 }, // Height (cm)
    { wch: 38 }, // Seller Name
    { wch: 45 }, // Seller Address
    { wch: 18 }, // Seller GSTIN
    { wch: 20 }, // Invoice Number
    { wch: 12 }, // HSN Code
    { wch: 18 }, // Tax Rate / Tax Type
  ];

  // 3. Create Summary Worksheet
  const uniqueOrderCount = new Set(shipmentRows.map(r => r['Order ID'])).size;
  const totalItemCount = shipmentRows.reduce((sum, r) => sum + r['Quantity'], 0);
  const totalShipmentValue = ordersToExport.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const codOrdersCount = ordersToExport.filter(o => {
    const pm = (o.paymentMethod || '').toLowerCase();
    return pm.includes('cod') || pm.includes('cash on delivery');
  }).length;
  const totalCodAmount = ordersToExport
    .filter(o => {
      const pm = (o.paymentMethod || '').toLowerCase();
      return pm.includes('cod') || pm.includes('cash on delivery');
    })
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const summaryData = [
    { Parameter: 'Manifest Created At', Value: new Date().toLocaleString('en-IN') },
    { Parameter: 'Carrier / Logistics Partner', Value: 'Delhivery B2C / Express Surface & Air' },
    { Parameter: 'Warehouse / Pickup Hub', Value: 'STUNNING BIRDS ATELIER (Kolkata, WB - 700039)' },
    { Parameter: 'Total Orders in Batch', Value: uniqueOrderCount },
    { Parameter: 'Total Line Items / Pieces', Value: totalItemCount },
    { Parameter: 'Total Shipment Value (INR)', Value: `₹${totalShipmentValue.toLocaleString('en-IN')}` },
    { Parameter: 'Prepaid Orders Count', Value: uniqueOrderCount - codOrdersCount },
    { Parameter: 'COD Orders Count', Value: codOrdersCount },
    { Parameter: 'Total COD Collectible Amount (INR)', Value: `₹${totalCodAmount.toLocaleString('en-IN')}` },
  ];

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [
    { wch: 32 },
    { wch: 45 },
  ];

  // 4. Build Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Delhivery_Shipments');
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Batch_Summary');

  // 5. Trigger download of real .xlsx file
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = customFilename || `delhivery_bulk_manifest_${ordersToExport.length}_orders_${dateStamp}.xlsx`;

  XLSX.writeFile(workbook, filename);
  return true;
}
