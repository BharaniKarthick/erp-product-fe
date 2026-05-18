import api from './axios';

export const reportsService = {
  // Get production reports
  getProductionReport: async (startDate, endDate) => {
    const response = await api.get('/api/reports/production', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Get financial reports
  getFinancialReport: async (startDate, endDate) => {
    const response = await api.get('/api/reports/financial', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Get inventory reports
  getInventoryReport: async () => {
    const response = await api.get('/api/reports/inventory');
    return response.data;
  },

  // Get order analytics
  getOrderAnalytics: async (period = '30') => {
    const response = await api.get(`/api/reports/analytics?period=${period}`);
    return response.data;
  },
};
