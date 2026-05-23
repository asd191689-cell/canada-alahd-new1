import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";

import LoginPage from "./components/LoginPage";
import MainLayout from "./components/Layout/MainLayout";

import Dashboard from "./pages/Dashboard";
import FamiliesPage from "./pages/FamiliesPage";
import DocumentsPage from "./pages/DocumentsPage";
import FamilyFormPage from "./pages/FamilyFormPage.tsx";
import AidPage from "./pages/AidPage";
import ReportsPage from "./pages/ReportsPage";
import AuditPage from "./pages/AuditPage";
import UsersPage from "./pages/UsersPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();

  // أثناء تحميل localStorage
  if (currentUser === undefined) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-gray-500 font-bold text-lg">جاري التحميل...</div>
      </div>
    );
  }

  // إذا غير مسجل دخول
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();

  if (currentUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser } = useApp();

  return (
    <Routes>
      {/* LOGIN */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* PROTECTED */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />

                <Route path="/families" element={<FamiliesPage />} />

                <Route path="/families/new" element={<FamilyFormPage />} />
                <Route path="/documents" element={<DocumentsPage />} />

                <Route path="/families/edit/:id" element={<FamilyFormPage />} />

                <Route path="/aid" element={<AidPage />} />

                <Route path="/reports" element={<ReportsPage />} />

                {/* ADMIN ONLY */}
                <Route
                  path="/audit"
                  element={
                    <AdminRoute>
                      <AuditPage />
                    </AdminRoute>
                  }
                />

                <Route
                  path="/users"
                  element={
                    <AdminRoute>
                      <UsersPage />
                    </AdminRoute>
                  }
                />

                {/* FALLBACK */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
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
