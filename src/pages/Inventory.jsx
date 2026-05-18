import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Pagination,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  History,
  Opacity,
  Payments,
  Science,
  Search,
  WarningAmber,
} from '@mui/icons-material';
import { inventoryService } from '../api/inventoryService';

const ITEMS_PAGE_SIZE = 50;
const TX_PAGE_SIZE = 20;

const Inventory = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');

  const [items, setItems] = useState([]);
  const [itemsPage, setItemsPage] = useState(0);
  const [itemsTotalPages, setItemsTotalPages] = useState(0);
  const [itemsTotalElements, setItemsTotalElements] = useState(0);
  const [itemSearch, setItemSearch] = useState('');

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [txPage, setTxPage] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(0);
  const [txTotalElements, setTxTotalElements] = useState(0);
  const [txSearch, setTxSearch] = useState('');
  const [txFromDate, setTxFromDate] = useState('');
  const [txToDate, setTxToDate] = useState('');

  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const normalizeCategoryValue = (value) =>
    String(value || '')
      .trim()
      .replace(/\s+/g, '_')
      .toUpperCase();

  const formatCategoryLabel = (value) =>
    String(value || '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const formatQty = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getStockMetrics = (item) => ({
    stock: Number(item.currentStock ?? item.currentQuantity ?? 0),
    minimum: Number(item.minimumQuantity ?? item.reorderPoint ?? 0),
  });

  const getStockStatus = (item) => {
    const { stock, minimum } = getStockMetrics(item);
    if (stock < minimum) return { label: 'UNHEALTHY', color: 'warning' };
    return { label: 'HEALTHY', color: 'success' };
  };

  const getCategory = (item) => {
    const raw = normalizeCategoryValue(item.categoryName || item.category || item.type);
    if (!raw) return 'UNCATEGORIZED';
    if (raw.includes('DYE')) return 'DYES';
    if (raw.includes('CHEM')) return 'CHEMICALS';
    if (raw.includes('SOLVENT')) return 'SOLVENTS';
    return raw;
  };

  const categoryPill = (category) => {
    if (category === 'DYES') {
      return { label: 'Dyes', bg: '#e6f0ff', color: '#335f9d' };
    }
    if (category === 'CHEMICALS') {
      return { label: 'Chemicals', bg: '#eef0f4', color: '#555f71' };
    }
    if (category === 'SOLVENTS') {
      return { label: 'Solvents', bg: '#fff0dd', color: '#ad6200' };
    }
    return { label: formatCategoryLabel(category), bg: '#ecfdf3', color: '#166534' };
  };

  const statusLabel = (item) => {
    const status = getStockStatus(item);
    if (status.color === 'success') return { dot: '#22c55e', text: 'Healthy', color: '#15803d' };
    return { dot: '#ef4444', text: 'Unhealthy', color: '#b91c1c' };
  };

  const transactionChip = (type) => {
    const normalized = (type || '').toUpperCase();
    if (normalized.includes('PURCHASE')) {
      return { label: 'Purchase', bg: '#e8f1ff', color: '#1d4ed8' };
    }
    if (normalized.includes('USAGE')) {
      return { label: 'Production Usage', bg: '#fff2e5', color: '#c2410c' };
    }
    return { label: 'Manual Adjustment', bg: '#eef0f4', color: '#475569' };
  };

  const fetchCategories = async () => {
    try {
      const response = await inventoryService.getCategories();
      const categoryListRaw = Array.isArray(response) ? response : [];
      const categoryList = categoryListRaw
        .map((entry) => {
          if (typeof entry === 'string') return normalizeCategoryValue(entry);
          return normalizeCategoryValue(entry?.category || entry?.name || entry?.type || entry?.label);
        })
        .filter(Boolean);

      const uniqueCategories = Array.from(new Set(categoryList));
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([]);
    }
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const pageResult = await inventoryService.getItemsPage({
        page: itemsPage,
        size: ITEMS_PAGE_SIZE,
        search: itemSearch,
        category: activeCategory === 'ALL' ? '' : activeCategory,
      });
      setItems(pageResult?.content || []);
      setItemsTotalPages(pageResult?.totalPages || 0);
      setItemsTotalElements(pageResult?.totalElements || 0);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch inventory items');
      setItems([]);
      setItemsTotalPages(0);
      setItemsTotalElements(0);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const pageResult = await inventoryService.getRecentTransactionsPage({
        page: txPage,
        size: TX_PAGE_SIZE,
        search: txSearch,
        fromDate: txFromDate,
        toDate: txToDate,
      });
      const normalizedRecent = (pageResult?.content || []).map((entry) => ({
        ...entry,
        itemName: entry.itemName || entry.materialName || entry.inventoryItemName || '-',
        itemId: entry.itemId || entry.inventoryItemId,
      }));
      setRecentTransactions(normalizedRecent);
      setTxTotalPages(pageResult?.totalPages || 0);
      setTxTotalElements(pageResult?.totalElements || 0);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch recent transactions');
      setRecentTransactions([]);
      setTxTotalPages(0);
      setTxTotalElements(0);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lowStockFromUrl = String(params.get('lowStock') || '').toLowerCase() === 'true';
    const searchFromUrl = params.get('search') || '';
    const categoryFromUrl = String(params.get('category') || '').trim();

    setLowStockOnly(lowStockFromUrl);

    if (searchFromUrl) {
      setItemSearch(searchFromUrl);
      setItemsPage(0);
    }

    if (categoryFromUrl) {
      setActiveCategory(String(categoryFromUrl).toUpperCase());
      setItemsPage(0);
    }
  }, [location.search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [itemsPage, itemSearch, activeCategory]);

  useEffect(() => {
    fetchTransactions();
  }, [txPage, txSearch, txFromDate, txToDate]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryService.deleteItem(id);
        fetchItems();
      } catch (err) {
        alert('Failed to delete item');
      }
    }
  };

  const lowStockCount = useMemo(
    () => items.filter((i) => getStockMetrics(i).stock < getStockMetrics(i).minimum).length,
    [items]
  );

  const visibleItems = useMemo(() => {
    if (!lowStockOnly) return items;
    return items.filter((item) => getStockMetrics(item).stock < getStockMetrics(item).minimum);
  }, [items, lowStockOnly]);

  const totalVolume = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.currentStock ?? i.currentQuantity ?? 0), 0),
    [items]
  );

  const totalValue = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum +
          Number(i.totalValue ?? Number(i.currentStock ?? i.currentQuantity ?? 0) * Number(i.unitCost || 0)),
        0
      ),
    [items]
  );

  if (loadingItems && loadingTransactions) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 0, md: 1 }, py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3.5 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Science sx={{ color: '#1275e2', fontSize: 18 }} />
            <Typography sx={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, fontSize: 11, color: '#1275e2' }}>
              Production Assets
            </Typography>
          </Stack>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#181c22' }}>
            Material Inventory
          </Typography>
          <Typography variant="body2" sx={{ color: '#5d6470', mt: 0.5 }}>
            Real-time stock monitoring for chemicals, dyes, and industrial solvents.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/inventory/new')}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            boxShadow: '0 10px 16px -8px rgba(18,117,226,0.45)',
            px: 2.5,
          }}
        >
          Add New Item
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          mb: 3,
          display: 'grid',
          gap: 2,
          width: '100%',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #edf0f6', boxShadow: '0 2px 8px rgba(10,32,75,0.04)', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.2 }}>
            Total Stock Quantity
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, mb: 0.5 }}>
            {Math.round(totalVolume).toLocaleString()}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#6b7280' }}>All items across all pages</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #edf0f6', boxShadow: '0 2px 8px rgba(10,32,75,0.04)', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.2 }}>
            Total Inventory Value
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, mb: 0.5 }}>
            ${Math.round(totalValue).toLocaleString()}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#6b7280' }}>Quantity × Unit Cost</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #edf0f6', boxShadow: '0 2px 8px rgba(10,32,75,0.04)', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.2 }}>
            Low Stocks Count
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, mb: 0.5, color: lowStockCount > 0 ? '#dc2626' : '#15803d' }}>
            {lowStockCount}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#6b7280' }}>Below minimum threshold</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #0b63bf', bgcolor: '#1275e2', color: '#fff', boxShadow: '0 2px 8px rgba(10,32,75,0.04)', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12, color: '#dbeafe', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.2 }}>
            Stock Wastage %
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, mb: 0.5 }}>
            0.0%
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#dbeafe' }}>Damage / Waste Rate (coming soon)</Typography>
        </Paper>
      </Box>

      <Paper sx={{ borderRadius: 3, border: '1px solid #dfe4ef', overflow: 'hidden', boxShadow: '0 3px 10px rgba(10,32,75,0.05)', mb: 3 }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #eef1f7', bgcolor: '#f8fafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Tabs
            value={activeCategory}
            onChange={(_, val) => {
              setActiveCategory(val);
              setItemsPage(0);
            }}
            sx={{
              minHeight: 36,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                minHeight: 34,
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 1.2,
                color: '#6b7280',
                px: 1.5,
              },
              '& .Mui-selected': {
                bgcolor: '#ffffff',
                color: '#1275e2',
                border: '1px solid #e4e8f2',
                boxShadow: '0 2px 6px rgba(31,49,82,0.08)',
              },
            }}
          >
            <Tab value="ALL" label="All Materials" />
            {categories.map((category) => (
              <Tab key={category} value={category} label={formatCategoryLabel(category)} />
            ))}
          </Tabs>

          <Stack direction="row" spacing={1} sx={{ minWidth: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search material name, SKU, category"
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                setItemsPage(0);
              }}
              sx={{ minWidth: { xs: '100%', md: 320 }, bgcolor: '#fff' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              size="small"
              variant={lowStockOnly ? 'contained' : 'outlined'}
              startIcon={<WarningAmber />}
              onClick={() => {
                setLowStockOnly((previous) => !previous);
                setItemsPage(0);
              }}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Low Stock Only
            </Button>
          </Stack>
        </Box>

        <TableContainer sx={{ maxHeight: 560 }}>
          <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 0.8 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }}>Material Name</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }} align="right">Current Stock</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }}>Unit</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }} align="right">Cost / Unit</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }} align="center">Is Active</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }} align="center">Alerts</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }} align="right">Total Value</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => {
                  const cat = getCategory(item);
                  const catBadge = categoryPill(cat);
                  const status = statusLabel(item);
                  const metrics = getStockMetrics(item);
                  const itemName = item.name || item.itemName || 'N/A';
                  const rowTotalValue = Number(item.totalValue ?? metrics.stock * Number(item.unitCost || 0));

                  return (
                    <TableRow key={item.id} hover onClick={() => navigate(`/inventory/${item.id}`)} sx={{ cursor: 'pointer', '&:hover .row-actions': { opacity: 1 } }}>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 38, height: 38, bgcolor: '#e7edf9', color: '#37588f', fontSize: 14, fontWeight: 700 }}>
                            {(itemName || '?').slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1f2937' }}>{itemName}</Typography>
                            <Typography variant="caption" sx={{ color: '#8a93a5' }}>SKU: {item.itemCode || 'N/A'}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Box component="span" sx={{ px: 1, py: 0.45, borderRadius: 1, bgcolor: catBadge.bg, color: catBadge.color, fontWeight: 700, fontSize: 11 }}>
                          {catBadge.label}
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: status.text === 'Healthy' ? '#1f2937' : '#dc2626', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {formatQty(metrics.stock)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#505766' }}>{item.unitOfMeasure || item.unit || '-'}</Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: '#505766', fontWeight: 600 }}>${Number(item.unitCost || 0).toFixed(2)}</Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Chip size="small" label={item.isActive ? 'Yes' : 'No'} sx={{ bgcolor: item.isActive ? '#ecfdf3' : '#fee2e2', color: item.isActive ? '#15803d' : '#b91c1c', fontWeight: 700 }} />
                      </TableCell>

                      <TableCell align="center">
                        <Chip size="small" label={item.lowStockAlertsEnabled ? 'On' : 'Off'} sx={{ bgcolor: item.lowStockAlertsEnabled ? '#e8f1ff' : '#eef0f4', color: item.lowStockAlertsEnabled ? '#1d4ed8' : '#64748b', fontWeight: 700 }} />
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: '#505766', fontWeight: 700 }}>
                          ${rowTotalValue.toFixed(2)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: status.dot }} />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: status.color }}>{status.text}</Typography>
                        </Stack>
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" className="row-actions" sx={{ opacity: 1, transition: 'opacity .2s ease' }}>
                          <Tooltip title="Transactions">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/inventory/${item.id}`);
                              }}
                              sx={{ color: '#6b7280', '&:hover': { bgcolor: '#fff', color: '#1275e2' } }}
                            >
                              <History sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/inventory/${item.id}/edit`);
                              }}
                              sx={{ color: '#6b7280', '&:hover': { bgcolor: '#fff', color: '#1275e2' } }}
                            >
                              <Edit sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(item.id);
                              }}
                              sx={{ color: '#6b7280', '&:hover': { bgcolor: '#fff', color: '#dc2626' } }}
                            >
                              <Delete sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: '#6b7280' }}>
                    No items available for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ px: 1.8, py: 1.0, borderTop: '1px solid #eef1f7', bgcolor: '#f8fafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 11, color: '#727b8e', fontWeight: 600 }}>
            Showing up to {ITEMS_PAGE_SIZE} per page, total {lowStockOnly ? visibleItems.length : itemsTotalElements} items
          </Typography>
          {itemsTotalPages > 1 && (
            <Pagination
              count={itemsTotalPages}
              page={itemsPage + 1}
              onChange={(_, value) => setItemsPage(value - 1)}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
            />
          )}
        </Box>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1d2430' }}>Inventory Transactions</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              placeholder="Search transactions"
              value={txSearch}
              onChange={(e) => {
                setTxSearch(e.target.value);
                setTxPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              size="small"
              type="date"
              label="From"
              InputLabelProps={{ shrink: true }}
              value={txFromDate}
              onChange={(e) => {
                setTxFromDate(e.target.value);
                setTxPage(0);
              }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              InputLabelProps={{ shrink: true }}
              value={txToDate}
              onChange={(e) => {
                setTxToDate(e.target.value);
                setTxPage(0);
              }}
            />
          </Stack>
        </Box>

        <Paper sx={{ borderRadius: 3, border: '1px solid #dfe4ef', overflow: 'hidden', boxShadow: '0 3px 10px rgba(10,32,75,0.05)' }}>
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 0.8 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }}>Item Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }}>Transaction Type</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }} align="right">Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7b8393' }} align="center">Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction, index) => {
                    const chip = transactionChip(transaction.transactionType);
                    const qty = Number(transaction.quantity || 0);
                    return (
                      <TableRow key={`${transaction.itemId || 'x'}-${transaction.id || index}`} hover>
                        <TableCell sx={{ fontSize: 13, color: '#344054' }}>
                          {transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{transaction.itemName || '-'}</TableCell>
                        <TableCell>
                          <Box component="span" sx={{ px: 1.2, py: 0.45, borderRadius: 99, bgcolor: chip.bg, color: chip.color, fontWeight: 700, fontSize: 11 }}>
                            {chip.label}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, color: qty >= 0 ? '#16a34a' : '#dc2626' }}>
                          {qty >= 0 ? '+' : ''}
                          {formatQty(qty)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, color: '#667085' }}>
                          {transaction.referenceNumber || transaction.referenceId || 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#6b7280' }}>
                      No transactions available for this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ px: 2.5, py: 1.6, borderTop: '1px solid #eef1f7', bgcolor: '#f8fafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12, color: '#727b8e', fontWeight: 600 }}>
              Showing up to {TX_PAGE_SIZE} per page, total {txTotalElements} transactions
            </Typography>
            {txTotalPages > 1 && (
              <Pagination
                count={txTotalPages}
                page={txPage + 1}
                onChange={(_, value) => setTxPage(value - 1)}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Inventory;
