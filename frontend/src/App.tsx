import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import MasterDashboard from './pages/MasterDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EventsPage from './pages/EventsPage';
import UploadPage from './pages/UploadPage';
import UsersPage from './pages/UsersPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to={user?.role === 'admin' ? '/master' : '/dashboard'} replace />} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/master" element={<AdminRoute><MasterDashboard /></AdminRoute>} />
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/upload" element={<AdminRoute><UploadPage /></AdminRoute>} />
        <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
