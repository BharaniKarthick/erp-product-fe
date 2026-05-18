import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Switch,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Select,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  AddCircle,
  Delete,
  Inventory2,
  Groups,
  PrecisionManufacturing,
  Public,
  AutoAwesome,
  CheckCircle,
  Warning,
  TrendingDown,
} from '@mui/icons-material';
import { orderService } from '../api/orderService';
import { inventoryService } from '../api/inventoryService';
import { customerService } from '../api/customerService';
import { aiService } from '../api/aiService';

const defaultForm = {
  orderNumber: '',
  customerId: '',
  customerName: '',
  customerContact: '',
  customerCode: '',
  productType: 'BROCHURE',
  fabricType: 'COTTON',
  gsm: '',
  baseColor: '',
  sizeS: '',
  sizeM: '',
  sizeL: '',
  sizeXL: '',
  printType: 'SCREEN_PRINTING',
  numberOfColors: '',
  printPlacement: 'FRONT',
  designReference: '',
  specialInstructions: '',
  orderQuantity: '',
  quotedPrice: '',
  orderDate: '',
  requestedDeliveryDate: '',
  status: 'PENDING',
  priority: 'STANDARD_NORMAL',
  estimatedLaborCost: '',
  estimatedMaterialCost: '',
  budgetThresholdPercent: '100',
  deliveryProximityAlertEnabled: true,
  proximityThresholdHours: '48',
  budgetOverrunAlertEnabled: true,
  notes: '',
};

const createMaterialRow = (id) => ({
  id,
  inventoryItemId: '',
  materialName: '',
  quantity: '1',
  unitCost: '0',
  availableQuantity: 0,
  unitOfMeasure: '',
});

const defaultMaterialRows = [createMaterialRow(1)];

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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

const parseStructuredNotes = (notesValue) => {
  const parsed = {};
  const raw = String(notesValue || '');
  if (!raw.trim()) return parsed;

  raw.split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (!key || rest.length === 0) return;
    parsed[key.trim()] = rest.join(':').trim();
  });

  return {
    customerContact: parsed['Customer Contact'] || '',
    fabricType: parsed['Fabric Type'] || '',
    gsm: parsed.GSM ? parsed.GSM.replace(/\s*GSM$/i, '').trim() : '',
    baseColor: parsed['Base Color'] || '',
    sizes: parsed.Sizes || '',
    printType: parsed['Print Type'] || '',
    numberOfColors: parsed['Number of Colors'] || '',
    printPlacement: parsed['Print Placement'] || '',
    designReference: parsed['Design Reference'] || '',
    specialInstructions: parsed['Special Instructions'] || '',
    freeformNotes: parsed.Notes || '',
  };
};

const parseSizes = (sizesValue) => {
  const result = { sizeS: '', sizeM: '', sizeL: '', sizeXL: '' };
  const raw = String(sizesValue || '').trim();
  if (!raw) return result;

  raw.split(',').forEach((pair) => {
    const [sizeKey, sizeValue] = pair.split(':').map((entry) => String(entry || '').trim());
    if (!sizeKey || !sizeValue) return;
    const normalized = sizeKey.toUpperCase();
    if (normalized === 'S') result.sizeS = sizeValue;
    if (normalized === 'M') result.sizeM = sizeValue;
    if (normalized === 'L') result.sizeL = sizeValue;
    if (normalized === 'XL') result.sizeXL = sizeValue;
  });

  return result;
};

const mapOrderToForm = (order) => {
  const parsedNotes = parseStructuredNotes(order.notes);
  const parsedSizes = parseSizes(parsedNotes.sizes);

  return {
    orderNumber: order.orderNumber || '',
    customerId: order.customerId || '',
    customerName: order.customerName || '',
    customerContact: order.customerContact || parsedNotes.customerContact || '',
    customerCode: order.customerCode || '',
    productType: order.productType || order.productName || 'BROCHURE',
    fabricType: order.fabricType || parsedNotes.fabricType || 'COTTON',
    gsm: String(order.gsm ?? parsedNotes.gsm ?? ''),
    baseColor: order.baseColor || order.color || parsedNotes.baseColor || '',
    sizeS: String(order.sizeS ?? parsedSizes.sizeS ?? ''),
    sizeM: String(order.sizeM ?? parsedSizes.sizeM ?? ''),
    sizeL: String(order.sizeL ?? parsedSizes.sizeL ?? ''),
    sizeXL: String(order.sizeXL ?? parsedSizes.sizeXL ?? ''),
    printType: order.printType || parsedNotes.printType || 'SCREEN_PRINTING',
    numberOfColors: String(order.numberOfColors ?? parsedNotes.numberOfColors ?? ''),
    printPlacement: order.printPlacement || parsedNotes.printPlacement || 'FRONT',
    designReference: order.designReference || parsedNotes.designReference || '',
    specialInstructions: order.specialInstructions || parsedNotes.specialInstructions || '',
    orderQuantity: String(order.orderQuantity ?? order.quantity ?? ''),
    quotedPrice: String(order.quotedPrice ?? order.unitPrice ?? ''),
    orderDate: toDateInput(order.orderDate || order.createdAt),
    requestedDeliveryDate: toDateInput(order.requestedDeliveryDate || order.requestedDelivery || order.dueDate),
    status: order.status || 'PENDING',
    priority: order.priority || 'STANDARD_NORMAL',
    estimatedLaborCost: String(order.estimatedLaborCost ?? ''),
    estimatedMaterialCost: String(order.estimatedMaterialCost ?? ''),
    budgetThresholdPercent: String(order.budgetThresholdPercent ?? 100),
    deliveryProximityAlertEnabled: Boolean(order.deliveryProximityAlertEnabled ?? true),
    proximityThresholdHours: String(order.proximityThresholdHours ?? 48),
    budgetOverrunAlertEnabled: Boolean(order.budgetOverrunAlertEnabled ?? true),
    notes: parsedNotes.freeformNotes || '',
  };
};

