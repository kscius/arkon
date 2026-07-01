import * as ReactRouter from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AppProvider, useApp } from '@/context/AppContext';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { Spinner } from '@/components/ui/spinner';
import LoginPage from '@/pages/LoginPage';
import BandejaAccionesPage from '@/pages/BandejaAccionesPage';
import DashboardRouter from '@/components/dashboard/DashboardRouter';
import ObraDetailPage from '@/pages/ObraDetailPage';
import ObrasPage from '@/pages/ObrasPage';
import MunicipioPanelPage from '@/pages/MunicipioPanelPage';
import ContratistaPanelPage from '@/pages/ContratistaPanelPage';
import AsistentePage from '@/pages/AsistentePage';
import AlertasPage from '@/pages/AlertasPage';
import ConfiguradorAlertasPage from '@/pages/ConfiguradorAlertasPage';
import AdminUsuariosPage from '@/pages/AdminUsuariosPage';
import SolicitudesPage from '@/pages/SolicitudesPage';
import AnexosPage from '@/pages/AnexosPage';
import CierresEjercicioPage from '@/pages/CierresEjercicioPage';
import ProaguaImportPage from '@/pages/ProaguaImportPage';
import { ContratistasRedirect, MunicipiosRedirect } from '@/components/CatalogRedirect';

const { Routes, Route, Navigate, useLocation } = ReactRouter;
const HashRouter = ReactRouter.HashRouter;

function AuthBootScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-surface">
      <Spinner className="size-8 text-brand-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, authReady, canAccess } = useApp();
  const location = useLocation();
  const path = location.pathname;

  if (!authReady) return <AuthBootScreen />;
  if (!user) return <Navigate to="/" replace />;

  if (!canAccess(path)) {
    return <Navigate to="/bandeja" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, authReady, mobileDrawerOpen, toggleMobileDrawer } = useApp();

  if (!authReady) return <AuthBootScreen />;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen bg-brand-surface">
      <Sidebar />
      {mobileDrawerOpen && <MobileDrawer onClose={toggleMobileDrawer} />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, authReady } = useApp();

  if (!authReady) return <AuthBootScreen />;

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/bandeja" replace /> : <LoginPage />}
      />
      <Route
        path="/bandeja"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BandejaAccionesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardRouter />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/acciones"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ObrasPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/acciones/:obraId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ObraDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/municipios"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MunicipiosRedirect />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/municipios/:municipioId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MunicipioPanelPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratistas"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ContratistasRedirect />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratistas/:contratistaId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ContratistaPanelPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alertas"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AlertasPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/configurador-alertas"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ConfiguradorAlertasPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/asistente"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AsistentePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/solicitudes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SolicitudesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/anexos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AnexosPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cierres-ejercicio"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CierresEjercicioPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/proagua/import"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProaguaImportPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AdminUsuariosPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/bandeja" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <HashRouter>
        <AppProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </AppProvider>
      </HashRouter>
    </ThemeProvider>
  );
}
