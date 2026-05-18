import api from './axios';

export const laborService = {
  // Get all labor records
  getAllLabor: async () => {
    const response = await api.get('/api/settings/labor');
    return response.data;
  },

  // Get labor by ID
  getLaborById: async (id) => {
    const response = await api.get(`/api/settings/labor/${id}`);
    return response.data;
  },

  // Create labor record
  createLabor: async (laborData) => {
    const response = await api.post('/api/settings/labor', laborData);
    return response.data;
  },

  // Update labor record
  updateLabor: async (id, laborData) => {
    const response = await api.put(`/api/settings/labor/${id}`, laborData);
    return response.data;
  },

  // Delete labor record
  deleteLabor: async (id) => {
    await api.delete(`/api/settings/labor/${id}`);
  },
};
