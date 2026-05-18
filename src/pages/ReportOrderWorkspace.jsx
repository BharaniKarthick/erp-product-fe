import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  MenuItem,
  Paper,
  Select,
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
  CalendarToday,
  Download,
  Groups,
  History,
  Inventory2,
  PrecisionManufacturing,
  TrendingUp,
} from '@mui/icons-material';
import { orderService } from '../api/orderService';

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

const getMaterialTotal = (material) =>
  normalizeNumber(material?.totalCost || normalizeNumber(material?.quantity) * normalizeNumber(material?.unitCost));

const getLaborTotal = (entry) =>
  normalizeNumber(entry?.totalCost || normalizeNumber(entry?.durationHours) * normalizeNumber(entry?.hourlyRate));

const getMachineTotal = (entry) =>
  normalizeNumber(entry?.totalCost || normalizeNumber(entry?.runtimeHours) * normalizeNumber(entry?.costPerHour));

const getMaterialName = (material) => material?.materialName || material?.name || material?.itemName || material?.description || 'Material';

const getMaterialUnit = (material) => material?.unitOfMeasure || material?.unit || material?.uom || '';

const getLaborRate = (entry) =>
  normalizeNumber(entry?.hourlyRate || entry?.dailyWage || entry?.shiftWage || entry?.wagePerShift);

const getLaborShiftCount = (entry) => {
  const explicitShiftCount = normalizeNumber(entry?.shiftCount);
  if (explicitShiftCount > 0) return explicitShiftCount;
  const durationHours = normalizeNumber(entry?.durationHours);
  if (durationHours <= 0) return 0;
  return durationHours >= 8 ? durationHours / 8 : durationHours;
};

const classifyMaterialBucket = (material) => {
  const category = String(material?.categoryName || material?.category || material?.materialCategory || '').toLowerCase();
  const name = getMaterialName(material).toLowerCase();
  const solventPattern = /solvent|finish|finisher|softener|silicone|water|emulsion|resin|coating/;
  if (solventPattern.test(category) || solventPattern.test(name)) return 'solvents';
  return 'dyes';
};

const getTransactionTone = (entry) => {
  const type = String(entry?.transactionType || entry?.category || '').toUpperCase();
  const impact = normalizeNumber(entry?.impactAmount ?? entry?.costImpact ?? 0);
  if (impact > 0 || type.includes('PAYMENT') || type.includes('REVENUE')) {
    return { accent: '#16a34a', bg: '#ecfdf3', label: 'Revenue Credit' };
  }
  if (type.includes('WARNING') || type.includes('ADJUST') || type.includes('OVERRUN')) {
    return { accent: '#dc2626', bg: '#fef2f2', label: 'Loss Overrun' };
  }
  if (type.includes('LABOR')) {
    return { accent: '#d97706', bg: '#fffbeb', label: 'Wage Disbursement' };
  }
  return { accent: '#1275e2', bg: '#eff6ff', label: 'Inventory Sync' };
};

