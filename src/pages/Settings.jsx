import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,

  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Add,
  Badge,
  Delete,
  Download,
  Edit,
  FilterList,
  Groups,
  PendingActions,
  Payments,
  Category,
  Person,
  UploadFile,
} from '@mui/icons-material';
import { laborService } from '../api/laborService';
import { customerService } from '../api/customerService';

const TAB_VALUES = {
  LABOR: 'labor',
  CUSTOMER: 'customer',
  INVENTORY: 'inventory',
};

const normalizeNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab');
  const activeTab = Object.values(TAB_VALUES).includes(tabFromQuery) ? tabFromQuery : TAB_VALUES.LABOR;

  const [laborList, setLaborList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [laborResponse, customerResponse] = await Promise.all([
        laborService.getAllLabor().catch(() => []),
        customerService.getAllCustomers().catch(() => []),
      ]);
      setLaborList(Array.isArray(laborResponse) ? laborResponse : []);
      setCustomerList(Array.isArray(customerResponse) ? customerResponse : []);
    } catch (err) {
      setError('Failed to load settings data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const laborStats = useMemo(() => {
    const total = laborList.length;

    const avgWage =
      total > 0
        ? laborList.reduce((sum, item) => sum + normalizeNumber(item.shiftWage ?? item.hourlyRate), 0) / total
        : 0;
    const activeRoles = new Set(laborList.map((item) => item.shiftRole).filter(Boolean)).size;
    const pending = laborList.filter((item) => item.isActive === false).length;

    return {
      total,
      avgWage,
      activeRoles,
      pending,
    };
  }, [laborList]);

  const customerStats = useMemo(() => {
    const total = customerList.length;
    const active = customerList.filter((item) => item.isActive !== false).length;
    const totalCredit = customerList.reduce((sum, item) => sum + normalizeNumber(item.creditLimit), 0);
    const tiers = new Set(customerList.map((item) => item.tier).filter(Boolean)).size;

    return { total, active, totalCredit, tiers };
  }, [customerList]);

  const headerCards =
    activeTab === TAB_VALUES.LABOR
      ? [
          {
            title: 'Total Workforce',
            value: laborStats.total,
            badge: '+4%',
            icon: <Groups fontSize="small" />,
            iconBg: '#eff6ff',
            iconColor: '#005ab4',
            badgeColor: '#16a34a',
            badgeBg: '#ecfdf3',
          },
          {
            title: 'Avg. Shift Wage',
            value: `$${laborStats.avgWage.toFixed(2)}`,
            badge: 'Stable',
            icon: <Payments fontSize="small" />,
            iconBg: '#fff7ed',
            iconColor: '#ea580c',
            badgeColor: '#64748b',
            badgeBg: '#f8fafc',
          },
          {
            title: 'Active Roles',
            value: laborStats.activeRoles,
            icon: <Badge fontSize="small" />,
            iconBg: '#f5f3ff',
            iconColor: '#7c3aed',
          },
          {
            title: 'Pending Approval',
            value: laborStats.pending,
            icon: <PendingActions fontSize="small" />,
            iconBg: '#ffedd5',
            iconColor: '#c2410c',
            borderLeft: '4px solid #964400',
          },
        ]
      : activeTab === TAB_VALUES.CUSTOMER
        ? [
          {
            title: 'Total Customers',
            value: customerStats.total,
            icon: <Groups fontSize="small" />,
            iconBg: '#eff6ff',
            iconColor: '#005ab4',
          },
          {
            title: 'Active Accounts',
            value: customerStats.active,
            icon: <Badge fontSize="small" />,
            iconBg: '#ecfdf3',
            iconColor: '#166534',
          },
          {
            title: 'Customer Tiers',
            value: customerStats.tiers,
            icon: <Person fontSize="small" />,
            iconBg: '#f5f3ff',
            iconColor: '#7c3aed',
          },
          {
            title: 'Credit Exposure',
            value: `$${customerStats.totalCredit.toLocaleString()}`,
            icon: <Payments fontSize="small" />,
            iconBg: '#fff7ed',
            iconColor: '#c2410c',
            borderLeft: '4px solid #964400',
          },
        ]
        : [
          {
            title: 'Category Groups',
            value: '--',
            icon: <Category fontSize="small" />,
            iconBg: '#eff6ff',
            iconColor: '#005ab4',
          },
          {
            title: 'Active Categories',
            value: '--',
            icon: <Badge fontSize="small" />,
            iconBg: '#ecfdf3',
            iconColor: '#166534',
          },
          {
            title: 'Mapped Materials',
            value: '--',
            icon: <Groups fontSize="small" />,
            iconBg: '#f5f3ff',
            iconColor: '#7c3aed',
          },
          {
            title: 'Last Sync',
            value: 'Pending',
            icon: <PendingActions fontSize="small" />,
            iconBg: '#fff7ed',
            iconColor: '#c2410c',
            borderLeft: '4px solid #964400',
          },
        ];

  const handleTabChange = (_, value) => {
    setSearchParams({ tab: value });
  };

  const handleEditLabor = (id) => {
    if (!id) return;
    navigate(`/settings/labor/${id}/edit`);
  };

  const handleDeleteLabor = async (id) => {
    if (!id) return;
    const confirmed = window.confirm('Are you sure you want to delete this employee?');
    if (!confirmed) return;

    try {
      await laborService.deleteLabor(id);
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete employee');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3.5 }}>
        <Typography sx={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', color: '#181c22' }}>
          System Settings
        </Typography>
        <Typography sx={{ color: '#465f89', fontWeight: 500 }}>
          Manage enterprise master data and organizational parameters
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          mb: 3.5,
          borderBottom: '1px solid #c1c6d5',
          '& .MuiTabs-indicator': { backgroundColor: '#005ab4', height: 2 },
        }}
      >
        <Tab value={TAB_VALUES.LABOR} label="Labour Master" sx={{ textTransform: 'none', fontWeight: 800 }} />
        <Tab value={TAB_VALUES.CUSTOMER} label="Customer Master" sx={{ textTransform: 'none', fontWeight: 800 }} />
        <Tab value={TAB_VALUES.INVENTORY} label="Inventory Categories" sx={{ textTransform: 'none', fontWeight: 800 }} />
      </Tabs>

      <GridView cards={headerCards} />

      <Box sx={{ mt: 5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#181c22' }}>
              {activeTab === TAB_VALUES.LABOR
                ? 'Personnel Directory'
                : activeTab === TAB_VALUES.CUSTOMER
                  ? 'Customer Directory'
                  : 'Inventory Category Master'}
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: 14 }}>
              {activeTab === TAB_VALUES.LABOR
                ? 'Managing staff allocation and wage structures'
                : activeTab === TAB_VALUES.CUSTOMER
                  ? 'Managing customer accounts and commercial terms'
                  : 'Category taxonomy and material grouping controls will be available soon.'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.2}>
            {activeTab === TAB_VALUES.INVENTORY ? (
              <Button variant="outlined" disabled sx={{ textTransform: 'none', fontWeight: 700 }}>
                Coming soon
              </Button>
            ) : (
              <>
                <Button startIcon={<FilterList />} variant="outlined" sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Filter
                </Button>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  onClick={() =>
                    navigate(activeTab === TAB_VALUES.LABOR ? '/settings/labor/new' : '/settings/customers/new')
                  }
                  sx={{ textTransform: 'none', fontWeight: 800 }}
                >
                  {activeTab === TAB_VALUES.LABOR ? 'Add Employee' : 'Add Customer'}
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Box>

      <Paper sx={{ mt: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {activeTab === TAB_VALUES.LABOR ? (
          <LaborTable rows={laborList} onEdit={handleEditLabor} onDelete={handleDeleteLabor} />
        ) : activeTab === TAB_VALUES.CUSTOMER ? (
          <CustomerTable rows={customerList} />
        ) : (
          <InventoryCategoriesComingSoon />
        )}
      </Paper>

      <GridViewBottom
        activeTab={activeTab}
        count={activeTab === TAB_VALUES.LABOR ? laborList.length : customerList.length}
      />
    </Box>
  );
};

const GridView = ({ cards }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
    {cards.map((card) => (
      <Paper
        key={card.title}
        sx={{
          p: 2.4,
          borderRadius: 2.5,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          ...(card.borderLeft ? { borderLeft: card.borderLeft } : {}),
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.8 }}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: card.iconBg, color: card.iconColor }}>{card.icon}</Box>
          {card.badge ? (
            <Chip
              label={card.badge}
              size="small"
              sx={{
                bgcolor: card.badgeBg,
                color: card.badgeColor,
                fontWeight: 800,
                fontSize: 10,
                height: 22,
              }}
            />
          ) : null}
        </Stack>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {card.title}
        </Typography>
        <Typography sx={{ fontSize: 30, fontWeight: 900, color: '#181c22', mt: 0.4 }}>{card.value}</Typography>
      </Paper>
    ))}
  </Box>
);

const LaborTable = ({ rows, onEdit, onDelete }) => (
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow sx={{ bgcolor: '#f8fafc' }}>
          <TableCell sx={thStyle}>Employee ID</TableCell>
          <TableCell sx={thStyle}>Is Active</TableCell>
          <TableCell sx={thStyle}>Employee Code</TableCell>
          <TableCell sx={thStyle}>Full Name</TableCell>
          <TableCell sx={thStyle}>Email</TableCell>
          <TableCell sx={thStyle}>Phone</TableCell>
          <TableCell sx={thStyle}>Job Title</TableCell>
          <TableCell sx={thStyle}>Department</TableCell>
          <TableCell sx={thStyle}>Shift Wage</TableCell>
          <TableCell sx={thStyle} align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length ? (
          rows.map((row, index) => {
            const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.operatorName || 'Unnamed Employee';
            const initials = String(fullName || 'NA')
              .split(' ')
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            const shiftWage = normalizeNumber(row.shiftWage || row.hourlyRate);
            return (
              <TableRow key={row.id || index} hover>
                <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#005ab4' }}>
                  {row.id || index + 1}
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.isActive === false ? 'Inactive' : 'Active'}
                    size="small"
                    color={row.isActive === false ? 'default' : 'success'}
                    sx={{ fontSize: 10, fontWeight: 800 }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#005ab4' }}>
                  {row.employeeCode || row.operatorCode || `EMP-${String(index + 1).padStart(4, '0')}`}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 800 }}>
                      {initials}
                    </Avatar>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{fullName}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: 13, color: '#465f89' }}>{row.email || '-'}</TableCell>
                <TableCell sx={{ fontSize: 13, color: '#465f89' }}>{row.phone || row.mobile || '-'}</TableCell>
                <TableCell>
                  <Chip label={row.jobTitle || row.shiftRole || 'Role'} size="small" sx={{ fontSize: 10, fontWeight: 800 }} />
                </TableCell>
                <TableCell sx={{ fontSize: 13, color: '#465f89' }}>{row.department || '-'}</TableCell>
                <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>${shiftWage.toFixed(2)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton size="small" onClick={() => onEdit?.(row.id)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete?.(row.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={10} align="center" sx={{ py: 5, color: '#64748b' }}>
              No employee records found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const CustomerTable = ({ rows }) => (
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow sx={{ bgcolor: '#f8fafc' }}>
          <TableCell sx={thStyle}>Customer Code</TableCell>
          <TableCell sx={thStyle}>Company Name</TableCell>
          <TableCell sx={thStyle}>Contact</TableCell>
          <TableCell sx={thStyle}>Mobile</TableCell>
          <TableCell sx={thStyle}>Email</TableCell>
          <TableCell sx={thStyle}>State</TableCell>
          <TableCell sx={thStyle}>Country</TableCell>
          <TableCell sx={thStyle}>Credit Limit</TableCell>
          <TableCell sx={thStyle}>Is Active</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length ? (
          rows.map((row, index) => (
            <TableRow key={row.id || index} hover>
              <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#005ab4' }}>{row.customerCode || `CUST-${index + 1}`}</TableCell>
              <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>{row.companyName || 'Unnamed Company'}</TableCell>
              <TableCell sx={{ fontSize: 13, color: '#465f89' }}>{row.contactPerson || '-'}</TableCell>
              <TableCell sx={{ fontSize: 13, color: '#465f89' }}>{row.mobile || row.phone || '-'}</TableCell>
              <TableCell sx={{ fontSize: 13, color: '#465f89' }}>{row.email || '-'}</TableCell>
              <TableCell sx={{ fontSize: 13, color: '#465f89' }}>{row.state || '-'}</TableCell>
              <TableCell sx={{ fontSize: 13, color: '#465f89' }}>{row.country || '-'}</TableCell>
              <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>${normalizeNumber(row.creditLimit).toLocaleString()}</TableCell>
              <TableCell>
                <Chip
                  label={row.isActive === false ? 'Inactive' : 'Active'}
                  size="small"
                  color={row.isActive === false ? 'default' : 'success'}
                  sx={{ fontSize: 10, fontWeight: 800 }}
                />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={9} align="center" sx={{ py: 5, color: '#64748b' }}>
              No customer records found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const InventoryCategoriesComingSoon = () => (
  <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 4, md: 5 }, bgcolor: '#fbfcff' }}>
    <Box sx={{ textAlign: 'center' }}>
      <Avatar sx={{ width: 56, height: 56, mx: 'auto', mb: 1.6, bgcolor: '#e8f1ff', color: '#005ab4' }}>
        <Category />
      </Avatar>
      <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#181c22' }}>Coming soon</Typography>
      <Typography sx={{ mt: 0.7, color: '#64748b', maxWidth: 560, mx: 'auto' }}>
        Inventory Category Master is under implementation. This tab will include category CRUD, default units, reorder rules,
        and category-level analytics.
      </Typography>
      <Chip
        label="Planned in upcoming release"
        size="small"
        sx={{ mt: 2, bgcolor: '#eff6ff', color: '#005ab4', fontWeight: 800 }}
      />
    </Box>

    <Paper sx={{ mt: 3, p: { xs: 2, md: 2.5 }, borderRadius: 2.5, border: '1px dashed #c7d2fe', bgcolor: '#f8faff' }}>
      <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="center">
        <Avatar sx={{ width: 34, height: 34, bgcolor: '#eef2ff', color: '#4f46e5' }}>
          <Badge fontSize="small" />
        </Avatar>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>
          Inventory Location Master
        </Typography>
      </Stack>
      <Typography sx={{ mt: 1, textAlign: 'center', color: '#64748b' }}>
        Coming soon. Location hierarchy management (warehouse, zone, rack, bin) will be added here.
      </Typography>
      <Chip
        label="Coming soon"
        size="small"
        sx={{ mt: 1.5, mx: 'auto', display: 'flex', width: 'fit-content', bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 800 }}
      />
    </Paper>
  </Box>
);

const GridViewBottom = ({ activeTab, count }) => (
  <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 2 }}>
    <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #005ab4, #1d4ed8)', color: '#fff' }}>
      <Typography sx={{ fontSize: 22, fontWeight: 800, mb: 1.2 }}>
        {activeTab === TAB_VALUES.LABOR
          ? 'Wage Optimization Engine'
          : activeTab === TAB_VALUES.CUSTOMER
            ? 'Customer Intelligence Engine'
            : 'Inventory Category Engine'}
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', mb: 2.5 }}>
        {activeTab === TAB_VALUES.LABOR
          ? 'Labor costs and shift distribution can be optimized by role and workload patterns.'
          : activeTab === TAB_VALUES.CUSTOMER
            ? 'Track customer profitability, credit patterns, and account health at scale.'
            : 'Define category hierarchies and automate material classification workflows.'}
      </Typography>
      <Button sx={{ bgcolor: '#fff', color: '#005ab4', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#f1f5f9' } }}>
        {activeTab === TAB_VALUES.INVENTORY ? 'Preview Blueprint' : 'Review Analytics'}
      </Button>
    </Paper>

    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#ecedf7', border: '1px solid #c1c6d5' }}>
      <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#717785', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 2 }}>
        Quick Bulk Actions
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        <Button variant="outlined" startIcon={<UploadFile />} sx={{ minHeight: 76, flexDirection: 'column', gap: 0.5, textTransform: 'none', fontWeight: 800 }}>
          Import CSV
        </Button>
        <Button variant="outlined" startIcon={<Download />} sx={{ minHeight: 76, flexDirection: 'column', gap: 0.5, textTransform: 'none', fontWeight: 800 }}>
          Export PDF
        </Button>
      </Box>
      <Typography sx={{ mt: 2, fontSize: 11, color: '#64748b' }}>Showing {count} records in active tab</Typography>
    </Paper>
  </Box>
);

const thStyle = {
  fontSize: 11,
  fontWeight: 900,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

export default Settings;
