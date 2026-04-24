import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateTransaction from './pages/CreateTransaction';
import TransactionDetails from './pages/TransactionDetails';
import Transactions from './pages/Transactions';
import JoinTransaction from './pages/JoinTransaction';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import AppLockScreen from './components/AppLockScreen';
import BlockedScreen from './pages/BlockedScreen';
import TOSModal from './components/TOSModal';
import ProfileCompletionModal from './components/ProfileCompletionModal';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-paper">Memuat...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (profile?.isBlocked) {
    return <BlockedScreen />;
  }

  return (
    <>
      <TOSModal />
      <ProfileCompletionModal />
      {children}
    </>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-paper">Memuat...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  const { user, loading, isAppLocked, isAdmin } = useAuth();

  if (loading) {
    return <Splash />;
  }

  if (isAppLocked && user) {
    return <AppLockScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <Onboarding />} />
        <Route path="/login" element={user ? (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <Login />} />
        
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />} />
          <Route path="/transactions" element={isAdmin ? <Navigate to="/admin" replace /> : <Transactions />} />
          <Route path="/create" element={isAdmin ? <Navigate to="/admin" replace /> : <CreateTransaction />} />
          <Route path="/join" element={isAdmin ? <Navigate to="/admin" replace /> : <JoinTransaction />} />
          <Route path="/transaction/:id" element={<TransactionDetails />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </AuthProvider>
  );
}
