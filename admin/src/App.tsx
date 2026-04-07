import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { RequireAdmin } from '@/components/RequireAdmin';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminLayout } from '@/layouts/AdminLayout';
import { GardesPage } from '@/pages/GardesPage';
import { LoginPage } from '@/pages/LoginPage';
import { PharmaciesPage } from '@/pages/PharmaciesPage';
import { StatsPage } from '@/pages/StatsPage';
import { VerificationsPage } from '@/pages/VerificationsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route path="/" element={<Navigate to="/pharmacies" replace />} />
            <Route path="/pharmacies" element={<PharmaciesPage />} />
            <Route path="/gardes" element={<GardesPage />} />
            <Route path="/verifications" element={<VerificationsPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/pharmacies" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
