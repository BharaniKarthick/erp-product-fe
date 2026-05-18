import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  ShoppingCart,
  Inventory,
  Assessment,
  Settings,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { authService } from '../api/authService';

const drawerWidth = 260;

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const user = authService.getCurrentUser();

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Orders', icon: <ShoppingCart />, path: '/orders' },
    { text: 'Inventory', icon: <Inventory />, path: '/inventory' },
    { text: 'Reports', icon: <Assessment />, path: '/reports' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
      <List sx={{ px: 1.5, pt: 2, flex: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.4 }}>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
              sx={{
                minHeight: 44,
                borderRadius: 2,
                pl: 2,
                color: '#5f6b7a',
                transition: 'all 180ms ease',
                '& .MuiListItemIcon-root': {
                  minWidth: 34,
                  color: 'inherit',
                },
                '& .MuiListItemText-primary': {
                  fontSize: 14,
                  fontWeight: 600,
                },
                '&:hover': {
                  bgcolor: '#edf2f7',
                  pl: 2.35,
                },
                '&.Mui-selected': {
                  backgroundColor: '#eaf2ff',
                  color: '#1275e2',
                  borderRight: '4px solid #1275e2',
                  '& .MuiListItemIcon-root': {
                    color: '#1275e2',
                  },
                  '&:hover': {
                    backgroundColor: '#eaf2ff',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ px: 1.5, pb: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              minHeight: 44,
              borderRadius: 2,
              pl: 2,
              color: '#5f6b7a',
              '& .MuiListItemIcon-root': {
                minWidth: 34,
                color: 'inherit',
              },
              '& .MuiListItemText-primary': {
                fontSize: 14,
                fontWeight: 600,
              },
              '&:hover': {
                bgcolor: '#feecec',
                color: '#c81e1e',
              },
            }}
          >
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}

      <AppBar
        position="fixed"
        sx={{
          backgroundColor: 'white',
          color: '#374151',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        }}
      >

        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', width: `${drawerWidth}px`, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: '#1275e2' }}>
              Cotton Park
            </Typography>
          </Box>

          <Typography sx={{ display: { xs: 'block', sm: 'none' }, fontSize: 18, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: '#1275e2' }}>
            Cotton Park
          </Typography>

          <Box sx={{ flexGrow: 1, minWidth: 0 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.roleName}
              </Typography>
            </Box>
            <IconButton onClick={handleMenuClick}>
              <Avatar sx={{ bgcolor: '#1275e2', width: 36, height: 36 }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: '#f8fafc',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: 64,
              height: 'calc(100% - 64px)',
              bgcolor: '#f8fafc',
              borderRight: '1px solid #e5e7eb',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
