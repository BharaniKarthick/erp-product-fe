import api from './axios';

let inFlightGetAllItemsRequest = null;

export const inventoryService = {
  // Get all inventory items
  getAllItems: async () => {

    if (inFlightGetAllItemsRequest) {
      return inFlightGetAllItemsRequest;
    }

    inFlightGetAllItemsRequest = api
      .get('/api/inventory')
      .then((response) => response.data)
      .finally(() => {
        inFlightGetAllItemsRequest = null;
      });

    return inFlightGetAllItemsRequest;
  },

  // Get paginated inventory items with optional search and category
  getItemsPage: async ({ page = 0, size = 50, search = '', category = '' } = {}) => {
    const response = await api.get('/api/inventory/paged', {
      params: {
        page,
        size,
        search: search || undefined,
        category: category || undefined,
      },
    });
    return response.data;
  },

  // Get inventory item by ID
  getItemById: async (id) => {
    const response = await api.get(`/api/inventory/${id}`);
    return response.data;
  },

  // Create inventory item
  createItem: async (itemData) => {
    const response = await api.post('/api/inventory', itemData);
    return response.data;
  },

  // Update inventory item
  updateItem: async (id, itemData) => {
    const response = await api.put(`/api/inventory/${id}`, itemData);
    return response.data;
  },

  // Delete inventory item
  deleteItem: async (id) => {
    await api.delete(`/api/inventory/${id}`);
  },

  // Get transactions for an item
  getTransactions: async (itemId) => {
    const response = await api.get(`/api/inventory/${itemId}/transactions`);
    return response.data;
  },

  // Get all recent transactions across inventory items
  getRecentTransactions: async () => {
    const response = await api.get('/api/inventory/transactions/recent');
    return response.data;
  },

  // Get paginated recent transactions with optional search and date filters
  getRecentTransactionsPage: async ({
    page = 0,
    size = 50,
    search = '',
    fromDate = '',
    toDate = '',
  } = {}) => {
    const response = await api.get('/api/inventory/transactions/recent/paged', {
      params: {
        page,
        size,
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      },
    });
    return response.data;
  },

  // Get available inventory categories
  getCategories: async () => {
    const response = await api.get('/api/inventory/categories');
    return response.data;
  },

  // Add transaction
  addTransaction: async (itemId, transactionData) => {
    const response = await api.post(`/api/inventory/${itemId}/transactions`, transactionData);
    return response.data;
  },

  // Adjust inventory (stock in/out)
  adjustInventory: async (
    inventoryItemId,
    quantity,
    reason,
    notes,
    effectiveDate,
    movementType
  ) => {
    const response = await api.post('/api/inventory/adjust', {
      inventoryItemId,
      quantity,
      reason,
      notes,
      effectiveDate,
      movementType,
    });
    return response.data;
  },

  // Get low stock alerts
  getLowStockAlerts: async () => {
    const response = await api.get('/api/inventory/alerts/low-stock');
    return response.data;
  },
};
