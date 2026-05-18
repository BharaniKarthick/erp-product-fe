import api from './axios';

export const customerService = {
  getAllCustomers: async () => {
    const response = await api.get('/api/customers');
    return response.data;
  },

  getCustomerById: async (id) => {
    const response = await api.get(`/api/customers/${id}`);
    return response.data;
  },

  createCustomer: async (customerData) => {
    const response = await api.post('/api/customers', customerData);
    return response.data;
  },

  updateCustomer: async (id, customerData) => {
    const response = await api.put(`/api/customers/${id}`, customerData);
    return response.data;
  },

  deleteCustomer: async (id) => {
    await api.delete(`/api/customers/${id}`);
  },
};
