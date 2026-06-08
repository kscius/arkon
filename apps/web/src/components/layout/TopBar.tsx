import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { getBrand } from '@/config/brand';
import { Bell, Menu } from 'lucide-react';

export function TopBar() {
  const brand = getBrand();
  const { user, notifications, toggleSidebar, toggleMobileDrawer } = useApp();
  const location = useLocation();

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard Ejecutivo';
    if (path === '/obras') return 'Catalogo de Obras';
    if (path.startsWith('/obras/')) return 'Detalle de Obra';
    if (path.startsWith('/municipios/')) return 'Panel del Municipio';
    if (path.startsWith('/contratistas/')) return 'Panel del Contratista';
    if (path === '/asistente') return 'Asistente de IA';
    if (path === '/alertas') return 'Centro de Alertas';
    return brand.productName;
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileDrawer}
          className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={toggleSidebar}
          className="hidden lg:block p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">{getTitle()}</h1>
          <p className="text-[10px] text-gray-500 hidden sm:block">{brand.tagline}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
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
            <div className="text-[10px] text-gray-500">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
