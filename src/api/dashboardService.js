import api from './axios';

export const dashboardService = {
  getSummary: async () => {
    const response = await api.get('/api/dashboard/summary');
    return response.data;
  },

  getKPIs: async () => {
    const response = await api.get('/api/dashboard/kpi');
    return response.data;
  },

  getLowInventoryAlerts: async () => {
    const response = await api.get('/api/dashboard/alerts/low-inventory');
    return response.data;
  },

  getNegativeProfitAlerts: async () => {
    const response = await api.get('/api/dashboard/alerts/negative-profit');
    return response.data;
  },

  getDelayedOrderAlerts: async () => {
    const response = await api.get('/api/dashboard/alerts/delayed');
    return response.data;
  },

  getRecentOrders: async (days = 7) => {
    const response = await api.get(`/api/dashboard/recent-orders?days=${days}`);
    return response.data;
  },
};
