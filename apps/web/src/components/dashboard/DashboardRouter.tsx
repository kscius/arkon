import { useApp } from '@/context/AppContext';
import { Navigate } from 'react-router-dom';
import DashboardEstatalPage from '@/pages/DashboardEstatalPage';
import DashboardMunicipalPage from '@/pages/DashboardMunicipalPage';
import DashboardContratistaPage from '@/pages/DashboardContratistaPage';

export default function DashboardRouter() {
  const { user } = useApp();
  if (!user) return <Navigate to="/" />;

  if (user.role === 'estatal') return <DashboardEstatalPage />;
  if (user.role === 'municipal') return <DashboardMunicipalPage />;
  if (user.role === 'contratista') return <DashboardContratistaPage />;
  return <Navigate to="/" />;
}