const ReportOrderWorkspace = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('THIS_MONTH');

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await orderService.getOrderDetail(id);
        setOrder(normalizeOrderDetailResponse(response));
      } catch (err) {
        setError('Failed to load report workspace for this order.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const materials = useMemo(() => normalizeList(order, ['orderMaterials', 'materials', 'materialEntries']), [order]);
  const laborEntries = useMemo(() => normalizeList(order, ['orderLabor', 'laborEntries', 'labourEntries']), [order]);
  const machineEntries = useMemo(() => normalizeList(order, ['orderMachines', 'machines', 'machineEntries']), [order]);
  const transactions = useMemo(() => normalizeList(order, ['orderTransactions', 'transactions', 'transactionHistory']), [order]);

  const totalMaterialCost = useMemo(() => materials.reduce((sum, item) => sum + getMaterialTotal(item), 0), [materials]);
  const totalLaborCost = useMemo(() => laborEntries.reduce((sum, item) => sum + getLaborTotal(item), 0), [laborEntries]);
  const totalMachineCost = useMemo(() => machineEntries.reduce((sum, item) => sum + getMachineTotal(item), 0), [machineEntries]);

  const totalCost = normalizeNumber(order?.totalActualCost || totalMaterialCost + totalLaborCost + totalMachineCost);
  const quotedPrice = normalizeNumber(order?.quotedPrice || order?.unitPrice || order?.targetRevenue);
  const projectedProfit = normalizeNumber(order?.profitLoss ?? quotedPrice - totalCost);
  const margin = quotedPrice > 0 ? (projectedProfit / quotedPrice) * 100 : 0;

  const materialColumns = useMemo(() => {
    if (!materials.length) {
      return [
        { title: 'Industrial Dyes & Chemicals', tag: 'No Records', tagTone: { bg: '#eef2f7', color: '#64748b' }, rows: [] },
        { title: 'Solvents & Finishers', tag: 'No Records', tagTone: { bg: '#eef2f7', color: '#64748b' }, rows: [] },
      ];
    }

    const dyeRows = [];
    const solventRows = [];
    materials.forEach((material) => {
      if (classifyMaterialBucket(material) === 'solvents') {
        solventRows.push(material);
      } else {
        dyeRows.push(material);
      }
    });

    if (!dyeRows.length || !solventRows.length) {
      const split = Math.ceil(materials.length / 2);
      return [
        { title: 'Industrial Dyes & Chemicals', tag: 'Live Materials', tagTone: { bg: '#dbeafe', color: '#1d4ed8' }, rows: materials.slice(0, split) },
        { title: 'Solvents & Finishers', tag: 'Inventory Linked', tagTone: { bg: '#fef3c7', color: '#b45309' }, rows: materials.slice(split) },
      ];
    }

    return [
      { title: 'Industrial Dyes & Chemicals', tag: 'Live Materials', tagTone: { bg: '#dbeafe', color: '#1d4ed8' }, rows: dyeRows },
      { title: 'Solvents & Finishers', tag: 'Inventory Linked', tagTone: { bg: '#fef3c7', color: '#b45309' }, rows: solventRows },
    ];
  }, [materials]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ px: { xs: 0.75, md: 1.25 }, pb: 3.2, color: '#181c22', width: '100%' }}>

      <Paper sx={{ p: { xs: 1.8, md: 2.1 }, borderRadius: 3, border: '1px solid #e2e8f0', mb: 2.2, background: 'linear-gradient(140deg, #ffffff 0%, #f7f9ff 100%)' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' },
            alignItems: 'center',
            columnGap: 2,
            rowGap: 1.4,
            width: '100%',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.02 }}>
              Order #{order?.orderNumber || id}
            </Typography>
            <Typography sx={{ color: '#64748b', mt: 0.35, fontSize: 13 }}>
              Workspace for {order?.productType || order?.productName || 'Industrial Production Process'}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="flex-end" sx={{ width: { xs: '100%', lg: 'auto' } }}>
            <Paper sx={{ px: 1.2, py: 0.55, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', minWidth: { sm: 220 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CalendarToday sx={{ fontSize: 18, color: '#64748b' }} />
                <Select
                  size="small"
                  value={timeRange}
                  onChange={(event) => setTimeRange(event.target.value)}
                  variant="standard"
                  disableUnderline
                  sx={{ minWidth: 156, flex: 1, '& .MuiSelect-select': { py: 0.35, fontSize: 13, fontWeight: 700, color: '#414753' } }}
                >
                  <MenuItem value="THIS_MONTH">This Month</MenuItem>
                  <MenuItem value="LAST_MONTH">Last Month</MenuItem>
                  <MenuItem value="CUSTOM">Custom Range</MenuItem>
                </Select>
              </Stack>
            </Paper>
            <Button variant="contained" startIcon={<Download />} sx={{ textTransform: 'none', fontSize: 12, fontWeight: 800, px: 1.8, py: 0.85, minWidth: { xs: '100%', sm: 132 } }}>
              Export PDF
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 1.2,
          mb: 2.3,
          alignItems: 'stretch',
        }}
      >
        <Box>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', height: '100%', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
            <CardContent sx={{ p: 1.7, '&:last-child': { pb: 1.7 } }}>
              <Typography sx={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', color: '#64748b' }}>Total Cost</Typography>
              <Typography sx={{ fontSize: 25, fontWeight: 900, mt: 0.35, lineHeight: 1.05 }}>{formatMoney(totalCost)}</Typography>
              <Stack direction="row" spacing={0.45} alignItems="center" sx={{ mt: 0.65, color: totalCost > quotedPrice ? '#dc2626' : '#16a34a' }}>
                <TrendingUp sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: 10, fontWeight: 800 }}>
                  {totalCost > quotedPrice ? 'Above quoted budget' : 'Within expected run'}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', height: '100%', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
            <CardContent sx={{ p: 1.7, '&:last-child': { pb: 1.7 } }}>
              <Typography sx={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', color: '#64748b' }}>Quoted Price</Typography>
              <Typography sx={{ fontSize: 25, fontWeight: 900, mt: 0.35, lineHeight: 1.05 }}>{formatMoney(quotedPrice)}</Typography>
              <Typography sx={{ fontSize: 10, color: '#64748b', fontWeight: 700, mt: 0.7, fontStyle: 'italic' }}>Fixed contract baseline</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', borderLeft: projectedProfit >= 0 ? '4px solid #16a34a' : '4px solid #dc2626', height: '100%', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
            <CardContent sx={{ p: 1.7, '&:last-child': { pb: 1.7 } }}>
              <Typography sx={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', color: '#64748b' }}>Projected Profit</Typography>
              <Typography sx={{ fontSize: 25, fontWeight: 900, mt: 0.35, lineHeight: 1.05, color: projectedProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                {`${projectedProfit >= 0 ? '+' : '-'}${formatMoney(Math.abs(projectedProfit))}`}
              </Typography>
              <Typography sx={{ fontSize: 10, mt: 0.7, fontWeight: 800, color: projectedProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                {projectedProfit >= 0 ? 'Within margin' : 'Margin at risk'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card sx={{ borderRadius: 2.5, background: 'linear-gradient(135deg, #0873df 0%, #005ab4 100%)', color: '#fff', height: '100%', boxShadow: '0 8px 22px rgba(8,115,223,0.24)' }}>
            <CardContent sx={{ p: 1.7, '&:last-child': { pb: 1.7 } }}>
              <Typography sx={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', color: '#dbeafe' }}>Margin %</Typography>
              <Typography sx={{ fontSize: 25, fontWeight: 900, mt: 0.35, lineHeight: 1.05 }}>{margin.toFixed(1)}%</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, margin))}
                sx={{ mt: 1.1, height: 5, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.25)', '& .MuiLinearProgress-bar': { bgcolor: '#fff', borderRadius: 999 } }}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.2 }}>
          <Inventory2 sx={{ color: '#1275e2' }} />
          <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Materials Consumption</Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            gap: 1.5,
            alignItems: 'stretch',
          }}
        >
          {materialColumns.map((column, idx) => (
            <Box key={`${column.title}-${idx}`}>
              <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', height: '100%', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
                <Box sx={{ px: 2, py: 1.15, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                    {column.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={column.tag}
                    sx={{ height: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', bgcolor: column.tagTone.bg, color: column.tagTone.color }}
                  />
                </Box>
                <TableContainer>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.85 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Material Name</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Qty Used</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Unit Cost</TableCell>
                        <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {column.rows.length ? (
                        column.rows.map((item, rowIdx) => (
                          <TableRow key={`${item.id || rowIdx}-${idx}`} hover>
                            <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{getMaterialName(item)}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#475569' }}>{`${normalizeNumber(item?.quantity).toLocaleString()} ${getMaterialUnit(item)}`}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#475569' }}>{formatMoney(item?.unitCost)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 12 }}>{formatMoney(getMaterialTotal(item))}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#64748b' }}>
                            No material records.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: 1.5,
          mb: 2.5,
          alignItems: 'start',
        }}
      >
        <Box>
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.1 }}>
            <Groups sx={{ color: '#1275e2' }} />
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Shift-Based Labor</Typography>
          </Stack>
          <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.9 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Staff Member</TableCell>
                    <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Shifts</TableCell>
                    <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Rate/hr</TableCell>
                    <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Labor Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {laborEntries.length ? (
                    laborEntries.map((entry, idx) => (
                      <TableRow key={entry?.id || idx} hover>
                        <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{entry?.operatorName || entry?.employeeName || entry?.shiftRole || 'Labor Entry'}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#475569' }}>{Math.max(1, Math.round(getLaborShiftCount(entry)))}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#475569' }}>{formatMoney(getLaborRate(entry))}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: 12 }}>{formatMoney(getLaborTotal(entry))}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#64748b' }}>
                        No labor records.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        <Box>
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.1 }}>
            <PrecisionManufacturing sx={{ color: '#1275e2' }} />
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Machine & Utility Usage</Typography>
          </Stack>
          <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.9 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Resource</TableCell>
                    <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Usage</TableCell>
                    <TableCell sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Cost/hr</TableCell>
                    <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {machineEntries.length ? (
                    machineEntries.map((entry, idx) => (
                      <TableRow key={entry?.id || idx} hover>
                        <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{entry?.machineName || entry?.machineCode || entry?.machineType || 'Machine'}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#475569' }}>{`${normalizeNumber(entry?.runtimeHours || entry?.usageHours).toFixed(1)} hrs`}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#475569' }}>{formatMoney(entry?.costPerHour)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: 12 }}>{formatMoney(getMachineTotal(entry))}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#64748b' }}>
                        No machine records.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2, gap: 1, flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <History sx={{ color: '#1275e2' }} />
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Transaction Audit Log</Typography>
          </Stack>
          <Stack direction="row" spacing={0.8}>
            <Chip size="small" label="This Month" sx={{ fontWeight: 700, bgcolor: '#eaf2ff', color: '#1275e2' }} />
            <Chip size="small" label="Total Project" variant="outlined" />
          </Stack>
        </Stack>
        <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(15,23,42,0.05)' }}>
          <Stack divider={<Box sx={{ borderBottom: '1px solid #eef2f7' }} />}>
            {transactions.length ? (
              transactions.slice(0, 20).map((entry, idx) => {
                const impact = normalizeNumber(entry?.impactAmount || entry?.costImpact || 0);
                const tone = getTransactionTone(entry);
                const isPositive = impact > 0;
                return (
                  <Stack key={entry?.id || idx} direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.45, gap: 1.2 }}>
                    <Stack direction="row" spacing={1.3} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: tone.bg, color: tone.accent, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <History sx={{ fontSize: 19 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                        {entry?.description || entry?.transactionType || entry?.action || 'Order Activity'}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.2 }}>
                        {formatDateTime(entry?.timestamp || entry?.dateTime || entry?.createdAt)}
                        {entry?.changedBy || entry?.userName ? ` • ${entry?.changedBy || entry?.userName}` : ''}
                      </Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: isPositive ? '#16a34a' : impact < 0 ? '#dc2626' : '#334155' }}>
                        {impact ? `${isPositive ? '+' : '-'}${formatMoney(Math.abs(impact))}` : '-'}
                      </Typography>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, color: tone.accent, textTransform: 'uppercase' }}>
                        {entry?.category || tone.label}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })
            ) : (
              <Box sx={{ p: 3, textAlign: 'center', color: '#64748b' }}>
                No audit entries available.
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>

      <Stack direction="row" spacing={1.4} sx={{ mt: 2.2, alignItems: 'center' }}>
        <Button variant="outlined" sx={{ fontWeight: 700, textTransform: 'none' }}>View Full Audit Trail</Button>
        <Button variant="contained" startIcon={<TrendingUp />} sx={{ fontWeight: 800, textTransform: 'none' }}>Finalize Analysis</Button>
      </Stack>
    </Box>
  );
};

export default ReportOrderWorkspace;
