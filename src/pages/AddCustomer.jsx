import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { customerService } from '../api/customerService';

const defaultForm = {
  customerCode: '',
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  mobile: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  taxId: '',
  creditLimit: '',
  paymentTerms: '',
  tier: 'STANDARD',
  notes: '',
  isActive: true,
};

const AddCustomer = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.customerCode || !formData.companyName) {
      setError('Customer Code and Company Name are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await customerService.createCustomer({
        customerCode: formData.customerCode,
        companyName: formData.companyName,
        contactPerson: formData.contactPerson || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        addressLine1: formData.addressLine1 || null,
        addressLine2: formData.addressLine2 || null,
        city: formData.city || null,
        state: formData.state || null,
        postalCode: formData.postalCode || null,
        country: formData.country || null,
        taxId: formData.taxId || null,
        creditLimit: Number(formData.creditLimit || 0),
        paymentTerms: formData.paymentTerms || null,
        isActive: true,
        notes: formData.notes || null,
        tier: formData.tier || 'STANDARD',
      });
      navigate('/settings?tab=customer');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create customer.');
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
        <Typography>Customer Master</Typography>
        <ChevronRight fontSize="small" />
        <Typography sx={{ color: '#005ab4', fontWeight: 700 }}>Add Customer</Typography>
      </Stack>

      <Typography sx={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', color: '#181c22' }}>
        Register Customer Profile
      </Typography>
      <Typography sx={{ color: '#64748b', mt: 0.6, mb: 3 }}>
        Add a new customer using the master data fields from the customers domain model.
      </Typography>

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, borderRadius: 3, border: '1px solid #c1c6d5' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField fullWidth label="Customer Code" value={formData.customerCode} onChange={handleChange('customerCode')} required />
          <TextField fullWidth label="Company Name" value={formData.companyName} onChange={handleChange('companyName')} required />
          <TextField fullWidth label="Contact Person" value={formData.contactPerson} onChange={handleChange('contactPerson')} />
          <TextField fullWidth label="Email" type="email" value={formData.email} onChange={handleChange('email')} />
          <TextField fullWidth label="Phone" value={formData.phone} onChange={handleChange('phone')} />
          <TextField fullWidth label="Mobile" value={formData.mobile} onChange={handleChange('mobile')} />
          <TextField fullWidth label="Address Line 1" value={formData.addressLine1} onChange={handleChange('addressLine1')} />
          <TextField fullWidth label="Address Line 2" value={formData.addressLine2} onChange={handleChange('addressLine2')} />
          <TextField fullWidth label="City" value={formData.city} onChange={handleChange('city')} />
          <TextField fullWidth label="State" value={formData.state} onChange={handleChange('state')} />
          <TextField fullWidth label="Postal Code" value={formData.postalCode} onChange={handleChange('postalCode')} />
          <TextField fullWidth label="Country" value={formData.country} onChange={handleChange('country')} />
          <TextField fullWidth label="Tax ID" value={formData.taxId} onChange={handleChange('taxId')} />
          <TextField fullWidth label="Credit Limit" type="number" value={formData.creditLimit} onChange={handleChange('creditLimit')} />
          <TextField fullWidth label="Payment Terms" value={formData.paymentTerms} onChange={handleChange('paymentTerms')} />
          <TextField select fullWidth label="Tier" value={formData.tier} onChange={handleChange('tier')}>
            <MenuItem value="STANDARD">Standard</MenuItem>
            <MenuItem value="SILVER">Silver</MenuItem>
            <MenuItem value="GOLD">Gold</MenuItem>
            <MenuItem value="PLATINUM">Platinum</MenuItem>
          </TextField>
        </Box>

        <TextField fullWidth multiline minRows={3} sx={{ mt: 2 }} label="Notes" value={formData.notes} onChange={handleChange('notes')} />

        <Stack direction="row" justifyContent="flex-end" spacing={1.2} sx={{ mt: 3 }}>
          <Button onClick={() => navigate('/settings?tab=customer')} sx={{ fontWeight: 700, textTransform: 'none' }}>Discard</Button>
          <Button type="submit" variant="contained" disabled={saving} sx={{ fontWeight: 800, textTransform: 'none' }}>
            {saving ? 'Saving...' : 'Register Customer'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default AddCustomer;
