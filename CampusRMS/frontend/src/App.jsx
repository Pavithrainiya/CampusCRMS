import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/ToastContext';
import { ProtectedRoute, RoleRoute } from './components/RouteGuards';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import Bookings from './pages/Bookings';
import Users from './pages/Users';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Access */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Access */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/dashboard"
                element={
                  <Layout>
                    <Dashboard />
                  </Layout>
                }
              />
              <Route
                path="/resources"
                element={
                  <Layout>
                    <Resources />
                  </Layout>
                }
              />
              <Route
                path="/bookings"
                element={
                  <Layout>
                    <Bookings />
                  </Layout>
                }
              />

              {/* Admin Access Only */}
              <Route element={<RoleRoute allowedRoles={['Admin']} />}>
                <Route
                  path="/users"
                  element={
                    <Layout>
                      <Users />
                    </Layout>
                  }
                />
              </Route>
            </Route>

            {/* Redirect fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
