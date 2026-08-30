import React, { useEffect, useRef, useState } from 'react';
import { ShippingLabel } from '../types';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface Props {
  label: ShippingLabel;
  containerId?: string;
}

export const ShippingLabelView: React.FC<Props> = ({ label, containerId = 'shipping-label-container' }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const safeLabel = label || {} as Partial<ShippingLabel>;
  const safeShipTo = safeLabel.shipTo || {
    name: 'Recipient',
    phone: '',
    addressLine: 'Delivery Address',
    city: 'City',
    state: 'State',
    pincode: '000000',
  };
  const safeSeller = safeLabel.seller || {
    name: 'STUNNING BIRDS ATELIER & LEATHERWORKS',
    addressLine: '6E/1B Topsia 2nd Lane, Topsia',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700039',
    country: 'India',
    phone: '+91 8582861387',
    email: 'stunningbirds236@gmail.com',
    gstin: '19BEIPH0104K1ZQ',
  };
  const safeItems = Array.isArray(safeLabel?.items) ? safeLabel.items : [];

  useEffect(() => {
    // Generate Primary 1D Barcode (AWB Tracking)
    if (barcodeRef.current && safeLabel.awbNumber) {
      try {
        JsBarcode(barcodeRef.current, safeLabel.awbNumber, {
          format: 'CODE128',
          width: 1.8,
          height: 44,
          displayValue: false,
          margin: 0,
        });
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    }

    // Generate 2D QR Code
    if (safeLabel.qrData) {
      QRCode.toDataURL(safeLabel.qrData, {
        width: 160,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url: string) => setQrCodeUrl(url))
        .catch((err: any) => console.error('QR code generation error:', err));
    }
  }, [safeLabel]);

  // Calculate totals for tax table
  const itemsTaxSum = safeItems.reduce((acc, it) => acc + (it.taxAmount || (((Number(it.price) || 0) * (Number(it.quantity) || 1)) - ((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18)), 0);
  const shippingTax = safeLabel?.shippingCharge ? (safeLabel.shippingCharge - safeLabel.shippingCharge / 1.18) : 0;
  const totalTaxSum = itemsTaxSum + shippingTax;
  const totalAmountNum = typeof safeLabel.totalAmount === 'number' ? safeLabel.totalAmount : Number(safeLabel.totalAmount) || 0;

  return (
    <div className="w-full flex justify-center py-2 px-1">
      {/* Container with standard black border & typography matching reference courier label */}
      <div
        id={containerId}
        className="w-full max-w-[520px] bg-white text-black font-sans text-xs leading-snug p-2 select-none print:m-0 print:p-0 print:border-none print:max-w-none print:w-full"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {/* ========================================================= */}
        {/* TOP HALF: COURIER SHIPPING LABEL                          */}
        {/* ========================================================= */}
        <div className="border-2 border-black bg-white">
          {/* 2-Column Grid: Customer/Return info (Left) and Courier/Barcode (Right) */}
          <div className="grid grid-cols-12 divide-x-2 divide-black">
            
            {/* LEFT COLUMN: Customer Address & Return Address */}
            <div className="col-span-5 flex flex-col justify-between">
              {/* Customer Address Box */}
              <div className="p-2 border-b-2 border-black flex-1">
                <div className="font-bold text-[11px] text-black uppercase tracking-tight">Customer Address</div>
                <div className="font-bold text-[12px] text-black mt-1 leading-tight">{safeShipTo.name || 'Recipient'}</div>
                <div className="text-[10px] text-black mt-0.5 leading-tight">{safeShipTo.addressLine}</div>
                {safeShipTo.landmark && (
                  <div className="text-[9.5px] text-black leading-tight">Near {safeShipTo.landmark}</div>
                )}
                <div className="text-[10px] text-black font-medium mt-0.5 leading-tight">
                  {safeShipTo.city}, {safeShipTo.state}, {safeShipTo.pincode}
                </div>
                {safeShipTo.phone && (
                  <div className="text-[9.5px] text-black mt-1 font-semibold">
                    Ph: <span className="font-mono font-bold">{safeShipTo.phone}</span>
                  </div>
                )}
              </div>

              {/* Return Address Box */}
              <div className="p-2 bg-white">
                <div className="font-semibold text-[9.5px] text-black leading-tight">If undelivered, return to:</div>
                <div className="font-bold text-[10.5px] text-black mt-0.5 leading-tight">{(safeSeller.name || '').toLowerCase()}</div>
                <div className="text-[9px] text-black mt-0.5 leading-tight">
                  {safeSeller.addressLine}, {safeSeller.city}, {safeSeller.state} pin code {safeSeller.pincode}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: COD Header, Courier, QR Code & 1D Barcode */}
            <div className="col-span-7 flex flex-col justify-between">
              {/* Top Strip: COD or Prepaid notification */}
              <div className="border-b-2 border-black bg-black text-white px-2.5 py-1.5 font-bold text-[11px] leading-tight">
                {safeLabel.isCod 
                  ? 'COD: Check the payable amount on the app'
                  : 'PREPAID: Do not collect cash from customer'}
              </div>

              {/* Courier Routing & QR Code row */}
              <div className="p-2 flex-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-black text-[17px] text-black tracking-tight leading-none">
                      {safeLabel.courierPartner || 'Delhivery'}
                    </div>
                    <div className="inline-block bg-black text-white text-[9.5px] font-bold px-1.5 py-0.5 my-1.5 uppercase leading-none">
                      Pickup
                    </div>
                    <div className="text-[9.5px] text-black font-medium mt-0.5 leading-tight">Destination Code</div>
                    <div className="text-[10px] text-black font-mono font-bold leading-tight">
                      {safeLabel.destinationCode || safeLabel.routingHub || 'BLR/S-HUB'}
                    </div>
                    <div className="text-[9.5px] text-black font-medium mt-1 leading-tight">Return Code</div>
                    <div className="text-[10.5px] text-black font-mono font-bold leading-tight">
                      {safeLabel.returnCode || '395006,800999'}
                    </div>
                  </div>

                  {/* 2D QR Code Matrix */}
                  <div className="shrink-0 flex flex-col items-center">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Matrix"
                        className="w-24 h-24 border border-black p-0.5"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 border border-black flex items-center justify-center text-[9px]">
                        QR Code
                      </div>
                    )}
                  </div>
                </div>

                {/* 1D Tracking Barcode Section */}
                <div className="mt-2 text-center">
                  <div className="font-mono font-black text-[15px] tracking-wider text-black leading-none mb-1">
                    {safeLabel.awbNumber}
                  </div>
                  <div className="flex justify-center w-full overflow-hidden">
                    <svg ref={barcodeRef} className="w-full max-h-11" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCT DETAILS STRIP (Bottom of Top Half) */}
          <div className="border-t-2 border-black p-2 bg-white">
            <div className="font-bold text-[11px] text-black uppercase mb-1">Product Details</div>
            <table className="w-full text-left text-[9.5px] border-collapse">
              <thead>
                <tr className="border-b border-black font-bold text-black text-[10px]">
                  <th className="py-0.5 pr-2">SKU</th>
                  <th className="py-0.5 px-2">Size</th>
                  <th className="py-0.5 px-2 text-center">Qty</th>
                  <th className="py-0.5 px-2">Color</th>
                  <th className="py-0.5 pl-2 text-right">Order No.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {safeItems.map((it, idx) => (
                  <tr key={idx} className="font-medium text-black">
                    <td className="py-0.5 pr-2 font-mono font-semibold">{it.sku}</td>
                    <td className="py-0.5 px-2">{it.size || 'S'}</td>
                    <td className="py-0.5 px-2 text-center font-bold">{it.quantity}</td>
                    <td className="py-0.5 px-2">{it.color || 'Peach'}</td>
                    <td className="py-0.5 pl-2 font-mono text-right">{it.orderItemNo || `${safeLabel.purchaseOrderNo || safeLabel.orderId || 'ORD'}_${idx + 1}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MIDDLE DIVIDER: FOLD HERE LINE                            */}
        {/* ========================================================= */}
        <div className="my-2 border-t border-dashed border-black text-center relative py-0.5">
          <span className="bg-white px-3 font-mono text-[9.5px] text-gray-700 tracking-wider">
            ---------------- Fold Here ----------------
          </span>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM HALF: OFFICIAL TAX INVOICE                         */}
        {/* ========================================================= */}
        <div className="border-2 border-black bg-white">
          {/* Tax Invoice Header Bar */}
          <div className="border-b-2 border-black px-2 py-0.5 flex items-center justify-between">
            <div className="font-black text-[12px] uppercase tracking-widest text-center flex-1 text-black">
              TAX INVOICE
            </div>
            <div className="text-[8.5px] font-bold text-black uppercase whitespace-nowrap">
              Original For Recipient
            </div>
          </div>

          {/* 3-Column Info Block: BILL TO | SHIP TO | Sold by / Invoice Metadata */}
          <div className="border-b-2 border-black grid grid-cols-12 divide-x-2 divide-black text-[9px] leading-tight">
            {/* BILL TO */}
            <div className="col-span-3 p-1.5 space-y-0.5">
              <div className="font-black uppercase text-[9.5px] text-black">BILL TO</div>
              <div className="font-bold text-black">{safeShipTo.name || 'Recipient'}</div>
              <div className="text-black">{safeShipTo.addressLine}</div>
              <div className="text-black">{safeShipTo.city}, {safeShipTo.state}, {safeShipTo.pincode}</div>
              <div className="font-bold text-black pt-1">
                Place of Supply: {safeLabel.placeOfSupply || '12 Arunachal Pradesh'}
              </div>
            </div>

            {/* SHIP TO */}
            <div className="col-span-4 p-1.5 space-y-0.5">
              <div className="font-black uppercase text-[9.5px] text-black">SHIP TO</div>
              <div className="font-bold text-black">{safeShipTo.name || 'Recipient'}</div>
              <div className="text-black">{safeShipTo.addressLine}</div>
              <div className="text-black">{safeShipTo.city}, {safeShipTo.state}, {safeShipTo.pincode}</div>
            </div>

            {/* SOLD BY / INVOICE METADATA */}
            <div className="col-span-5 p-1.5 space-y-0.5">
              <div className="text-[8.5px] text-black leading-tight">
                Sold by : <span className="font-bold">{safeSeller.name}</span>, {safeSeller.city}, {safeSeller.state}, {safeSeller.pincode}
              </div>
              <div className="font-mono font-bold text-[9px] text-black">
                GSTIN - {safeSeller.gstin}
              </div>
              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[8.5px] pt-1 border-t border-gray-300">
                <div>
                  <span className="text-gray-600 block text-[7.5px]">Purchase Order No.</span>
                  <span className="font-mono font-bold text-black">{safeLabel.purchaseOrderNo || (safeLabel.orderId || '').replace('#', '')}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[7.5px]">Invoice No.</span>
                  <span className="font-mono font-bold text-black">{safeLabel.invoiceNumber || 'INV-001'}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[7.5px]">Order Date</span>
                  <span className="font-semibold text-black">{safeLabel.orderDateFormatted || safeLabel.orderDate}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[7.5px]">Invoice Date</span>
                  <span className="font-semibold text-black">{safeLabel.invoiceDate || safeLabel.orderDateFormatted}</span>
                </div>
              </div>
            </div>
          </div>

          {/* GST Itemized Breakdown Table */}
          <table className="w-full text-left text-[8.5px] border-collapse">
            <thead>
              <tr className="border-b border-black font-bold uppercase text-[8px] text-black bg-gray-100">
                <th className="py-1 px-1.5">Description</th>
                <th className="py-1 px-1 text-center">HSN</th>
                <th className="py-1 px-1 text-center">Qty</th>
                <th className="py-1 px-1 text-right">Gross Amount</th>
                <th className="py-1 px-1 text-right">Discount</th>
                <th className="py-1 px-1 text-right">Taxable Value</th>
                <th className="py-1 px-1 text-right">Taxes</th>
                <th className="py-1 px-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[8.5px]">
              {safeItems.map((it, idx) => (
                <tr key={idx} className="font-medium text-black">
                  <td className="py-1 px-1.5 font-semibold text-black">
                    {it.sku} - {it.size || 'S'}
                  </td>
                  <td className="py-1 px-1 text-center font-mono">{it.hsn || '6211'}</td>
                  <td className="py-1 px-1 text-center font-bold">{it.quantity}</td>
                  <td className="py-1 px-1 text-right font-mono">
                    Rs.{it.grossAmount ? it.grossAmount.toFixed(2) : ((Number(it.price) || 0) * (Number(it.quantity) || 1)).toFixed(2)}
                  </td>
                  <td className="py-1 px-1 text-right font-mono">Rs.0.00</td>
                  <td className="py-1 px-1 text-right font-mono">
                    Rs.{it.taxableValue ? it.taxableValue.toFixed(2) : (((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18).toFixed(2)}
                  </td>
                  <td className="py-1 px-1 text-right leading-tight">
                    <div className="text-[7.5px] text-gray-700">IGST @{it.taxRate ? it.taxRate.toFixed(1) : '18.0'}%</div>
                    <div className="font-mono font-semibold">
                      Rs.{it.taxAmount ? it.taxAmount.toFixed(2) : (((Number(it.price) || 0) * (Number(it.quantity) || 1)) - ((Number(it.price) || 0) * (Number(it.quantity) || 1)) / 1.18).toFixed(2)}
                    </div>
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono font-bold">
                    Rs.{it.total ? it.total.toFixed(2) : ((Number(it.price) || 0) * (Number(it.quantity) || 1)).toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Other Charges (Logistics / Shipping fee) */}
              <tr className="text-[8.5px] font-medium text-black">
                <td className="py-1 px-1.5 font-semibold text-black">Other Charges</td>
                <td className="py-1 px-1 text-center font-mono">4202</td>
                <td className="py-1 px-1 text-center">NA</td>
                <td className="py-1 px-1 text-right font-mono">
                  Rs.{(safeLabel.shippingCharge || 0).toFixed(2)}
                </td>
                <td className="py-1 px-1 text-right font-mono">Rs.0</td>
                <td className="py-1 px-1 text-right font-mono">
                  Rs.{safeLabel.shippingCharge ? (safeLabel.shippingCharge / 1.18).toFixed(2) : '0.00'}
                </td>
                <td className="py-1 px-1 text-right leading-tight">
                  <div className="text-[7.5px] text-gray-700">IGST @18.0%</div>
                  <div className="font-mono font-semibold">
                    Rs.{safeLabel.shippingCharge ? (safeLabel.shippingCharge - safeLabel.shippingCharge / 1.18).toFixed(2) : '0.00'}
                  </div>
                </td>
                <td className="py-1 px-1.5 text-right font-mono font-bold">
                  Rs.{(safeLabel.shippingCharge || 0).toFixed(2)}
                </td>
              </tr>

              {/* Total Row */}
              <tr className="border-t-2 border-black font-black bg-gray-50 text-[9px]">
                <td colSpan={6} className="py-1 px-1.5 font-black text-black uppercase">Total</td>
                <td className="py-1 px-1 text-right font-mono font-black text-black">
                  Rs.{totalTaxSum.toFixed(2)}
                </td>
                <td className="py-1 px-1.5 text-right font-mono font-black text-black">
                  Rs.{totalAmountNum.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Computer Generated Legal Declaration Footer */}
          <div className="p-1.5 text-[7.5px] leading-tight text-gray-800 border-t border-black bg-white">
            Tax is not payable on reverse charge basis. This is a computer generated invoice and does not require signature. Other charges are charges that are applicable to your order and include charges for logistics fee (where applicable). Includes discounts for your city and/or for online payments (as applicable)
          </div>
        </div>
      </div>
    </div>
  );
};
