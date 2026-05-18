import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  ArrowDropDown,
  Close,
  Delete,
  Edit,
  InfoOutlined,
  Inventory2,
  Notifications,
  PersonAdd,
  Search,
  Settings,
  TrendingUp,
  VerifiedUser,
  WarningAmber,
  WbSunnyOutlined,
  NightlightOutlined,
  Payments,
} from '@mui/icons-material';
import { orderService } from '../api/orderService';
import { inventoryService } from '../api/inventoryService';
import { laborService } from '../api/laborService';

const normalizeOrderDetailResponse = (payload) => {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.data && typeof payload.data === 'object') return payload.data;
  if (payload.order && typeof payload.order === 'object') return payload.order;
  return payload;
};

const normalizeList = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const normalizeNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) =>
  `$${normalizeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

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

const getItemCategory = (item) =>
  normalizeCategoryValue(item?.categoryName || item?.category || item?.type || item?.materialCategory);

const getItemName = (item) => item?.name || item?.itemName || item?.materialName || 'Unknown Material';

const getItemUnitCost = (item) => normalizeNumber(item?.unitCost || item?.costPerUnit || item?.price);

const getItemStock = (item) => normalizeNumber(item?.currentStock || item?.currentQuantity || item?.availableQuantity);

const getItemUom = (item) => item?.unitOfMeasure || item?.uom || item?.unit || 'Units';

const getLaborShiftRate = (entry) =>
  normalizeNumber(entry?.dailyWage ?? entry?.shiftWage ?? entry?.wagePerShift ?? entry?.hourlyRate);

const getLaborShiftCount = (entry) => {
  const explicitShiftCount = normalizeNumber(entry?.shiftCount);
  if (explicitShiftCount > 0) return explicitShiftCount;

  // Backward compatibility: older rows may only have durationHours.
  const durationHours = normalizeNumber(entry?.durationHours);
  if (durationHours <= 0) return 0;
  return durationHours >= 8 ? durationHours / 8 : durationHours;
};

const getLaborEntryCost = (entry) => {
  const explicitTotal = normalizeNumber(entry?.totalCost);
  if (explicitTotal > 0) return explicitTotal;
  return getLaborShiftCount(entry) * getLaborShiftRate(entry);
};

const getStatusChipStyles = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'RUNNING' || normalized === 'ACTIVE') {
    return { bgcolor: '#dbeafe', color: '#1d4ed8' };
  }
  if (normalized === 'COMPLETED') {
    return { bgcolor: '#dcfce7', color: '#166534' };
  }
  if (normalized === 'PENDING') {
    return { bgcolor: '#fef3c7', color: '#92400e' };
  }
  return { bgcolor: '#e2e8f0', color: '#475569' };
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [laborMaster, setLaborMaster] = useState([]);
  const [activeMaterialCategory, setActiveMaterialCategory] = useState('');
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [selectedLaborId, setSelectedLaborId] = useState('');
  const [shiftType, setShiftType] = useState('DAY');
  const [shiftCount, setShiftCount] = useState('1');
  const [loading, setLoading] = useState(true);
  const [modalSaving, setModalSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPage = async () => {
    try {
      setLoading(true);
      setError('');
      const [orderResponse, categoriesResponse, itemsResponse, laborResponse] = await Promise.all([
        orderService.getOrderDetail(id),
        inventoryService.getCategories().catch(() => []),
        inventoryService.getAllItems().catch(() => []),
        laborService.getAllLabor().catch(() => []),
      ]);

      const normalizedOrder = normalizeOrderDetailResponse(orderResponse);
      const categories = (Array.isArray(categoriesResponse) ? categoriesResponse : [])
        .map((entry) => {
          if (typeof entry === 'string') return normalizeCategoryValue(entry);
          return normalizeCategoryValue(entry?.category || entry?.name || entry?.type || entry?.label);
        })
        .filter(Boolean);
      const items = Array.isArray(itemsResponse) ? itemsResponse.filter(Boolean) : [];
      const labor = Array.isArray(laborResponse) ? laborResponse.filter(Boolean) : [];

      setOrder(normalizedOrder);
      setInventoryCategories(Array.from(new Set(categories)));
      setInventoryItems(items);
      setLaborMaster(labor);
      setActiveMaterialCategory((prev) => prev || Array.from(new Set(categories))[0] || '');
    } catch (err) {
      setError('Failed to fetch order details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [id]);

  const materials = useMemo(
    () => normalizeList(order, ['orderMaterials', 'materials', 'materialEntries']),
    [order]
  );

  const actualMaterials = useMemo(
    () => materials.filter((item) => String(item?.materialType || '').toUpperCase() !== 'ESTIMATED'),
    [materials]
  );
  const laborEntries = useMemo(
    () => normalizeList(order, ['orderLabor', 'laborEntries', 'labourEntries']),
    [order]
  );
  const machines = useMemo(
    () => normalizeList(order, ['orderMachines', 'machines', 'machineEntries']),
    [order]
  );
  const transactions = useMemo(
    () => normalizeList(order, ['orderTransactions', 'transactions', 'transactionHistory']),
    [order]
  );

  const totalMaterialCost = useMemo(
    () => materials.reduce((sum, item) => sum + normalizeNumber(item?.totalCost || normalizeNumber(item?.quantity) * normalizeNumber(item?.unitCost)), 0),
    [materials]
  );
  const totalLaborCost = useMemo(
    () => laborEntries.reduce((sum, entry) => sum + getLaborEntryCost(entry), 0),
    [laborEntries]
  );
  const totalMachineCost = useMemo(
    () => machines.reduce((sum, machine) => sum + normalizeNumber(machine?.totalCost || normalizeNumber(machine?.runtimeHours) * normalizeNumber(machine?.costPerHour)), 0),
    [machines]
  );

  const totalOperatingCost = normalizeNumber(order?.totalActualCost || totalMaterialCost + totalLaborCost + totalMachineCost);

  const quotedUnitPrice = normalizeNumber(order?.quotedPrice || order?.unitPrice || order?.targetRevenue);
  const orderQuantity = normalizeNumber(order?.orderQuantity || order?.quantity);
  const quotedPrice = quotedUnitPrice * orderQuantity;
  const profitLoss = normalizeNumber(order?.profitLoss || quotedPrice - totalOperatingCost);
  const margin = quotedPrice > 0 ? (profitLoss / quotedPrice) * 100 : normalizeNumber(order?.marginPercentage);
  const estimatedProdCost = normalizeNumber(order?.estimatedLaborCost) + normalizeNumber(order?.estimatedMaterialCost);
  const actualProdCost = normalizeNumber(order?.actualLaborCost || totalLaborCost) + normalizeNumber(order?.actualMaterialCost || totalMaterialCost);

  const filteredMaterialOptions = useMemo(() => {
    if (!activeMaterialCategory) return inventoryItems;
    return inventoryItems.filter((item) => getItemCategory(item) === activeMaterialCategory);
  }, [activeMaterialCategory, inventoryItems]);

  const selectedMaterial = useMemo(
    () => inventoryItems.find((item) => String(item?.id) === String(selectedMaterialId)) || null,
    [inventoryItems, selectedMaterialId]
  );

  const selectedMaterialAvailableStock = getItemStock(selectedMaterial);
  const selectedMaterialUnitCost = getItemUnitCost(selectedMaterial);
  const materialCostImpact = normalizeNumber(materialQuantity) * selectedMaterialUnitCost;
  const materialExceedsStock = normalizeNumber(materialQuantity) > selectedMaterialAvailableStock;

  const selectedLabor = useMemo(
    () => laborMaster.find((item) => String(item?.id) === String(selectedLaborId)) || null,
    [laborMaster, selectedLaborId]
  );

  const wagePerShift = getLaborShiftRate(selectedLabor);
  const totalLaborModalCost = wagePerShift * normalizeNumber(shiftCount || 0);

  const getLaborOptionLabel = (labor) => {
    const firstName = String(labor?.firstName || '').trim();
    const lastName = String(labor?.lastName || '').trim();
    const fullNameFromParts = `${firstName} ${lastName}`.trim();
    const fullName =
      fullNameFromParts ||
      String(labor?.operatorName || '').trim() ||
      String(labor?.fullName || '').trim() ||
      'Unknown Employee';

    const employeeCode =
      String(labor?.employeeCode || '').trim() ||
      String(labor?.operatorCode || '').trim() ||
      String(labor?.code || '').trim();

    return employeeCode ? `${fullName} (${employeeCode})` : fullName;
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!materialId || !window.confirm('Remove this material from the order?')) return;
    try {
      await orderService.removeMaterial(materialId);
      loadPage();
    } catch (err) {
      setError('Failed to remove material');
    }
  };

  const handleDeleteLabor = async (laborId) => {
    if (!laborId || !window.confirm('Remove this labor entry from the order?')) return;
    try {
      await orderService.removeLabor(laborId);
      loadPage();
    } catch (err) {
      setError('Failed to remove labor');
    }
  };

  const handleDeleteMachine = async (machineId) => {
    if (!machineId || !window.confirm('Remove this machine from the order?')) return;
    try {
      await orderService.removeMachine(machineId);
      loadPage();
    } catch (err) {
      setError('Failed to remove machine');
    }
  };

  const resetMaterialDialog = () => {
    setMaterialDialogOpen(false);
    setSelectedMaterialId('');
    setMaterialQuantity('');
  };

  const resetLaborDialog = () => {
    setLaborDialogOpen(false);
    setSelectedLaborId('');
    setShiftType('DAY');
    setShiftCount('1');
  };

  const handleAddMaterial = async () => {
    if (!selectedMaterial || normalizeNumber(materialQuantity) <= 0) {
      setError('Select a material and enter a valid quantity.');
      return;
    }

    try {
      setModalSaving(true);

      await orderService.addMaterial(id, {
        orderId: normalizeNumber(id),
        orderNumber: order?.orderNumber || undefined,
        inventoryItemId: selectedMaterial.id,
        materialId: selectedMaterial.id,
        materialName: getItemName(selectedMaterial),
        description: selectedMaterial?.description || selectedMaterial?.notes || getItemName(selectedMaterial),
        quantity: normalizeNumber(materialQuantity),
        unitOfMeasure: getItemUom(selectedMaterial),
        unitCost: selectedMaterialUnitCost,
        totalCost: materialCostImpact,
        stockStatus: materialExceedsStock ? 'REQUIRED_PO' : 'IN_STOCK',
        categoryName: selectedMaterial?.categoryName || selectedMaterial?.category || activeMaterialCategory,
      });
      resetMaterialDialog();
      await loadPage();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add material to order.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleAddLabor = async () => {
    if (!selectedLabor || normalizeNumber(shiftCount) <= 0) {
      setError('Select an employee and enter a valid shift count.');
      return;
    }

    try {
      setModalSaving(true);

      await orderService.addLabor(id, {
        orderId: normalizeNumber(id),
        orderNumber: order?.orderNumber || undefined,
        laborId: selectedLabor.id,
        operatorId: selectedLabor.id,
        operatorCode: selectedLabor.operatorCode,
        operatorName: selectedLabor.operatorName,
        shiftRole: selectedLabor.shiftRole,
        shiftDate: new Date().toISOString().slice(0, 10),
        shiftCount: normalizeNumber(shiftCount),
        // Backend still expects durationHours/hourlyRate-style fields. We send shift-count and daily-rate values
        // so persisted math remains aligned with per-shift costing while avoiding null numeric fields server-side.
        durationHours: normalizeNumber(shiftCount),
        dailyWage: getLaborShiftRate(selectedLabor),
        shiftWage: getLaborShiftRate(selectedLabor),
        hourlyRate: getLaborShiftRate(selectedLabor),
        totalCost: totalLaborModalCost,
        notes: `${shiftType} shift x${shiftCount}`,
      });
      resetLaborDialog();
      await loadPage();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add labour to order.');
    } finally {
      setModalSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Order not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fdfbff' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 3 }, py: 1.4, bgcolor: '#fff', borderBottom: '1px solid #c4c6cf' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box>
              <Typography sx={{ fontWeight: 900, color: '#1978e5', textTransform: 'uppercase', letterSpacing: '-0.03em', fontSize: 18, lineHeight: 1 }}>
                TEXTILE OS
              </Typography>
              <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e', mt: 0.3 }}>
                Cotton Park
              </Typography>
            </Box>
            <Chip label={`${order.orderNumber || `ORD-${id}`} / ${String(order.status || 'ACTIVE').toUpperCase()}`} sx={{ bgcolor: '#dae2f9', color: '#131c2b', fontWeight: 800 }} />
          </Stack>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <IconButton><Notifications /></IconButton>
            <IconButton><Settings /></IconButton>
            <Avatar src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvIBbGiDbQYlb91dozdW51vv9XTm7cyzJ1uyClTHBPuk2VA8BJ9Xlz6MrYW3kiyijUbh9__gdva0TxtXlMYe5xn0jhNYd9R-omoiWefoKX36NxdXv8dgutQYWif2QlRxfRIOiEIhgo4TkQHrXAU_9U5QoxGd-hVnXLLVwCYQfVIIU0WltsoEROqy30xVxxLrL2jlugIxG6eLLdD3rNKyru2qFKOmcZG-_2WEtrXP_ctSzM3FaU4ojDgBdRyHDWA6-j8lEdyUucNZU" />
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 3 }, py: 2.2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3.5, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ fontSize: { xs: 30, md: 42 }, fontWeight: 900, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.05em', color: '#1a1c1e' }}>
                Expanded Order
                <br />
                View
              </Typography>
              <Typography sx={{ color: '#44474e', fontWeight: 500, mt: 1.1, maxWidth: 640, fontSize: 13 }}>
                {order.description || `Batch production for ${order.productType || 'premium textile'} workflow. System is currently tracking materials, machine uptime, and labor shifts.`}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={0.7}>
              <Paper sx={{ bgcolor: '#1a1c1e', color: '#fdfbff', px: 2.2, py: 1.2, borderRadius: 2 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 900 }}>{formatMoney(quotedPrice)}</Typography>
              </Paper>
              <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#74777f' }}>
                Target Revenue
              </Typography>
            </Stack>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3.5 }}>
            <Grid item xs={12} lg={12}>
              <Paper sx={{ p: 2.2, border: '1px solid #c4c6cf', borderRadius: 3, boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#1978e5', borderBottom: '2px solid #1978e5', pb: 0.6 }}>
                    Order Configuration
                  </Typography>
                </Stack>
                <Grid container spacing={1.6}>
                  <Grid item xs={12} md={6}>

                    <TextField fullWidth label="Order Number" value={order.orderNumber || `ORD-${id}`} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Customer Name" value={order.customerName || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Estimated Prod Cost" value={formatMoney(estimatedProdCost)} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Actual Prod Cost" value={formatMoney(actualProdCost)} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label={`Quotation (${formatMoney(quotedUnitPrice)} × ${orderQuantity.toLocaleString()} qty)`} value={formatMoney(quotedPrice)} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Production Delivery Date" value={formatDate(order.requestedDeliveryDate || order.dueDate || order.deliveryDate)} InputProps={{ readOnly: true }} />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          <Stack spacing={4.2}>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2, gap: 1.2, flexWrap: 'wrap' }}>

                <Typography sx={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', flex: 1, minWidth: 0 }}>
                  I. Materials Usage
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setMaterialDialogOpen(true)} sx={{ borderRadius: 2, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', px: 1.8, py: 0.8, ml: 'auto', flexShrink: 0 }}>
                  Add Material
                </Button>
              </Stack>
              <Paper sx={{ border: '1px solid #c4c6cf', borderRadius: 3, overflow: 'hidden', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
                <TableContainer>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#ebe7ed' }}>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Material Name</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Material Code</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Quantity</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Unit Cost</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Total Cost</TableCell>
                        <TableCell sx={{ width: 72 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>

                      {actualMaterials.length ? (
                        actualMaterials.map((material, index) => (
                          <TableRow key={material.id || `${material.materialName}-${index}`} hover>
                            <TableCell sx={{ fontWeight: 800, color: '#1978e5', fontSize: 13 }}>
                              {material.materialName || material.description || `Material ${index + 1}`}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#44474e' }}>
                              {material.materialCode || material.reference || material.sku || '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, fontStyle: 'italic' }}>
                              {normalizeNumber(material.quantity).toLocaleString()}{material.unitOfMeasure || material.unit ? ` ${material.unitOfMeasure || material.unit}` : ''}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12 }}>{formatMoney(material.unitCost)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900 }}>
                              {formatMoney(material.totalCost || normalizeNumber(material.quantity) * normalizeNumber(material.unitCost))}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton onClick={() => handleDeleteMaterial(material.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 2.5, color: '#74777f' }}>
                            No materials added yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2, gap: 1.2, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', flex: 1, minWidth: 0 }}>
                  II. Labour Shifts
                </Typography>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setLaborDialogOpen(true)} sx={{ borderRadius: 2, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', px: 1.8, py: 0.8, ml: 'auto', flexShrink: 0 }}>
                  Add Labour
                </Button>
              </Stack>
              <Paper sx={{ border: '1px solid #c4c6cf', borderRadius: 3, overflow: 'hidden', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
                <TableContainer>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#ebe7ed' }}>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Employee Name</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Job Title</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Department</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Shift Date</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Total Cost</TableCell>
                        <TableCell sx={{ width: 72 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {laborEntries.length ? (
                        laborEntries.map((labor, index) => (
                          <TableRow key={labor.id || index} hover>
                            <TableCell sx={{ fontWeight: 800, color: '#1978e5', fontSize: 13 }}>
                              {labor.employeeName || labor.operatorName || `EMP-${index + 1}`}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#44474e' }}>
                              {labor.jobTitle || labor.shiftRole || '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#44474e' }}>
                              {labor.department || '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#44474e' }}>
                              {labor.shiftDate ? new Date(labor.shiftDate).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900 }}>
                              {formatMoney(labor.totalCost || getLaborEntryCost(labor))}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton onClick={() => handleDeleteLabor(labor.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 2.5, color: '#74777f' }}>
                            No labour entries yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.6 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
                  III. Machine Allocation
                </Typography>
              </Stack>
              <Paper sx={{ border: '1px solid #c4c6cf', borderRadius: 3, overflow: 'hidden', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
                <TableContainer>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#ebe7ed' }}>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Machine Asset</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Process</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Uptime</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Usage Cost / Hr</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Total Cost</TableCell>
                        <TableCell sx={{ width: 72 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {machines.length ? (
                        machines.map((machine, index) => (
                          <TableRow key={machine.id || `${machine.machineCode}-${index}`} hover>
                            <TableCell sx={{ fontWeight: 800, color: '#1978e5', fontSize: 13 }}>
                              {machine.machineCode || machine.machineName || `MAC-${index + 1}`}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#44474e' }}>
                              {machine.machineType || machine.process || 'Process allocation'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, fontStyle: 'italic' }}>
                              {normalizeNumber(machine.runtimeHours).toFixed(1)} h
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12 }}>{formatMoney(machine.costPerHour)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900 }}>
                              {formatMoney(machine.totalCost || normalizeNumber(machine.runtimeHours) * normalizeNumber(machine.costPerHour))}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton onClick={() => handleDeleteMachine(machine.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 2.5, color: '#74777f' }}>
                            No machines assigned yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.6 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
                  IV. Transaction History
                </Typography>
                <Chip icon={<VerifiedUser fontSize="small" />} label="Audit Log Verified" sx={{ bgcolor: '#d7e3ff', color: '#001b3e', fontWeight: 800 }} />
              </Stack>
              <Paper sx={{ border: '1px solid #c4c6cf', borderRadius: 3, overflow: 'hidden', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
                <TableContainer>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#ebe7ed' }}>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Transaction Date</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Action / Transaction</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Qty / Dur</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>User</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#44474e' }}>Cost Impact</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.length ? (
                        transactions.map((transaction, index) => (
                          <TableRow key={transaction.id || index} hover>
                            <TableCell sx={{ fontSize: 12, color: '#44474e' }}>
                              {formatDateTime(transaction.transactionDate || transaction.timestamp || transaction.dateTime || transaction.createdAt)}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12 }}>
                              <Stack spacing={0.3}>
                                <Chip
                                  label={transaction.transactionType || 'UPDATE'}
                                  size="small"
                                  sx={{ fontSize: 10, fontWeight: 800, height: 20, width: 'fit-content',
                                    bgcolor: transaction.transactionType === 'STATUS_CHANGE' ? '#d7ffe0' :
                                             transaction.transactionType === 'MATERIAL_DEDUCTION' ? '#fff3cd' :
                                             transaction.transactionType === 'LABOR_ENTRY' ? '#d7e3ff' :
                                             transaction.transactionType === 'MACHINE_ALLOCATION' ? '#fce4ec' : '#ede7f6',
                                    color: '#1a1c1e' }}
                                />
                                <Typography sx={{ fontSize: 11, color: '#44474e' }}>
                                  {transaction.actionDescription || transaction.description || '—'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, fontStyle: 'italic', color: '#44474e' }}>
                              {transaction.quantityOrDuration || transaction.quantity || transaction.duration || '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#44474e' }}>
                              {transaction.userName || transaction.changedBy || transaction.user || 'System'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: normalizeNumber(transaction.costImpact || transaction.impactAmount) > 0 ? '#ba1a1a' : normalizeNumber(transaction.costImpact || transaction.impactAmount) < 0 ? '#1b6c2e' : '#44474e' }}>
                              {(transaction.costImpact != null || transaction.impactAmount != null)
                                ? `${normalizeNumber(transaction.costImpact ?? transaction.impactAmount) >= 0 ? '+' : ''}${formatMoney(transaction.costImpact ?? transaction.impactAmount)}`
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 2.5, color: '#74777f' }}>
                            No transaction history available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </Stack>

          <Box sx={{ height: 64 }} />
        </Box>

        <Box sx={{ position: 'sticky', bottom: 0, bgcolor: '#1a1c1e', color: '#fdfbff', px: { xs: 2, md: 3 }, py: 2, borderTop: '1px solid #c4c6cf', boxShadow: '0 -8px 30px rgba(0,0,0,0.12)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={{ xs: 3, md: 5 }}>
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#74777f', mb: 0.7 }}>Total Operating Cost</Typography>
                <Typography sx={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em' }}>{formatMoney(totalOperatingCost)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#74777f', mb: 0.7 }}>Quoted Price</Typography>
                <Typography sx={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em' }}>{formatMoney(quotedPrice)}</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={{ xs: 3, md: 4 }} alignItems="center">
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#74777f', mb: 0.7 }}>Final Profit / Loss</Typography>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                  <TrendingUp sx={{ color: '#1978e5' }} />
                  <Typography sx={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em' }}>{`${profitLoss >= 0 ? '+' : '-'}${formatMoney(Math.abs(profitLoss))}`}</Typography>
                </Stack>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(196,198,207,0.3)' }} />
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#74777f', mb: 0.7 }}>Margin</Typography>
                <Typography sx={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: '#1978e5', letterSpacing: '-0.03em' }}>{margin.toFixed(1)}%</Typography>
              </Box>
              <Button variant="contained" sx={{ px: 2.2, py: 1.1, fontWeight: 900, textTransform: 'uppercase', borderRadius: 2, fontSize: 11 }}>
                Finalize & Invoice
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Dialog open={materialDialogOpen} onClose={resetMaterialDialog} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2.2, borderBottom: '1px solid #c1c6d5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f9f9ff' }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800 }}>Add Material to Order</Typography>
            <IconButton onClick={resetMaterialDialog}><Close /></IconButton>
          </Box>
          <Box sx={{ p: 3, display: 'grid', gap: 3 }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#414753', mb: 1.2 }}>Material Category</Typography>
              <Stack direction="row" spacing={1} sx={{ p: 0.7, bgcolor: '#e6e8f1', borderRadius: 2, overflowX: 'auto' }}>
                {inventoryCategories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={activeMaterialCategory === category ? 'contained' : 'text'}
                    onClick={() => {
                      setActiveMaterialCategory(category);
                      setSelectedMaterialId('');
                    }}
                    sx={{
                      minWidth: 110,
                      whiteSpace: 'nowrap',
                      textTransform: 'none',
                      fontWeight: 700,
                      color: activeMaterialCategory === category ? '#fff' : '#414753',
                    }}
                  >
                    {formatCategoryLabel(category)}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#414753', mb: 1.2 }}>Material Selection</Typography>
              <TextField
                select
                fullWidth
                value={selectedMaterialId}
                onChange={(event) => setSelectedMaterialId(event.target.value)}
                SelectProps={{ IconComponent: ArrowDropDown }}
              >
                {filteredMaterialOptions.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {getItemName(item)}
                  </MenuItem>
                ))}
              </TextField>
              {selectedMaterial && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#964400' }} />
                  <Typography sx={{ fontSize: 12, color: '#414753' }}>
                    Stock Status: <strong>Available: {selectedMaterialAvailableStock} {getItemUom(selectedMaterial)}</strong>
                  </Typography>
                </Stack>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#414753', mb: 1.2 }}>Quantity to Use</Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={materialQuantity}
                  onChange={(event) => setMaterialQuantity(event.target.value)}
                  error={materialExceedsStock}
                  placeholder="0.00"
                  InputProps={{ endAdornment: <Typography sx={{ color: '#414753', fontWeight: 600 }}>{getItemUom(selectedMaterial)}</Typography> }}
                />
                {materialExceedsStock && (
                  <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 1, color: '#ba1a1a' }}>
                    <WarningAmber sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 600 }}>
                      Exceeds current inventory ({selectedMaterialAvailableStock} {getItemUom(selectedMaterial)} available)
                    </Typography>
                  </Stack>
                )}
              </Grid>
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 2, height: '100%', bgcolor: '#f2f3fd', border: '1px solid rgba(113,119,133,0.2)' }}>
                  <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: '#414753', opacity: 0.7 }}>Cost Impact</Typography>
                  <Typography sx={{ fontSize: 12, color: '#414753', mt: 1 }}>Unit: <strong>{formatMoney(selectedMaterialUnitCost)}</strong></Typography>
                  <Typography sx={{ fontSize: 30, fontWeight: 900, color: '#005ab4', mt: 0.5 }}>{formatMoney(materialCostImpact)}</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(8,115,223,0.08)', border: '1px solid rgba(0,93,184,0.2)', display: 'flex', gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: 'rgba(8,115,223,0.1)', borderRadius: 1.5, height: 'fit-content' }}>
                <InfoOutlined sx={{ color: '#005ab4' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#00458d' }}>Production Optimization Tip</Typography>
                <Typography sx={{ fontSize: 12, color: '#414753', mt: 0.4 }}>
                  Adding a high material load may require a secondary replenishment cycle. Review current stock before committing this allocation.
                </Typography>
              </Box>
            </Paper>
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid #c1c6d5', bgcolor: '#f2f3fd', display: 'flex', justifyContent: 'flex-end', gap: 1.2 }}>
            <Button onClick={resetMaterialDialog} sx={{ fontWeight: 700 }}>Cancel</Button>
            <Button onClick={handleAddMaterial} variant="contained" disabled={modalSaving} sx={{ px: 3, fontWeight: 800 }}>
              Add to Order
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={laborDialogOpen} onClose={resetLaborDialog} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2.2, borderBottom: '1px solid #c1c6d5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff' }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800 }}>Add Labour to Order</Typography>
            <IconButton onClick={resetLaborDialog}><Close /></IconButton>
          </Box>
          <Box sx={{ p: 3, display: 'grid', gap: 3 }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#414753', mb: 1.2 }}>Select Employee</Typography>
              <TextField
                select
                fullWidth
                value={selectedLaborId}
                onChange={(event) => setSelectedLaborId(event.target.value)}
                SelectProps={{ IconComponent: ArrowDropDown }}
                InputProps={{ startAdornment: <Search sx={{ color: '#717785', mr: 1 }} /> }}
              >

                {laborMaster.map((labor) => (
                  <MenuItem key={labor.id} value={String(labor.id)}>
                    {getLaborOptionLabel(labor)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#414753', mb: 1.2 }}>Shift Type</Typography>
                <Grid container spacing={1.2}>
                  <Grid item xs={6}>
                    <Paper
                      onClick={() => setShiftType('DAY')}
                      sx={{
                        p: 1.5,
                        textAlign: 'center',
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: shiftType === 'DAY' ? '2px solid #005ab4' : '2px solid #c1c6d5',
                        bgcolor: shiftType === 'DAY' ? 'rgba(0,90,180,0.05)' : '#fff',
                      }}
                    >
                      <WbSunnyOutlined sx={{ color: shiftType === 'DAY' ? '#005ab4' : '#717785', mb: 0.5 }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: shiftType === 'DAY' ? '#005ab4' : '#414753' }}>Day Shift</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper
                      onClick={() => setShiftType('NIGHT')}
                      sx={{
                        p: 1.5,
                        textAlign: 'center',
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: shiftType === 'NIGHT' ? '2px solid #005ab4' : '2px solid #c1c6d5',
                        bgcolor: shiftType === 'NIGHT' ? 'rgba(0,90,180,0.05)' : '#fff',
                      }}
                    >
                      <NightlightOutlined sx={{ color: shiftType === 'NIGHT' ? '#005ab4' : '#717785', mb: 0.5 }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: shiftType === 'NIGHT' ? '#005ab4' : '#414753' }}>Night Shift</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#414753', mb: 1.2 }}>Number of Shifts</Typography>
                <TextField fullWidth type="number" value={shiftCount} onChange={(event) => setShiftCount(event.target.value)} inputProps={{ min: 1 }} />
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f2f3fd', border: '1px solid rgba(183,207,255,0.65)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Payments sx={{ color: '#005ab4', fontSize: 18 }} />
                  <Typography sx={{ fontSize: 14, color: '#414753' }}>Wage per Shift</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 800 }}>{formatMoney(wagePerShift)}</Typography>
              </Stack>
              <Divider sx={{ borderColor: 'rgba(191,219,254,0.7)' }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#005ab4', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Labour Cost</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 32, fontWeight: 900, color: '#005ab4' }}>{formatMoney(totalLaborModalCost)}</Typography>
                  <Typography sx={{ fontSize: 10, color: '#414753', fontStyle: 'italic' }}>Ref: Labor-Rate-Matrix-Q3</Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid #c1c6d5', bgcolor: '#f2f3fd', display: 'flex', justifyContent: 'flex-end', gap: 1.2 }}>
            <Button onClick={resetLaborDialog} sx={{ fontWeight: 700 }}>Cancel</Button>
            <Button onClick={handleAddLabor} variant="contained" disabled={modalSaving} sx={{ px: 3, fontWeight: 800 }}>
              Add to Order
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default OrderDetail;
