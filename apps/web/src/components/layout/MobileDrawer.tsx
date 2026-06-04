import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, MapPin, Users, Bell, Sparkles, LogOut, X, Shield,
  HardHat, LandPlot
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Building2, MapPin, Users, Bell, Sparkles, Shield, HardHat, LandPlot,
};

export function MobileDrawer({ onClose }: { onClose: () => void }) {
  const { user, logout, getMenuItems, notifications } = useApp();
  const location = useLocation();
  const menuItems = getMenuItems();

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

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path.includes('/municipios/')) return location.pathname.startsWith('/municipios');
    if (path.includes('/contratistas/')) return location.pathname.startsWith('/contratistas');
    if (path === '/alertas') return location.pathname === '/alertas';
    if (path === '/asistente') return location.pathname === '/asistente';
    if (path === '/admin/usuarios') return location.pathname === '/admin/usuarios';
    return location.pathname === path;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-[#1B3A5C] text-white z-50 lg:hidden flex flex-col animate-in slide-in-from-left duration-300">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#E8913A]" />
            <div>
              <div className="text-sm font-bold">SIGOPEM</div>
              <div className="text-[10px] text-white/60">Gobierno de Puebla</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {user && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ backgroundColor: getRoleBadgeColor() + '25' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoleBadgeColor() }} />
              <span className="text-[10px] font-medium text-white/90">{getRoleLabel()}</span>
            </div>
          </div>
        )}

        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isActive(item.path)
                    ? "bg-white/15 border-l-2 border-[#E8913A] text-white"
                    : "text-white/70 hover:bg-white/8"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.path === '/alertas' && notifications > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifications}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: getRoleBadgeColor() }}>
              {user?.avatar || 'US'}
            </div>
            <div>
              <div className="text-xs font-medium">{user?.name?.split(' ').slice(0, 2).join(' ')}</div>
              <div className="text-[10px] text-white/60">{getRoleLabel()}</div>
            </div>
          </div>
          <button onClick={() => { logout(); onClose(); }} className="flex items-center gap-2 text-white/60 hover:text-white text-xs">
            <LogOut className="w-4 h-4" /><span>Cerrar sesion</span>
          </button>
        </div>
      </div>
    </>
  );
}
