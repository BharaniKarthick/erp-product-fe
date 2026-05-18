import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import OrderForm from './pages/OrderForm';
import Inventory from './pages/Inventory';
import AddNewItem from './pages/AddNewItem';
import InventoryDetail from './pages/InventoryDetail';
import Reports from './pages/Reports';

import ReportOrderWorkspace from './pages/ReportOrderWorkspace';
import Settings from './pages/Settings';
import AddEmployee from './pages/AddEmployee';
import AddCustomer from './pages/AddCustomer';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1275e2',
    },
    secondary: {
      main: '#5f78a3',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f59e0b',
    },
    success: {
      main: '#10b981',
    },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            <Route path="orders" element={<Orders />} />
            <Route path="orders/new" element={<OrderForm />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="orders/:id/edit" element={<OrderForm />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/new" element={<AddNewItem />} />

            <Route path="inventory/:id/edit" element={<AddNewItem />} />
            <Route path="inventory/:id" element={<InventoryDetail />} />
            <Route path="reports" element={<Reports />} />

            <Route path="reports/orders/:id" element={<ReportOrderWorkspace />} />
            <Route path="settings" element={<Settings />} />

            <Route path="settings/labor/new" element={<AddEmployee />} />
            <Route path="settings/labor/:id/edit" element={<AddEmployee />} />
            <Route path="settings/customers/new" element={<AddCustomer />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
