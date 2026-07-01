import { useApp } from '@/context/AppContext';
import { Navigate } from 'react-router-dom';
import DashboardEstatalPage from '@/pages/DashboardEstatalPage';
import DashboardMunicipalPage from '@/pages/DashboardMunicipalPage';
import DashboardContratistaPage from '@/pages/DashboardContratistaPage';
import { PendingActionsInbox } from '@/components/PendingActionsInbox';

export default function DashboardRouter() {
  const { user } = useApp();
  if (!user) return <Navigate to="/" />;

  const RoleDashboard =
    user.role === 'estatal'
      ? DashboardEstatalPage
      : user.role === 'municipal'
        ? DashboardMunicipalPage
        : user.role === 'contratista'
          ? DashboardContratistaPage
          : null;

  if (!RoleDashboard) return <Navigate to="/" />;

  return (
    <div className="space-y-6">
      <PendingActionsInbox />
      <RoleDashboard />
    </div>
  );
}
