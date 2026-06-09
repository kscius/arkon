import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { canAccessRoute } from '@/lib/access';
import { getToken, setToken, setUnauthorizedHandler } from '@/lib/api-client';
import { fetchAlertas, fetchMe, login as apiLogin } from '@/lib/api';
import type { User } from '@/types';

interface AppState {
  user: User | null;
  authReady: boolean;
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  notifications: number;
  selectedMunicipio: string;
  selectedContratista: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  toggleSidebar: () => void;
  toggleMobileDrawer: () => void;
  setSelectedMunicipio: (id: string) => void;
  setSelectedContratista: (id: string) => void;
  setNotifications: (count: number) => void;
  refreshNotifications: () => Promise<void>;
  canAccess: (route: string) => boolean;
  getMenuItems: () => MenuItem[];
}

export interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [selectedContratista, setSelectedContratista] = useState('');

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setNotifications(0);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const alertas = await fetchAlertas({ atendida: false });
      setNotifications(alertas.length);
    } catch {
      setNotifications(0);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthReady(true);
      return;
    }
    fetchMe()
      .then(async (u) => {
        setUser(u);
        if (u.municipioId) setSelectedMunicipio(u.municipioId);
        if (u.contratistaId) setSelectedContratista(u.contratistaId);
        try {
          const alertas = await fetchAlertas({ atendida: false });
          setNotifications(alertas.length);
        } catch {
          setNotifications(0);
        }
      })
      .catch(() => setToken(null))
      .finally(() => setAuthReady(true));
  }, []);

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
    if (u.municipioId) setSelectedMunicipio(u.municipioId);
    if (u.contratistaId) setSelectedContratista(u.contratistaId);
    await refreshNotifications();
  };

  const toggleSidebar = () => setSidebarCollapsed((p) => !p);
  const toggleMobileDrawer = () => setMobileDrawerOpen((p) => !p);

  const canAccess = (route: string): boolean =>
    canAccessRoute(user?.role, route, Boolean(user));

  const getMenuItems = (): MenuItem[] => {
    if (!user) return [];
    const { role } = user;

    if (role === 'estatal') {
      const munPath = selectedMunicipio
        ? `/municipios/${selectedMunicipio}`
        : '/municipios';
      const conPath = selectedContratista
        ? `/contratistas/${selectedContratista}`
        : '/contratistas';
      return [
        { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { path: '/obras', label: 'Obras', icon: 'HardHat' },
        { path: munPath, label: 'Municipios', icon: 'MapPin' },
        { path: conPath, label: 'Contratistas', icon: 'Users' },
        { path: '/admin/usuarios', label: 'Usuarios', icon: 'Shield' },
        { path: '/alertas', label: 'Alertas', icon: 'Bell' },
        { path: '/configurador-alertas', label: 'Configurador de Alertas', icon: 'BellRing' },
        { path: '/asistente', label: 'Asistente IA', icon: 'Sparkles' },
      ];
    }

    if (role === 'municipal') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { path: '/obras', label: 'Obras', icon: 'HardHat' },
        {
          path: `/municipios/${user.municipioId ?? selectedMunicipio}`,
          label: 'Mi Municipio',
          icon: 'MapPin',
        },
        { path: '/contratistas', label: 'Contratistas', icon: 'Users' },
        { path: '/alertas', label: 'Alertas', icon: 'Bell' },
        { path: '/configurador-alertas', label: 'Configurador de Alertas', icon: 'Settings' },
        { path: '/asistente', label: 'Asistente IA', icon: 'Sparkles' },
      ];
    }

    return [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/obras', label: 'Mis Obras', icon: 'HardHat' },
      {
        path: `/contratistas/${user.contratistaId ?? selectedContratista}`,
        label: 'Mi Empresa',
        icon: 'Building2',
      },
      { path: '/alertas', label: 'Alertas', icon: 'Bell' },
    ];
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authReady,
        sidebarCollapsed,
        mobileDrawerOpen,
        notifications,
        selectedMunicipio,
        selectedContratista,
        login,
        logout,
        toggleSidebar,
        toggleMobileDrawer,
        setSelectedMunicipio,
        setSelectedContratista,
        setNotifications,
        refreshNotifications,
        canAccess,
        getMenuItems,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