const mapOrderMaterialsToRows = (order) => {
  const source = normalizeList(order, ['orderMaterials', 'materials', 'materialEntries']);
  if (!source.length) return defaultMaterialRows;

  const estimatedOnly = source.filter((material) => {
    const materialType = String(material?.materialType || '').toUpperCase();
    const usageType = String(material?.usageType || '').toUpperCase();

    if (usageType) return usageType === 'ESTIMATED';
    if (materialType) return materialType !== 'ACTUAL';

    // Backward compatibility for old payloads that do not carry usage/material type.
    return true;
  });

  if (!estimatedOnly.length) return defaultMaterialRows;

  return estimatedOnly.map((material, index) => ({
    id: index + 1,
    inventoryItemId: String(material?.inventoryItemId ?? material?.itemId ?? material?.materialId ?? ''),
    materialName: String(material?.materialName ?? material?.name ?? material?.itemName ?? ''),
    quantity: String(material?.quantity ?? material?.usedQuantity ?? 1),
    unitCost: String(material?.unitCost ?? material?.costPerUnit ?? 0),
    availableQuantity: Number(material?.availableQuantity ?? material?.currentStock ?? 0),
    unitOfMeasure: String(material?.unitOfMeasure ?? material?.uom ?? material?.unit ?? ''),
  }));
};

const toCurrency = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const uiScale = {
  pageTitle: { xs: 24, md: 34 },
  sectionTitle: 17,
  metric: 28,
  heroMetric: 30,
};

const normalizeInventoryItem = (entry) => ({
  id: String(entry?.id ?? ''),
  name: String(entry?.name || entry?.itemName || entry?.materialName || 'Unknown Item'),
  unitCost: Number(entry?.unitCost ?? 0),
  availableQuantity: Number(entry?.currentStock ?? entry?.currentQuantity ?? 0),
  unitOfMeasure: String(entry?.unitOfMeasure || entry?.unit || ''),
  itemCode: String(entry?.itemCode || ''),
});

const normalizeCustomerOption = (entry) => ({
  id: String(entry?.id ?? ''),
  customerCode: String(entry?.customerCode || ''),
  companyName: String(entry?.companyName || ''),
  contactPerson: String(entry?.contactPerson || ''),
  mobile: String(entry?.mobile || entry?.phone || ''),
  email: String(entry?.email || ''),
});

