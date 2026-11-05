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
  const { user, loading, logout } = useAuth();

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
    return (
      <div className="max-w-lg mx-auto my-16 p-8 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/60 rounded-2xl shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Privileges Required</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aap currently <strong>{user.name}</strong> ke roop me logged in hain, jiska role <strong>{user.role}</strong> hai. Yeh section access karne ke liye <strong>{allowedRoles.join(', ')}</strong> role hona zaroori hai.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
          >
            Go to My Support Tickets
          </a>
          <button
            onClick={logout}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/25"
          >
            Switch Account / Login as Admin
          </button>
        </div>
      </div>
    );
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
