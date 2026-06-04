import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, MapPin, Users, Bell, FileText, Sparkles, LogOut, ChevronLeft, ChevronRight, Shield,
  HardHat, LandPlot
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Building2, MapPin, Users, Bell, FileText, Sparkles, Shield, HardHat, LandPlot,
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

  const getRoleBadgeColor = () => {
    if (!user) return '#718096';
    const colors: Record<string, string> = { estatal: '#1B3A5C', municipal: '#0D7377', contratista: '#E8913A' };
    return colors[user.role] || '#718096';
  };

  return (
    <aside className={cn(
      "hidden lg:flex flex-col bg-[#1B3A5C] text-white transition-all duration-300 ease-in-out h-screen flex-shrink-0 sticky top-0 self-start",
      sidebarCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#E8913A]" />
            <div>
              <div className="text-sm font-bold tracking-wide">SIGOPEM</div>
              <div className="text-[10px] text-white/60">Gobierno de Puebla</div>
            </div>
          </div>
        )}
        {sidebarCollapsed && <Shield className="w-7 h-7 text-[#E8913A] mx-auto" />}
        <button onClick={toggleSidebar} className="text-white/60 hover:text-white transition-colors">
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role badge */}
      {!sidebarCollapsed && user && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ backgroundColor: getRoleBadgeColor() + '25' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoleBadgeColor() }} />
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
                  ? "bg-white/15 border-l-2 border-[#E8913A] text-white"
                  : "text-white/70 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              {item.path === '/alertas' && !sidebarCollapsed && notifications > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifications}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: getRoleBadgeColor() }}>
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
