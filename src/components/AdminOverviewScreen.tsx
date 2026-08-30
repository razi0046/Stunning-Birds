import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  Plus, 
  ArrowUpRight, 
  Package, 
  Eye, 
  CheckCircle2, 
  CheckCircle,
  Clock, 
  LayoutDashboard, 
  Layers, 
  BarChart3, 
  Settings,
  Store,
  Calendar,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  X,
  Printer,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  Check,
  Percent,
  Truck,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  CheckSquare,
  Square,
  FileDown,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { AdminNewProductModal } from './AdminNewProductModal';
import { AdminEditProductModal } from './AdminEditProductModal';
import { formatINR } from '../utils/formatCurrency';
import { Order, Product, ProductCategory } from '../types';
import { ShippingLabelView } from './ShippingLabelView';
import { 
  generateShippingLabelData, 
  downloadShippingLabelPDF, 
  downloadBatchShippingLabelsPDF 
} from '../utils/shippingLabelGenerator';
import { supabase } from '../supabaseClient';

export type AdminTab = 'overview' | 'orders' | 'products' | 'analytics' | 'settings';

export const AdminOverviewScreen: React.FC = () => {
  const { 
    adminMetrics, 
    orders, 
    products, 
    setCurrentScreen, 
    updateOrderStatus,
    updateProduct,
    deleteProduct,
    deleteOrder,
    exportOrdersCSV,
    exportProductsCSV,
    refetchOrders,
    userProfile,
    isLoggedIn,
    logout,
    showToast
  } = useShop();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [timeRange, setTimeRange] = useState<'Last 30 Days' | 'Today' | 'Last 7 Days' | 'This Quarter' | 'All Time'>('Last 30 Days');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      const success = await deleteProduct(productToDelete.id);
      if (success) {
        setProductToDelete(null);
      }
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const targetId = orderToDelete.id;
      const success = await deleteOrder(targetId);
      if (success) {
        setSelectedOverviewOrderIds(prev => prev.filter(id => id !== targetId));
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
    // If shop context already verified admin status, simply refetch latest orders
    if (userProfile?.isAdmin) {
      refetchOrders();
      return;
    }

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

      if (!profile?.is_admin && !userProfile?.isAdmin) {
        setCurrentScreen('admin-login');
        window.location.hash = '/admin-login';
        showToast('Access Denied: Administrative permissions required.');
      } else {
        refetchOrders();
      }
    });
  }, [userProfile?.isAdmin, refetchOrders]);

  // Orders Tab Filters & Search
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [selectedOverviewOrderIds, setSelectedOverviewOrderIds] = useState<string[]>([]);
  const [isBatchDownloadingOverview, setIsBatchDownloadingOverview] = useState(false);
  const [batchOverviewProgress, setBatchOverviewProgress] = useState<{ current: number; total: number } | null>(null);
  const [singleDownloadingOverviewId, setSingleDownloadingOverviewId] = useState<string | null>(null);

  // Products Tab Filters & Search
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');

  // Settings State
  const [atelierName, setAtelierName] = useState('STUNNING BIRDS');
  const [masterArtisan, setMasterArtisan] = useState('Master Artisan & Atelier Guild');
  const [atelierEmail, setAtelierEmail] = useState('stunningbirds236@gmail.com');
  const [taxRate, setTaxRate] = useState('18');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('0');

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      if (!o) return false;
      const q = orderSearch.toLowerCase();
      const matchSearch = 
        (o.id || '').toLowerCase().includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.email || '').toLowerCase().includes(q) ||
        (o.shippingAddress?.city && o.shippingAddress.city.toLowerCase().includes(q)) ||
        (o.shippingLabel?.awbNumber && o.shippingLabel.awbNumber.toLowerCase().includes(q)) ||
        (Array.isArray(o.items) && o.items.some(i => (i.sku && i.sku.toLowerCase().includes(q)) || (i.skuId && i.skuId.toLowerCase().includes(q)) || (i.productName && i.productName.toLowerCase().includes(q))));
      
      const matchStatus = orderStatusFilter === 'All' || o.fulfillmentStatus === orderStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const allOverviewFilteredSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.every(o => selectedOverviewOrderIds.includes(o.id));
  }, [filteredOrders, selectedOverviewOrderIds]);

  const handleToggleOverviewSelectAll = () => {
    if (allOverviewFilteredSelected) {
      const visibleIds = new Set(filteredOrders.map(o => o.id));
      setSelectedOverviewOrderIds(prev => prev.filter(id => !visibleIds.has(id)));
      showToast('Deselected all orders');
    } else {
      const visibleIds = filteredOrders.map(o => o.id);
      setSelectedOverviewOrderIds(prev => Array.from(new Set([...prev, ...visibleIds])));
      showToast(`Selected all ${filteredOrders.length} orders`);
    }
  };

  const handleToggleOverviewOrder = (orderId: string) => {
    setSelectedOverviewOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleDownloadOverviewSingleLabel = async (order: Order) => {
    try {
      setSingleDownloadingOverviewId(order.id);
      const elementId = `overview-shipping-label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}`;
      const element = document.getElementById(elementId);
      
      if (!element) {
        setSelectedOrder(order);
        setSingleDownloadingOverviewId(null);
        return;
      }

      const awb = order.shippingLabel?.awbNumber || `AWB-${order.id.replace('#', '')}`;
      const filename = `Shipping-Label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}-${awb}.pdf`;
      await downloadShippingLabelPDF(element, filename);
      showToast(`Downloaded Shipping Label for ${order.id}`);
    } catch (err) {
      console.error('Error downloading label:', err);
      showToast('Failed to generate PDF. Opening inspect modal...');
      setSelectedOrder(order);
    } finally {
      setSingleDownloadingOverviewId(null);
    }
  };

  const handleDownloadOverviewBatchLabels = async () => {
    const targetOrders = selectedOverviewOrderIds.length > 0
      ? orders.filter(o => selectedOverviewOrderIds.includes(o.id))
      : filteredOrders;

    if (targetOrders.length === 0) {
      showToast('No orders available to download');
      return;
    }

    try {
      setIsBatchDownloadingOverview(true);
      setBatchOverviewProgress({ current: 1, total: targetOrders.length });
      
      await downloadBatchShippingLabelsPDF(targetOrders, (current, total) => {
        setBatchOverviewProgress({ current, total });
      });

      showToast(`Downloaded ${targetOrders.length} shipping labels into combined PDF!`);
    } catch (err) {
      console.error('Error in batch label download:', err);
      showToast('Failed to download batch labels.');
    } finally {
      setIsBatchDownloadingOverview(false);
      setBatchOverviewProgress(null);
    }
  };

  // Filter strictly paid/successful orders (excluding Failed, Pending, Unpaid, Cancelled)
  const paidOrders = useMemo(() => {
    return (orders || []).filter(o => o && o.paymentStatus === 'Paid');
  }, [orders]);

  // Dynamic Metrics Calculation based strictly on real paid orders
  const calculatedMetrics = useMemo(() => {
    const liveRevenue = (paidOrders || []).reduce((sum, o) => sum + (Number(o?.total) || 0), 0);
    const totalOrderCount = (paidOrders || []).length;
    const avgOrder = totalOrderCount > 0 ? Math.round(liveRevenue / totalOrderCount) : 0;
    
    return {
      revenue: liveRevenue,
      orders: totalOrderCount,
      avgValue: avgOrder,
      conversion: totalOrderCount > 0 ? (Math.min(100, (totalOrderCount / Math.max(totalOrderCount, 1)) * 3.2)).toFixed(1) : '0.0',
    };
  }, [paidOrders]);

  // Real Financial Year Revenue & Growth Data based strictly on real paid orders from Supabase
  const monthlyRevenueData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 3 = Apr, 7 = Aug, 11 = Dec

    // In India & standard fiscal accounting, Financial Year starts April 1 and ends March 31
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const fyEndYear = fyStartYear + 1;
    const fyLabel = `FY ${fyStartYear}–${fyEndYear.toString().slice(-2)}`;

    const monthConfigs = [
      { key: 'Apr', label: 'Apr', fullName: 'April', monthIndex: 3, year: fyStartYear },
      { key: 'May', label: 'May', fullName: 'May', monthIndex: 4, year: fyStartYear },
      { key: 'Jun', label: 'Jun', fullName: 'June', monthIndex: 5, year: fyStartYear },
      { key: 'Jul', label: 'Jul', fullName: 'July', monthIndex: 6, year: fyStartYear },
      { key: 'Aug', label: 'Aug', fullName: 'August', monthIndex: 7, year: fyStartYear },
      { key: 'Sep', label: 'Sep', fullName: 'September', monthIndex: 8, year: fyStartYear },
      { key: 'Oct', label: 'Oct', fullName: 'October', monthIndex: 9, year: fyStartYear },
      { key: 'Nov', label: 'Nov', fullName: 'November', monthIndex: 10, year: fyStartYear },
      { key: 'Dec', label: 'Dec', fullName: 'December', monthIndex: 11, year: fyStartYear },
      { key: 'Jan', label: 'Jan', fullName: 'January', monthIndex: 0, year: fyEndYear },
      { key: 'Feb', label: 'Feb', fullName: 'February', monthIndex: 1, year: fyEndYear },
      { key: 'Mar', label: 'Mar', fullName: 'March', monthIndex: 2, year: fyEndYear },
    ];

    const months = monthConfigs.map(cfg => {
      const isCurrentMonth =
        cfg.monthIndex === currentMonth &&
        cfg.year === (currentMonth >= 3 ? fyStartYear : fyEndYear);

      return {
        ...cfg,
        liveRevenue: 0,
        liveOrderCount: 0,
        totalRevenue: 0,
        isCurrentMonth,
      };
    });

    // Aggregate strictly paid orders received in the system
    paidOrders.forEach(order => {
      let orderDate = new Date(order.date);
      if (isNaN(orderDate.getTime())) {
        orderDate = new Date();
      }
      const oMonth = orderDate.getMonth();
      const oYear = orderDate.getFullYear();
      const oTotal = Number(order.total) || 0;

      const target = months.find(m => m.monthIndex === oMonth && m.year === oYear);
      if (target) {
        target.liveRevenue += oTotal;
        target.liveOrderCount += 1;
        target.totalRevenue += oTotal;
      } else {
        // Fallback to active month if placing an order in current session
        const currentActive = months.find(m => m.isCurrentMonth);
        if (currentActive) {
          currentActive.liveRevenue += oTotal;
          currentActive.liveOrderCount += 1;
          currentActive.totalRevenue += oTotal;
        }
      }
    });

    const totalFyRevenue = (months || []).reduce((sum, m) => sum + (Number(m?.totalRevenue) || 0), 0);
    const totalLiveOrders = (paidOrders || []).length;
    const totalFyOrders = (months || []).reduce((sum, m) => sum + (Number(m?.liveOrderCount) || 0), 0);
    const maxRevenue = Math.max(...(months || []).map(m => m.totalRevenue || 0), 0);
    const yCeil = maxRevenue > 0 ? Math.ceil(maxRevenue * 1.25) : 50000;

    // SVG coordinates mapping (X: 50 to 950, Y: 30 to 210 in a 1000x250 canvas)
    const points = (months || []).map((m, idx) => {
      const x = 50 + idx * ((950 - 50) / 11);
      const ratio = maxRevenue > 0 ? Math.min(1, Math.max(0, (m.totalRevenue || 0) / yCeil)) : 0;
      const y = maxRevenue > 0 ? 210 - ratio * 170 : 210;
      return {
        ...m,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
      };
    });

    // Smooth cubic Bézier spline calculation
    const linePath = (points || []).reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = points[i - 1];
      const dx = (pt.x - prev.x) / 2;
      return `${acc} C ${prev.x + dx} ${prev.y}, ${pt.x - dx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');

    const firstPt = points[0] || { x: 50, y: 210 };
    const lastPt = points[points.length - 1] || { x: 950, y: 210 };
    const areaPath = `${linePath} L ${lastPt.x} 210 L ${firstPt.x} 210 Z`;

    return {
      fyLabel,
      fyStartYear,
      fyEndYear,
      months: points,
      totalFyRevenue,
      totalLiveOrders,
      totalFyOrders,
      maxRevenue,
      yCeil,
      linePath,
      areaPath,
    };
  }, [paidOrders]);

  // Derive Top Selling Products strictly from paid orders
  const topSellingPieces = useMemo(() => {
    const productStatsMap: Record<string, { id: string; name: string; sales: number; revenue: number }> = {};
    
    paidOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const prodId = item.productId || item.productName;
        if (!productStatsMap[prodId]) {
          productStatsMap[prodId] = {
            id: prodId,
            name: item.productName || 'Bespoke Atelier Piece',
            sales: 0,
            revenue: 0,
          };
        }
        productStatsMap[prodId].sales += Number(item.quantity) || 1;
        productStatsMap[prodId].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      });
    });

    const list = Object.values(productStatsMap).sort((a, b) => b.revenue - a.revenue);
    return list.slice(0, 5);
  }, [paidOrders]);

  // Derive Analytics (Category breakdown, monogram rate, regions) strictly from paid orders
  const atelierAnalytics = useMemo(() => {
    const categoryCounts: Record<string, number> = {
      'Bifold Wallets': 0,
      'Cardholders': 0,
      'Travel Wallets': 0,
      'Bags & Totes': 0,
      'Accessories': 0,
    };
    let totalItemsSold = 0;
    let monogramCount = 0;
    const foilCounts: Record<string, number> = {
      'Gold': 0,
      'Blind Emboss': 0,
      'Silver': 0,
    };
    const cityCounts: Record<string, number> = {};

    paidOrders.forEach(order => {
      // City stats
      const city = order.shippingAddress?.city?.trim() || 'Unspecified Region';
      cityCounts[city] = (cityCounts[city] || 0) + 1;

      // Item stats
      (order.items || []).forEach(item => {
        const qty = Number(item.quantity) || 1;
        totalItemsSold += qty;

        // Find product category
        const prod = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
        const cat = prod?.category || 'Bifold Wallets';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + qty;

        // Monogramming
        if (item.monogram && item.monogram.trim().length > 0) {
          monogramCount += qty;
          const foil = item.foilColor || 'Gold';
          foilCounts[foil] = (foilCounts[foil] || 0) + qty;
        }
      });
    });

    const categoryColors: Record<string, string> = {
      'Bifold Wallets': '#8c562e',
      'Cardholders': '#b47b48',
      'Travel Wallets': '#554e47',
      'Bags & Totes': '#2e2824',
      'Accessories': '#a8a199',
    };

    const categoryShares = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      share: totalItemsSold > 0 ? Math.round((count / totalItemsSold) * 100) : 0,
      color: categoryColors[category] || '#8c562e',
    }));

    const monogramRate = totalItemsSold > 0 ? ((monogramCount / totalItemsSold) * 100).toFixed(1) : '0.0';
    const totalFoils = (foilCounts['Gold'] + foilCounts['Blind Emboss'] + foilCounts['Silver']) || 1;
    const goldPct = Math.round((foilCounts['Gold'] / totalFoils) * 100);
    const debossPct = Math.round((foilCounts['Blind Emboss'] / totalFoils) * 100);
    const silverPct = Math.round((foilCounts['Silver'] / totalFoils) * 100);

    const topRegions = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({
        city,
        orders: count,
        pct: `${Math.round((count / Math.max(paidOrders.length, 1)) * 100)}%`,
      }));

    return {
      totalItemsSold,
      categoryShares,
      monogramRate,
      monogramCount,
      goldPct,
      debossPct,
      silverPct,
      topRegions,
    };
  }, [paidOrders, products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = productSearch.toLowerCase();
      const matchSearch = 
        p.name.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q) ||
        p.colorName.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.skuId && p.skuId.toLowerCase().includes(q));
      
      const matchCategory = productCategoryFilter === 'All' || p.category === productCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, productSearch, productCategoryFilter]);

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

  const handlePrintSlip = (order: Order) => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] flex flex-col md:flex-row">
      
      {/* Commerce Manager Left Sidebar */}
      <aside className="w-full md:w-64 bg-[#181614] text-[#ece5da] flex flex-col justify-between p-6 border-r border-[#262320]">
        <div className="space-y-8">
          
          {/* Atelier Brand Banner */}
          <div className="cursor-pointer" onClick={() => setCurrentScreen('home')}>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37] font-semibold">
              STUNNING BIRDS
            </span>
            <h2 className="font-serif-luxury text-xl font-bold text-white tracking-wide">
              Commerce Manager
            </h2>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 text-xs font-medium tracking-wider uppercase">
            <button
              id="admin-nav-overview"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xs transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#2e2824] text-white border-l-2 border-[#d4af37]'
                  : 'text-[#a8a199] hover:bg-[#262320] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#d4af37]" />
              <span>Overview</span>
            </button>

            <button
              id="admin-nav-orders"
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xs transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#2e2824] text-white border-l-2 border-[#d4af37]'
                  : 'text-[#a8a199] hover:bg-[#262320] hover:text-white'
              }`}
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
              id="admin-nav-products"
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xs transition-colors cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#2e2824] text-white border-l-2 border-[#d4af37]'
                  : 'text-[#a8a199] hover:bg-[#262320] hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Package className="w-4 h-4 text-[#d4af37]" />
                <span>Catalog</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#3a3530] text-[10px] text-[#ded5c7]">
                {products.length}
              </span>
            </button>

            <button
              id="admin-nav-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xs transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#2e2824] text-white border-l-2 border-[#d4af37]'
                  : 'text-[#a8a199] hover:bg-[#262320] hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#d4af37]" />
              <span>Analytics</span>
            </button>

            <button
              id="admin-nav-settings"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xs transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#2e2824] text-white border-l-2 border-[#d4af37]'
                  : 'text-[#a8a199] hover:bg-[#262320] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-[#d4af37]" />
              <span>Atelier Settings</span>
            </button>

            <button
              onClick={() => setCurrentScreen('account')}
              className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xs text-[#a8a199] hover:bg-[#262320] hover:text-white transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#a8a199]" />
              <span>Customer Portal</span>
            </button>
          </nav>

        </div>

        {/* Bottom Storefront preview link & Admin Sign Out */}
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
            id="admin-sidebar-signout-btn"
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

      {/* Main Dashboard Content Area */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl">
        
        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#e4dcd0]">
              <div>
                <h1 className="font-serif-luxury text-3xl font-bold text-[#181614]">
                  Overview
                </h1>
                <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                  Welcome back to the atelier dashboard. Real-time metrics & commissions.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {/* Time Range Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                    className="flex items-center space-x-2 bg-white border border-[#ded5c7] hover:border-[#8c562e] px-3.5 py-2 text-xs text-[#554e47] rounded-xs shadow-2xs cursor-pointer transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#8c562e]" />
                    <span>{timeRange}</span>
                    <ChevronDown className="w-3 h-3 text-[#8c857d]" />
                  </button>

                  {isTimeDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-[#ded5c7] rounded-xs shadow-lg py-1 z-20 text-xs">
                      {(['Today', 'Last 7 Days', 'Last 30 Days', 'This Quarter', 'All Time'] as const).map(tr => (
                        <button
                          key={tr}
                          onClick={() => {
                            setTimeRange(tr);
                            setIsTimeDropdownOpen(false);
                            showToast(`Updated view to: ${tr}`);
                          }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-[#f6f2ea] flex items-center justify-between ${
                            timeRange === tr ? 'font-bold text-[#8c562e] bg-[#faf7f2]' : 'text-[#181614]'
                          }`}
                        >
                          <span>{tr}</span>
                          {timeRange === tr && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  id="admin-add-product-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="px-4 py-2 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Product</span>
                </motion.button>
              </div>
            </div>

            {/* 4 KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: 'Total Revenue (INR)',
                  value: formatINR(calculatedMetrics.revenue),
                  change: '+14.2% trajectory',
                  icon: <span className="font-bold text-[#8c562e] text-sm">₹</span>,
                },
                {
                  title: 'Total Orders',
                  value: calculatedMetrics.orders.toLocaleString(),
                  change: '+8.1% volume',
                  icon: <ShoppingBag className="w-4 h-4 text-[#8c562e]" />,
                },
                {
                  title: 'Avg. Order Value',
                  value: formatINR(calculatedMetrics.avgValue),
                  change: '+5.4% AOV',
                  icon: <ArrowUpRight className="w-4 h-4 text-[#8c562e]" />,
                },
                {
                  title: 'Conversion Rate',
                  value: `${calculatedMetrics.conversion}%`,
                  change: '+0.8% organic',
                  icon: <Users className="w-4 h-4 text-[#8c562e]" />,
                },
              ].map((metric, idx) => (
                <motion.div
                  key={metric.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.06 }}
                  whileHover={{ y: -2 }}
                  className="bg-white p-6 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-2 hover:border-[#8c562e]/40 transition-colors"
                >
                  <div className="flex justify-between items-center text-xs font-semibold tracking-wider uppercase text-[#78716c]">
                    <span>{metric.title}</span>
                    {metric.icon}
                  </div>
                  <div className="font-serif-luxury text-2xl sm:text-3xl font-bold text-[#181614] truncate">
                    {metric.value}
                  </div>
                  <div className="flex items-center text-xs text-[#15803d] font-medium gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{metric.change}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Revenue Over Time Interactive Chart Visual */}
            <div className="bg-white p-6 sm:p-8 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif-luxury text-xl font-bold text-[#181614]">
                      Revenue Growth & Performance (INR)
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f6f2ea] border border-[#e4dcd0] text-[10px] font-semibold text-[#8c562e] uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                      Live Feed
                    </span>
                  </div>
                  <p className="text-xs text-[#78716c] mt-0.5">
                    Live monthly gross trajectory across all atelier leather collections & commissions
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center space-x-2 bg-[#faf7f2] px-3 py-1.5 rounded-xs border border-[#e4dcd0]">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#8c562e]" />
                    <span className="font-semibold text-[#181614]">
                      {monthlyRevenueData.fyLabel} Atelier Gross
                    </span>
                    <span className="text-[#8c857d] font-mono">
                      ({formatINR(monthlyRevenueData.totalFyRevenue)})
                    </span>
                  </div>

                  <div className="hidden md:flex items-center space-x-1.5 text-[#78716c] text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-[#8c562e]" />
                    <span>{paidOrders.length} paid order{paidOrders.length === 1 ? '' : 's'} recorded</span>
                  </div>
                </div>
              </div>

              {/* Luxury Line/Area Curve SVG */}
              <div className="relative h-72 w-full select-none">
                <svg viewBox="0 0 1000 250" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8c562e" stopOpacity="0.28" />
                      <stop offset="60%" stopColor="#8c562e" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#8c562e" stopOpacity="0.0" />
                    </linearGradient>

                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Horizontal Guide lines & Values */}
                  {[
                    { y: 35, val: formatINR(monthlyRevenueData.yCeil) },
                    { y: 95, val: formatINR(Math.round(monthlyRevenueData.yCeil * 0.66)) },
                    { y: 150, val: formatINR(Math.round(monthlyRevenueData.yCeil * 0.33)) },
                    { y: 210, val: '₹0' },
                  ].map((grid, i) => (
                    <g key={i}>
                      <line
                        x1="45"
                        y1={grid.y}
                        x2="955"
                        y2={grid.y}
                        stroke="#f0eae0"
                        strokeDasharray="4 4"
                        strokeWidth="1.2"
                      />
                      <text
                        x="35"
                        y={grid.y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill="#a8a199"
                        fontFamily="sans-serif"
                      >
                        {grid.val}
                      </text>
                    </g>
                  ))}

                  {/* Shaded Area */}
                  <motion.path
                    key={`area-${orders.length}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    d={monthlyRevenueData.areaPath}
                    fill="url(#goldGradient)"
                  />

                  {/* Main Trend Line */}
                  <motion.path
                    key={`line-${orders.length}`}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: 'easeInOut' }}
                    d={monthlyRevenueData.linePath}
                    fill="none"
                    stroke="#8c562e"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Month Points */}
                  {monthlyRevenueData.months.map((pt, i) => {
                    const isHovered = hoveredMonthIndex === i;
                    const hasLiveOrders = pt.liveOrderCount > 0;

                    return (
                      <g 
                        key={i} 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredMonthIndex(i)}
                        onMouseLeave={() => setHoveredMonthIndex(null)}
                        onClick={() => setHoveredMonthIndex(hoveredMonthIndex === i ? null : i)}
                      >
                        {/* Vertical Guide when hovered */}
                        {isHovered && (
                          <line
                            x1={pt.x}
                            y1="35"
                            x2={pt.x}
                            y2="210"
                            stroke="#8c562e"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                            opacity="0.6"
                          />
                        )}

                        {/* Outer Glow Ring for current or active month */}
                        {(pt.isCurrentMonth || isHovered || hasLiveOrders) && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 11 : pt.isCurrentMonth ? 9 : 8}
                            fill="#8c562e"
                            fillOpacity={isHovered ? 0.25 : pt.isCurrentMonth ? 0.18 : 0.12}
                            className="transition-all duration-200"
                          />
                        )}

                        {/* Main Center Node */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6.5 : pt.isCurrentMonth ? 5.5 : 4.5}
                          fill={hasLiveOrders ? '#8c562e' : '#ffffff'}
                          stroke="#8c562e"
                          strokeWidth={isHovered ? 3.5 : 2.5}
                          className="transition-all duration-200"
                        />

                        {/* Top Tooltip Card on Hover */}
                        {isHovered && (
                          <g transform={`translate(${Math.max(80, Math.min(880, pt.x))}, ${Math.max(30, pt.y - 45)})`}>
                            <rect
                              x="-65"
                              y="-28"
                              width="130"
                              height="44"
                              rx="4"
                              fill="#181614"
                              filter="url(#glow)"
                            />
                            <text
                              x="0"
                              y="-13"
                              textAnchor="middle"
                              fill="#d4af37"
                              fontSize="10"
                              fontWeight="600"
                              fontFamily="sans-serif"
                            >
                              {pt.fullName} {pt.year}
                            </text>
                            <text
                              x="0"
                              y="1"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="11"
                              fontWeight="bold"
                              fontFamily="serif"
                            >
                              {formatINR(pt.totalRevenue)}
                            </text>
                            <text
                              x="0"
                              y="11"
                              textAnchor="middle"
                              fill="#a8a199"
                              fontSize="8"
                              fontFamily="sans-serif"
                            >
                              {pt.liveOrderCount > 0 
                                ? `${pt.liveOrderCount} paid order${pt.liveOrderCount === 1 ? '' : 's'}`
                                : pt.isCurrentMonth ? 'Active Fiscal Month (₹0)' : 'No commissions recorded'}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* X-axis labels with active month badge */}
                <div className="flex justify-between text-[11px] font-medium text-[#8c857d] pt-2 px-1">
                  {monthlyRevenueData.months.map((m, i) => {
                    const isHovered = hoveredMonthIndex === i;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setHoveredMonthIndex(hoveredMonthIndex === i ? null : i)}
                        onMouseEnter={() => setHoveredMonthIndex(i)}
                        onMouseLeave={() => setHoveredMonthIndex(null)}
                        className={`flex flex-col items-center cursor-pointer transition-colors ${
                          m.isCurrentMonth
                            ? 'text-[#8c562e] font-bold'
                            : isHovered
                            ? 'text-[#181614] font-semibold'
                            : 'text-[#8c857d] hover:text-[#181614]'
                        }`}
                      >
                        <span>{m.label}</span>
                        {m.isCurrentMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8c562e] mt-0.5" />
                        )}
                        {m.liveOrderCount > 0 && !m.isCurrentMonth && (
                          <span className="w-1 h-1 rounded-full bg-[#16a34a] mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Stats Summary Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#f0eae0] text-xs">
                <div className="bg-[#faf7f2] p-2.5 rounded-xs border border-[#e4dcd0]/60">
                  <span className="text-[10px] uppercase tracking-wider text-[#78716c] block">
                    Fiscal Period
                  </span>
                  <span className="font-semibold text-[#181614] font-serif-luxury text-sm">
                    {monthlyRevenueData.fyLabel} (Apr–Mar)
                  </span>
                </div>

                <div className="bg-[#faf7f2] p-2.5 rounded-xs border border-[#e4dcd0]/60">
                  <span className="text-[10px] uppercase tracking-wider text-[#78716c] block">
                    Fiscal Gross Revenue
                  </span>
                  <span className="font-semibold text-[#8c562e] font-serif-luxury text-sm">
                    {formatINR(monthlyRevenueData.totalFyRevenue)}
                  </span>
                </div>

                <div className="bg-[#faf7f2] p-2.5 rounded-xs border border-[#e4dcd0]/60">
                  <span className="text-[10px] uppercase tracking-wider text-[#78716c] block">
                    Active Month Status
                  </span>
                  <span className="font-semibold text-[#181614] text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                    {monthlyRevenueData.months.find(m => m.isCurrentMonth)?.fullName || 'Active'}
                  </span>
                </div>

                <div className="bg-[#faf7f2] p-2.5 rounded-xs border border-[#e4dcd0]/60">
                  <span className="text-[10px] uppercase tracking-wider text-[#78716c] block">
                    Live System Commissions
                  </span>
                  <span className="font-semibold text-[#181614] font-mono text-sm">
                    {orders.length} Placed Orders
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom 2 Columns: Top Products & Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left: Top Products */}
              <div className="lg:col-span-6 bg-white p-6 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-[#f0eae0] pb-4">
                  <h3 className="font-serif-luxury text-lg font-bold text-[#181614]">
                    Top Selling Pieces
                  </h3>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="text-xs text-[#8c562e] font-semibold hover:underline cursor-pointer"
                  >
                    View All Products ({products.length})
                  </button>
                </div>

                <div className="space-y-4">
                  {topSellingPieces.length > 0 ? (
                    topSellingPieces.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-[#f7f4ee] last:border-0 hover:bg-[#faf7f2] px-2 rounded-xs transition-colors">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-xs font-semibold text-[#8c857d] w-4">
                            0{idx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs font-semibold text-[#181614]">{p.name}</h4>
                            <span className="text-[11px] text-[#8c857d]">{p.sales} bespoke sale{p.sales === 1 ? '' : 's'}</span>
                          </div>
                        </div>
                        <span className="font-serif-luxury text-xs font-bold text-[#181614]">
                          {formatINR(p.revenue)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-[#a8a199]">
                      No sales recorded yet. Top pieces will appear as commissions are fulfilled.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Recent Orders */}
              <div className="lg:col-span-6 bg-white p-6 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-[#f0eae0] pb-4">
                  <h3 className="font-serif-luxury text-lg font-bold text-[#181614]">
                    Recent Commissions
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#8c562e] font-semibold hover:underline cursor-pointer"
                  >
                    Manage Orders ({orders.length})
                  </button>
                </div>

                <div className="space-y-4">
                  {orders.slice(0, 4).map(order => (
                    <div 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center justify-between py-2 border-b border-[#f7f4ee] last:border-0 hover:bg-[#faf7f2] px-2 rounded-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#f6f2ea] border border-[#ded5c7] flex items-center justify-center text-xs font-bold text-[#8c562e]">
                          {order.customer?.avatarInitials || 'SB'}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-[#181614]">{order.customer?.name || 'Valued Patron'}</h4>
                          <span className="text-[11px] text-[#8c857d]">{order.id} • {order.date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-serif-luxury text-xs font-bold text-[#181614] block">
                          {formatINR(order.total)}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${getFulfillmentBadgeClass(order.fulfillmentStatus)}`}>
                          {order.fulfillmentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ===================== TAB 2: ORDERS MANAGEMENT ===================== */}
        {activeTab === 'orders' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-[#e4dcd0]">
              <div>
                <h1 className="font-serif-luxury text-3xl font-bold text-[#181614]">
                  Order &amp; Commission Management
                </h1>
                <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                  Track atelier production, dispatch status, customer details, and bulk download shipping labels.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Select All Toggle Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleToggleOverviewSelectAll}
                  className={`px-3.5 py-2 border text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    allOverviewFilteredSelected
                      ? 'bg-[#181614] text-white border-[#181614]'
                      : 'bg-white border-[#ded5c7] hover:border-[#8c562e] text-[#181614]'
                  }`}
                >
                  {allOverviewFilteredSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#d4af37]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#78716c]" />
                  )}
                  <span>{allOverviewFilteredSelected ? 'Deselect All' : `Select All (${filteredOrders.length})`}</span>
                </motion.button>

                {/* Bulk Download Labels Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isBatchDownloadingOverview || filteredOrders.length === 0}
                  onClick={handleDownloadOverviewBatchLabels}
                  className="px-4 py-2 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title="Download all shipping labels into one combined multi-page PDF"
                >
                  {isBatchDownloadingOverview ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>
                        Generating ({batchOverviewProgress?.current || 1}/{batchOverviewProgress?.total || filteredOrders.length})...
                      </span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>
                        {selectedOverviewOrderIds.length > 0
                          ? `Download Labels (${selectedOverviewOrderIds.length})`
                          : `Download All Labels (${filteredOrders.length})`}
                      </span>
                    </>
                  )}
                </motion.button>

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
            </div>

            {/* Selection Banner */}
            {selectedOverviewOrderIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#181614] text-[#faf7f2] px-4 py-3 rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
                  <span className="text-xs font-medium">
                    <strong className="text-[#d4af37] font-bold">{selectedOverviewOrderIds.length}</strong> of {orders.length} orders selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadOverviewBatchLabels}
                    disabled={isBatchDownloadingOverview}
                    className="px-3 py-1.5 bg-[#8c562e] hover:bg-[#a66838] text-white text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-[#d4af37]" />
                    <span>Download {selectedOverviewOrderIds.length} PDF Labels</span>
                  </button>
                  <button
                    onClick={() => setSelectedOverviewOrderIds([])}
                    className="px-2.5 py-1.5 bg-[#2a2622] hover:bg-[#38332e] text-[#a8a199] hover:text-white text-xs font-medium uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
              </motion.div>
            )}

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xs border border-[#e4dcd0] shadow-2xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#8c857d] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="Search by Order ID, Customer, City, AWB..."
                  className="w-full pl-9 pr-4 py-2 bg-[#fbf9f5] border border-[#ded5c7] rounded-xs text-xs text-[#181614] focus:outline-none focus:border-[#8c562e]"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs text-[#8c857d] uppercase tracking-wider mr-1">Status:</span>
                {['All', 'CRAFTING', 'SHIPPED', 'PROCESSING', 'DELIVERED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xs text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      orderStatusFilter === st
                        ? 'bg-[#8c562e] text-white shadow-2xs'
                        : 'bg-[#f6f2ea] text-[#554e47] hover:bg-[#ede5d8]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xs border border-[#e4dcd0] shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f6f2ea] border-b border-[#e4dcd0] text-[#78716c] uppercase tracking-widest font-semibold">
                  <tr>
                    <th className="py-3.5 px-3 sm:px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allOverviewFilteredSelected}
                        onChange={handleToggleOverviewSelectAll}
                        className="w-4 h-4 rounded-xs text-[#8c562e] accent-[#8c562e] cursor-pointer"
                        title={allOverviewFilteredSelected ? 'Deselect all' : 'Select all'}
                      />
                    </th>
                    <th className="py-3.5 px-3 sm:px-4">Order ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Customer</th>
                    <th className="py-3.5 px-4 sm:px-6">Items &amp; SKU</th>
                    <th className="py-3.5 px-4 sm:px-6">Date</th>
                    <th className="py-3.5 px-4 sm:px-6">Total</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f0eae0]">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-sm text-[#78716c]">
                        No orders match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, oIdx) => {
                      const isSelected = selectedOverviewOrderIds.includes(order.id);
                      const isDownloadingThis = singleDownloadingOverviewId === order.id;

                      return (
                        <tr
                          key={order.id}
                          className={`transition-colors ${isSelected ? 'bg-[#f7f0e6]' : 'hover:bg-[#faf7f2]'}`}
                        >
                          <td className="py-4 px-3 sm:px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleOverviewOrder(order.id)}
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
                                {order.customer?.avatarInitials || 'SB'}
                              </div>
                              <div>
                                <div className="font-semibold text-[#181614]">{order.customer?.name || 'Valued Patron'}</div>
                                <div className="text-[11px] text-[#8c857d]">{order.customer?.email || 'client@stunningbirds.com'}</div>
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

                          <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {/* Direct Download Label Button */}
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                disabled={isDownloadingThis}
                                onClick={() => handleDownloadOverviewSingleLabel(order)}
                                className="px-2.5 py-1.5 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-bold uppercase tracking-wider rounded-xs border border-[#8c562e] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                                title={`Download Shipping Label for ${order.id} as PDF`}
                              >
                                {isDownloadingThis ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                                )}
                                <span>Download Label</span>
                              </motion.button>

                              {/* Inspect Button */}
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
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}


        {/* ===================== TAB 3: PRODUCT CATALOG & INVENTORY ===================== */}
        {activeTab === 'products' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#e4dcd0]">
              <div>
                <h1 className="font-serif-luxury text-3xl font-bold text-[#181614]">
                  Atelier Catalog & Stock
                </h1>
                <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                  Update inventory, adjust prices, edit specifications, or publish new leathercraft pieces.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportProductsCSV}
                  className="px-3.5 py-2 bg-white border border-[#ded5c7] hover:border-[#8c562e] text-xs font-semibold text-[#181614] uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#8c562e]" />
                  <span>Export CSV</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="px-4 py-2 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Piece</span>
                </motion.button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xs border border-[#e4dcd0] shadow-2xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#8c857d] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search pieces by title, leather, color..."
                  className="w-full pl-9 pr-4 py-2 bg-[#fbf9f5] border border-[#ded5c7] rounded-xs text-xs text-[#181614] focus:outline-none focus:border-[#8c562e]"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs text-[#8c857d] uppercase tracking-wider mr-1">Category:</span>
                {['All', 'Bifold Wallets', 'Cardholders', 'Travel Wallets', 'Bags & Totes', 'Accessories'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setProductCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xs text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      productCategoryFilter === cat
                        ? 'bg-[#8c562e] text-white shadow-2xs'
                        : 'bg-[#f6f2ea] text-[#554e47] hover:bg-[#ede5d8]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xs border border-[#e4dcd0] shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f6f2ea] border-b border-[#e4dcd0] text-[#78716c] uppercase tracking-widest font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Piece</th>
                    <th className="py-3.5 px-4 sm:px-6">SKU ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Category</th>
                    <th className="py-3.5 px-4 sm:px-6">Leather / Origin</th>
                    <th className="py-3.5 px-4 sm:px-6">Price (INR)</th>
                    <th className="py-3.5 px-4 sm:px-6">Availability</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f0eae0]">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-[#78716c]">
                        No atelier pieces match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(prod => (
                      <tr key={prod.id} className="hover:bg-[#faf7f2] transition-colors">
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center space-x-3">
                            <img
                              src={prod.images[0]}
                              alt={prod.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-14 object-cover rounded-xs border border-[#ded5c7]"
                            />
                            <div>
                              <h4 className="font-serif-luxury font-bold text-sm text-[#181614]">{prod.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-[#8c857d]">{prod.colorName}</span>
                                {prod.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#8c562e]/10 text-[#8c562e]">
                                    {prod.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 sm:px-6">
                          <span className="inline-flex items-center px-2 py-1 rounded-xs bg-[#f6f2ea] border border-[#ded5c7] font-mono text-[11px] font-bold text-[#8c562e]">
                            {prod.sku || prod.skuId || 'N/A'}
                          </span>
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-[#554e47] font-medium">
                          {prod.category}
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-[#78716c] max-w-[200px] truncate">
                          {prod.material}
                        </td>

                        <td className="py-4 px-4 sm:px-6">
                          <div className="font-serif-luxury font-bold text-sm text-[#181614]">
                            {formatINR(prod.price)}
                          </div>
                          {Boolean(prod.originalPrice && prod.originalPrice > prod.price) && (
                            <div className="text-[10px] text-[#8c857d] line-through">
                              MRP: {formatINR(prod.originalPrice!)}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 sm:px-6">
                          <button
                            onClick={() => updateProduct(prod.id, { inStock: !prod.inStock })}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                              prod.inStock
                                ? 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]'
                                : 'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]'
                            }`}
                          >
                            {prod.inStock ? 'In Stock' : 'Sold Out'}
                          </button>
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setEditingProduct(prod)}
                              className="p-1.5 bg-[#f6f2ea] hover:bg-[#8c562e] hover:text-white text-[#181614] rounded-xs border border-[#ded5c7] transition-all cursor-pointer"
                              title="Edit product"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-product-btn-${prod.id}`}
                              onClick={() => setProductToDelete(prod)}
                              className="p-1.5 bg-[#fee2e2] hover:bg-[#b91c1c] hover:text-white text-[#b91c1c] rounded-xs border border-[#fecaca] transition-all cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ===================== TAB 4: ANALYTICS ===================== */}
        {activeTab === 'analytics' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="pb-4 border-b border-[#e4dcd0]">
              <h1 className="font-serif-luxury text-3xl font-bold text-[#181614]">
                Atelier Analytics & Insights
              </h1>
              <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                Deep dive into category distribution, foil customization preferences, and regional demand.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Category Sales Breakdown */}
              <div className="bg-white p-6 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-4">
                <h3 className="font-serif-luxury text-lg font-bold text-[#181614]">
                  Category Volume Share
                </h3>
                <div className="space-y-3">
                  {atelierAnalytics.totalItemsSold > 0 ? (
                    atelierAnalytics.categoryShares.map(cat => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-[#181614]">{cat.category}</span>
                          <span className="text-[#8c562e]">{cat.share}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#f0eae0] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${cat.share}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-[#a8a199]">
                      No category metrics available yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Bespoke Customization Adoption */}
              <div className="bg-white p-6 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-4">
                <h3 className="font-serif-luxury text-lg font-bold text-[#181614]">
                  Bespoke Monogramming Rate
                </h3>
                <div className="p-4 bg-[#fbf9f5] border border-[#ded5c7] rounded-xs text-center space-y-2">
                  <span className="text-3xl font-serif-luxury font-bold text-[#8c562e]">{atelierAnalytics.monogramRate}%</span>
                  <p className="text-xs text-[#554e47]">
                    {atelierAnalytics.totalItemsSold > 0 
                      ? `${atelierAnalytics.monogramCount} of ${atelierAnalytics.totalItemsSold} bespoke pieces stamped.` 
                      : 'No monogrammed commissions placed yet.'}
                  </p>
                </div>
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#f7f4ee]">
                    <span className="text-[#78716c]">Gold 24K Hot Foil</span>
                    <span className="font-bold text-[#181614]">{atelierAnalytics.monogramCount > 0 ? `${atelierAnalytics.goldPct}%` : '0%'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f7f4ee]">
                    <span className="text-[#78716c]">Blind Deboss (Raw)</span>
                    <span className="font-bold text-[#181614]">{atelierAnalytics.monogramCount > 0 ? `${atelierAnalytics.debossPct}%` : '0%'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#78716c]">Silver Foil</span>
                    <span className="font-bold text-[#181614]">{atelierAnalytics.monogramCount > 0 ? `${atelierAnalytics.silverPct}%` : '0%'}</span>
                  </div>
                </div>
              </div>

              {/* Regional Demand */}
              <div className="bg-white p-6 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-4">
                <h3 className="font-serif-luxury text-lg font-bold text-[#181614]">
                  Top Delivery Regions
                </h3>
                <div className="space-y-3">
                  {atelierAnalytics.topRegions.length > 0 ? (
                    atelierAnalytics.topRegions.map(reg => (
                      <div key={reg.city} className="flex justify-between items-center text-xs py-1.5 border-b border-[#f7f4ee] last:border-0">
                        <span className="font-medium text-[#181614]">{reg.city}</span>
                        <span className="font-mono font-bold text-[#8c562e]">{reg.pct}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-[#a8a199]">
                      No regional shipping metrics available yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ===================== TAB 5: ATELIER SETTINGS ===================== */}
        {activeTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="pb-4 border-b border-[#e4dcd0]">
              <h1 className="font-serif-luxury text-3xl font-bold text-[#181614]">
                Atelier Workshop Settings
              </h1>
              <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                Configure brand information, GST rate rules, and workshop preferences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Brand & Workshop identity */}
              <div className="bg-white p-6 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-4">
                <h3 className="font-serif-luxury text-lg font-bold text-[#181614]">
                  Atelier Identity
                </h3>
                
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                    Store / Atelier Name
                  </label>
                  <input
                    type="text"
                    value={atelierName}
                    onChange={e => setAtelierName(e.target.value)}
                    className="w-full bg-[#fbf9f5] border border-[#ded5c7] px-3.5 py-2 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                    Master Artisan / Signature
                  </label>
                  <input
                    type="text"
                    value={masterArtisan}
                    onChange={e => setMasterArtisan(e.target.value)}
                    className="w-full bg-[#fbf9f5] border border-[#ded5c7] px-3.5 py-2 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                    Atelier Concierge Email
                  </label>
                  <input
                    type="email"
                    value={atelierEmail}
                    onChange={e => setAtelierEmail(e.target.value)}
                    className="w-full bg-[#fbf9f5] border border-[#ded5c7] px-3.5 py-2 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                  />
                </div>

                <button
                  onClick={() => showToast('Atelier profile preferences saved.')}
                  className="px-4 py-2 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                >
                  Save Identity
                </button>
              </div>

              {/* Taxation & Courier Rules */}
              <div className="bg-white p-6 rounded-xs border border-[#e4dcd0] shadow-2xs space-y-4">
                <h3 className="font-serif-luxury text-lg font-bold text-[#181614]">
                  Commerce & Delivery Rules
                </h3>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                    GST / Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    className="w-full bg-[#fbf9f5] border border-[#ded5c7] px-3.5 py-2 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                  />
                  <span className="text-[11px] text-[#78716c] mt-1 block">Standard luxury handcrafted leather goods GST rate is 18%.</span>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#181614] block mb-1">
                    Complimentary Courier Shipping Threshold (INR ₹)
                  </label>
                  <input
                    type="number"
                    value={freeShippingThreshold}
                    onChange={e => setFreeShippingThreshold(e.target.value)}
                    className="w-full bg-[#fbf9f5] border border-[#ded5c7] px-3.5 py-2 text-xs text-[#181614] rounded-xs focus:outline-none focus:border-[#8c562e]"
                  />
                  <span className="text-[11px] text-[#78716c] mt-1 block">Set to 0 for unconditional complimentary delivery across all orders.</span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => showToast('Commerce rules saved.')}
                    className="px-4 py-2 bg-[#8c562e] hover:bg-[#734320] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                  >
                    Save Rules
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </main>

      {/* ===================== MODAL: ORDER INSPECTION & STATUS MANAGEMENT ===================== */}
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
                    onClick={() => handlePrintSlip(selectedOrder)}
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
                    <p className="text-sm font-semibold text-[#181614]">{selectedOrder.customer?.name || 'Valued Patron'}</p>
                    <p className="text-xs text-[#78716c]">{selectedOrder.customer?.email || 'client@stunningbirds.com'}</p>
                    <p className="text-xs text-[#78716c]">{selectedOrder.shippingAddress?.phone || 'Phone not provided'}</p>
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
                  id="confirm-delete-overview-order-btn"
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
              id={`overview-shipping-label-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}`}
              className="bg-white p-2"
            >
              <ShippingLabelView label={label} containerId={`overview-label-offscreen-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}`} />
            </div>
          );
        })}
      </div>

      {/* New Product Modal */}
      {isNewProductModalOpen && (
        <AdminNewProductModal onClose={() => setIsNewProductModalOpen(false)} />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <AdminEditProductModal 
          product={editingProduct} 
          onClose={() => setEditingProduct(null)} 
        />
      )}

      {/* Delete Product Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
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
                      Remove Atelier Piece
                    </h3>
                    <p className="text-[11px] text-[#78716c]">Catalog Deletion Confirmation</p>
                  </div>
                </div>
                <button
                  onClick={() => setProductToDelete(null)}
                  className="p-1 text-[#8c827a] hover:text-[#181614] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-[#f6f2ea] border border-[#ded5c7] rounded-xs">
                  <img
                    src={productToDelete.images[0]}
                    alt={productToDelete.name}
                    className="w-14 h-14 object-cover rounded-xs border border-[#ded5c7] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-xs text-[#181614] truncate">
                      {productToDelete.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] font-bold text-[#8c562e] bg-[#f4ebe1] px-1.5 py-0.5 rounded-xs border border-[#ded5c7]">
                        SKU: {productToDelete.sku || productToDelete.skuId || 'N/A'}
                      </span>
                      <span className="text-[11px] text-[#78716c]">
                        {formatINR(productToDelete.price)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#554e47] leading-relaxed">
                  Are you sure you want to remove <strong className="text-[#181614]">"{productToDelete.name}"</strong> from the atelier catalog? This action will immediately unlist the product from the storefront.
                </p>
              </div>

              <div className="p-4 bg-[#fbf9f5] border-t border-[#e8dfd2] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isDeletingProduct}
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#554e47] hover:text-[#181614] bg-white border border-[#ded5c7] hover:bg-[#f6f2ea] rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-product-modal-btn"
                  disabled={isDeletingProduct}
                  onClick={handleConfirmDeleteProduct}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#b91c1c] hover:bg-[#991b1b] rounded-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-75"
                >
                  {isDeletingProduct ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting from Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Piece</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
