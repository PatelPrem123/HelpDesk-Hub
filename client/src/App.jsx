import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { Layout } from './components/layout/Layout.jsx';

import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { EmployeeDashboard } from './pages/EmployeeDashboard.jsx';
import { TechQueue } from './pages/TechQueue.jsx';
import { AdminConsole } from './pages/AdminConsole.jsx';
import { TicketDetail } from './pages/TicketDetail.jsx';
import { NewTicket } from './pages/NewTicket.jsx';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        Loading HelpDesk Hub...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) {
    return <Navigate to={user.role === 'Administrator' ? '/admin' : user.role === 'Technician' ? '/queue' : '/'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

                {/* Protected Layout Routes */}
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<EmployeeDashboard />} />
                  <Route path="tickets/new" element={<NewTicket />} />
                  <Route path="tickets/:id" element={<TicketDetail />} />

                  {/* Technician & Admin Routes */}
                  <Route
                    path="queue"
                    element={
                      <ProtectedRoute allowedRoles={['Technician', 'Administrator']}>
                        <TechQueue />
                      </ProtectedRoute>
                    }
                  />

                  {/* Administrator Routes */}
                  <Route
                    path="admin"
                    element={
                      <ProtectedRoute allowedRoles={['Administrator']}>
                        <AdminConsole />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={['Administrator']}>
                        <AdminConsole />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/audit"
                    element={
                      <ProtectedRoute allowedRoles={['Administrator']}>
                        <AdminConsole />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/export"
                    element={
                      <ProtectedRoute allowedRoles={['Administrator']}>
                        <AdminConsole />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
