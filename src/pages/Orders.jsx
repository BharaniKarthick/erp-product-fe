import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Search,
  ChevronRight,
  Edit,
  MoreHoriz,
  FilterList,
  TrendingUp,
  TrendingDown,
  Help,
  Notifications,
} from '@mui/icons-material';
import { orderService } from '../api/orderService';

const normalizeOrdersResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.orders)) return payload.orders;
  return [];
};

const ORDER_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'In Production', label: 'In Production' },
  { value: 'Quality Check (QC)', label: 'Quality Check (QC)' },
  { value: 'Ready for Dispatch', label: 'Ready for Dispatch' },
  { value: 'Dispatched', label: 'Dispatched' },
  { value: 'Completed', label: 'Completed' },
  { value: 'On Hold', label: 'On Hold' },
];

const Orders = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('ALL');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusChangeNotes, setStatusChangeNotes] = useState('');
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchTransactions();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterFromUrl = String(params.get('quickFilter') || '').toUpperCase();
    const searchFromUrl = params.get('search') || '';

    setActiveQuickFilter(filterFromUrl || 'ALL');

    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
    }
  }, [location.search]);

  const fetchOrders = async () => {
    try {

      const data = await orderService.getAllOrders();
      const normalized = normalizeOrdersResponse(data).filter(Boolean);
      setOrders(normalized);
    } catch (err) {
      setError('Failed to fetch orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await orderService.getAllOrderTransactions();
      const normalized = Array.isArray(data) ? data : [];
      setTransactions(normalized);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      // Don't set error state here as it affects the entire page
    }
  };

  const handleStatusChangeClick = (orderId, currentStatus) => {
    setSelectedOrderId(orderId);
    setSelectedOrderStatus(currentStatus);
    setNewStatus('');
    setStatusChangeNotes('');
    setStatusDialogOpen(true);
  };

  const handleStatusChangeConfirm = async () => {
    if (!selectedOrderId || !newStatus) {
      return;
    }
    
    try {
      setStatusChanging(true);
      await orderService.changeOrderStatus(selectedOrderId, newStatus, statusChangeNotes);
      
      // Refresh orders and transactions
      await fetchOrders();
      await fetchTransactions();
      
      setStatusDialogOpen(false);
      setSelectedOrderId(null);
      setSelectedOrderStatus(null);
      setNewStatus('');
      setStatusChangeNotes('');
    } catch (err) {
      console.error('Failed to change order status:', err);
      setError('Failed to change order status');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleStatusDialogClose = () => {
    setStatusDialogOpen(false);
    setSelectedOrderId(null);
    setSelectedOrderStatus(null);
    setNewStatus('');
    setStatusChangeNotes('');
  };

  const normalizeNumber = (value) => Number(value ?? 0);

  const getQuantity = (order) =>
    normalizeNumber(order?.quantity ?? order?.orderQuantity ?? order?.totalQuantity ?? 0);

  const isDelayedOrder = (order) => {

    const requestedDeliveryDate = order?.requestedDeliveryDate || order?.requiredDate;
    if (!requestedDeliveryDate) return false;

    const requestedDate = new Date(requestedDeliveryDate);
    if (Number.isNaN(requestedDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestedDate.setHours(0, 0, 0, 0);
    return today > requestedDate;
  };

  const filteredOrders = useMemo(() => {
    const base = (Array.isArray(orders) ? orders : []).filter(
      (order) =>
        String(order?.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(order?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(order?.productType || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (activeQuickFilter === 'EXPEDITED') {
      return base.filter((order) =>
        String(order.priority || '').toUpperCase().includes('URGENT') ||
        String(order.priority || '').toUpperCase().includes('HIGH')
      );
    }

    if (activeQuickFilter === 'NEGATIVE_PROFIT') {

      return base.filter((order) => {
        const actualProdCost = normalizeNumber(order?.actualLaborCost) + normalizeNumber(order?.actualMaterialCost);
        const quotationAmount = normalizeNumber(order?.totalAmount);
        return actualProdCost > quotationAmount;
      });
    }

    if (activeQuickFilter === 'DELAYED') {
      return base.filter((order) => isDelayedOrder(order));
    }

    return base;
  }, [orders, searchTerm, activeQuickFilter]);

  const stats = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getQuotationAmount = (order) => {
      const explicitTotal = normalizeNumber(order?.totalAmount);
      if (explicitTotal > 0) return explicitTotal;

      const unitQuoted = normalizeNumber(order?.quotedPrice ?? order?.unitPrice);
      const qty = normalizeNumber(order?.orderQuantity ?? order?.quantity);
      return unitQuoted * qty;
    };

    const getActualProdCost = (order) =>
      normalizeNumber(order?.actualLaborCost) + normalizeNumber(order?.actualMaterialCost);

    const totalOpenOrders = safeOrders.filter((order) => {
      const status = String(order?.status || '').toUpperCase();
      return !['COMPLETED', 'CANCELLED', 'CANCELED'].includes(status);
    }).length;

    const totalLossOrders = safeOrders.filter((order) => getActualProdCost(order) > getQuotationAmount(order)).length;

    const deliveryDueThisMonth = safeOrders.filter((order) => {
      const rawDate = order?.requestedDeliveryDate || order?.requiredDate || order?.dueDate;
      if (!rawDate) return false;
      const dueDate = new Date(rawDate);
      if (Number.isNaN(dueDate.getTime())) return false;
      return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    }).length;

    const totalEstimatedProdCost = safeOrders.reduce(
      (sum, order) => sum + normalizeNumber(order?.estimatedLaborCost) + normalizeNumber(order?.estimatedMaterialCost),
      0
    );
    const totalActualProdCost = safeOrders.reduce((sum, order) => sum + getActualProdCost(order), 0);
    const totalQuotationAmount = safeOrders.reduce((sum, order) => sum + getQuotationAmount(order), 0);

    const estimatedVsActualDelta = totalEstimatedProdCost - totalActualProdCost;

    const averageMargin = totalQuotationAmount > 0
      ? ((totalQuotationAmount - totalActualProdCost) / totalQuotationAmount) * 100
      : 0;

    return {
      totalOpenOrders,
      totalLossOrders,
      deliveryDueThisMonth,
      estimatedVsActualDelta,
      averageMargin,
    };
  }, [orders]);

  const getStatusVisual = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'RUNNING') {
      return { bg: '#dbeafe', color: '#1d4ed8', dot: '#2563eb', label: 'Running' };
    }
    if (normalized === 'COMPLETED') {
      return { bg: '#dcfce7', color: '#15803d', dot: '#16a34a', label: 'Completed' };
    }
    if (normalized === 'PENDING') {
      return { bg: '#f1f5f9', color: '#475569', dot: '#64748b', label: 'Pending' };
    }
    return { bg: '#fee2e2', color: '#b91c1c', dot: '#dc2626', label: normalized || 'Unknown' };
  };

  const getCustomerInitials = (name) =>
    String(name || 'NA')
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 2.5,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          bgcolor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ maxWidth: 520 }}>
          <Typography sx={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 800, color: '#64748b', letterSpacing: '0.12em' }}>
            Dashboard / Production Orders
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.8 }}>
            Production Orders
          </Typography>
          <Typography sx={{ color: '#64748b', mt: 0.6 }}>
            Manage and track your active print jobs across all departments.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton sx={{ bgcolor: '#f8fafc' }}>
            <Notifications fontSize="small" />
          </IconButton>
          <IconButton sx={{ bgcolor: '#f8fafc' }}>
            <Help fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/orders/new')}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              px: 2.6,
              py: 1.1,
              borderRadius: 2,
            }}
          >
            Create New Order
          </Button>
        </Stack>
      </Paper>

      <Box
        sx={{
          mb: 2.5,
          display: 'grid',
          gap: 2,
          width: '100%',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
        }}
      >
        <Paper sx={{ p: 2.4, borderRadius: 2.5, border: '1px solid #e2e8f0', minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Total Open Orders
          </Typography>
          <Typography sx={{ fontSize: 32, fontWeight: 900, mt: 1.2 }}>
            {stats.totalOpenOrders}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.4, borderRadius: 2.5, border: '1px solid #e2e8f0', minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Total Loss Orders
          </Typography>
          <Typography sx={{ fontSize: 32, fontWeight: 900, mt: 1.2, color: '#b91c1c' }}>
            {stats.totalLossOrders}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.4, borderRadius: 2.5, border: '1px solid #e2e8f0', minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Delivery Due This Month
          </Typography>
          <Typography sx={{ fontSize: 32, fontWeight: 900, mt: 1.2 }}>
            {stats.deliveryDueThisMonth}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.4, borderRadius: 2.5, border: '1px solid #e2e8f0', minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Estimated - Actual Cost
          </Typography>
          <Typography
            sx={{
              fontSize: 32,
              fontWeight: 900,
              mt: 1.2,
              color: stats.estimatedVsActualDelta > 0 ? '#15803d' : stats.estimatedVsActualDelta < 0 ? '#b91c1c' : '#0f172a',
            }}
          >
            {`${stats.estimatedVsActualDelta >= 0 ? '+' : '-'}$${Math.abs(stats.estimatedVsActualDelta).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.6 }}>
            Total estimated production cost minus total actual production cost
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.4, borderRadius: 2.5, border: '1px solid #0b63bf', bgcolor: '#1275e2', color: '#fff', minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#dbeafe', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Average Margin
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.2 }}>
            <Typography sx={{ fontSize: 32, fontWeight: 900 }}>
              {stats.averageMargin.toFixed(1)}%
            </Typography>
            {stats.averageMargin >= 0 ? <TrendingUp /> : <TrendingDown />}
          </Stack>
          <Typography sx={{ fontSize: 11, color: '#dbeafe', mt: 0.6 }}>
            Based on quotation amount and actual production cost
          </Typography>
        </Paper>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', mb: 2.5 }}>
        <Box sx={{ px: 2.2, py: 1.6, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search orders, customers, or SKUs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: { xs: 220, md: 360 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button size="small" startIcon={<FilterList />} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Filters
            </Button>
            <Button
              size="small"
              variant={activeQuickFilter === 'ALL' ? 'contained' : 'text'}
              onClick={() => setActiveQuickFilter('ALL')}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 99 }}
            >
              All Orders
            </Button>
            <Button
              size="small"
              variant={activeQuickFilter === 'NEGATIVE_PROFIT' ? 'contained' : 'text'}
              onClick={() => setActiveQuickFilter('NEGATIVE_PROFIT')}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 99 }}
            >
              Negative Profit
            </Button>
            <Button
              size="small"
              variant={activeQuickFilter === 'DELAYED' ? 'contained' : 'text'}
              onClick={() => setActiveQuickFilter('DELAYED')}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 99 }}
            >
              Delayed
            </Button>
          </Stack>
          <IconButton size="small">
            <MoreHoriz fontSize="small" />
          </IconButton>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>

                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Order Number</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Product Type</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fabric Type</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }} align="center">Order Quantity</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Order Date</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Requested Delivery Date</TableCell>

                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }} align="right">Estimated Prod Cost</TableCell>

                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }} align="right">Actual Prod Cost</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }} align="right">Quotation Amount</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Status</TableCell>
                <TableCell sx={{ width: 52 }} />
              </TableRow>
            </TableHead>
            <TableBody>

              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => {
                  const visual = getStatusVisual(order.status);
                  const orderId = order?.id;
                  const rowKey = orderId || order?.orderNumber || `row-${index}`;
                  
                  // Format date helper
                  const formatDate = (dateStr) => {
                    if (!dateStr) return '-';
                    const date = new Date(dateStr);
                    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  };
                  
                  const formatCurrency = (amount) => {
                    const value = normalizeNumber(amount);
                    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  };
                  
                  return (
                    <TableRow
                      key={rowKey}
                      hover
                      onClick={() => {
                        if (orderId) navigate(`/orders/${orderId}`);
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, fontSize: 12, color: '#0f172a' }}>
                          {order.id || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, fontSize: 12 }}>
                          {order.orderNumber || `#${order.id}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                          {order.customerName || 'Unknown Customer'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                          {order.productType || order.productName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                          {order.fabricType || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                          {getQuantity(order).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                          {formatDate(order.orderDate || order.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                          {formatDate(order.requestedDeliveryDate || order.expectedShippingDate)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                          {formatCurrency(normalizeNumber(order.estimatedLaborCost) + normalizeNumber(order.estimatedMaterialCost))}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                          {formatCurrency(normalizeNumber(order.actualLaborCost) + normalizeNumber(order.actualMaterialCost))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(order.totalAmount || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>

                        <Chip
                          size="small"
                          label={visual.label}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChangeClick(orderId, order.status);
                          }}
                          sx={{
                            bgcolor: visual.bg,
                            color: visual.color,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            '&:hover': {
                              opacity: 0.8,
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.3} justifyContent="flex-end">
                          <IconButton
                            disabled={!orderId}
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (orderId) navigate(`/orders/${orderId}/edit`);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            disabled={!orderId}
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (orderId) navigate(`/orders/${orderId}`);
                            }}
                          >
                            <ChevronRight fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 6, color: '#64748b' }}>
                    {searchTerm ? 'No orders found matching your search' : 'No orders available'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ px: 2.2, py: 1.6, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            Showing {Math.min(filteredOrders.length, 10)} of {filteredOrders.length} orders
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" disabled>
              Previous
            </Button>
            <Button size="small" variant="contained">1</Button>
            <Button size="small" variant="outlined">2</Button>
            <Button size="small" variant="outlined">3</Button>
            <Button size="small" variant="outlined">Next</Button>
          </Stack>
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', mt: 2.5 }}>
        <Box sx={{ px: 2.2, py: 1.6, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>Order Transaction History</Typography>
          <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: '#94a3b8' }}>
            All Transactions Across Orders
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Order ID</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Customer</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Transaction Type</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Description</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Quantity / Duration</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Updated By</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }} align="right">Updated At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((transaction) => {
                  const transactionDate = transaction.transactionDate ? new Date(transaction.transactionDate) : null;
                  const timeString = transactionDate
                    ? `${transactionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${transactionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                    : 'N/A';
                  
                  // Color code transaction types
                  const getTransactionTypeColor = (type) => {
                    const typeMap = {
                      'MATERIAL_DEDUCTION': { bg: '#fef3c7', color: '#92400e' },
                      'LABOR_ENTRY': { bg: '#dbeafe', color: '#1e3a8a' },
                      'MACHINE_ALLOCATION': { bg: '#e0e7ff', color: '#3730a3' },
                      'STATUS_CHANGE': { bg: '#dcfce7', color: '#166534' },
                      'STOCK_ADJUSTMENT': { bg: '#f5d5ff', color: '#6b21a8' },
                    };
                    return typeMap[type] || { bg: '#f3f4f6', color: '#374151' };
                  };
                  
                  const typeColor = getTransactionTypeColor(transaction.transactionType);
                  
                  return (
                    <TableRow key={`transaction-${transaction.id}`} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, fontSize: 12 }}>
                        {transaction.orderNumber || `#${transaction.orderId}`}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                          {transaction.customerName || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={transaction.transactionType?.replace(/_/g, ' ')} 
                          sx={{ 
                            bgcolor: typeColor.bg, 
                            color: typeColor.color, 
                            fontWeight: 700,
                            fontSize: '0.75rem'
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: 12, color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {transaction.actionDescription || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: 12, color: '#475569' }}>
                          {transaction.quantityOrDuration || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: '#e2e8f0', color: '#334155' }}>
                            {transaction.userName?.split('')[0]?.toUpperCase() || 'S'}
                          </Avatar>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                            {transaction.userName || 'System'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, color: '#64748b' }}>
                        {timeString}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#64748b' }}>
                    No transactions available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onClose={handleStatusDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
          Change Order Status
        </DialogTitle>
        <DialogContent sx={{ py: 2.5 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Current Status
              </Typography>
              <Chip
                label={selectedOrderStatus}
                size="small"
                sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 700 }}
              />
            </Box>
            
            <FormControl fullWidth>
              <InputLabel id="new-status-label" sx={{ fontSize: 12, fontWeight: 700 }}>
                New Status
              </InputLabel>
              <Select
                labelId="new-status-label"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="New Status"
                size="small"
              >
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Notes (Optional)"
              placeholder="Add notes about this status change..."
              value={statusChangeNotes}
              onChange={(e) => setStatusChangeNotes(e.target.value)}
              multiline
              rows={3}
              size="small"
              fullWidth
              variant="outlined"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1.5 }}>
          <Button onClick={handleStatusDialogClose} variant="outlined" disabled={statusChanging}>
            Cancel
          </Button>
          <Button
            onClick={handleStatusChangeConfirm}
            variant="contained"
            disabled={!newStatus || statusChanging}
          >
            {statusChanging ? 'Updating...' : 'Change Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Orders;
