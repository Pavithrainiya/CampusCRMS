import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import API from '../services/api';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  CalendarDays, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  Activity,
  Bell,
  Check,
  CheckCheck,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'success');
    navigate('/login');
  };

  const fetchNotifications = async () => {
    try {
      const response = await API.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 20 seconds
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      await API.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.post('/notifications/read_all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Failed to mark all read', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: ['Student', 'Staff', 'Admin']
    },
    {
      name: 'Resources',
      path: '/resources',
      icon: <Layers className="w-5 h-5" />,
      roles: ['Student', 'Staff', 'Admin']
    },
    {
      name: 'Bookings',
      path: '/bookings',
      icon: <CalendarDays className="w-5 h-5" />,
      roles: ['Student', 'Staff', 'Admin']
    },
    {
      name: 'Users',
      path: '/users',
      icon: <Users className="w-5 h-5" />,
      roles: ['Admin']
    }
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-xl border-r border-slate-800/50">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/50">
        <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400 border border-primary-500/20">
          <Activity className="w-6 h-6 animate-pulse-subtle" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg text-slate-100 tracking-tight">Campus<span className="text-primary-400">RMS</span></h1>
          <span className="text-xs text-slate-500 font-medium">Resource Manager</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/15' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent hover:border-slate-800/50'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-950/20">
        <div className="flex items-center gap-3 px-2 py-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold border border-slate-700/50 shadow-md">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20 uppercase mt-0.5">
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 bg-radial-gradient flex text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 md:hidden"
            >
              <div className="relative h-full">
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-md bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
                {sidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/40 bg-slate-950/20 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block">
              <p className="text-xs text-slate-500 font-medium">Welcome back,</p>
              <h2 className="text-sm font-semibold text-slate-200">{user?.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Notification Bell Icon */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 rounded-lg border transition-all duration-200 relative ${
                  isNotifOpen 
                    ? 'bg-primary-500/10 border-primary-500/40 text-primary-400' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-slate-950 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    {/* Click outside overlay */}
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsNotifOpen(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md z-40 flex flex-col"
                    >
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-slate-950/40">
                        <span className="text-xs font-bold text-slate-300">Notifications</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1 text-[10px] font-bold text-primary-400 hover:text-primary-300"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                          </button>
                        )}
                      </div>

                      {/* Notification list */}
                      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 max-h-72">
                        {notifications.length === 0 ? (
                          <div className="py-8 px-4 text-center">
                            <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              className={`p-4 flex gap-3 transition-colors ${
                                notif.is_read ? 'opacity-60 hover:opacity-90' : 'bg-primary-500/5'
                              }`}
                            >
                              <div className="flex-1 space-y-1">
                                <p className="text-xs text-slate-200 leading-normal">{notif.message}</p>
                                <span className="text-[9px] text-slate-500 block">
                                  {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              
                              {!notif.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="self-start p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400"
                                  title="Mark as Read"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
            </div>
          </div>
        </header>

        {/* Content Page Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
