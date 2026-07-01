import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { getBrand } from '@/config/brand';
import { getPageTitle } from '@/lib/page-titles';
import { getRoleLabel } from '@/lib/utils';
import { Bell, Menu } from 'lucide-react';

export function TopBar() {
  const brand = getBrand();
  const { user, notifications, toggleSidebar, toggleMobileDrawer } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const title = getPageTitle(location.pathname, brand.productName);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileDrawer}
          className="lg:hidden min-h-11 min-w-11 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:flex min-h-11 min-w-11 items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          aria-label="Alternar barra lateral"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-900" aria-live="polite">
            {title}
          </p>
          <p className="text-[10px] text-gray-500 hidden sm:block">{brand.tagline}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/alertas')}
          className="relative min-h-11 min-w-11 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          aria-label={
            notifications > 0
              ? `Ir al centro de alertas, ${notifications} pendientes`
              : 'Ir al centro de alertas'
          }
        >
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: brand.colors.secondary }}
          >
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'US'}
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-medium text-gray-900">{user?.name?.split(' ').slice(0, 2).join(' ')}</div>
            <div className="text-[10px] text-gray-500">{getRoleLabel(user?.role)}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
