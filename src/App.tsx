/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import ReportsPage from './pages/ReportsPage';
import Assistant from './pages/Assistant';
import Layout from './components/Layout';
import FamilySetup from './pages/FamilySetup';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (!profile.familyId) return <Navigate to="/setup" replace />;
  return <Layout>{children}</Layout>;
}

function MainApp() {
  const { loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<FamilySetup />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainApp />
      </DataProvider>
    </AuthProvider>
  );
}
