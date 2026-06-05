import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, MapPin, Users, Bell, FileText, Sparkles, LogOut, ChevronLeft, ChevronRight,
  HardHat, LandPlot
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Building2, MapPin, Users, Bell, FileText, Sparkles, HardHat, LandPlot,
};

export function Sidebar() {
  const { user, sidebarCollapsed, toggleSidebar, logout, getMenuItems, notifications } = useApp();
  const location = useLocation();
  const menuItems = getMenuItems();

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/obras/obra-1') return location.pathname.startsWith('/obras');
    if (path.includes('/municipios/')) return location.pathname.startsWith('/municipios');
    if (path.includes('/contratistas/')) return location.pathname.startsWith('/contratistas');
    if (path === '/alertas') return location.pathname === '/alertas';
    if (path === '/asistente') return location.pathname === '/asistente';
    if (path === '/admin/usuarios') return location.pathname === '/admin/usuarios';
    return location.pathname === path;
  };

  const getRoleLabel = () => {
    if (!user) return '';
    const labels: Record<string, string> = { estatal: 'Servidor Estatal', municipal: 'Servidor Municipal', contratista: 'Contratista' };
    return labels[user.role] || user.role;
  };

  return (
    <aside className={cn(
      "hidden lg:flex flex-col bg-[#8B1538] text-white transition-all duration-300 ease-in-out h-screen flex-shrink-0 sticky top-0 self-start",
      sidebarCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        {!sidebarCollapsed && (
          <img
            src="/images/ceaspue-logo.png"
            alt="CEASPUE"
            className="h-10 object-contain brightness-0 invert"
          />
        )}
        {sidebarCollapsed && (
          <span className="text-xs font-bold mx-auto tracking-wider">CSP</span>
        )}
        <button onClick={toggleSidebar} className="text-white/60 hover:text-white transition-colors flex-shrink-0">
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!sidebarCollapsed && user && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/10">
            <span className="w-2 h-2 rounded-full bg-white/70" />
            <span className="text-[10px] font-medium text-white/90">{getRoleLabel()}</span>
          </div>
        </div>
      )}

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                active
                  ? "bg-white/20 border-l-2 border-white text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              {item.path === '/alertas' && !sidebarCollapsed && notifications > 0 && (
                <span className="ml-auto bg-white text-[#8B1538] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifications}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-white/20">
            {user?.avatar || 'US'}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{user?.name?.split(' ').slice(0, 2).join(' ')}</div>
              <div className="text-[10px] text-white/60 truncate">{getRoleLabel()}</div>
            </div>
          )}
        </div>
        <button onClick={logout} className="flex items-center gap-2 px-2 py-2 text-white/60 hover:text-white text-xs transition-colors w-full mt-1">
          <LogOut className="w-4 h-4" />
          {!sidebarCollapsed && <span>Cerrar sesion</span>}
        </button>
      </div>
    </aside>
  );
}
