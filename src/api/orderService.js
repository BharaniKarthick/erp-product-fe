import api from './axios';

export const orderService = {
  // Get all orders
  getAllOrders: async () => {
    const response = await api.get('/api/orders');
    return response.data;
  },

  // Get order detail
  getOrderDetail: async (id) => {
    const response = await api.get(`/api/orders/${id}/detail`);
    return response.data;
  },

  // Create order
  createOrder: async (orderData) => {
    const response = await api.post('/api/orders', orderData);
    return response.data;
  },

  // Update order
  updateOrder: async (id, orderData) => {
    const response = await api.put(`/api/orders/${id}`, orderData);
    return response.data;
  },

  // Delete order
  deleteOrder: async (id) => {
    await api.delete(`/api/orders/${id}`);
  },

  // Materials
  addMaterial: async (orderId, materialData) => {
    const response = await api.post(`/api/orders/${orderId}/materials`, materialData);
    return response.data;
  },

  removeMaterial: async (materialId) => {
    await api.delete(`/api/orders/materials/${materialId}`);
  },

  // Labor
  addLabor: async (orderId, laborData) => {
    const response = await api.post(`/api/orders/${orderId}/labor`, laborData);
    return response.data;
  },

  removeLabor: async (laborId) => {
    await api.delete(`/api/orders/labor/${laborId}`);
  },

  // Machines
  addMachine: async (orderId, machineData) => {
    const response = await api.post(`/api/orders/${orderId}/machines`, machineData);
    return response.data;
  },

  removeMachine: async (machineId) => {
    await api.delete(`/api/orders/machines/${machineId}`);
  },

  // Transactions
  getAllOrderTransactions: async () => {
    const response = await api.get('/api/orders/transactions/all');
    return response.data;
  },

  getOrderTransactions: async (orderId) => {
    const response = await api.get(`/api/orders/${orderId}/transactions`);
    return response.data;
  },

  // Change order status
  changeOrderStatus: async (orderId, newStatus, notes = '') => {
    const response = await api.patch(`/api/orders/${orderId}/status`, {
      newStatus,
      notes,
    });
    return response.data;
  },
};
