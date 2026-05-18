# PrintFlow ERP - Frontend Application

Modern React-based frontend for the PrintFlow ERP Production Management System.

## 🚀 Features

- **Dashboard**: Real-time KPIs, alerts, and recent orders overview
- **Orders Management**: Complete order lifecycle management with detailed views
- **Inventory Control**: Track inventory, manage transactions, and handle adjustments
- **Reports & Analytics**: Production, financial, inventory, and performance reports
- **Labor Master Settings**: Manage workforce and labor rates
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Technology Stack

- **React 19** - UI framework
- **Material-UI (MUI)** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Vite** - Build tool

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔧 Configuration

### Backend API URL

Update the base URL in `src/api/axios.js` if your backend is running on a different port:

```javascript
const api = axios.create({
  baseURL: 'http://localhost:8080', // Change this if needed
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## 📁 Project Structure

```
src/
├── api/                    # API service layer
│   ├── axios.js           # Axios configuration
│   ├── authService.js     # Authentication API
│   ├── dashboardService.js # Dashboard API
│   ├── orderService.js    # Orders API
│   ├── inventoryService.js # Inventory API
│   ├── laborService.js    # Labor API
│   └── reportsService.js  # Reports API
├── components/            # Reusable components
│   ├── Layout.jsx        # Main layout with navigation
│   └── ProtectedRoute.jsx # Authentication guard
├── pages/                 # Page components
│   ├── Login.jsx         # Login page
│   ├── Dashboard.jsx     # Dashboard
│   ├── Orders.jsx        # Orders list
│   ├── OrderDetail.jsx   # Order details
│   ├── Inventory.jsx     # Inventory management
│   ├── Reports.jsx       # Reports & analytics
│   └── Settings.jsx      # Labor master settings
├── App.jsx               # Main app with routing
└── main.jsx              # Entry point
```

## 🎨 Design System

The application follows the PrintFlow design system:

### Colors
- **Primary**: `#1275e2` (Blue)
- **Secondary**: `#5f78a3` (Slate Blue)
- **Success**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Amber)
- **Error**: `#ef4444` (Red)

### Typography
- **Font Family**: Inter
- **Font Weights**: 300, 400, 500, 600, 700

## 🔐 Authentication

Default credentials:
- **Username**: `admin`
- **Password**: `admin123`

The application uses JWT token-based authentication. Tokens are stored in localStorage.

## 📱 Pages Overview

### Dashboard
- KPI metrics (Total Orders, Active Orders, Revenue, Profit)
- Low inventory alerts
- Negative profit alerts
- Delayed order alerts
- Recent orders table

### Orders Management
- List all orders with search
- View order details
- Add/remove materials, labor, and machines
- Track progress and profitability
- Transaction history

### Inventory Management
- View all inventory items
- Track stock levels
- Add inventory adjustments
- View transaction history
- Low stock and out-of-stock alerts

### Reports & Analytics
- Production reports
- Financial reports
- Inventory reports
- Order analytics
- Performance trends

### Settings
- Labor master management
- Add/edit/delete labor records
- Manage hourly rates
- Track active/inactive workers

## 🔨 Build for Production

```bash
npm run build
```

The build output will be in the `dist/` folder.

## 📝 API Integration

All API calls go through the service layer in `src/api/`. Each service handles a specific domain:

- `authService` - Login/logout
- `dashboardService` - Dashboard data
- `orderService` - Order CRUD operations
- `inventoryService` - Inventory management
- `laborService` - Labor master
- `reportsService` - Reports and analytics

## 🤝 Working with Backend

Ensure the backend API is running on `http://localhost:8080` before starting the frontend. The backend repository is located at:

```
/Users/b0k03wc/Documents/3-8/ERP/erp-product-be
```

## 📄 License

This is a proprietary ERP system for production management.

## 👨‍💻 Development

For detailed backend API documentation, refer to:
- Backend README
- API_QUICK_REFERENCE.md
- FRONTEND_API_REFERENCE.md

## 🐛 Error Handling

The application includes:
- Global error interceptor for 401 (unauthorized) responses
- Automatic redirect to login on authentication failure
- User-friendly error messages
- Loading states for async operations

## 🎯 Next Steps

1. Start the backend server
2. Run the frontend development server
3. Login with default credentials
4. Explore the features!

For additional features or customization, refer to the backend documentation for available API endpoints.
