import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Badge,
  Business,
  ChevronRight,
  DarkMode,
  LightMode,
  Person,
  VerifiedUser,
} from '@mui/icons-material';
import { laborService } from '../api/laborService';

const defaultForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  jobTitle: '',
  shiftWage: '',
  email: '',
  phone: '',
  operatorCode: '',
  operatorName: '',
  department: '',
  shiftRole: '',
  shiftType: 'DAY',
  hourlyRate: '',
  contactInfo: '',
  isActive: true,
};

const AddEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState(defaultForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;

    const fetchEmployee = async () => {
      try {
        const response = await laborService.getLaborById(id);
        const employee = response?.data && typeof response.data === 'object' ? response.data : response;
        if (!employee || typeof employee !== 'object') return;

        setFormData((prev) => ({
          ...prev,
          employeeCode: employee.employeeCode || employee.operatorCode || '',
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          jobTitle: employee.jobTitle || employee.shiftRole || '',
          shiftWage: String(employee.shiftWage ?? employee.hourlyRate ?? ''),
          email: employee.email || '',
          phone: employee.phone || employee.mobile || '',
          department: employee.department || '',
          shiftType: employee.shiftType || 'DAY',
          contactInfo: employee.contactInfo || employee.email || employee.phone || '',
          isActive: employee.isActive !== false,
        }));
      } catch (err) {
        setError('Failed to load employee details for edit.');
      }
    };

    fetchEmployee();
  }, [id, isEditMode]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.jobTitle || !formData.shiftWage || !formData.employeeCode) {
      setError('Please fill Employee Code, First Name, Last Name, Job Title, and Shift Wage.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const firstName = formData.firstName.trim();
      const lastName = formData.lastName.trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const employeeCode = formData.employeeCode.trim();
      const jobTitle = formData.jobTitle.trim();
      const shiftWage = Number(formData.shiftWage || 0);
      const email = formData.email.trim();
      const phone = formData.phone.trim();

      const payload = {
        firstName,
        lastName,
        jobTitle,
        shiftWage,
        dailyWage: shiftWage,
        employeeCode,
        email: email || null,
        phone: phone || null,
        operatorCode: employeeCode,
        operatorName: fullName,
        department: formData.department || null,
        shiftRole: jobTitle,
        shiftType: formData.shiftType,
        contactInfo: phone || email || formData.contactInfo || null,
        isActive: true,
      };

      if (isEditMode) {
        await laborService.updateLabor(id, payload);
      } else {
        await laborService.createLabor(payload);
      }
      navigate('/settings?tab=labor');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to register employee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, color: '#64748b', fontSize: 13 }}>
        <Typography>Settings</Typography>
        <ChevronRight fontSize="small" />
        <Typography>Labor Master</Typography>
        <ChevronRight fontSize="small" />
        <Typography sx={{ color: '#005ab4', fontWeight: 700 }}>
          {isEditMode ? 'Edit Employee' : 'Add Employee'}
        </Typography>
      </Stack>

      <Typography sx={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', color: '#181c22' }}>
        {isEditMode ? `Update Personnel - ${id}` : 'Register New Personnel - 001'}
      </Typography>
      <Typography sx={{ color: '#64748b', mt: 0.6, mb: 3 }}>
        Complete the form below to add a new employee to the ERP system.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2 }}>
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, borderRadius: 3, border: '1px solid #c1c6d5' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>

            <TextField fullWidth label="Employee Code" value={formData.employeeCode} onChange={handleChange('employeeCode')} InputProps={{ startAdornment: <Badge sx={{ mr: 1, color: '#717785' }} /> }} />
            <TextField fullWidth label="First Name" value={formData.firstName} onChange={handleChange('firstName')} InputProps={{ startAdornment: <Person sx={{ mr: 1, color: '#717785' }} /> }} />
            <TextField fullWidth label="Last Name" value={formData.lastName} onChange={handleChange('lastName')} InputProps={{ startAdornment: <Person sx={{ mr: 1, color: '#717785' }} /> }} />
            <TextField select fullWidth label="Department" value={formData.department} onChange={handleChange('department')} InputProps={{ startAdornment: <Business sx={{ mr: 1, color: '#717785' }} /> }}>
              <MenuItem value="">Select Department</MenuItem>
              <MenuItem value="Production">Production</MenuItem>
              <MenuItem value="Quality Control">Quality Control</MenuItem>
              <MenuItem value="Logistics">Logistics</MenuItem>
              <MenuItem value="Administration">Administration</MenuItem>
            </TextField>
            <TextField fullWidth label="Job Title" value={formData.jobTitle} onChange={handleChange('jobTitle')} />
            <TextField fullWidth label="Email" type="email" value={formData.email} onChange={handleChange('email')} />
            <TextField fullWidth label="Phone" value={formData.phone} onChange={handleChange('phone')} />
          </Box>

          <Box sx={{ my: 2.5, borderTop: '1px solid #e2e8f0' }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569', mb: 1 }}>Shift Type</Typography>
              <RadioGroup row value={formData.shiftType} onChange={handleChange('shiftType')}>
                <FormControlLabel value="DAY" control={<Radio />} label={<Stack direction="row" spacing={0.5} alignItems="center"><LightMode fontSize="small" /><span>Day Shift</span></Stack>} />
                <FormControlLabel value="NIGHT" control={<Radio />} label={<Stack direction="row" spacing={0.5} alignItems="center"><DarkMode fontSize="small" /><span>Night Shift</span></Stack>} />
              </RadioGroup>
            </Box>
            <Box>
              <TextField fullWidth label="Wage per Shift" type="number" value={formData.shiftWage} onChange={handleChange('shiftWage')} InputProps={{ startAdornment: <Typography sx={{ color: '#717785', mr: 1 }}>$</Typography>, endAdornment: <Typography sx={{ color: '#717785', fontSize: 11 }}>USD</Typography> }} />
              <Typography sx={{ mt: 0.6, fontSize: 11, color: '#64748b' }}>Base pay excluding overtime bonuses</Typography>
            </Box>
          </Box>
          <Stack direction="row" justifyContent="flex-end" spacing={1.2} sx={{ mt: 3 }}>
            <Button onClick={() => navigate('/settings?tab=labor')} sx={{ fontWeight: 700, textTransform: 'none' }}>Discard</Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ fontWeight: 800, textTransform: 'none' }}>
              {saving ? (isEditMode ? 'Updating...' : 'Registering...') : (isEditMode ? 'Update Personnel' : 'Register Personnel')}
            </Button>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #c1c6d5', textAlign: 'center' }}>
            <Avatar src="https://lh3.googleusercontent.com/aida-public/AB6AXuBluFpZ4Y5h9S_33U3Xt6ENX3CAfwVMf53xv0Rhr_od7eIcOtPm9y16QdA1QELUJW32_NzcqxNp-j72SZdrzbOzD9VbAUCxSt__suQKlWlHZuiw67p4mGChMT097zzXQWwESKZcxZrO7Q_vHRxN6i-iddqbpuDxDs_pZaU3uZEkBVAT2TqtviXTIf2x0YcihDoZDroth5qbcpLGVP02vCC5XvsRJV_JhYbdeBsQpzF4O27kpCLwsQnASOH9uz5aEZt9d6OQ48geQBw" sx={{ width: 96, height: 96, mx: 'auto', mb: 1.5 }} />
            <Typography sx={{ fontWeight: 800 }}>Employee Photo</Typography>
            <Typography sx={{ color: '#64748b', fontSize: 12 }}>JPEG or PNG. Max 5MB.</Typography>
          </Paper>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#0873df', color: '#fff' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <VerifiedUser fontSize="small" />
              <Typography sx={{ fontWeight: 800 }}>Policy Note</Typography>
            </Stack>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
              All new registrations are subject to verification by HR. Employee IDs must follow regional format.
            </Typography>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
};

export default AddEmployee;
