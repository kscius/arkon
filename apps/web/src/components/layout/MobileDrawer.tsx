import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { getBrand } from '@/config/brand';
import {
  LayoutDashboard,
  Inbox,
  Building2,
  MapPin,
  Users,
  Bell,
  Sparkles,
  LogOut,
  X,
  HardHat,
  LandPlot,
  BellRing,
  Settings,
  Shield,
  FileText,
  FileStack,
  Landmark,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Inbox,
  Building2,
  MapPin,
  Users,
  Bell,
  Sparkles,
  HardHat,
  LandPlot,
  BellRing,
  Settings,
  Shield,
  FileText,
  FileStack,
  Landmark,
  Upload,
};

export function MobileDrawer({ onClose }: { onClose: () => void }) {
  const brand = getBrand();
  const { user, logout, getMenuItems, notifications } = useApp();
  const location = useLocation();
  const menuItems = getMenuItems();

  const getRoleLabel = () => {
    if (!user) return '';
    const labels: Record<string, string> = {
      estatal: 'Servidor Estatal',
      municipal: 'Servidor Municipal',
      contratista: 'Contratista',
    };
    return labels[user.role] || user.role;
  };

  const getRoleBadgeColor = () => {
    if (!user) return '#718096';
    const colors = brand.roleColors as Record<string, string>;
    return colors[user.role] || '#718096';
  };

  const isActive = (path: string) => {
    if (path === '/bandeja') return location.pathname === '/bandeja';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/acciones') return location.pathname === '/acciones' || location.pathname.startsWith('/acciones/');
    if (path.includes('/municipios/')) return location.pathname.startsWith('/municipios');
    if (path.includes('/contratistas/')) return location.pathname.startsWith('/contratistas');
    if (path === '/alertas') return location.pathname === '/alertas';
    if (path === '/configurador-alertas') return location.pathname === '/configurador-alertas';
    if (path === '/configurador-alertas') return location.pathname === '/configurador-alertas';
    if (path === '/asistente') return location.pathname === '/asistente';
    if (path === '/solicitudes') return location.pathname === '/solicitudes';
    if (path === '/admin/usuarios') return location.pathname === '/admin/usuarios';
    return location.pathname === path;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      <div
        className="fixed left-0 top-0 bottom-0 w-64 text-white z-50 lg:hidden flex flex-col animate-in slide-in-from-left duration-300"
        style={{ backgroundColor: brand.colors.primary }}
      >
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-white/10">
          <BrandLogo compact imageOnly className="flex-1 min-w-0" />
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {user && (
          <div className="px-4 py-2">
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-md"
              style={{ backgroundColor: `${getRoleBadgeColor()}25` }}
            >
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
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                  active
                    ? 'bg-white/15 border-l-2 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
                style={active ? { borderLeftColor: brand.colors.accent } : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.path === '/alertas' && notifications > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {notifications}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex items-center gap-2 px-2 py-2 text-white/60 hover:text-white text-xs transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
