import api from './axios';

export const aiService = {
  estimateProductionCosts: async (orderData) => {
    const response = await api.post('/api/ai/estimate', orderData);
    return response.data;
  },
};
