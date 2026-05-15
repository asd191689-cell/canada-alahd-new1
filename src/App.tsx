import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './components/LoginPage';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import FamiliesPage from './pages/FamiliesPage';
import FamilyFormPage from './pages/FamilyFormPage';
import AidPage from './pages/AidPage';
import ReportsPage from './pages/ReportsPage';
import AuditPage from './pages/AuditPage';
import UsersPage from './pages/UsersPage';

function AppRoutes() {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/families" element={<FamiliesPage />} />
        <Route path="/families/new" element={<FamilyFormPage />} />
        <Route path="/families/edit/:id" element={<FamilyFormPage />} />
        <Route path="/aid" element={<AidPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit" element={
          currentUser.role === 'admin' ? <AuditPage /> : <Navigate to="/" replace />
        } />
        <Route path="/users" element={
          currentUser.role === 'admin' ? <UsersPage /> : <Navigate to="/" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