const buildStructuredNotes = (formData) => {
  const detailPairs = [
    ['Customer Contact', formData.customerContact],
    ['Fabric Type', formData.fabricType],
    ['GSM', formData.gsm ? `${formData.gsm} GSM` : ''],
    ['Base Color', formData.baseColor],
    ['Sizes', [
      formData.sizeS ? `S:${formData.sizeS}` : '',
      formData.sizeM ? `M:${formData.sizeM}` : '',
      formData.sizeL ? `L:${formData.sizeL}` : '',
      formData.sizeXL ? `XL:${formData.sizeXL}` : '',
    ].filter(Boolean).join(', ')],
    ['Print Type', formData.printType],
    ['Number of Colors', formData.numberOfColors],
    ['Print Placement', formData.printPlacement],
    ['Design Reference', formData.designReference],
    ['Special Instructions', formData.specialInstructions],
  ];

  const generatedDetails = detailPairs
    .filter(([, value]) => String(value || '').trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join('\n');

  const freeformNotes = String(formData.notes || '').trim();
  if (generatedDetails && freeformNotes) return `${generatedDetails}\n\nNotes: ${freeformNotes}`;
  return generatedDetails || freeformNotes || undefined;
};

const buildMaterialPayloadRows = (rows) =>
  rows
    .map((row) => {
      const quantity = toNumberOrNull(row.quantity);
      const unitCost = toNumberOrNull(row.unitCost);
      const totalCost = Number(quantity || 0) * Number(unitCost || 0);
      const inventoryItemId = toNumberOrNull(row.inventoryItemId);

      if ((!inventoryItemId && !String(row.materialName || '').trim()) || !quantity || quantity <= 0) {
        return null;
      }

      return {
        inventoryItemId,
        itemId: inventoryItemId,
        materialId: inventoryItemId,

        usageType: 'ESTIMATED',
        materialType: 'ESTIMATED',
        materialStage: 'ORDER_PLANNING',
        materialName: String(row.materialName || '').trim() || undefined,
        quantity,
        unitCost,
        unitOfMeasure: String(row.unitOfMeasure || '').trim() || undefined,
        availableQuantity: Number(row.availableQuantity || 0),
        totalCost,
        stockStatus: quantity > Number(row.availableQuantity || 0) ? 'REQUIRED_PO' : 'IN_STOCK',
      };
    })
    .filter(Boolean);

const OrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState(defaultForm);
  const [materials, setMaterials] = useState(defaultMaterialRows);
  const [inventoryCatalog, setInventoryCatalog] = useState([]);
  const [customerCatalog, setCustomerCatalog] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (!isEditMode) return;

    const loadOrder = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await orderService.getOrderDetail(id);
        const safeOrder = normalizeOrderDetailResponse(response);
        setFormData(mapOrderToForm(safeOrder));
        setMaterials(mapOrderMaterialsToRows(safeOrder));
      } catch (err) {
        setError('Failed to load order details for editing.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id, isEditMode]);

  useEffect(() => {
    const loadInventoryCatalog = async () => {
      try {
        setInventoryLoading(true);
        const response = await inventoryService.getAllItems();
        const rows = Array.isArray(response) ? response : [];
        const normalized = rows.map(normalizeInventoryItem).filter((item) => item.id);
        setInventoryCatalog(normalized);
      } catch (err) {
        console.error('Failed to load inventory items for order materials.', err);
        setInventoryCatalog([]);
      } finally {
        setInventoryLoading(false);
      }
    };

    loadInventoryCatalog();
  }, []);

  useEffect(() => {
    const loadCustomerCatalog = async () => {
      try {
        setCustomerLoading(true);
        const response = await customerService.getAllCustomers();
        const rows = Array.isArray(response) ? response : [];
        const normalized = rows.map(normalizeCustomerOption).filter((item) => item.id || item.companyName || item.customerCode);
        setCustomerCatalog(normalized);
      } catch (err) {
        console.error('Failed to load customers for order form.', err);
        setCustomerCatalog([]);
      } finally {
        setCustomerLoading(false);
      }
    };

    loadCustomerCatalog();
  }, []);

  const inventoryById = useMemo(() => {
    const map = new Map();
    inventoryCatalog.forEach((item) => map.set(item.id, item));
    return map;
  }, [inventoryCatalog]);

  const customerById = useMemo(() => {
    const map = new Map();
    customerCatalog.forEach((item) => map.set(item.id, item));
    return map;
  }, [customerCatalog]);

  const customerByName = useMemo(() => {
    const map = new Map();
    customerCatalog.forEach((item) => {
      if (item.companyName) map.set(item.companyName, item);
    });
    return map;
  }, [customerCatalog]);

  const estimatedMaterialCostFromRows = useMemo(
    () =>
      materials.reduce(
        (sum, row) => sum + Number(row?.quantity || 0) * Number(row?.unitCost || 0),
        0
      ),
    [materials]
  );

  const effectiveMaterialCost = useMemo(() => {
    const fromForm = Number(formData.estimatedMaterialCost || 0);
    return fromForm > 0 ? fromForm : estimatedMaterialCostFromRows;
  }, [estimatedMaterialCostFromRows, formData.estimatedMaterialCost]);

  const aggregateProjection = Number(formData.estimatedLaborCost || 0) + effectiveMaterialCost;

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomerNameSelect = (event) => {
    const selectedName = event.target.value;
    const selected = customerByName.get(selectedName);

    if (!selected) {
      setFormData((prev) => ({ ...prev, customerName: selectedName }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      customerName: selected.companyName || prev.customerName,
      customerId: selected.id || prev.customerId,
      customerCode: selected.customerCode || prev.customerCode,
      customerContact: selected.contactPerson || selected.mobile || selected.email || prev.customerContact,
    }));
  };

  const handleCustomerIdSelect = (event) => {
    const selectedId = event.target.value;
    const selected = customerById.get(String(selectedId));

    if (!selected) {
      setFormData((prev) => ({ ...prev, customerId: selectedId }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      customerId: selected.id || prev.customerId,
      customerName: selected.companyName || prev.customerName,
      customerCode: selected.customerCode || prev.customerCode,
      customerContact: selected.contactPerson || selected.mobile || selected.email || prev.customerContact,
    }));
  };

  const handleMaterialChange = (idValue, field, value) => {
    setMaterials((prev) =>
      prev.map((row) => (row.id === idValue ? { ...row, [field]: value } : row))
    );
  };

  const handleMaterialSelect = (idValue, inventoryItemId) => {
    const selected = inventoryById.get(String(inventoryItemId));

    setMaterials((prev) =>
      prev.map((row) => {
        if (row.id !== idValue) return row;
        if (!selected) {
          return {
            ...row,
            inventoryItemId: '',
            materialName: '',
            unitCost: '0',
            availableQuantity: 0,
            unitOfMeasure: '',
          };
        }

        return {
          ...row,
          inventoryItemId: selected.id,
          materialName: selected.name,
          unitCost: String(selected.unitCost),
          availableQuantity: selected.availableQuantity,
          unitOfMeasure: selected.unitOfMeasure,
        };
      })
    );
  };

  const handleAddMaterialRow = () => {
    const nextId = materials.length ? Math.max(...materials.map((m) => m.id)) + 1 : 1;
    const firstInventoryItem = inventoryCatalog[0];
    const newRow = createMaterialRow(nextId);

    setMaterials((prev) => {
      const next = [...prev, newRow];
      if (!firstInventoryItem) return next;
      return next.map((row) =>
        row.id === nextId
          ? {
              ...row,
              inventoryItemId: firstInventoryItem.id,
              materialName: firstInventoryItem.name,
              unitCost: String(firstInventoryItem.unitCost),
              availableQuantity: firstInventoryItem.availableQuantity,
              unitOfMeasure: firstInventoryItem.unitOfMeasure,
            }
          : row
      );
    });
  };

  const handleRemoveMaterialRow = (idValue) => {
    setMaterials((prev) => prev.filter((row) => row.id !== idValue));
  };

  const handleAiPredict = async () => {
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiResult(null);
    setAiError('');
    try {
      const payload = {
        productType: formData.productType,
        fabricType: formData.fabricType,
        gsm: formData.gsm ? Number(formData.gsm) : null,
        baseColor: formData.baseColor || null,
        orderQuantity: formData.orderQuantity ? Number(formData.orderQuantity) : null,
        printType: formData.printType,
        numberOfColors: formData.numberOfColors ? Number(formData.numberOfColors) : null,
        printPlacement: formData.printPlacement || null,
        specialInstructions: formData.specialInstructions || null,
        sizeS: formData.sizeS ? Number(formData.sizeS) : null,
        sizeM: formData.sizeM ? Number(formData.sizeM) : null,
        sizeL: formData.sizeL ? Number(formData.sizeL) : null,
        sizeXL: formData.sizeXL ? Number(formData.sizeXL) : null,
        quotedUnitPrice: formData.quotedPrice ? Number(formData.quotedPrice) : null,
      };
      const result = await aiService.estimateProductionCosts(payload);
      setAiResult(result);
    } catch (err) {
      setAiError(err?.response?.data?.message || 'AI estimation failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiEstimate = () => {
    if (!aiResult) return;
    // Apply labor cost
    setFormData((prev) => ({
      ...prev,
      estimatedLaborCost: String(aiResult.totalEstimatedLaborCost.toFixed(2)),
      estimatedMaterialCost: String(aiResult.totalEstimatedMaterialCost.toFixed(2)),
    }));
    // Add AI-suggested materials as new rows (mapped to free-text since AI won't know inventory IDs)
    if (aiResult.materials && aiResult.materials.length > 0) {
      const aiRows = aiResult.materials.map((mat, idx) => ({
        id: Date.now() + idx,
        inventoryItemId: '',
        materialName: mat.materialName,
        quantity: String(mat.quantity),
        unitCost: String(mat.estimatedUnitCost),
        availableQuantity: 0,
        unitOfMeasure: mat.unitOfMeasure,
      }));
      setMaterials(aiRows);
    }
    setAiDialogOpen(false);
  };

  const validate = () => {
    if (!String(formData.customerName || '').trim()) return 'Customer name is required.';
    if (!formData.orderQuantity || Number(formData.orderQuantity) <= 0) return 'Order quantity must be greater than 0.';
    if (!formData.quotedPrice || Number(formData.quotedPrice) <= 0) return 'Quoted unit price must be greater than 0.';
    return '';
  };

  const buildPayload = () => {
    const materialRows = buildMaterialPayloadRows(materials);

    return {
      orderNumber: formData.orderNumber || undefined,
      customerId: String(formData.customerId || '').trim() || undefined,
      customerName: String(formData.customerName || '').trim(),
      customerContact: String(formData.customerContact || '').trim() || undefined,
      customerCode: String(formData.customerCode || '').trim() || undefined,

      productType: formData.productType,
      productName: formData.productType,
      fabricType: formData.fabricType || undefined,
      gsm: toNumberOrNull(formData.gsm),
      baseColor: String(formData.baseColor || '').trim() || undefined,
      color: String(formData.baseColor || '').trim() || undefined,
      sizeS: toNumberOrNull(formData.sizeS),
      sizeM: toNumberOrNull(formData.sizeM),
      sizeL: toNumberOrNull(formData.sizeL),
      sizeXL: toNumberOrNull(formData.sizeXL),

      printType: formData.printType || undefined,
      numberOfColors: toNumberOrNull(formData.numberOfColors),
      printPlacement: formData.printPlacement || undefined,
      designReference: String(formData.designReference || '').trim() || undefined,
      specialInstructions: String(formData.specialInstructions || '').trim() || undefined,

      orderQuantity: toNumberOrNull(formData.orderQuantity),
      quantity: toNumberOrNull(formData.orderQuantity),
      quotedPrice: toNumberOrNull(formData.quotedPrice),
      unitPrice: toNumberOrNull(formData.quotedPrice),
      orderDate: formData.orderDate || null,
      requestedDeliveryDate: formData.requestedDeliveryDate || null,
      requestedDelivery: formData.requestedDeliveryDate || null,
      dueDate: formData.requestedDeliveryDate || null,
      status: formData.status,
      priority: formData.priority,

      estimatedLaborCost: toNumberOrNull(formData.estimatedLaborCost),
      estimatedMaterialCost: Number(effectiveMaterialCost || 0),
      budgetThresholdPercent: toNumberOrNull(formData.budgetThresholdPercent),
      deliveryProximityAlertEnabled: Boolean(formData.deliveryProximityAlertEnabled),
      proximityThresholdHours: toNumberOrNull(formData.proximityThresholdHours),
      budgetOverrunAlertEnabled: Boolean(formData.budgetOverrunAlertEnabled),

      orderMaterials: materialRows,
      materials: materialRows,
      materialEntries: materialRows,

      notes: String(formData.notes || '').trim() || undefined,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = buildPayload();

      if (isEditMode) {
        await orderService.updateOrder(id, payload);
        setSuccessMessage('Order updated successfully.');
      } else {
        await orderService.createOrder(payload);
        setSuccessMessage('Order created successfully.');
      }

      setTimeout(() => navigate('/orders'), 600);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to save order.';
      setError(message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
    <Box
      sx={{
        p: { xs: 1.5, md: 2.5 },
        maxWidth: 1200,
        mx: 'auto',
        backgroundImage:
          'linear-gradient(#ecedf7 1px, transparent 1px), linear-gradient(90deg, #ecedf7 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        borderRadius: 3,
        '& .MuiInputBase-input': { fontSize: '0.8rem' },
        '& .MuiInputLabel-root': { fontSize: '0.74rem' },
        '& .MuiButton-root': { fontSize: '0.7rem' },
        '& .MuiInputBase-root': { minHeight: 40 },
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Box sx={{ mb: 3.5 }}>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#005ab4', mb: 1 }}>
          <AddCircle fontSize="small" />
          <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em' }}>
            Process Initiation
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: uiScale.pageTitle, lineHeight: 1, fontWeight: 900, color: '#181c22', mb: 1.1 }}>
          {isEditMode ? 'Edit Order' : 'Create Order'}
        </Typography>
        <Typography sx={{ color: '#414753', fontWeight: 600 }}>
          Create Order • Phase 01: Order Intake
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ pb: 3.5 }}>

        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid #e2e8f0', mb: 2.2 }}>
          <Typography sx={{ fontSize: uiScale.sectionTitle, fontWeight: 800, color: '#181c22', mb: 2, display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.2, bgcolor: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>01</Box>
            Basic Order Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Order Number"
                placeholder="Auto-generated (e.g., ORD-2026-0042)"
                value={formData.orderNumber}
                onChange={handleChange('orderNumber')}
                InputProps={{ readOnly: !isEditMode }}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>

              <TextField
                select
                fullWidth
                label="Customer Name"
                value={formData.customerName}
                onChange={handleCustomerNameSelect}
                sx={{ minWidth: { xs: 220, md: 260 } }}
                required
              >
                {customerLoading && <MenuItem value="">Loading customers...</MenuItem>}
                {!customerLoading && customerCatalog.length === 0 && (
                  <MenuItem value="">No customers found</MenuItem>
                )}
                {!customerLoading && customerCatalog.map((customer) => (
                  <MenuItem key={`name-${customer.id || customer.companyName}`} value={customer.companyName}>
                    {customer.companyName || 'Unnamed Customer'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Customer Contact (Phone / Email)"
                placeholder="Example: +1 214 555 0182 or ops@metrotextiles.com"
                value={formData.customerContact}
                onChange={handleChange('customerContact')}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Order Quantity (Pieces)"
                type="number"
                value={formData.orderQuantity}
                onChange={handleChange('orderQuantity')}
                inputProps={{ min: 1 }}
                placeholder="Example: 500"
                required
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Quoted Unit Price (USD)"
                type="number"
                value={formData.quotedPrice}
                onChange={handleChange('quotedPrice')}
                inputProps={{ min: 0, step: '0.01' }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Order Date"
                type="date"
                value={formData.orderDate}
                onChange={handleChange('orderDate')}
                variant="outlined"
                InputLabelProps={{ shrink: true, sx: { bgcolor: '#fff', px: 0.5 } }}
                inputProps={{ placeholder: '' }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    paddingTop: '8px',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Delivery Date"
                type="date"
                value={formData.requestedDeliveryDate}
                onChange={handleChange('requestedDeliveryDate')}
                variant="outlined"
                InputLabelProps={{ shrink: true, sx: { bgcolor: '#fff', px: 0.5 } }}
                inputProps={{ placeholder: '' }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    paddingTop: '8px',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Customer Code"
                placeholder="Example: CUST-102"
                value={formData.customerCode}
                onChange={handleChange('customerCode')}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>

              <TextField
                select
                fullWidth
                label="Customer ID"
                value={formData.customerId}
                onChange={handleCustomerIdSelect}
                sx={{ minWidth: { xs: 220, md: 260 } }}
              >
                {customerLoading && <MenuItem value="">Loading customer IDs...</MenuItem>}
                {!customerLoading && customerCatalog.length === 0 && (
                  <MenuItem value="">No customer IDs found</MenuItem>
                )}
                {!customerLoading && customerCatalog.map((customer) => (
                  <MenuItem key={`id-${customer.id || customer.customerCode || customer.companyName}`} value={customer.id}>
                    {customer.id || '-'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid #e2e8f0', mb: 2.2 }}>
          <Typography sx={{ fontSize: uiScale.sectionTitle, fontWeight: 800, color: '#181c22', mb: 2, display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.2, bgcolor: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>02</Box>
            Product Details
          </Typography>

          <Grid container spacing={2}>

            <Grid item xs={12} md={6} lg={5}>
              <TextField
                select
                fullWidth
                label="Product Type"
                value={formData.productType}
                onChange={handleChange('productType')}
                sx={{ minWidth: { md: 250 } }}
              >
                <MenuItem value="TSHIRT">T-shirt</MenuItem>
                <MenuItem value="HOODIE">Hoodie</MenuItem>
                <MenuItem value="FABRIC">Fabric</MenuItem>
                <MenuItem value="BANNER">Banner</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                select
                fullWidth
                label="Fabric Type"
                value={formData.fabricType}
                onChange={handleChange('fabricType')}
              >
                <MenuItem value="COTTON">Cotton</MenuItem>
                <MenuItem value="POLYESTER">Polyester</MenuItem>
                <MenuItem value="BLENDED">Blended</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="GSM (Fabric Weight)"
                type="number"
                placeholder="Example: 180"
                value={formData.gsm}
                onChange={handleChange('gsm')}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Color"
                placeholder="Example: Navy Blue"
                value={formData.baseColor}
                onChange={handleChange('baseColor')}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.2 }}>
                Sizes Breakdown
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth type="number" label="S" placeholder="Example: 80" value={formData.sizeS} onChange={handleChange('sizeS')} inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth type="number" label="M" placeholder="Example: 150" value={formData.sizeM} onChange={handleChange('sizeM')} inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth type="number" label="L" placeholder="Example: 170" value={formData.sizeL} onChange={handleChange('sizeL')} inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth type="number" label="XL" placeholder="Example: 100" value={formData.sizeXL} onChange={handleChange('sizeXL')} inputProps={{ min: 0 }} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid #e2e8f0', mb: 2.2 }}>
          <Typography sx={{ fontSize: uiScale.sectionTitle, fontWeight: 800, color: '#181c22', mb: 2, display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.2, bgcolor: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>03</Box>
            Printing Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                select
                fullWidth
                label="Print Type"
                value={formData.printType}
                onChange={handleChange('printType')}
              >
                <MenuItem value="SCREEN_PRINTING">Screen printing</MenuItem>
                <MenuItem value="DTG">DTG</MenuItem>
                <MenuItem value="HEAT_TRANSFER">Heat transfer</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Number of Colors"
                type="number"
                placeholder="Example: 4"
                value={formData.numberOfColors}
                onChange={handleChange('numberOfColors')}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                select
                fullWidth
                label="Print Placement"
                value={formData.printPlacement}
                onChange={handleChange('printPlacement')}
              >
                <MenuItem value="FRONT">Front</MenuItem>
                <MenuItem value="BACK">Back</MenuItem>
                <MenuItem value="SLEEVE">Sleeve</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Design Reference"
                placeholder="Example: DR-2026-SUMMER-015"
                value={formData.designReference}
                onChange={handleChange('designReference')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Special Instructions"
                placeholder="Example: Gloss finish, eco ink"
                value={formData.specialInstructions}
                onChange={handleChange('specialInstructions')}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, bgcolor: '#2d3038', color: '#eff0fa', mb: 2.2, boxShadow: '0 20px 40px rgba(15,23,42,0.25)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 2.2 }}>
            <Typography sx={{ fontSize: uiScale.sectionTitle, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 1.2, bgcolor: '#005ab4', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>04</Box>
              Estimated Production Costs
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AutoAwesome />}
                onClick={handleAiPredict}
                type="button"
                sx={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 800,
                  px: 2,
                  borderRadius: 2,
                  '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #4338ca)' },
                }}
              >
                Predict Materials with AI
              </Button>
              <Button startIcon={<Add />} onClick={handleAddMaterialRow} type="button" sx={{ bgcolor: '#475569', color: '#fff', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#64748b' } }}>
                Add Materials
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={1.6} sx={{ mb: 2.2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.2, bgcolor: 'rgba(15,23,42,0.45)', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 2, color: '#fff' }}>
                <Typography sx={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.12em', mb: 1.2 }}>
                  Estimated Total Labor Cost
                </Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography sx={{ color: '#94a3b8' }}>USD</Typography>
                  <TextField
                    variant="standard"
                    value={formData.estimatedLaborCost}
                    onChange={handleChange('estimatedLaborCost')}
                    type="number"
                    InputProps={{ disableUnderline: true }}
                    sx={{
                      '& input': { color: '#fff', fontSize: uiScale.metric, fontWeight: 900, p: 0 },
                      flex: 1,
                    }}
                  />
                  <Groups sx={{ color: 'rgba(255,255,255,0.18)', fontSize: 36 }} />
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.2, bgcolor: 'rgba(15,23,42,0.45)', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 2, color: '#fff' }}>
                <Typography sx={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.12em', mb: 1.2 }}>
                  Estimated Total Material Cost
                </Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography sx={{ color: '#94a3b8' }}>USD</Typography>
                  <Typography sx={{ fontSize: uiScale.metric, fontWeight: 900 }}>{toCurrency(effectiveMaterialCost)}</Typography>
                  <Inventory2 sx={{ color: 'rgba(255,255,255,0.18)', fontSize: 36, ml: 'auto' }} />
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Stack spacing={1} sx={{ mb: 2.2 }}>
            {materials.map((row) => {
              const lineCost = Number(row?.quantity || 0) * Number(row?.unitCost || 0);
              const availableQuantity = Number(row?.availableQuantity || 0);
              const requestedQuantity = Number(row?.quantity || 0);
              const isOverRequested = Boolean(row.inventoryItemId) && requestedQuantity > availableQuantity;
              const helperText = row.inventoryItemId
                ? `Available: ${availableQuantity.toLocaleString()} ${row.unitOfMeasure || 'units'}`
                : 'Select material to see available stock';

              return (
                <Grid
                  key={row.id}
                  container
                  spacing={1.2}
                  alignItems="center"
                  sx={{ p: 1.6, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.35)', border: '1px solid rgba(100,116,139,0.35)' }}
                >

                  <Grid item xs={12} md={5}>
                    <FormControl fullWidth size="small" sx={{ minWidth: { md: 280 } }}>
                      <InputLabel sx={{ color: '#94a3b8' }}>Material Name</InputLabel>
                      <Select
                        value={row.inventoryItemId || ''}
                        label="Material Name"
                        onChange={(event) => handleMaterialSelect(row.id, event.target.value)}
                        sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#475569' } }}
                      >
                        {inventoryLoading && <MenuItem value="">Loading inventory items...</MenuItem>}
                        {!inventoryLoading && inventoryCatalog.length === 0 && (
                          <MenuItem value="">No inventory items found</MenuItem>
                        )}
                        {!inventoryLoading && inventoryCatalog.map((option) => (
                          <MenuItem key={option.id} value={option.id}>
                            {option.name}{option.itemCode ? ` (${option.itemCode})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={row.quantity}
                      onChange={(event) => handleMaterialChange(row.id, 'quantity', event.target.value)}
                      inputProps={{ min: 0 }}
                      helperText={helperText}
                      sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' }, '& .MuiFormHelperText-root': { color: '#fff' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Unit Cost"
                      type="number"
                      value={row.unitCost}
                      onChange={(event) => handleMaterialChange(row.id, 'unitCost', event.target.value)}
                      sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' } }}
                    />
                  </Grid>
                  <Grid item xs={10} md={2}>
                    {!isOverRequested ? (
                      <Chip label="In Stock" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 800 }} />
                    ) : (
                      <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
                        <Chip label="Required PO" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.2)', color: '#f87171', fontWeight: 800 }} />
                        <Button
                          size="small"
                          type="button"
                          variant="outlined"
                          onClick={() => navigate('/inventory/new')}
                          sx={{
                            color: '#f59e0b',
                            borderColor: 'rgba(245,158,11,0.6)',
                            minWidth: 0,
                            px: 1,
                            py: 0.2,
                            textTransform: 'none',
                            fontWeight: 700,
                            '&:hover': { borderColor: '#f59e0b' },
                          }}
                        >
                          Order Item
                        </Button>
                      </Stack>
                    )}
                    <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.6 }}>Line Cost: ${toCurrency(lineCost)}</Typography>
                  </Grid>
                  <Grid item xs={2} md={1} sx={{ textAlign: 'right' }}>
                    <IconButton type="button" onClick={() => handleRemoveMaterialRow(row.id)} sx={{ color: '#94a3b8' }}>
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              );
            })}
          </Stack>

          <Paper sx={{ p: 2.4, borderRadius: 2, bgcolor: '#005ab4', color: '#fff' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.75)' }}>
                  Aggregate Projection
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>
                  Total overhead before logistics adjustment.
                </Typography>
              </Box>
              <Typography sx={{ fontSize: uiScale.heroMetric, fontWeight: 900 }}>{toCurrency(aggregateProjection)}</Typography>
            </Stack>
          </Paper>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid #e2e8f0', mb: 2.2 }}>
          <Typography sx={{ fontSize: uiScale.sectionTitle, fontWeight: 800, color: '#181c22', mb: 2, display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.2, bgcolor: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>05</Box>
            Alert Configuration
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  <Switch
                    checked={formData.deliveryProximityAlertEnabled}
                    onChange={handleChange('deliveryProximityAlertEnabled')}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: '#181c22' }}>
                      Delivery Date Proximity Alert
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#414753', mb: 1.2 }}>
                      Notify the operations team when the requested delivery date is approaching.
                    </Typography>
                    <TextField
                      select
                      size="small"
                      label="Threshold"
                      value={formData.proximityThresholdHours}
                      onChange={handleChange('proximityThresholdHours')}
                      disabled={!formData.deliveryProximityAlertEnabled}
                    >
                      <MenuItem value="24">Within 24 Hours</MenuItem>
                      <MenuItem value="48">Within 48 Hours</MenuItem>
                      <MenuItem value="72">Within 72 Hours</MenuItem>
                    </TextField>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  <Switch
                    checked={formData.budgetOverrunAlertEnabled}
                    onChange={handleChange('budgetOverrunAlertEnabled')}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: '#181c22' }}>
                      Budget Overrun Alert
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#414753', mb: 1.2 }}>
                      Trigger notification if production costs exceed estimate or quoted price.
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        type="number"
                        value={formData.budgetThresholdPercent}
                        onChange={handleChange('budgetThresholdPercent')}
                        inputProps={{ min: 1, step: 1 }}
                        sx={{ width: 90 }}
                      />
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>% of cost</Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Internal Notes"
            value={formData.notes}
            onChange={handleChange('notes')}
            sx={{ mt: 1.8 }}
          />
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: '#181c22', mb: 1.8, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <PrecisionManufacturing sx={{ color: '#2563eb', fontSize: 18 }} />
                Production Site Reference
              </Typography>
              <Box
                component="img"
                alt="Industrial factory interior"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-mYYUSUV6nURFa4j1JGvTLuwkJSwiJNpq7jb99HJ43sJZvV_Xw7ANn7Xo2UC5bsapX6Mh1AY2zqe-b88Ht3wflWr2YYyAktxmZTkimWEEDdmtVtko8O9qWikNutACI_nZy4L8IGNKqXNyIrIxthoAmIFBIJpVE3UTXbf0KePHJQS7nbuNFgkR7QXNnTtoA6OCEoaI6mSY0PpRjwypTnaGnSBwMUtE4AhRCGvg9T4geJTvwjEvqcvdPx2YTUpWyguFdsmpOGrWRpA"
                sx={{ width: '100%', height: 210, objectFit: 'cover', borderRadius: 2, border: '1px solid #f1f5f9', mb: 1.2 }}
              />
              <Typography sx={{ fontSize: 12, color: '#414753' }}>
                Default production lane assigned: <b>Terminal 04-B</b>. Verify material lead times in Inventory module before commit.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: '#181c22', mb: 1.8 }}>
                  Quick Resource Stats
                </Typography>
                <Stack spacing={1.6}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Utilization Rate</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#181c22' }}>84.2%</Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Capacity Window</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#181c22' }}>14 Days</Typography>
                  </Stack>
                </Stack>
              </Box>

              <Box sx={{ mt: 2.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', mb: 1 }}>
                  Geographic Map
                </Typography>
                <Box sx={{ height: 130, borderRadius: 2, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'grid', placeItems: 'center' }}>
                  <Public sx={{ color: '#94a3b8' }} />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.5}
          sx={{ pt: 2, borderTop: '1px solid #e2e8f0' }}
        >
          <Button
            type="button"
            onClick={() => navigate('/orders')}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#64748b' }}
          >
            Discard_Draft
          </Button>
          <Stack direction="row" spacing={1.2}>
            <Button
              type="submit"
              disabled={saving}
              variant="outlined"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, borderWidth: 2 }}
            >
              Save_To_Queue
            </Button>
            <Button
              type="submit"
              disabled={saving}
              variant="contained"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900, px: 2.5 }}
            >
              {saving ? 'Saving...' : 'Authorize_Production'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>

    {/* AI Prediction Dialog */}
    <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.2 }}>
        <AutoAwesome sx={{ color: '#7c3aed', fontSize: 22 }} />
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: 16 }}>AI Production Estimate</Typography>
          <Typography sx={{ fontSize: 12, color: '#64748b' }}>Powered by Groq · Llama 3.3 70B</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {aiLoading && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 2.5, borderRadius: 2, height: 6 }} />
            <Typography sx={{ color: '#64748b', fontWeight: 700 }}>Analysing order details with AI...</Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.5 }}>Estimating materials, labour hours & operational costs</Typography>
          </Box>
        )}

        {aiError && (
          <Alert severity="error" sx={{ mb: 2 }}>{aiError}</Alert>
        )}

        {aiResult && !aiLoading && (
          <Box>
            {/* Verdict Banner */}
            {(() => {
              const verdict = aiResult.quotationVerdict;
              const config =
                verdict === 'PROFITABLE'
                  ? { bg: '#dcfce7', color: '#15803d', Icon: CheckCircle, label: 'PROFITABLE — Quotation covers costs with margin' }
                  : verdict === 'BREAK_EVEN'
                    ? { bg: '#fef9c3', color: '#92400e', Icon: Warning, label: 'BREAK EVEN — Quotation barely covers costs' }
                    : { bg: '#fee2e2', color: '#b91c1c', Icon: TrendingDown, label: 'LOSS — Quotation is below estimated cost' };
              return (
                <Paper sx={{ p: 1.8, mb: 2.5, bgcolor: config.bg, border: `1px solid ${config.color}40`, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <config.Icon sx={{ color: config.color, mt: 0.2, fontSize: 20 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: config.color, fontSize: 13 }}>{config.label}</Typography>
                      <Typography sx={{ fontSize: 12, color: config.color, mt: 0.4, opacity: 0.85 }}>{aiResult.quotationAnalysis}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              );
            })()}

            {/* Cost Summary */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2.5 }}>
              {[
                { label: 'Est. Material Cost', value: `$${aiResult.totalEstimatedMaterialCost.toFixed(2)}`, color: '#1d4ed8' },
                { label: 'Est. Labour Cost', value: `$${aiResult.totalEstimatedLaborCost.toFixed(2)}`, color: '#7c3aed' },
                { label: 'Total Operational Cost', value: `$${aiResult.totalOperationalCost.toFixed(2)}`, color: '#b91c1c' },
              ].map((item) => (
                <Paper key={item.label} sx={{ p: 1.8, borderRadius: 2, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.value}</Typography>
                </Paper>
              ))}
            </Box>

            {/* Materials Table */}
            <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' }}>
              Suggested Materials
            </Typography>
            <Paper sx={{ mb: 2.5, border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['Material', 'Qty', 'Unit', 'Unit Cost', 'Total', 'Rationale'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', color: '#64748b' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aiResult.materials.map((mat, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{mat.materialName}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{mat.quantity}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{mat.unitOfMeasure}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>${mat.estimatedUnitCost.toFixed(2)}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>${mat.totalCost.toFixed(2)}</TableCell>
                      <TableCell sx={{ fontSize: 11, color: '#64748b', maxWidth: 180 }}>{mat.rationale}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {/* Labour Table */}
            <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' }}>
              Estimated Man Hours
            </Typography>
            <Paper sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['Role', 'Hours', 'Hourly Rate', 'Total Cost', 'Rationale'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', color: '#64748b' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aiResult.laborHours.map((lab, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{lab.role}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{lab.hours}h</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>${lab.hourlyRate.toFixed(2)}/hr</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>${lab.totalCost.toFixed(2)}</TableCell>
                      <TableCell sx={{ fontSize: 11, color: '#64748b', maxWidth: 200 }}>{lab.rationale}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={() => setAiDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748b' }}>
          Close
        </Button>
        {aiResult && !aiLoading && (
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={handleApplyAiEstimate}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #4338ca)' },
            }}
          >
            Apply to Estimation
          </Button>
        )}
      </DialogActions>
    </Dialog>
    </>
  );
};

export default OrderForm;
