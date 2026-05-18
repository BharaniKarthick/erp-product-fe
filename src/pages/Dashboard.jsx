import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import {
  Add,
  ArrowForward,
  ChevronLeft,
  ChevronRight,
  Download,
  FilterList,
  Help,
  Inventory,
  Notifications,
  Print,
  Schedule,
  Search,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material';
import { dashboardService } from '../api/dashboardService';

const Dashboard = () => {

  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  // All hooks must be called before any early returns
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const {
    kpiMetrics,
    lowInventoryAlerts = [],
    negativeProfitAlerts = [],
    delayedOrderAlerts = [],
    recentOrders = [],
  } = dashboardData || {};

  const financials = useMemo(() => {
    const revenue = Number(kpiMetrics?.totalRevenue ?? 0);
    const cost = Number(kpiMetrics?.totalCost ?? 0);
    const netProfit = Number(kpiMetrics?.netProfit ?? revenue - cost);
    const marginPct = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
    return { revenue, cost, netProfit, marginPct };
  }, [kpiMetrics]);

  const getOrderDateTimestamp = (order) => {
    const rawDate = order?.orderDate || order?.createdAt || order?.createdDate || order?.updatedAt;
    if (!rawDate) return 0;
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const formatOrderDate = (order) => {
    const timestamp = getOrderDateTimestamp(order);
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  };

  const getQuotationAmount = (order) => {
    const explicitTotal = Number(order?.totalAmount ?? 0);
    if (explicitTotal > 0) return explicitTotal;

    const unitQuoted = Number(order?.quotedPrice ?? order?.unitPrice ?? 0);
    const qty = Number(order?.orderQuantity ?? order?.quantity ?? 0);
    return unitQuoted * qty;
  };

  const filteredRecentOrders = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    const baseRows = !term
      ? recentOrders
      : recentOrders.filter((order) =>
      [order?.orderNumber, order?.customerName, order?.productType].some((field) =>
        String(field || '').toLowerCase().includes(term)
      )
    );

    return [...baseRows].sort((a, b) => getOrderDateTimestamp(b) - getOrderDateTimestamp(a));
  }, [recentOrders, globalSearch]);

  const fetchDashboardData = async () => {
    try {
      const data = await dashboardService.getSummary();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Early returns now happen after all hooks
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
      <Box>
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2.5 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#181c22' }}>
              Production Dashboard
            </Typography>
            <Typography sx={{ color: '#4b5563', mt: 0.5, fontSize: 14 }}>
              Real-time overview of printing operations and financial health.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Download />} sx={{ textTransform: 'none', fontWeight: 700, px: 2.5, py: 0.9 }}>
              Export Report
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/orders/new')} sx={{ textTransform: 'none', fontWeight: 700, px: 2.5, py: 0.9 }}>
              New Production Order
            </Button>
          </Stack>
        </Box>

        {/* Attention Needed Section */}
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
              🔥 Attention Needed
            </Typography>
            <Chip label="High Priority" size="small" sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: 10 }} />
          </Stack>
          <Grid container spacing={2}>
            {/* Low Inventory Alert */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderLeft: '4px solid #f59e0b', borderRadius: '12px', height: '100%', bgcolor: '#fff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Inventory sx={{ color: '#c2410c', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>Low Inventory</Typography>
                  </Stack>
                  <Chip label={`${lowInventoryAlerts.length} Items`} size="small" sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: 10 }} />
                </Stack>
                <Stack spacing={0.8} sx={{ mb: 1.2 }}>
                  {(lowInventoryAlerts.length ? lowInventoryAlerts : [{ itemName: 'No low inventory', currentQuantity: '-' }])
                    .slice(0, 2)
                    .map((alert, index) => (
                      <Stack key={`${alert.itemName || 'inv'}-${index}`} direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: 12, color: '#181c22' }}>{alert.itemName}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
                          {alert.currentQuantity} left
                        </Typography>
                      </Stack>
                    ))}
                </Stack>
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => navigate('/inventory?lowStock=true&source=dashboard')}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: 11, fontWeight: 800, color: '#005ab4' }}
                >
                  Open Inventory
                  <ArrowForward sx={{ fontSize: 12 }} />
                </Link>
              </Paper>
            </Grid>

            {/* Negative Profit Alert */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderLeft: '4px solid #dc2626', borderRadius: '12px', height: '100%', bgcolor: '#fff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <TrendingDown sx={{ color: '#dc2626', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>Negative Profit</Typography>
                  </Stack>
                  <Chip label={`${negativeProfitAlerts.length} Orders`} size="small" sx={{ bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: 10 }} />
                </Stack>
                <Stack spacing={0.8} sx={{ mb: 1.2 }}>
                  {(negativeProfitAlerts.length ? negativeProfitAlerts : [{ orderNumber: 'No loss orders', profitLoss: 0 }])
                    .slice(0, 2)
                    .map((alert, index) => (
                      <Stack key={`${alert.orderNumber || 'loss'}-${index}`} direction="row" justifyContent="space-between">
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#005ab4', fontWeight: 600 }}>
                          {alert.orderNumber}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
                          -${Math.abs(Number(alert.profitLoss || 0)).toFixed(2)}
                        </Typography>
                      </Stack>
                    ))}
                </Stack>
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => navigate('/orders?quickFilter=NEGATIVE_PROFIT&source=dashboard')}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: 11, fontWeight: 800, color: '#005ab4' }}
                >
                  View Details
                  <ArrowForward sx={{ fontSize: 12 }} />
                </Link>
              </Paper>
            </Grid>

            {/* Delayed Orders Alert */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderLeft: '4px solid #dc2626', borderRadius: '12px', height: '100%', bgcolor: '#fff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Schedule sx={{ color: '#dc2626', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>Delayed Orders</Typography>
                  </Stack>
                  <Chip label={`${delayedOrderAlerts.length} Delayed`} size="small" sx={{ bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: 10 }} />
                </Stack>
                <Typography sx={{ fontSize: 12, color: '#6b7280', mb: 0.8 }}>
                  {delayedOrderAlerts.length} critical orders have exceeded their expected shipping date.
                </Typography>
                <Stack spacing={0.4} sx={{ mb: 1.2 }}>
                  {(delayedOrderAlerts.length ? delayedOrderAlerts : [{ orderNumber: 'No delays', daysLate: 0 }])
                    .slice(0, 2)
                    .map((alert, index) => (
                      <Link
                        key={`${alert.orderNumber || 'delay'}-${index}`}
                        component="button"
                        underline="hover"
                        sx={{ fontSize: 11, color: '#005ab4', fontWeight: 600, textAlign: 'left' }}
                      >
                        {alert.orderNumber} ({alert.daysLate || 0} days late)
                      </Link>
                    ))}
                </Stack>
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => navigate('/orders?quickFilter=DELAYED&source=dashboard')}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: 11, fontWeight: 800, color: '#005ab4' }}
                >
                  View Production Queue
                  <ArrowForward sx={{ fontSize: 12 }} />
                </Link>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* KPI Cards - CSS Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mb: 3, minWidth: 0 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #edf0f6', position: 'relative', overflow: 'hidden', minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
              <Avatar sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', width: 36, height: 36 }}>
                <FilterList fontSize="small" />
              </Avatar>
              <Chip label="+12.5%" size="small" sx={{ bgcolor: '#ecfdf3', color: '#15803d', fontWeight: 700, fontSize: 10 }} />
            </Stack>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.8 }}>Total Orders</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, mb: 0.3 }}>
              {Number(kpiMetrics?.totalOrders || 0).toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#8b95a7' }}>
              Active queue: {Number(kpiMetrics?.activeOrders || 0)} orders
            </Typography>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #edf0f6', minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
              <Avatar sx={{ bgcolor: '#f1f5f9', color: '#475569', width: 36, height: 36 }}>
                <Inventory fontSize="small" />
              </Avatar>
              <Chip label="+4.2%" size="small" sx={{ bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: 10 }} />
            </Stack>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.8 }}>Total Cost</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, mb: 0.3 }}>
              ${financials.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#8b95a7' }}>Material and labor overhead</Typography>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #edf0f6', minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
              <Avatar sx={{ bgcolor: '#dbeafe', color: '#1e3a8a', width: 36, height: 36 }}>
                <TrendingUp fontSize="small" />
              </Avatar>
              <Chip label="+18.3%" size="small" sx={{ bgcolor: '#ecfdf3', color: '#15803d', fontWeight: 700, fontSize: 10 }} />
            </Stack>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.8 }}>Revenue</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, mb: 0.3 }}>
              ${financials.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#8b95a7' }}>Projection driven by active contracts</Typography>
          </Paper>

          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #0669cc',
              bgcolor: '#005ab4',
              color: '#fff',
              minWidth: 0,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
              <Avatar sx={{ bgcolor: '#ffffff24', color: '#fff', width: 36, height: 36 }}>
                <TrendingUp fontSize="small" />
              </Avatar>
              <Chip label="Optimal" size="small" sx={{ bgcolor: '#ffffff2b', color: '#fff', fontWeight: 700, fontSize: 10 }} />
            </Stack>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#dbeafe', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.8 }}>Net Profit</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, mb: 0.3 }}>
              ${financials.netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
            <Box sx={{ mt: 1, height: 3, borderRadius: 999, bgcolor: '#ffffff33' }}>
              <Box
                sx={{
                  width: `${Math.min(Math.max(financials.marginPct, 0), 100)}%`,
                  height: '100%',
                  bgcolor: '#fff',
                  borderRadius: 999,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 10, color: '#cfe7ff', mt: 0.6 }}>{financials.marginPct}% margin</Typography>
          </Paper>
        </Box>

        {/* Recent Orders Table */}
        <Paper sx={{ borderRadius: '12px', border: '1px solid #dce2ef', overflow: 'hidden' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.4, py: 1.8, borderBottom: '1px solid #dce2ef' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Recent Orders</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 12, color: '#64748b' }}>Filtered by: Last 7 Days</Typography>
              <IconButton size="small">
                <FilterList fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f2f4fd' }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>
                    Order ID
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>
                    Order Number
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>
                    Customer Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: '#64748b' }} align="right">
                    Quotation
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>
                    Order Date
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecentOrders.length > 0 ? (
                  filteredRecentOrders.slice(0, 6).map((order, index) => {
                    const status = String(order?.status || '').toUpperCase();
                    const statusConfig =
                      status === 'RUNNING'
                        ? { bg: '#dbeafe', color: '#1d4ed8', label: 'In Production' }
                        : status === 'COMPLETED'
                          ? { bg: '#dcfce7', color: '#15803d', label: 'Completed' }
                          : status === 'READY_TO_SHIP'
                            ? { bg: '#dbeafe', color: '#1e3a8a', label: 'Ready to Ship' }
                            : { bg: '#fff7ed', color: '#c2410c', label: status || 'Unknown' };

                    return (
                      <TableRow
                        key={`${order?.orderNumber || 'ord'}-${index}`}
                        hover
                        onClick={() => order?.id && navigate(`/orders/${order.id}`)}
                        sx={{ cursor: order?.id ? 'pointer' : 'default', '&:hover': { bgcolor: '#f9f9ff' } }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#005ab4', fontSize: 13 }}>
                          {order?.id || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                          {order?.orderNumber || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ color: '#4b5563', fontSize: 13, fontWeight: 600 }}>{order?.customerName || 'Unknown'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', fontSize: 13 }}>
                          ${Math.abs(getQuotationAmount(order)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={statusConfig.label}
                            sx={{
                              bgcolor: statusConfig.bg,
                              color: statusConfig.color,
                              fontWeight: 800,
                              fontSize: 10,
                              textTransform: 'uppercase',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#4b5563', fontSize: 13 }}>
                          {formatOrderDate(order)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#6b7280' }}>
                      No recent orders available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.4, py: 1.2, borderTop: '1px solid #dce2ef', bgcolor: '#f8fafe' }}>
            <Typography sx={{ fontSize: 12, color: '#667085' }}>
              Showing {Math.min(filteredRecentOrders.length, 6)} of {recentOrders.length} orders
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" disabled>
                <ChevronLeft fontSize="small" />
              </IconButton>
              <IconButton size="small">
                <ChevronRight fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>

        {/* Footer */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" sx={{ mt: 4, color: '#6b7280', gap: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
            <Typography sx={{ fontSize: 12 }}>System status: All production lines active</Typography>
          </Stack>
          <Stack direction="row" spacing={2.4}>
            <Link component="button" underline="hover" sx={{ fontSize: 12, color: '#6b7280' }}>
              Documentation
            </Link>
            <Link component="button" underline="hover" sx={{ fontSize: 12, color: '#6b7280' }}>
              Privacy Policy
            </Link>
            <Link component="button" underline="hover" sx={{ fontSize: 12, color: '#6b7280' }}>
              API Keys
            </Link>
          </Stack>
        </Stack>

        {/* FAB */}
        <IconButton
          onClick={() => navigate('/orders/new')}
          sx={{
            position: 'fixed',
            right: 32,
            bottom: 32,
            bgcolor: '#bd5700',
            color: '#fff',
            width: 56,
            height: 56,
            boxShadow: '0 14px 26px -14px rgba(189,87,0,0.8)',
            '&:hover': { bgcolor: '#964400', transform: 'scale(1.05)' },
            '&:active': { transform: 'scale(0.95)' },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <Print />
        </IconButton>

        <Divider sx={{ mt: 1, opacity: 0 }} />
      </Box>
    </Box>
  );
};

export default Dashboard;
