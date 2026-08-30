import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Download, 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  Store, 
  ChevronDown,
  X,
  CheckCircle,
  Truck,
  Clock,
  Eye,
  Printer,
  FileText,
  QrCode,
  RefreshCw,
  Copy,
  Check,
  CheckSquare,
  Square,
  FileDown,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Order } from '../types';
import { formatINR } from '../utils/formatCurrency';
import { ShippingLabelModal } from './ShippingLabelModal';
import { ShippingLabelView } from './ShippingLabelView';
import { 
  generateShippingLabelData, 
  downloadShippingLabelPDF, 
  downloadBatchShippingLabelsPDF 
} from '../utils/shippingLabelGenerator';
import { supabase } from '../supabaseClient';

export const AdminOrdersScreen: React.FC = () => {
  const { 
    orders, 
    updateOrderStatus, 
    updateOrderShippingLabel, 
    deleteOrder,
    setCurrentScreen, 
    exportOrdersCSV, 
    refetchOrders,
    products, 
    logout,
    showToast 
  } = useShop();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingLabelOrder, setShippingLabelOrder] = useState<Order | null>(null);
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const targetId = orderToDelete.id;
      const success = await deleteOrder(targetId);
      if (success) {
        setSelectedOrderIds(prev => prev.filter(id => id !== targetId));
        if (selectedOrder?.id === targetId) {
          setSelectedOrder(null);
        }
        setOrderToDelete(null);
      }
    } finally {
      setIsDeletingOrder(false);
    }
  };

  React.useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setCurrentScreen('admin-login');
        window.location.hash = '/admin-login';
        return;
      }

      const uid = session.user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', uid)
        .maybeSingle();

      if (!profile?.is_admin) {
        setCurrentScreen('admin-login');
        window.location.hash = '/admin-login';
        showToast('Access Denied: Administrative permissions required.');
      } else {
        refetchOrders();
      }
    });
  }, [refetchOrders]);
  
  // Multi-selection state for batch shipping label operations
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [singleDownloadingId, setSingleDownloadingId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      if (!o) return false;
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        (o.id || '').toLowerCase().includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.email || '').toLowerCase().includes(q) ||
        (o.shippingAddress?.city && o.shippingAddress.city.toLowerCase().includes(q)) ||
        (o.shippingLabel?.awbNumber && o.shippingLabel.awbNumber.toLowerCase().includes(q)) ||
        (Array.isArray(o.items) && o.items.some(i => (i.sku && i.sku.toLowerCase().includes(q)) || (i.skuId && i.skuId.toLowerCase().includes(q)) || (i.productName && i.productName.toLowerCase().includes(q))));
      
      const matchStatus = statusFilter === 'All' || o.fulfillmentStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const allFilteredSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.every(o => selectedOrderIds.includes(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all visible
      const visibleIds = new Set(filteredOrders.map(o => o.id));
      setSelectedOrderIds(prev => prev.filter(id => !visibleIds.has(id)));
      showToast('Deselected all orders');
    } else {
      // Select all visible
      const visibleIds = filteredOrders.map(o => o.id);
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...visibleIds])));
      showToast(`Selected all ${filteredOrders.length} orders`);
    }
  };

  const handleToggleOrderSelect = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Single label direct PDF download
  const handleDownloadSingleLabel = async (order: Order) => {
    try {
      setSingleDownloadingId(order.id);
      const elementId = `batch-shipping-label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}`;
      const element = document.getElementById(elementId);
      
      if (!element) {
        // Fallback: open shipping label modal
        setShippingLabelOrder(order);
        setSingleDownloadingId(null);
        return;
      }

      const awb = order.shippingLabel?.awbNumber || `AWB-${order.id.replace('#', '')}`;
      const filename = `Shipping-Label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}-${awb}.pdf`;
      await downloadShippingLabelPDF(element, filename);
      showToast(`Downloaded Shipping Label for ${order.id}`);
    } catch (err) {
      console.error('Error downloading label:', err);
      showToast('Error generating PDF. Opening preview modal...');
      setShippingLabelOrder(order);
    } finally {
      setSingleDownloadingId(null);
    }
  };

  // Batch download of selected (or all) shipping labels into 1 multi-page PDF
  const handleDownloadAllLabels = async (ordersToDownload?: Order[]) => {
    const targetOrders = ordersToDownload || (
      selectedOrderIds.length > 0 
        ? orders.filter(o => selectedOrderIds.includes(o.id))
        : filteredOrders
    );

    if (targetOrders.length === 0) {
      showToast('No orders available to download');
      return;
    }

    try {
      setIsBatchDownloading(true);
      setBatchProgress({ current: 1, total: targetOrders.length });
      
      await downloadBatchShippingLabelsPDF(targetOrders, (current, total) => {
        setBatchProgress({ current, total });
      });

      showToast(`Successfully downloaded ${targetOrders.length} shipping labels into combined PDF!`);
    } catch (err) {
      console.error('Error in batch label download:', err);
      showToast('Failed to download batch labels. Please try individually.');
    } finally {
      setIsBatchDownloading(false);
      setBatchProgress(null);
    }
  };

  const getItemSku = (item: any) => {
    if (item.sku) return item.sku;
    if (item.skuId) return item.skuId;
    const found = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
    return found?.sku || found?.skuId || 'N/A';
  };

  const getFulfillmentBadgeClass = (status: string) => {
    switch (status) {
      case 'CRAFTING':
        return 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
      case 'SHIPPED':
        return 'bg-[#e0f2fe] text-[#075985] border-[#bae6fd]';
      case 'PROCESSING':
        return 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]';
      case 'DELIVERED':
        return 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]';
      default:
        return 'bg-[#f6f2ea] text-[#8c562e] border-[#e4d9cb]';
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleCopyAwb = (awb: string) => {
    navigator.clipboard.writeText(awb);
    setCopiedAwb(awb);
    setTimeout(() => setCopiedAwb(null), 2000);
    showToast(`Copied AWB ${awb}`);
  };


  return (
    <div className="min-h-screen bg-[#f7f4ee] flex flex-col md:flex-row">
      
      {/* Commerce Manager Left Sidebar */}
      <aside className="w-full md:w-64 bg-[#181614] text-[#ece5da] flex flex-col justify-between p-6 border-r border-[#262320]">
        <div className="space-y-8">
          
          <div className="cursor-pointer" onClick={() => setCurrentScreen('home')}>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37] font-semibold">
              STUNNING BIRDS
            </span>
            <h2 className="font-serif-luxury text-xl font-bold text-white tracking-wide">
              Commerce Manager
            </h2>
          </div>

          <nav className="space-y-1.5 text-xs font-medium tracking-wider uppercase">
            <button
              onClick={() => setCurrentScreen('admin-overview')}
              className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xs text-[#a8a199] hover:bg-[#262320] hover:text-white transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xs bg-[#2e2824] text-white border-l-2 border-[#d4af37] cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-4 h-4 text-[#d4af37]" />
                <span>Orders</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#8c562e] text-[10px] text-white font-bold">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentScreen('admin-overview')}
              className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xs text-[#a8a199] hover:bg-[#262320] hover:text-white transition-colors cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Products ({products.length})</span>
            </button>

            <button
              onClick={() => setCurrentScreen('account')}
              className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xs text-[#a8a199] hover:bg-[#262320] hover:text-white transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Customer Portal</span>
            </button>
          </nav>

        </div>

        <div className="pt-6 border-t border-[#262320] space-y-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentScreen('home')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#262320] hover:bg-[#332e2a] text-xs font-semibold text-[#faf7f2] tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
          >
            <Store className="w-4 h-4 text-[#d4af37]" />
            <span>View Storefront</span>
          </motion.button>

          <button
            id="admin-orders-signout-btn"
            onClick={() => {
              logout();
              setCurrentScreen('admin-login');
              window.location.hash = '/admin-login';
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-[11px] text-[#a89f91] hover:text-[#f87171] hover:bg-[#2c1515] transition-colors rounded-xs border border-transparent hover:border-[#6d2525] cursor-pointer"
          >
            <span>Lock & Sign Out Admin</span>
          </button>
        </div>

      </aside>

      {/* Main Orders Table View */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 space-y-6 max-w-7xl">
        
        {/* Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-[#e4dcd0]"
        >
          <div>
            <h1 className="font-serif-luxury text-3xl font-bold text-[#181614]">
              Order Management
            </h1>
            <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
              Track, inspect, and bulk-download courier shipping labels for bespoke commissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Select All Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleSelectAll}
              className={`px-3.5 py-2 border text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                allFilteredSelected
                  ? 'bg-[#181614] text-white border-[#181614]'
                  : 'bg-white border-[#ded5c7] hover:border-[#8c562e] text-[#181614]'
              }`}
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#d4af37]" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#78716c]" />
              )}
              <span>{allFilteredSelected ? 'Deselect All' : `Select All (${filteredOrders.length})`}</span>
            </motion.button>

            {/* Bulk Download All / Selected Shipping Labels Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isBatchDownloading || filteredOrders.length === 0}
              onClick={() => handleDownloadAllLabels()}
              className="px-4 py-2 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Download 4x6 courier shipping labels for all selected orders in 1 consolidated multi-page PDF"
            >
              {isBatchDownloading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>
                    Generating ({batchProgress?.current || 1}/{batchProgress?.total || filteredOrders.length})...
                  </span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>
                    {selectedOrderIds.length > 0
                      ? `Download Labels (${selectedOrderIds.length})`
                      : `Download All Labels (${filteredOrders.length})`}
                  </span>
                </>
              )}
            </motion.button>

            {/* CSV Export Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportOrdersCSV}
              className="px-3.5 py-2 bg-white border border-[#ded5c7] hover:border-[#8c562e] text-xs font-semibold text-[#181614] uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#8c562e]" />
              <span>Export CSV</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Selection Banner (When 1+ items selected) */}
        {selectedOrderIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#181614] text-[#faf7f2] px-4 py-3 rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
              <span className="text-xs font-medium">
                <strong className="text-[#d4af37] font-bold">{selectedOrderIds.length}</strong> of {orders.length} orders selected for batch processing
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadAllLabels()}
                disabled={isBatchDownloading}
                className="px-3 py-1.5 bg-[#8c562e] hover:bg-[#a66838] text-white text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 text-[#d4af37]" />
                <span>Download {selectedOrderIds.length} PDF Labels</span>
              </button>
              <button
                onClick={() => setSelectedOrderIds([])}
                className="px-2.5 py-1.5 bg-[#2a2622] hover:bg-[#38332e] text-[#a8a199] hover:text-white text-xs font-medium uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </motion.div>
        )}

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xs border border-[#e4dcd0] shadow-2xs"
        >
          
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8c857d] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Customer, City, AWB..."
              className="w-full pl-9 pr-4 py-2 bg-[#fbf9f5] border border-[#ded5c7] rounded-xs text-xs text-[#181614] focus:outline-none focus:border-[#8c562e]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs text-[#8c857d] uppercase tracking-wider mr-1">Status:</span>
            {['All', 'CRAFTING', 'SHIPPED', 'PROCESSING', 'DELIVERED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xs text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#8c562e] text-white shadow-2xs'
                    : 'bg-[#f6f2ea] text-[#554e47] hover:bg-[#ede5d8]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

        </motion.div>

        {/* Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="bg-white rounded-xs border border-[#e4dcd0] shadow-2xs overflow-x-auto"
        >
          <table className="w-full text-left text-xs">
            
            <thead className="bg-[#f6f2ea] border-b border-[#e4dcd0] text-[#78716c] uppercase tracking-widest font-semibold">
              <tr>
                {/* Select All Checkbox Header */}
                <th className="py-3.5 px-3 sm:px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded-xs text-[#8c562e] accent-[#8c562e] cursor-pointer"
                    title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>
                <th className="py-3.5 px-3 sm:px-4">Order ID</th>
                <th className="py-3.5 px-4 sm:px-6">Customer</th>
                <th className="py-3.5 px-4 sm:px-6">Items &amp; SKU</th>
                <th className="py-3.5 px-4 sm:px-6">Date</th>
                <th className="py-3.5 px-4 sm:px-6">Total</th>
                <th className="py-3.5 px-4 sm:px-6">Status</th>
                <th className="py-3.5 px-4 sm:px-6">Shipping Label</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0eae0]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-[#78716c]">
                    No orders match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, oIdx) => {
                  const label = order.shippingLabel || generateShippingLabelData(order);
                  const isSelected = selectedOrderIds.includes(order.id);
                  const isDownloadingThis = singleDownloadingId === order.id;

                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: oIdx * 0.04 }}
                      className={`transition-colors ${isSelected ? 'bg-[#f7f0e6]' : 'hover:bg-[#faf7f2]'}`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-4 px-3 sm:px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleOrderSelect(order.id)}
                          className="w-4 h-4 rounded-xs text-[#8c562e] accent-[#8c562e] cursor-pointer"
                          title={`Select order ${order.id}`}
                        />
                      </td>
                      
                      <td className="py-4 px-3 sm:px-4 font-mono font-semibold text-[#181614]">
                        {order.id}
                      </td>

                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#f6f2ea] border border-[#ded5c7] flex items-center justify-center font-bold text-[#8c562e]">
                            {order.customer.avatarInitials}
                          </div>
                          <div>
                            <div className="font-semibold text-[#181614]">{order.customer.name}</div>
                            <div className="text-[11px] text-[#8c857d]">{order.customer.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 sm:px-6 max-w-xs">
                        <div className="space-y-1.5">
                          {(order.items || []).map((it, iIdx) => {
                            const sku = getItemSku(it);
                            return (
                              <div key={iIdx} className="text-xs text-[#181614]">
                                <span className="font-medium text-[#181614]">{it.productName}</span>
                                <span className="text-[#78716c]"> (x{it.quantity})</span>
                                <div className="inline-block ml-1.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-[#f6f2ea] border border-[#ded5c7] font-mono text-[10px] font-bold text-[#8c562e]">
                                    SKU: {sku}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-[#554e47] whitespace-nowrap">
                        {order.date}
                      </td>

                      <td className="py-4 px-4 sm:px-6 font-serif-luxury font-bold text-[#181614] whitespace-nowrap">
                        {formatINR(order.total)}
                      </td>

                      <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                        <div className="space-y-1">
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${getFulfillmentBadgeClass(order.fulfillmentStatus)}`}>
                              {order.fulfillmentStatus}
                            </span>
                          </div>
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]">
                              <CheckCircle className="w-2.5 h-2.5" />
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Shipping Label Column */}
                      <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <Truck className="w-3 h-3 text-[#8c562e]" />
                            <span className="font-bold text-[#181614]">{label.awbNumber}</span>
                          </div>
                          <button
                            onClick={() => setShippingLabelOrder(order)}
                            className="px-2.5 py-1 bg-[#f4ebe1] hover:bg-[#8c562e] hover:text-white text-[#8c562e] text-[11px] font-bold rounded-xs border border-[#ded5c7] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Preview 4×6</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions: Download Label Button beside Inspect */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Direct Download Label Button */}
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            disabled={isDownloadingThis}
                            onClick={() => handleDownloadSingleLabel(order)}
                            className="px-2.5 py-1.5 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-bold uppercase tracking-wider rounded-xs border border-[#8c562e] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                            title={`Download 4x6 Courier Shipping Label for ${order.id} as PDF`}
                          >
                            {isDownloadingThis ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                            )}
                            <span>Download Label</span>
                          </motion.button>

                          {/* Inspect Order Button */}
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1.5 bg-[#f6f2ea] hover:bg-[#181614] hover:text-white text-[#181614] font-semibold rounded-xs border border-[#ded5c7] transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </motion.button>

                          {/* Delete Order Button */}
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderToDelete(order);
                            }}
                            className="px-2.5 py-1.5 bg-[#fef2f2] hover:bg-[#ef4444] text-[#b91c1c] hover:text-white text-xs font-semibold rounded-xs border border-[#fecaca] hover:border-[#ef4444] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title={`Delete order ${order.id} permanently`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Delete</span>
                          </motion.button>

                        </div>
                      </td>

                    </motion.tr>
                  );
                })
              )}
            </tbody>

          </table>
        </motion.div>

      </main>

      {/* Hidden Offscreen DOM Containers for Crisp High-Res PDF Rendering */}
      <div 
        style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '440px', pointerEvents: 'none', zIndex: -100 }} 
        aria-hidden="true"
      >
        {orders.map(order => {
          const label = order.shippingLabel || generateShippingLabelData(order);
          return (
            <div 
              key={order.id} 
              id={`batch-shipping-label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}`}
              className="bg-white p-2"
            >
              <ShippingLabelView label={label} containerId={`label-offscreen-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}`} />
            </div>
          );
        })}
      </div>


      {/* Order Inspection & Status Management Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setSelectedOrder(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-2xl bg-[#fbf9f5] rounded-lg shadow-2xl border border-[#ded5c7] overflow-hidden z-10"
            >
              
              <div className="p-6 bg-[#f6f2ea] border-b border-[#e4dcd0] flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#8c562e] font-bold">Atelier Commission</span>
                  <h3 className="font-serif-luxury text-xl font-bold text-[#181614]">
                    Order {selectedOrder.id}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrintSlip}
                    className="p-2 bg-white hover:bg-[#ded5c7] text-[#181614] rounded-xs border border-[#ded5c7] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Print Packing Slip"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Slip</span>
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1.5 text-[#78716c] hover:text-black rounded-full cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                
                {/* Customer & Shipping Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-xs border border-[#e4dcd0]">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8c857d] mb-1">Customer</h4>
                    <p className="text-sm font-semibold text-[#181614]">{selectedOrder.customer.name}</p>
                    <p className="text-xs text-[#78716c]">{selectedOrder.customer.email}</p>
                    <p className="text-xs text-[#78716c]">{selectedOrder.shippingAddress?.phone}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-[#78716c]">Order Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${getFulfillmentBadgeClass(selectedOrder.fulfillmentStatus)}`}>
                        {selectedOrder.fulfillmentStatus}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8c857d] mb-1">Ship To</h4>
                    <p className="text-xs text-[#554e47] leading-relaxed">
                      {selectedOrder.shippingAddress?.addressLine}<br />
                      {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.pincode}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-[#78716c]">Payment:</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]">
                        {selectedOrder.paymentStatus} ({selectedOrder.paymentMethod})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#181614]">Commissioned Pieces</h4>
                    <span className="text-[11px] text-[#78716c]">{(selectedOrder.items || []).length} unique item{(selectedOrder.items || []).length > 1 ? 's' : ''}</span>
                  </div>

                  {(selectedOrder.items || []).map((it, idx) => {
                    const sku = getItemSku(it);
                    return (
                      <div key={idx} className="p-4 bg-white border border-[#e4dcd0] rounded-xs space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center space-x-3.5">
                            <img
                              src={it.productImage}
                              alt={it.productName}
                              referrerPolicy="no-referrer"
                              className="w-14 h-16 object-cover rounded-xs border border-[#ded5c7]"
                            />
                            <div>
                              <h5 className="font-serif-luxury text-sm font-semibold text-[#181614]">{it.productName}</h5>
                              <p className="text-xs text-[#78716c]">{it.colorName}</p>
                              {it.monogram && (
                                <span className="text-[11px] text-[#8c562e] font-semibold block mt-0.5">
                                  Monogram: {it.monogram} ({it.foilColor || 'Gold'})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-serif-luxury text-sm font-bold text-[#181614]">
                              {formatINR(it.price * it.quantity)}
                            </div>
                            <div className="text-[11px] text-[#78716c]">
                              {formatINR(it.price)} each
                            </div>
                          </div>
                        </div>

                        {/* Explicit Spec Strip for Order Fulfillment */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#f0eae0] text-xs">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#8c857d] block">Product</span>
                            <span className="font-medium text-[#181614] truncate block">{it.productName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#8c857d] block">SKU ID</span>
                            <span className="font-mono font-bold text-[#8c562e] bg-[#f6f2ea] px-1.5 py-0.5 rounded-xs border border-[#ded5c7] inline-block mt-0.5">
                              {sku}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#8c857d] block">Quantity</span>
                            <span className="font-semibold text-[#181614] block mt-0.5">{it.quantity} unit{it.quantity > 1 ? 's' : ''}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#8c857d] block">Unit Price</span>
                            <span className="font-medium text-[#181614] block mt-0.5">{formatINR(it.price)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Shipping Label & Courier Dispatch Management Card */}
                {(() => {
                  const modalLabel = selectedOrder.shippingLabel || generateShippingLabelData(selectedOrder);
                  return (
                    <div className="p-4 bg-white border border-[#ded5c7] rounded-xs shadow-2xs space-y-3.5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#f0eae0] pb-2.5">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-[#8c562e] text-white rounded-xs">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#181614]">
                              Courier Dispatch &amp; Shipping Label
                            </h4>
                            <p className="text-[11px] text-[#78716c]">
                              Air Cargo Consignment • {modalLabel.routingHub} Hub ({modalLabel.sortCode})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#8c562e] bg-[#f6f2ea] px-2 py-1 border border-[#ded5c7] rounded-xs">
                            {modalLabel.awbNumber}
                          </span>
                          <button
                            onClick={() => handleCopyAwb(modalLabel.awbNumber)}
                            className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded cursor-pointer"
                            title="Copy AWB Tracking Number"
                          >
                            {copiedAwb === modalLabel.awbNumber ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShippingLabelOrder(selectedOrder);
                          }}
                          className="py-2.5 px-3 bg-[#8c562e] hover:bg-[#734320] text-white rounded-xs text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View &amp; Download Label</span>
                        </motion.button>

                        <button
                          onClick={() => {
                            setShippingLabelOrder(selectedOrder);
                          }}
                          className="py-2.5 px-3 bg-[#181614] hover:bg-[#2d2925] text-white rounded-xs text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>Print Label</span>
                        </button>

                        <button
                          onClick={() => {
                            const newLabel = generateShippingLabelData(selectedOrder);
                            updateOrderShippingLabel(selectedOrder.id, newLabel);
                            setSelectedOrder({ ...selectedOrder, shippingLabel: newLabel });
                            showToast(`Regenerated AWB: ${newLabel.awbNumber}`);
                          }}
                          className="py-2.5 px-3 bg-[#fbf9f5] hover:bg-[#ede5d8] text-[#554e47] border border-[#ded5c7] rounded-xs text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Regenerate AWB</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Status Update Controls */}
                <div className="p-4 bg-[#f6f2ea] border border-[#ded5c7] rounded-xs space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#181614]">Update Fulfillment Status</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['PROCESSING', 'CRAFTING', 'SHIPPED', 'DELIVERED'].map(st => (
                      <button
                        key={st}
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, st);
                          setSelectedOrder({ ...selectedOrder, fulfillmentStatus: st as any });
                        }}
                        className={`py-2 px-3 rounded-xs text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          selectedOrder.fulfillmentStatus === st
                            ? 'bg-[#8c562e] text-white shadow-xs'
                            : 'bg-white text-[#554e47] hover:bg-[#ede5d8] border border-[#ded5c7]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Status Controls */}
                <div className="p-4 bg-[#f6f2ea] border border-[#ded5c7] rounded-xs space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#181614]">Update Payment Status</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {['Paid', 'Pending', 'Failed'].map(pst => (
                      <button
                        key={pst}
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, undefined, pst);
                          setSelectedOrder({ ...selectedOrder, paymentStatus: pst as any });
                        }}
                        className={`py-2 px-3 rounded-xs text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          selectedOrder.paymentStatus === pst
                            ? 'bg-[#15803d] text-white shadow-xs'
                            : 'bg-white text-[#554e47] hover:bg-[#ede5d8] border border-[#ded5c7]'
                        }`}
                      >
                        {pst}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <div className="p-4 bg-[#f6f2ea] border-t border-[#e4dcd0] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="font-serif-luxury text-sm font-bold text-[#181614]">
                    Total: {formatINR(selectedOrder.total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const toDel = selectedOrder;
                      setSelectedOrder(null);
                      setOrderToDelete(toDel);
                    }}
                    className="px-3 py-1.5 bg-[#fef2f2] hover:bg-[#ef4444] text-[#b91c1c] hover:text-white text-xs font-semibold rounded-xs border border-[#fecaca] hover:border-[#ef4444] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Order</span>
                  </button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                >
                  Done
                </motion.button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Order Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-[#ded5c7] rounded-xs shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-5 border-b border-[#e8dfd2] bg-[#fbf9f5] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 border border-red-200 text-red-700 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif-luxury font-bold text-base text-[#181614]">
                      Delete Commission Order
                    </h3>
                    <p className="text-[11px] text-[#78716c]">Supabase Database Deletion</p>
                  </div>
                </div>
                <button
                  onClick={() => setOrderToDelete(null)}
                  className="p-1 text-[#8c827a] hover:text-[#181614] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3.5 bg-[#f6f2ea] border border-[#ded5c7] rounded-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-xs text-[#181614]">{orderToDelete.id}</span>
                    <span className="font-serif-luxury font-bold text-xs text-[#8c562e]">{formatINR(orderToDelete.total)}</span>
                  </div>
                  <div className="text-xs text-[#554e47]">
                    <div><strong>Customer:</strong> {orderToDelete.customer.name} ({orderToDelete.customer.email})</div>
                    <div><strong>Date:</strong> {orderToDelete.date} • <strong>Status:</strong> {orderToDelete.fulfillmentStatus}</div>
                    <div className="text-[11px] text-[#78716c] mt-1">
                      {(orderToDelete.items || []).map(i => `${i.productName || 'Piece'} (x${i.quantity || 1})`).join(', ')}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 leading-relaxed">
                    Are you sure you want to permanently delete order <strong className="font-mono font-bold">{orderToDelete.id}</strong>? This commission will be immediately and irreversibly removed from Supabase.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#fbf9f5] border-t border-[#e8dfd2] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isDeletingOrder}
                  onClick={() => setOrderToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#554e47] hover:text-[#181614] bg-white border border-[#ded5c7] hover:bg-[#f6f2ea] rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-order-modal-btn"
                  disabled={isDeletingOrder}
                  onClick={handleConfirmDeleteOrder}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#b91c1c] hover:bg-[#991b1b] rounded-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-75"
                >
                  {isDeletingOrder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting from Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Order</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Standalone Full-Featured Shipping Label View & PDF Download Modal */}
      <ShippingLabelModal
        isOpen={!!shippingLabelOrder}
        order={shippingLabelOrder}
        onClose={() => setShippingLabelOrder(null)}
        onUpdateLabel={updateOrderShippingLabel}
        showToast={showToast}
      />

    </div>
  );
};
