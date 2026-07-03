import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { cn, getRoleLabel } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { getBrand } from '@/config/brand';
import {
  LayoutDashboard,
  Inbox,
  Building2,
  MapPin,
  Users,
  Bell,
  FileText,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HardHat,
  LandPlot,
  BellRing,
  Settings,
  Shield,
  FileStack,
  Landmark,
  Upload,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Inbox,
  Building2,
  MapPin,
  Users,
  Bell,
  FileText,
  Sparkles,
  HardHat,
  LandPlot,
  BellRing,
  Settings,
  Shield,
  FileStack,
  Landmark,
  Upload,
  Layers,
};

export function Sidebar() {
  const brand = getBrand();
  const { user, sidebarCollapsed, toggleSidebar, logout, getMenuItems, notifications } = useApp();
  const location = useLocation();
  const menuItems = getMenuItems();

  const isActive = (path: string) => {
    if (path === '/bandeja') return location.pathname === '/bandeja';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/acciones') return location.pathname === '/acciones' || location.pathname.startsWith('/acciones/');
    if (path === '/programas') return location.pathname === '/programas' || location.pathname.startsWith('/programas/');
    if (path === '/obras') return location.pathname === '/obras' || location.pathname.startsWith('/obras/');
    if (path.includes('/municipios/')) return location.pathname.startsWith('/municipios');
    if (path.includes('/contratistas/')) return location.pathname.startsWith('/contratistas');
    if (path === '/alertas') return location.pathname === '/alertas';
    if (path === '/configurador-alertas') return location.pathname === '/configurador-alertas';
    if (path === '/asistente') return location.pathname === '/asistente';
    if (path === '/solicitudes') return location.pathname === '/solicitudes';
    if (path === '/admin/usuarios') return location.pathname === '/admin/usuarios';
    return location.pathname === path;
  };

  const getRoleBadgeColor = () => {
    if (!user) return '#718096';
    const colors = brand.roleColors as Record<string, string>;
    return colors[user.role] || '#718096';
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col text-white transition-all duration-300 ease-in-out h-screen flex-shrink-0 sticky top-0 self-start',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
      style={{ backgroundColor: brand.colors.primary }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-white/10">
        <BrandLogo
          compact
          imageOnly
          collapsed={sidebarCollapsed}
          className={sidebarCollapsed ? 'flex-1' : 'flex-1 min-w-0'}
        />
        <button
          type="button"
          onClick={toggleSidebar}
          className="min-h-11 min-w-11 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!sidebarCollapsed && user && (
        <div className="px-4 py-2">
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-md"
            style={{ backgroundColor: `${getRoleBadgeColor()}25` }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoleBadgeColor() }} />
            <span className="text-[10px] font-medium text-white/90">{getRoleLabel(user.role)}</span>
          </div>
        </div>
      )}

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item, index) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const active = isActive(item.path);
          const prevSection = index > 0 ? menuItems[index - 1].section : undefined;
          const showSection = !sidebarCollapsed && item.section && item.section !== prevSection;
          return (
            <div key={`${item.path}-${item.label}`}>
              {showSection && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                  {item.section}
                </div>
              )}
              <NavLink
                to={item.path}
                aria-label={sidebarCollapsed ? item.label : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                  active
                    ? 'bg-white/15 border-l-2 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
                style={active ? { borderLeftColor: brand.colors.accent } : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                {item.path === '/alertas' && !sidebarCollapsed && notifications > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {notifications}
                  </span>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: getRoleBadgeColor() }}
          >
            {user?.avatar || 'US'}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{user?.name?.split(' ').slice(0, 2).join(' ')}</div>
              <div className="text-[10px] text-white/60 truncate">{getRoleLabel(user?.role)}</div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          aria-label="Cerrar sesión"
          className="flex items-center gap-2 px-2 py-2 text-white/60 hover:text-white text-xs transition-colors w-full mt-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <LogOut className="w-4 h-4" />
          {!sidebarCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
