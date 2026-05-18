import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import {
  ChevronLeft,
  Edit,
  GetApp,
  FilterList,
} from '@mui/icons-material';
import { inventoryService } from '../api/inventoryService';

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('STOCK_IN');
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: '',
    reason: 'PURCHASE_RECEIVED',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchItemDetails();
  }, [id]);

  const fetchItemDetails = async () => {
    try {
      const itemData = await inventoryService.getAllItems();
      const foundItem = itemData.find((i) => i.id === parseInt(id));
      if (!foundItem) {
        setError('Item not found');
        return;
      }
      setItem(foundItem);

      const txData = await inventoryService.getTransactions(parseInt(id));
      setTransactions(txData || []);
    } catch (err) {
      setError('Failed to load item details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAdjustment = async (e) => {

    e.preventDefault();
    if (!adjustmentData.quantity) {
      setError('Please enter a quantity');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const quantity =
        adjustmentType === 'STOCK_OUT' ? -Math.abs(parseFloat(adjustmentData.quantity)) : Math.abs(parseFloat(adjustmentData.quantity));

      await inventoryService.adjustInventory(
        parseInt(id),
        quantity,
        adjustmentData.reason,
        adjustmentData.notes,
        adjustmentData.effectiveDate,
        adjustmentType
      );

      setAdjustmentData({
        quantity: '',
        reason: 'PURCHASE_RECEIVED',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      await fetchItemDetails();
    } catch (err) {
      console.error('Failed to submit adjustment:', err);
      const responseData = err.response?.data;
      const validationMessage =
        responseData && typeof responseData === 'object'
          ? Object.values(responseData).filter(Boolean).join(' | ')
          : '';
      setError(
        validationMessage ||
          responseData?.message ||
          'Failed to submit adjustment'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!item) {
    return (
      <Box sx={{ px: 3, py: 2 }}>
        <Alert severity="error">{error || 'Item not found'}</Alert>
        <Button onClick={() => navigate('/inventory')} sx={{ mt: 2 }}>
          Back to Inventory
        </Button>
      </Box>
    );
  }

  const normalizeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const skuCode = item.sku || `SKU-${item.id.toString().padStart(4, '0')}`;
  const currentStock = normalizeNumber(item.currentStock ?? item.currentQuantity ?? item.availableQuantity, 0);
  const reorderPoint = normalizeNumber(item.reorderPoint, 0);
  const unitCost = normalizeNumber(item.unitCost, 0);
  const stockStatus = currentStock <= 0 ? 'OUT_OF_STOCK' : currentStock <= reorderPoint ? 'LOW_STOCK' : 'HEALTHY';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff', color: '#1a1c1c', px: { xs: 2, md: 3 }, py: 3 }}>
      <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
          <Button
            startIcon={<ChevronLeft />}
            onClick={() => navigate('/inventory')}
            sx={{ textTransform: 'none', color: '#5d6470', fontWeight: 700, mb: 1, '&:hover': { bgcolor: '#f3f4f6' } }}
          >
            Back to Inventory
          </Button>

          {/* Header section */}
          <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #c6c6c64d', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#1978e5', letterSpacing: '0.16em', mb: 0.8 }}>SKU: {skuCode}</Typography>
              <Typography sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 900, textTransform: 'uppercase', lineHeight: 0.98, letterSpacing: '-0.03em' }}>
                {item.itemName}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#474747', letterSpacing: '0.08em' }}>
                Category: {item.category || 'General'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={{ xs: 2, md: 4 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#474747', letterSpacing: '0.14em', mb: 0.5 }}>Current Stock</Typography>
                <Typography sx={{ fontSize: { xs: 22, md: 32 }, fontWeight: 900 }}>{currentStock.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Box component="span" sx={{ fontSize: 14, color: '#1978e5' }}>{item.unit || 'units'}</Box></Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#474747', letterSpacing: '0.14em', mb: 0.5 }}>Unit Cost</Typography>
                <Typography sx={{ fontSize: { xs: 22, md: 32 }, fontWeight: 900 }}>${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
              </Box>
            </Stack>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px, 4fr) minmax(0, 8fr)' }, gap: 3 }}>
            {/* Left visual */}
            <Stack spacing={2}>
              <Paper sx={{ aspectRatio: '1 / 1', borderRadius: 2, overflow: 'hidden', border: '1px solid #c6c6c633' }}>
                <Box sx={{ height: '100%', backgroundImage: 'url(https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=900&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(0.85) contrast(1.02)' }} />
              </Paper>

              <Paper sx={{ p: 2.25, borderRadius: 2, bgcolor: '#f3f3f3', border: '1px solid #c6c6c633' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#1978e5', letterSpacing: '0.12em', mb: 1.5 }}>Specifications</Typography>
                {[{ k: 'Category', v: item.category || 'N/A' }, { k: 'Unit', v: item.unit || 'kg' }, { k: 'Reorder Point', v: reorderPoint }, { k: 'Location', v: item.location || 'Aisle 4, Shelf B' }].map((row) => (
                  <Box key={row.k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.9, borderBottom: '1px solid #c6c6c633' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#474747' }}>{row.k}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: row.k === 'Category' ? '#1978e5' : '#1a1c1c' }}>{row.v}</Typography>
                  </Box>
                ))}
                <Box sx={{ pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#474747' }}>Status</Typography>
                  <Chip
                    size="small"
                    label={stockStatus === 'HEALTHY' ? 'Healthy' : stockStatus === 'LOW_STOCK' ? 'Low Stock' : 'Out Of Stock'}
                    sx={{ fontWeight: 800, fontSize: 9, textTransform: 'uppercase', bgcolor: stockStatus === 'HEALTHY' ? '#dcfce7' : stockStatus === 'LOW_STOCK' ? '#fee2e2' : '#fecaca', color: stockStatus === 'HEALTHY' ? '#166534' : '#991b1b' }}
                  />
                </Box>
              </Paper>
            </Stack>

            {/* Right adjustment */}
            <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, border: '1px solid #c6c6c64d', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Stock Adjustment</Typography>
                <Edit sx={{ color: '#1978e5' }} />
              </Box>

              <Box component="form" onSubmit={handleSubmitAdjustment} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#474747', letterSpacing: '0.1em', mb: 1 }}>Movement Type</Typography>
                  <Box sx={{ display: 'flex', bgcolor: '#eeeeee', p: 0.6, borderRadius: 1 }}>
                    <Button type="button" onClick={() => setAdjustmentType('STOCK_IN')} sx={{ flex: 1, py: 0.9, borderRadius: 0.6, bgcolor: adjustmentType === 'STOCK_IN' ? '#1978e5' : 'transparent', color: adjustmentType === 'STOCK_IN' ? '#fff' : '#474747', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', '&:hover': { bgcolor: adjustmentType === 'STOCK_IN' ? '#1978e5' : '#e2e2e2' } }}>Stock In</Button>
                    <Button type="button" onClick={() => setAdjustmentType('STOCK_OUT')} sx={{ flex: 1, py: 0.9, borderRadius: 0.6, bgcolor: adjustmentType === 'STOCK_OUT' ? '#1978e5' : 'transparent', color: adjustmentType === 'STOCK_OUT' ? '#fff' : '#474747', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', '&:hover': { bgcolor: adjustmentType === 'STOCK_OUT' ? '#1978e5' : '#e2e2e2' } }}>Stock Out</Button>
                  </Box>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#474747', letterSpacing: '0.1em', mb: 1 }}>Quantity ({item.unit || 'units'})</Typography>
                  <TextField
                    fullWidth
                    type="number"
                    inputProps={{ step: '0.01', min: 0 }}
                    placeholder="0.00"
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData((prev) => ({ ...prev, quantity: e.target.value }))}
                    variant="standard"
                    InputProps={{ disableUnderline: true }}
                    sx={{ '& .MuiInputBase-root': { borderBottom: '2px solid #c6c6c6', px: 0.6, py: 0.4 }, '& .MuiInputBase-input': { fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' } }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#474747', letterSpacing: '0.1em', mb: 1 }}>Reason for Adjustment</Typography>
                    <Select
                      fullWidth
                      value={adjustmentData.reason}
                      onChange={(e) => setAdjustmentData((prev) => ({ ...prev, reason: e.target.value }))}
                      sx={{ borderRadius: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', bgcolor: '#f3f3f3', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c6c6c64d' } }}
                    >
                      <MenuItem value="PURCHASE_RECEIVED">Purchase Received</MenuItem>
                      <MenuItem value="CUSTOMER_RETURN">Customer Return</MenuItem>
                      <MenuItem value="DAMAGE_WASTAGE">Damage / Wastage</MenuItem>
                      <MenuItem value="INVENTORY_AUDIT">Inventory Audit</MenuItem>
                      <MenuItem value="PRODUCTION_USAGE">Production Usage</MenuItem>
                    </Select>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#474747', letterSpacing: '0.1em', mb: 1 }}>Effective Date</Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={adjustmentData.effectiveDate}
                      onChange={(e) => setAdjustmentData((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f3f3f3' }, '& .MuiInputBase-input': { fontSize: 13 } }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>

                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#474747', letterSpacing: '0.1em', mb: 1 }}>Internal Notes</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="PROVIDE CONTEXT FOR THE ADJUSTMENT..."
                    value={adjustmentData.notes}
                    onChange={(e) => setAdjustmentData((prev) => ({ ...prev, notes: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f3f3f3' }, '& .MuiOutlinedInput-input': { fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  fullWidth
                  sx={{ py: 1.4, borderRadius: 1, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', bgcolor: '#1978e5', '&:hover': { bgcolor: '#1565c0' }, '&:disabled': { bgcolor: '#c6c6c6', color: '#f3f3f3' } }}
                >
                  {submitting ? <CircularProgress size={18} sx={{ mr: 1, color: '#fff' }} /> : null}
                  Commit Inventory Change
                </Button>
              </Box>
            </Paper>
          </Box>

          {/* Transaction History */}
          <Box sx={{ mt: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Transaction History</Typography>
              <Stack direction="row" spacing={1.2}>
                <Button variant="outlined" startIcon={<GetApp fontSize="small" />} sx={{ borderColor: '#c6c6c64d', color: '#1a1c1c', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Export CSV
                </Button>
                <Button variant="contained" startIcon={<FilterList fontSize="small" />} sx={{ bgcolor: '#1978e5', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Filter
                </Button>
              </Stack>
            </Box>

            <TableContainer sx={{ borderRadius: 2, border: '1px solid #c6c6c64d', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#e8e8e8' }}>
                  <TableRow>
                    {['Date', 'Type', 'Quantity', 'Balance', 'Reason', 'Linked Order'].map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 900, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#474747' }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map((tx, idx) => {
                      const qty = Number(tx.quantity || 0);
                      const linkedOrder = tx.orderNumber || tx.linkedOrder || tx.referenceNumber || '—';
                      return (
                        <TableRow key={idx} sx={{ '&:hover': { bgcolor: '#f3f3f3' }, bgcolor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                          <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>{new Date(tx.transactionDate || tx.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={qty >= 0 ? 'STOCK IN' : 'STOCK OUT'}
                              sx={{
                                fontSize: 9,
                                fontWeight: 900,
                                letterSpacing: '0.04em',
                                bgcolor: qty >= 0 ? '#dcfce7' : '#fee2e2',
                                color: qty >= 0 ? '#166534' : '#ba1a1a',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, fontWeight: 900, color: qty >= 0 ? '#166534' : '#ba1a1a' }}>
                            {qty >= 0 ? '+' : '-'} {Math.abs(qty).toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>{normalizeNumber(tx.balanceAfter ?? currentStock, currentStock).toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}</TableCell>
                          <TableCell sx={{ fontSize: 10, fontWeight: 700, color: '#474747', textTransform: 'uppercase' }}>{tx.reason || tx.transactionType || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: 11, fontWeight: 900, color: linkedOrder === '—' ? '#6b7280' : '#1978e5', textDecoration: linkedOrder === '—' ? 'none' : 'underline', textUnderlineOffset: '4px' }}>
                            {linkedOrder}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#9ca3af', fontWeight: 700 }}>No transactions found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

        <Box sx={{ height: 24 }} />
      </Box>
    </Box>
  );
};

export default InventoryDetail;
