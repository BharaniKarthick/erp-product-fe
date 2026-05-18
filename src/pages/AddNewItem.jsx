import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  ChevronRight,
  Science,
  Add,
  NotificationsActive,
  Dashboard,
  ReceiptLong,
  Inventory2,
  Assessment,
  Settings,
  Person,
  Menu,
} from '@mui/icons-material';
import { inventoryService } from '../api/inventoryService';

const AddNewItem = () => {

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'DYE',
    unit: 'kg',
    unitCost: 0,
    currentQuantity: 0,
    reorderPoint: 50,
    enableLowStockAlert: true,
  });

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

  useEffect(() => {

    const fetchCategories = async () => {
      try {
        const response = await inventoryService.getCategories();
        const normalized = (Array.isArray(response) ? response : [])
          .map((entry) => {
            if (typeof entry === 'string') return normalizeCategoryValue(entry);
            return normalizeCategoryValue(
              entry?.category || entry?.name || entry?.type || entry?.label
            );
          })
          .filter(Boolean);

        const unique = Array.from(new Set(normalized));
        const resolvedOptions =
          unique.length > 0 ? unique : ['DYE', 'CHEMICAL', 'SOLVENT'];
        setCategoryOptions(resolvedOptions);

        if (!resolvedOptions.includes(formData.category)) {
          setFormData((prev) => ({ ...prev, category: resolvedOptions[0] }));
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategoryOptions(['DYE', 'CHEMICAL', 'SOLVENT']);
      } finally {
        setCategoriesLoading(false);
      }
    };

    const fetchItemForEdit = async () => {
      if (!isEditMode) {
        return;
      }
      try {
        const item = await inventoryService.getItemById(id);
        setFormData((prev) => ({
          ...prev,
          itemName: item?.name || item?.itemName || '',
          category: normalizeCategoryValue(item?.categoryName || item?.category || prev.category),
          unit: item?.unitOfMeasure || item?.unit || prev.unit,
          unitCost: Number(item?.unitCost || 0),
          currentQuantity: Number(item?.currentStock ?? item?.currentQuantity ?? 0),
          reorderPoint: Number(item?.reorderPoint ?? item?.minimumQuantity ?? 0),
          enableLowStockAlert: Boolean(item?.lowStockAlertsEnabled ?? true),
        }));
      } catch (err) {
        console.error('Failed to fetch inventory item for edit:', err);
        setError('Failed to load item data for editing');
      }
    };

    fetchCategories();
    fetchItemForEdit();
  }, [id, isEditMode]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {

    e.preventDefault();
    if (!formData.itemName.trim()) {
      setError('Item name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        itemName: formData.itemName.trim(),
        category: formData.category,
        type: formData.category,
        unitOfMeasure: formData.unit,
        unit: formData.unit,
        costPerUnit: Number(formData.unitCost || 0),
        currentQuantity: Number(formData.currentQuantity || 0),
        openingStock: Number(formData.currentQuantity || 0),
        reorderPoint: Number(formData.reorderPoint || 0),
        lowStockThreshold: Number(formData.reorderPoint || 0),
        enableLowStockAlert: Boolean(formData.enableLowStockAlert),
      };

      if (isEditMode) {
        await inventoryService.updateItem(id, payload);
      } else {
        await inventoryService.createItem(payload);
      }
      navigate('/inventory');
    } catch (err) {
      console.error('Failed to create item:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : '') ||
        err.message ||
        'Failed to create item';
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setFormData((prev) => ({
      ...prev,
      itemName: '',
      category: categoryOptions.includes('DYE') ? 'DYE' : (categoryOptions[0] || prev.category || 'DYE'),
      unit: 'kg',
      unitCost: 0,
      currentQuantity: 0,
      reorderPoint: 50,
      enableLowStockAlert: true,
    }));
    setError('');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fdfbff', color: '#191c20' }}>

      {/* Sidebar mimic */}
      <Box
        sx={{
          display: 'none',
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          width: 248,
          flexDirection: 'column',
          bgcolor: '#f9f9fb',
          borderRight: '1px solid #c4c6d033',
          zIndex: 20,
        }}
      >
        <Box sx={{ px: 3, py: 3.5 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 900, color: '#1978e5', letterSpacing: '-0.04em' }}>OPERATIONS</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 10, fontWeight: 700, color: '#44474e', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Unit 04 - Print Hub
          </Typography>
        </Box>
        <Stack sx={{ px: 1.5, gap: 0.8 }}>
          {[
            { icon: <Dashboard sx={{ fontSize: 20 }} />, label: 'Dashboard' },
            { icon: <ReceiptLong sx={{ fontSize: 20 }} />, label: 'Orders' },
            { icon: <Inventory2 sx={{ fontSize: 20 }} />, label: 'Inventory', active: true },
            { icon: <Assessment sx={{ fontSize: 20 }} />, label: 'Reports' },
            { icon: <Settings sx={{ fontSize: 20 }} />, label: 'Settings' },
          ].map((item) => (
            <Button
              key={item.label}
              startIcon={item.icon}
              sx={{
                justifyContent: 'flex-start',
                py: 1.2,
                px: 1.8,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: item.active ? 800 : 600,
                color: item.active ? '#001b3f' : '#44474e',
                bgcolor: item.active ? '#d7e3ff' : 'transparent',
                '&:hover': { bgcolor: item.active ? '#d7e3ff' : '#dae2f94d' },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>
      </Box>

      <Box sx={{ ml: 0 }}>
        {/* Top bar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            px: { xs: 2.5, md: 3 },
            py: 1.2,
            bgcolor: '#fdfbffdd',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #c4c6d033',
          }}
        >

          <Box sx={{ maxWidth: 1280, mx: 'auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Menu sx={{ display: { xs: 'block', md: 'none' } }} />
              <Box>
                <Typography sx={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>TEXTILE OS</Typography>
                <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e', mt: 0.3 }}>
                  Cotton Park
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button sx={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800, color: '#44474e', display: { xs: 'none', lg: 'inline-flex' } }}>Help</Button>
              <Button sx={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800, color: '#44474e', display: { xs: 'none', lg: 'inline-flex' } }}>Support</Button>
              <Button sx={{ minWidth: 0, p: 1, borderRadius: '50%' }}><NotificationsActive sx={{ color: '#565f71' }} /></Button>
              <Button sx={{ minWidth: 0, p: 1, borderRadius: '50%' }}><Settings sx={{ color: '#565f71' }} /></Button>
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#d7e3ff', display: 'grid', placeItems: 'center' }}>
                <Person sx={{ color: '#001b3f' }} />
              </Box>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 3, md: 4 }, maxWidth: 1180, mx: 'auto' }}>
          {/* Page header */}
          <Box sx={{ mb: 4.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.8 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e' }}>Inventory</Typography>
              <ChevronRight sx={{ fontSize: 16, color: '#74777f' }} />
              <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#1978e5' }}>
                {isEditMode ? 'Edit Item' : 'New Item'}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 900, lineHeight: 0.98, textTransform: 'uppercase', letterSpacing: '-0.035em' }}>
              {isEditMode ? 'Update Material' : 'Add Material'}
            </Typography>
            <Typography sx={{ mt: 1.5, maxWidth: 680, fontSize: 14, color: '#44474e' }}>
              Input chemical or dye specifications into the centralized ledger. All entries are tracked via the production unit inventory system.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(320px, 1fr)' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Box>
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2.5, border: '1px solid #c4c6d04d', bgcolor: '#fff', boxShadow: '0 2px 10px rgba(25,28,32,0.04)' }}>
                  <Stack spacing={2.25}>
                    <Box>
                      <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e' }}>Item Name</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g., Reactive Blue 19 / Sodium Hydrosulphite"
                        value={formData.itemName}
                        onChange={(e) => handleInputChange('itemName', e.target.value)}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        sx={{
                          '& .MuiInputBase-root': { bgcolor: '#f9f9fb', borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5, borderBottom: '2px solid #c4c6d0', px: 1.6, py: 0.9 },
                          '& .MuiInputBase-root.Mui-focused': { borderBottomColor: '#1978e5' },
                          '& .MuiInputBase-input': { fontSize: 14 },
                        }}
                      />
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e' }}>Type</Typography>
                        <Select
                          fullWidth
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          disabled={categoriesLoading}
                          variant="standard"
                          disableUnderline
                          sx={{ bgcolor: '#f9f9fb', borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5, borderBottom: '2px solid #c4c6d0', px: 1.6, py: 0.9, fontSize: 14 }}
                        >
                          {categoryOptions.map((category) => (
                            <MenuItem key={category} value={category}>{formatCategoryLabel(category)}</MenuItem>
                          ))}
                        </Select>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e' }}>Unit</Typography>
                        <Select
                          fullWidth
                          value={formData.unit}
                          onChange={(e) => handleInputChange('unit', e.target.value)}
                          variant="standard"
                          disableUnderline
                          sx={{ bgcolor: '#f9f9fb', borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5, borderBottom: '2px solid #c4c6d0', px: 1.6, py: 0.9, fontSize: 14 }}
                        >
                          <MenuItem value="kg">kg</MenuItem>
                          <MenuItem value="litre">litre</MenuItem>
                          <MenuItem value="gram">gram</MenuItem>
                          <MenuItem value="drum">drum</MenuItem>
                        </Select>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e' }}>Cost Per Unit (USD)</Typography>
                        <TextField
                          fullWidth
                          type="number"
                          inputProps={{ step: '0.01', min: 0 }}
                          placeholder="0.00"
                          value={formData.unitCost}
                          onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value) || 0)}
                          variant="standard"
                          InputProps={{ disableUnderline: true, startAdornment: '$' }}
                          sx={{ '& .MuiInputBase-root': { bgcolor: '#f9f9fb', borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5, borderBottom: '2px solid #c4c6d0', px: 1.6, py: 0.9 }, '& .MuiInputBase-input': { fontSize: 14 } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e' }}>Opening Stock</Typography>
                        <TextField
                          fullWidth
                          type="number"
                          inputProps={{ step: '0.01', min: 0 }}
                          placeholder="Enter amount"
                          value={formData.currentQuantity}
                          onChange={(e) => handleInputChange('currentQuantity', parseFloat(e.target.value) || 0)}
                          variant="standard"
                          InputProps={{ disableUnderline: true }}
                          sx={{ '& .MuiInputBase-root': { bgcolor: '#f9f9fb', borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5, borderBottom: '2px solid #c4c6d0', px: 1.6, py: 0.9 }, '& .MuiInputBase-input': { fontSize: 14 } }}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </Paper>

                <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2.5, borderLeft: '6px solid #1978e5', border: '1px solid #c4c6d04d', bgcolor: '#fff', boxShadow: '0 2px 10px rgba(25,28,32,0.04)' }}>
                  <Stack spacing={2.25}>
                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ pb: 1.6, borderBottom: '1px solid #c4c6d066' }}>
                      <NotificationsActive sx={{ color: '#1978e5' }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Alert Configuration</Typography>
                    </Stack>

                    <Box>
                      <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e' }}>Low Stock Threshold</Typography>
                      <TextField
                        fullWidth
                        type="number"
                        placeholder="e.g., 50"
                        value={formData.reorderPoint}
                        onChange={(e) => handleInputChange('reorderPoint', parseFloat(e.target.value) || 0)}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        sx={{ '& .MuiInputBase-root': { bgcolor: '#f9f9fb', borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5, borderBottom: '2px solid #c4c6d0', px: 1.6, py: 0.9 }, '& .MuiInputBase-input': { fontSize: 14 } }}
                      />
                    </Box>

                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f9f9fb', border: '1px solid #c4c6d033', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Low Stock Alerts</Typography>
                        <Typography sx={{ fontSize: 10, color: '#44474e', textTransform: 'uppercase', mt: 0.4 }}>Via SMS/Email</Typography>
                      </Box>
                      <FormControlLabel
                        control={<Switch checked={formData.enableLowStockAlert} onChange={(e) => handleInputChange('enableLowStockAlert', e.target.checked)} />}
                        label=""
                      />
                    </Box>
                  </Stack>
                </Paper>

                <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center" sx={{ pt: 0.5 }}>
                  <Button type="button" onClick={handleClearForm} sx={{ textTransform: 'uppercase', fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: '#44474e' }}>
                    Clear Form
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} /> : undefined}
                    sx={{
                      px: 4,
                      py: 1.2,
                      bgcolor: '#1978e5',
                      borderRadius: 2,
                      fontWeight: 900,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.2em',
                      boxShadow: '0 12px 24px -10px rgba(25,120,229,0.45)',
                      '&:hover': { bgcolor: '#1565c0' },
                    }}
                  >
                    {isEditMode ? 'Update Item' : 'Save Item'}
                  </Button>
                </Stack>
              </Box>
            </Box>

            <Box>
              <Stack spacing={2} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
                <Paper
                  sx={{
                    aspectRatio: '1 / 1',
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundImage: 'url(https://images.unsplash.com/photo-1581093806997-124204d9fa9d?w=900&q=80)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.2))', p: 2.2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.68)', mb: 1 }}>System Context</Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.15, letterSpacing: '-0.02em', color: '#fff' }}>
                      Verification Required for High-Risk Additives
                    </Typography>
                  </Box>
                </Paper>

                <Paper sx={{ p: 2.2, borderRadius: 2.5, border: '1px solid #c4c6d04d' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e', mb: 1.5 }}>Unit 04 Storage Capacity</Typography>
                  <Box sx={{ height: 10, borderRadius: 999, bgcolor: '#e0e2ec', overflow: 'hidden', mb: 1.8 }}>
                    <Box sx={{ width: '72%', height: '100%', bgcolor: '#1978e5' }} />
                  </Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography sx={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em' }}>72%</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#1978e5' }}>Near Limit</Typography>
                  </Stack>
                </Paper>

                <Paper sx={{ p: 2.2, borderRadius: 2.5, bgcolor: '#d7e3ff', borderLeft: '4px solid #1978e5' }}>
                  <Science sx={{ color: '#1978e5', mb: 1 }} />
                  <Typography sx={{ fontSize: 12, lineHeight: 1.5, color: '#001b3f', fontWeight: 600 }}>
                    Ensure all chemical units are converted to Metric (kg/L) as per ISO 9001 standard protocols for Unit 04.
                  </Typography>
                </Paper>
              </Stack>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 4,
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            {[
              { label: 'Logged By', value: 'System Admin' },
              { label: 'Timestamp', value: new Date().toLocaleString() },
              { label: 'Location', value: 'Terminal A-1' },
              { label: 'Status', value: 'Active Session' },
            ].map((item) => (
              <Box key={item.label}>
                <Paper sx={{ p: 1.8, borderRadius: 2, border: '1px solid #c4c6d033' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#44474e', mb: 1 }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', color: '#191c20' }}>{item.value}</Typography>
                </Paper>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AddNewItem;
