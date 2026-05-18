import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  AccountBalanceWallet,
  ChevronLeft,
  ChevronRight,
  Download,
  FilterList,
  Inventory,
  Payments,
  Receipt,
  Search,
  ShoppingCart,
  Stars,
  TrendingUp,
  Tune,
  WarningAmber,
} from '@mui/icons-material';
import { reportsService } from '../api/reportsService';
import { orderService } from '../api/orderService';
import { inventoryService } from '../api/inventoryService';

const normalizeNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  `$${normalizeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatShortDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeOrdersResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.orders)) return payload.orders;
  return [];
};

const Reports = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('WEEKLY');
  const [department, setDepartment] = useState('ALL');

  const [showTxDetails, setShowTxDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [inventoryItemsLive, setInventoryItemsLive] = useState([]);
  const [recentInventoryTransactions, setRecentInventoryTransactions] = useState([]);
  const [orderTransactions, setOrderTransactions] = useState([]);

  useEffect(() => {

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {

        const [ordersResult, financialResult, inventoryResult, inventoryItemsResult, inventoryTxResult, orderTxResult] = await Promise.allSettled([
          orderService.getAllOrders(),
          reportsService.getFinancialReport(),
          reportsService.getInventoryReport(),
          inventoryService.getAllItems(),
          inventoryService.getRecentTransactions(),
          orderService.getAllOrderTransactions(),
        ]);

        if (ordersResult.status === 'fulfilled') {
          setOrders(normalizeOrdersResponse(ordersResult.value).filter(Boolean));
        } else {
          setOrders([]);
        }

        if (inventoryResult.status === 'fulfilled') {
          setInventoryReport(inventoryResult.value || null);
        }

        if (inventoryItemsResult.status === 'fulfilled') {
          setInventoryItemsLive(Array.isArray(inventoryItemsResult.value) ? inventoryItemsResult.value.filter(Boolean) : []);
        } else {
          setInventoryItemsLive([]);
        }

        if (inventoryTxResult.status === 'fulfilled') {
          setRecentInventoryTransactions(Array.isArray(inventoryTxResult.value) ? inventoryTxResult.value.filter(Boolean) : []);
        } else {
          setRecentInventoryTransactions([]);
        }

        if (orderTxResult.status === 'fulfilled') {
          setOrderTransactions(Array.isArray(orderTxResult.value) ? orderTxResult.value.filter(Boolean) : []);
        } else {
          setOrderTransactions([]);
        }

        if (ordersResult.status === 'rejected' && financialResult.status === 'rejected' && inventoryResult.status === 'rejected') {
          setError('Failed to load reports data.');
        }
      } catch (err) {
        setError('Failed to load reports data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    if (department === 'ALL') return orders;
    const lower = String(department).toLowerCase();
    return orders.filter((order) =>
      String(order?.productType || order?.productName || '').toLowerCase().includes(lower)
    );
  }, [department, orders]);

  const totals = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        const qty = normalizeNumber(order?.orderQuantity ?? order?.quantity ?? 0);
        const unitPrice = normalizeNumber(order?.quotedPrice ?? order?.unitPrice ?? 0);
        const revenue = normalizeNumber(order?.targetRevenue || order?.totalRevenue || qty * unitPrice);
        const material = normalizeNumber(order?.estimatedMaterialCost || order?.totalMaterialCost);
        const labor = normalizeNumber(order?.estimatedLaborCost || order?.totalLaborCost);
        const machine = normalizeNumber(order?.totalMachineCost || order?.machineCost);
        const explicitTotalCost = normalizeNumber(order?.totalActualCost || order?.totalCosts || order?.cost);
        const cost = explicitTotalCost > 0 ? explicitTotalCost : material + labor + machine;

        acc.revenue += revenue;
        acc.cost += cost;
        acc.material += material;
        acc.labor += labor;
        acc.machine += machine;
        return acc;
      },
      { revenue: 0, cost: 0, material: 0, labor: 0, machine: 0 }
    );
  }, [filteredOrders]);

  const totalProfit = totals.revenue - totals.cost;
  const margin = totals.revenue > 0 ? (totalProfit / totals.revenue) * 100 : 0;

  const runningCostVsRevenue = useMemo(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      const aDate = new Date(a?.orderDate || a?.createdAt || a?.updatedAt || 0).getTime();
      const bDate = new Date(b?.orderDate || b?.createdAt || b?.updatedAt || 0).getTime();
      return aDate - bDate;
    });

    const expectedRevenue = sorted.reduce((sum, order) => {
      const qty = normalizeNumber(order?.orderQuantity ?? order?.quantity ?? 0);
      const unitPrice = normalizeNumber(order?.quotedPrice ?? order?.unitPrice ?? 0);
      return sum + normalizeNumber(order?.targetRevenue || order?.totalRevenue || qty * unitPrice);
    }, 0);

    const allowedOrderIds = new Set(
      sorted
        .map((order) => order?.id ?? order?.orderId)
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value))
    );
    const allowedOrderNumbers = new Set(
      sorted
        .map((order) => order?.orderNumber)
        .filter(Boolean)
        .map((value) => String(value))
    );

    const transactionSeries = orderTransactions
      .filter((tx) => {
        if (!allowedOrderIds.size && !allowedOrderNumbers.size) return true;
        const txOrderId = tx?.orderId ?? tx?.order?.id;
        const txOrderNumber = tx?.orderNumber ?? tx?.order?.orderNumber;
        return (
          (txOrderId !== null && txOrderId !== undefined && allowedOrderIds.has(String(txOrderId))) ||
          (txOrderNumber && allowedOrderNumbers.has(String(txOrderNumber)))
        );
      })
      .map((tx) => {
        const costImpact = normalizeNumber(tx?.costImpact ?? tx?.impactAmount ?? tx?.totalCost ?? tx?.amount);
        const timestampRaw = tx?.transactionDate || tx?.timestamp || tx?.dateTime || tx?.createdAt || tx?.updatedAt;
        const timestamp = new Date(timestampRaw || 0).getTime();
        const txType = String(tx?.transactionType || tx?.actionType || 'COST_UPDATE').toUpperCase();
        const txDesc = String(tx?.actionDescription || tx?.description || txType).trim();
        return {
          costImpact: Math.max(0, costImpact),
          timestamp: Number.isFinite(timestamp) ? timestamp : 0,
          timestampRaw,
          txType,
          txDesc,
          label: tx?.orderNumber || txType || 'TX',
        };
      })
      .filter((tx) => tx.costImpact > 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    let cumulativeCost = 0;
    let points = transactionSeries.map((tx, idx) => {
      cumulativeCost += tx.costImpact;
      return {
        x: idx,
        label: tx.label || `TX-${idx + 1}`,
        runningCost: cumulativeCost,
        expectedRevenue,
      };
    });

    // Fallback for environments without transaction-history cost impact.
    if (!points.length) {
      cumulativeCost = 0;
      points = sorted.map((order, idx) => {
        const material = normalizeNumber(order?.estimatedMaterialCost || order?.totalMaterialCost);
        const labor = normalizeNumber(order?.estimatedLaborCost || order?.totalLaborCost);
        const machine = normalizeNumber(order?.totalMachineCost || order?.machineCost);
        const explicitTotalCost = normalizeNumber(order?.totalActualCost || order?.totalCosts || order?.cost);
        const orderCost = explicitTotalCost > 0 ? explicitTotalCost : material + labor + machine;

        cumulativeCost += orderCost;
        return {
          x: idx,
          label: order?.orderNumber || `ORD-${idx + 1}`,
          runningCost: cumulativeCost,
          expectedRevenue,
          txType: 'ORDER_COST',
          txDesc: order?.description || 'Order cost snapshot',
          timestampRaw: order?.orderDate || order?.updatedAt || order?.createdAt || null,
        };
      });
    }

    const pointsWithDisplay = points.map((point) => ({
      ...point,
      timeLabel: formatShortDateTime(point.timestampRaw),
      txLabel: point.txType || point.label || 'TX',
      txDetail: point.txDesc || point.label || 'Transaction',
      deltaCost: normalizeNumber(point.costImpact || 0),
    }));

    const maxY = Math.max(
      1,
      expectedRevenue,
      ...pointsWithDisplay.map((point) => point.runningCost)
    );

    return {
      points: pointsWithDisplay,
      expectedRevenue,
      maxY,
      isOverBudget: cumulativeCost > expectedRevenue,
    };
  }, [filteredOrders, orderTransactions]);

  const inventoryUsage = useMemo(() => {
    const txUsageByItemId = recentInventoryTransactions.reduce((acc, tx) => {
      const itemId = tx?.inventoryItemId ?? tx?.itemId ?? tx?.inventoryId ?? tx?.id;
      if (itemId === undefined || itemId === null) return acc;

      const rawQty = normalizeNumber(tx?.quantity ?? tx?.adjustmentQuantity ?? tx?.qty ?? 0);
      if (rawQty >= 0) return acc;

      const key = String(itemId);
      acc.set(key, (acc.get(key) || 0) + Math.abs(rawQty));
      return acc;
    }, new Map());

    const liveRows = inventoryItemsLive
      .map((item) => {
        const itemId = String(item?.id ?? item?.inventoryItemId ?? item?.itemId ?? '');
        const name = String(item?.name || item?.itemName || item?.materialName || '').trim();
        const current = normalizeNumber(item?.currentStock ?? item?.currentQuantity ?? item?.availableQuantity);
        const usedFromTx = txUsageByItemId.get(itemId) || 0;

        // Utilization relative to observed movement + current stock.
        const denominator = usedFromTx + Math.max(0, current);
        const pct = denominator > 0 ? (usedFromTx / denominator) * 100 : 0;

        return { name, used: usedFromTx, current, pct };
      })
      .filter((row) => row.name)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);

    if (liveRows.length) return liveRows;

    const rows = Array.isArray(inventoryReport?.items)
      ? inventoryReport.items
      : Array.isArray(inventoryReport?.data)
      ? inventoryReport.data
      : [];

    const normalizedRows = rows
      .map((item) => {
        const name = String(item?.name || item?.itemName || item?.materialName || '').trim();
        const current = normalizeNumber(item?.currentStock ?? item?.currentQuantity);
        const max = normalizeNumber(item?.maxStock ?? item?.capacity ?? item?.openingStock);
        const used = Math.max(0, max - current);
        const pct = max > 0 ? (used / max) * 100 : 0;
        return { name, used, current, pct };
      })
      .filter((row) => row.name)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);

    if (normalizedRows.length) return normalizedRows;

    return [];
  }, [inventoryItemsLive, recentInventoryTransactions, inventoryReport]);

  const tableRows = useMemo(() => filteredOrders.slice(0, 12), [filteredOrders]);

  const getOrderEntityId = (order) => order?.id ?? order?.orderId ?? null;
  const getOrderId = (order) => getOrderEntityId(order) ?? order?.orderNumber;
  const getOrderNumber = (order) =>
    order?.orderNumber || (getOrderId(order) ? `ORD-${getOrderId(order)}` : 'N/A');

  const getOrderRevenue = (order) => {
    const qty = normalizeNumber(order?.orderQuantity ?? order?.quantity ?? 0);
    const unitPrice = normalizeNumber(order?.quotedPrice ?? order?.unitPrice ?? 0);
    return normalizeNumber(order?.targetRevenue || order?.totalRevenue || qty * unitPrice);
  };

  const getOrderMaterialCost = (order) => normalizeNumber(order?.materialCost || order?.totalMaterialCost || order?.estimatedMaterialCost);
  const getOrderLaborCost = (order) => normalizeNumber(order?.laborCost || order?.totalLaborCost || order?.estimatedLaborCost);
  const getOrderMachineCost = (order) => normalizeNumber(order?.machineCost || order?.totalMachineCost);

  const getOrderProfit = (order) => {
    const providedProfit = order?.profitLoss;
    if (providedProfit !== undefined && providedProfit !== null) {
      return normalizeNumber(providedProfit);
    }
    return getOrderRevenue(order) - (getOrderMaterialCost(order) + getOrderLaborCost(order) + getOrderMachineCost(order));
  };

  const handleOpenOrder = (order) => {
    const orderId = getOrderEntityId(order);
    if (!orderId) return;
    navigate(`/reports/orders/${orderId}`);
  };

  return (
    <Box
      sx={{
        px: { xs: 0.5, md: 1.2 },
        pb: { xs: 2.5, md: 4 },
        color: '#181c22',
      }}
    >

      <Paper
        sx={{
          p: { xs: 1.7, md: 2.2 },
          mb: 2.1,
          borderRadius: 3,
          border: '1px solid #dfe4ee',
          background: 'linear-gradient(140deg, #ffffff 0%, #f5f8ff 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', xl: 'flex-start' }} spacing={{ xs: 1.5, xl: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0, pt: { xl: 0.2 } }}>
            <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
              Performance Reports
            </Typography>
            <Typography sx={{ color: '#5a6473', mt: 0.45, fontSize: 13, maxWidth: 520 }}>
              Detailed analysis of production costs and order profitability.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="flex-end" sx={{ width: { xs: '100%', xl: 'auto' }, flexShrink: 0 }}>
            <Paper sx={{ p: 0.45, borderRadius: 1.75, bgcolor: '#e9eef9', border: '1px solid #d4dceb', alignSelf: { xs: 'stretch', sm: 'center' } }}>
              <Stack direction="row" spacing={0.45} justifyContent="space-between" sx={{ width: '100%' }}>
                {['WEEKLY', 'MONTHLY', 'CUSTOM'].map((item) => (
                  <Button
                    key={item}
                    size="small"
                    onClick={() => setPeriod(item)}
                    sx={{
                      minWidth: { xs: 0, sm: 76 },
                      flex: { xs: 1, sm: '0 0 auto' },
                      borderRadius: 1.25,
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: 11,
                      py: 0.45,
                      bgcolor: period === item ? '#fff' : 'transparent',
                      color: period === item ? '#0f172a' : '#667185',
                      boxShadow: period === item ? '0 1px 3px rgba(15,23,42,0.1)' : 'none',
                    }}
                  >
                    {item[0]}{item.slice(1).toLowerCase()}
                  </Button>
                ))}
              </Stack>
            </Paper>

            <Button variant="contained" startIcon={<Download />} sx={{ px: 1.9, py: 0.85, minWidth: { xs: '100%', sm: 132 }, fontSize: 12, fontWeight: 800, textTransform: 'none', alignSelf: { xs: 'stretch', sm: 'center' }, boxShadow: '0 10px 18px rgba(8,115,223,0.22)' }}>
              Export CSV
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <CircularProgress />
        </Paper>
      ) : (
        <>

          <Grid container spacing={1.2} sx={{ mb: 2.2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', height: '100%', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
                <CardContent sx={{ p: 1.7, '&:last-child': { pb: 1.7 } }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Total Orders</Typography>
                      <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.25, lineHeight: 1.05 }}>{filteredOrders.length.toLocaleString()}</Typography>
                      <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.55, color: '#059669' }}>
                        <TrendingUp sx={{ fontSize: 14 }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 800 }}>+12.5% vs last month</Typography>
                      </Stack>
                    </Box>
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.25, bgcolor: '#eaf2ff', display: 'grid', placeItems: 'center' }}>
                      <ShoppingCart sx={{ color: '#1967d2', fontSize: 20 }} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', height: '100%', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
                <CardContent sx={{ p: 1.7, '&:last-child': { pb: 1.7 } }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Total Revenue</Typography>
                      <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.25, lineHeight: 1.05 }}>{formatCurrency(totals.revenue)}</Typography>
                      <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.55, color: '#059669' }}>
                        <TrendingUp sx={{ fontSize: 14 }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 800 }}>+8.2% vs last month</Typography>
                      </Stack>
                    </Box>
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.25, bgcolor: '#e8fbf3', display: 'grid', placeItems: 'center' }}>
                      <Payments sx={{ color: '#059669', fontSize: 20 }} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', height: '100%', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
                <CardContent sx={{ p: 1.7, '&:last-child': { pb: 1.7 } }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Total Cost</Typography>
                      <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.25, lineHeight: 1.05 }}>{formatCurrency(totals.cost)}</Typography>
                      <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.55, color: '#ba1a1a' }}>
                        <TrendingUp sx={{ fontSize: 14 }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 800 }}>+5.1% material hike</Typography>
                      </Stack>
                    </Box>
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.25, bgcolor: '#feefef', display: 'grid', placeItems: 'center' }}>
                      <Receipt sx={{ color: '#b42318', fontSize: 20 }} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2.5, background: 'linear-gradient(135deg, #005ab4 0%, #0873df 100%)', color: '#fff', height: '100%', boxShadow: '0 8px 22px rgba(8,115,223,0.26)' }}>
                <CardContent sx={{ p: 1.7, '&:last-child': { pb: 1.7 } }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#dbeafe' }}>Total Profit</Typography>
                      <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.25, lineHeight: 1.05 }}>{formatCurrency(totalProfit)}</Typography>
                      <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.55, color: '#dbeafe' }}>
                        <Stars sx={{ fontSize: 14 }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 800 }}>
                          Margin: {margin.toFixed(1)}%
                        </Typography>
                      </Stack>
                    </Box>
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.25, bgcolor: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center' }}>
                      <AccountBalanceWallet sx={{ color: '#fff', fontSize: 20 }} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2.8 }}>
            <Grid item xs={12} xl={4}>
              <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0', height: '100%', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Inventory Usage Trends</Typography>
                  <Chip size="small" label="Live Stock" sx={{ fontWeight: 800, bgcolor: '#ffe8d8', color: '#7c2d12' }} />
                </Stack>

                <Stack spacing={2.3}>
                  {inventoryUsage.map((item, index) => {
                    const barColor = index === 2 ? '#dc2626' : index === 1 ? '#5f78a3' : '#1275e2';
                    return (
                      <Box key={`${item.name}-${index}`}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.name}</Typography>
                          <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                            {item.used.toLocaleString()} used / {item.current.toLocaleString()} remaining
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, Math.max(0, item.pct))}
                          sx={{
                            height: 8,
                            borderRadius: 999,
                            bgcolor: '#e7edf6',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 999,
                              bgcolor: barColor,
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>

                <Paper sx={{ mt: 2.2, p: 1.7, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f5f8ff', position: 'relative', overflow: 'hidden' }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <WarningAmber sx={{ color: '#b45309' }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#92400e' }}>
                        Critical Low Alert
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: '#334155', mt: 0.2 }}>
                        Supplier options are available for urgent replenishment within 24 hours.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Paper>
            </Grid>

            <Grid item xs={12} xl={8}>
              <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0', height: '100%', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Running Cost vs Expected Revenue</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.2 }}>
                      Revenue = quoted price (fixed), Cost = current accumulated cost
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={2}>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1275e2' }} />
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>Expected Revenue</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>Running Cost</Typography>
                    </Stack>
                  </Stack>
                </Stack>

                {runningCostVsRevenue.points.length ? (
                  <Box sx={{ px: 1.2, pb: 0.5 }}>
                    <Box sx={{ position: 'relative', height: 260, border: '1px solid #eef2f7', borderRadius: 2, bgcolor: '#fbfdff' }}>
                      <svg width="100%" height="100%" viewBox="0 0 760 260" preserveAspectRatio="none">
                        {[0, 1, 2, 3, 4].map((tick) => {
                          const y = 18 + ((212 / 4) * tick);
                          return <line key={tick} x1="40" y1={y} x2="740" y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />;
                        })}

                        {(() => {
                          const points = runningCostVsRevenue.points;
                          const xForIndex = (index) => 40 + ((700 * index) / Math.max(1, points.length - 1));
                          const yForValue = (value) => 230 - ((212 * value) / runningCostVsRevenue.maxY);

                          const revenueLineY = yForValue(runningCostVsRevenue.expectedRevenue);
                          const revenueLine = `M 40 ${revenueLineY} L 740 ${revenueLineY}`;

                          const costPolyline = points
                            .map((point, index) => `${xForIndex(index)},${yForValue(point.runningCost)}`)
                            .join(' ');

                          return (
                            <>
                              <path d={revenueLine} stroke="#1275e2" strokeWidth="2.5" fill="none" />
                              <polyline points={costPolyline} stroke="#ef4444" strokeWidth="2.5" fill="none" />

                              {points.map((point, index) => (
                                <g key={`cost-dot-${point.label}-${index}`}>
                                  <circle
                                    cx={xForIndex(index)}
                                    cy={yForValue(point.runningCost)}
                                    r="2.8"
                                    fill="#ef4444"
                                  >
                                    <title>{`${point.txLabel} | ${point.txDetail} | +${formatCurrency(point.deltaCost)} | Running: ${formatCurrency(point.runningCost)} | ${point.timeLabel}`}</title>
                                  </circle>
                                </g>
                              ))}

                              {points.map((point, index) => {
                                const isMajorTick =
                                  index === 0 ||
                                  index === points.length - 1 ||
                                  (points.length > 4 && index % Math.ceil(points.length / 4) === 0);
                                if (!isMajorTick) return null;
                                return (
                                <text
                                  key={`x-label-${point.label}-${index}`}
                                  x={xForIndex(index)}
                                  y="248"
                                  fontSize="8"
                                  textAnchor="middle"
                                  fill="#64748b"
                                >
                                  {point.timeLabel}
                                </text>
                                );
                              })}

                              {runningCostVsRevenue.isOverBudget ? (
                                <text x="742" y={Math.max(14, revenueLineY - 6)} fontSize="10" fill="#b91c1c" textAnchor="end">
                                  Loss risk: cost crossed revenue
                                </text>
                              ) : null}
                            </>
                          );
                        })()}
                      </svg>
                    </Box>

                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.1 }}>
                      <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                        Expected Revenue: {formatCurrency(runningCostVsRevenue.expectedRevenue)}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: runningCostVsRevenue.isOverBudget ? '#b91c1c' : '#166534', fontWeight: 800 }}>
                        {runningCostVsRevenue.isOverBudget ? 'Over budget (loss risk)' : 'Within budget'}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                      <Typography sx={{ fontSize: 10, color: '#64748b' }}>
                        Hover a red point for transaction + value details.
                      </Typography>
                      <Button size="small" onClick={() => setShowTxDetails((prev) => !prev)} sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700 }}>
                        {showTxDetails ? 'Hide Transactions' : 'Show Transactions'}
                      </Button>
                    </Stack>

                    {showTxDetails ? (
                      <Stack spacing={0.5} sx={{ mt: 0.8, maxHeight: 96, overflowY: 'auto', pr: 0.4 }}>
                        {runningCostVsRevenue.points.map((point, idx) => (
                          <Typography key={`tx-item-${idx}`} sx={{ fontSize: 10, color: '#475569' }}>
                            {`${idx + 1}. ${point.timeLabel} - ${point.txLabel}: +${formatCurrency(point.deltaCost)} | Running ${formatCurrency(point.runningCost)}`}
                          </Typography>
                        ))}
                      </Stack>
                    ) : null}
                  </Box>
                ) : (
                  <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center', color: '#64748b', fontSize: 13 }}>
                    Not enough order data to render running trend.
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
            <Box sx={{ px: 1.8, py: 1.3, borderBottom: '1px solid #edf2f7', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Order-wise Profit Breakdown</Typography>
                <Typography sx={{ mt: 0.25, color: '#64748b', fontSize: 11 }}>
                  Click any order row to open the in-depth order workspace.
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.55}>
                <Button size="small" variant="outlined" sx={{ minWidth: 30, px: 0.45, py: 0.25 }}>
                  <Search sx={{ fontSize: 16 }} />
                </Button>
                <Button size="small" variant="outlined" sx={{ minWidth: 30, px: 0.45, py: 0.25 }}>
                  <Tune sx={{ fontSize: 16 }} />
                </Button>
                <Button size="small" variant="outlined" sx={{ minWidth: 30, px: 0.45, py: 0.25 }}>
                  <FilterList sx={{ fontSize: 16 }} />
                </Button>
              </Stack>
            </Box>

            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.8 } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Order ID</TableCell>
                    <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Customer Name</TableCell>
                    <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Mat. Cost</TableCell>
                    <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Labor Cost</TableCell>
                    <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Machine Cost</TableCell>
                    <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Revenue</TableCell>
                    <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Final Profit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.length ? (
                    tableRows.map((order, index) => {
                      const profit = getOrderProfit(order);
                      const clickable = Boolean(getOrderEntityId(order));
                      return (
                        <TableRow
                          key={`${getOrderId(order) || index}`}
                          hover
                          onClick={() => clickable && handleOpenOrder(order)}
                          sx={{ cursor: clickable ? 'pointer' : 'default' }}
                        >
                          <TableCell sx={{ fontWeight: 800, color: '#1967d2', fontSize: 12 }}>{getOrderNumber(order)}</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{order?.customerName || 'Unknown Customer'}</TableCell>
                          <TableCell align="right" sx={{ color: '#475569', fontSize: 12 }}>{formatCurrency(getOrderMaterialCost(order))}</TableCell>
                          <TableCell align="right" sx={{ color: '#475569', fontSize: 12 }}>{formatCurrency(getOrderLaborCost(order))}</TableCell>
                          <TableCell align="right" sx={{ color: '#475569', fontSize: 12 }}>{formatCurrency(getOrderMachineCost(order))}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 12 }}>{formatCurrency(getOrderRevenue(order))}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={`${profit >= 0 ? '+' : '-'}${formatCurrency(Math.abs(profit))}`}
                              sx={{
                                height: 22,
                                '& .MuiChip-label': { px: 0.9, fontSize: 11 },
                                fontWeight: 800,
                                color: profit >= 0 ? '#166534' : '#b91c1c',
                                bgcolor: profit >= 0 ? '#dcfce7' : '#fee2e2',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#64748b', fontSize: 12 }}>
                        No orders found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={0.8} sx={{ px: 1.8, py: 1, borderTop: '1px solid #edf2f7', bgcolor: '#f8fafc' }}>
              <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                Showing 1-{tableRows.length} of {filteredOrders.length} transactions
              </Typography>
              <Stack direction="row" spacing={0.4} alignItems="center">
                <Button size="small" sx={{ minWidth: 26, px: 0.35 }}>
                  <ChevronLeft fontSize="small" />
                </Button>
                <Chip label="1" size="small" sx={{ height: 22, bgcolor: '#005ab4', color: '#fff', fontWeight: 800, borderRadius: 1, '& .MuiChip-label': { px: 0.8, fontSize: 11 } }} />
                <Chip label="2" size="small" sx={{ height: 22, bgcolor: '#e2e8f0', color: '#334155', fontWeight: 700, borderRadius: 1, '& .MuiChip-label': { px: 0.8, fontSize: 11 } }} />
                <Chip label="3" size="small" sx={{ height: 22, bgcolor: '#e2e8f0', color: '#334155', fontWeight: 700, borderRadius: 1, '& .MuiChip-label': { px: 0.8, fontSize: 11 } }} />
                <Button size="small" sx={{ minWidth: 26, px: 0.35 }}>
                  <ChevronRight fontSize="small" />
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ mt: 2, borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
            <Box sx={{ px: 2.2, py: 1.8, borderBottom: '1px solid #edf2f7', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.2 }}>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Customer-wise Profit Breakdown</Typography>
                <Typography sx={{ mt: 0.4, color: '#64748b', fontSize: 12 }}>
                  Profitability summary grouped by customer.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ minHeight: 160, display: 'grid', placeItems: 'center', px: 2.2, py: 3, bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#94a3b8' }}>
                Comming soon
              </Typography>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default Reports;
