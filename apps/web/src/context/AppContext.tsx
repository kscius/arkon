import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { canAccessRoute } from '@/lib/access';
import { getBrand } from '@/config/brand';
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
  section?: string;
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
    const brand = getBrand();
    const isConagua = brand.tenantId === 'conagua';
    const { entity, obraEntity } = brand;
    const trabajoSection = 'Trabajo';
    const portafolioSection = 'Portafolio';
    const proaguaItems: MenuItem[] = isConagua
      ? [
          { path: '/anexos', label: 'Anexos XII/XIII', icon: 'FileStack', section: 'Programas' },
          { path: '/cierres-ejercicio', label: 'Cierre ejercicio', icon: 'Landmark', section: 'Programas' },
          { path: '/proagua/import', label: 'Importar PROAGUA', icon: 'Upload', section: 'Programas' },
        ]
      : [];
    const solicitudesItem: MenuItem | null = isConagua
      ? { path: '/solicitudes', label: 'Solicitudes', icon: 'FileText', section: 'Programas' }
      : null;

    const portafolioItems: MenuItem[] = [
      { path: '/programas', label: 'Programas', icon: 'Layers', section: portafolioSection },
      { path: '/obras', label: obraEntity.pluralCap, icon: 'Building2', section: portafolioSection },
      { path: '/acciones', label: entity.pluralCap, icon: 'HardHat', section: portafolioSection },
    ];

    const trabajoItems: MenuItem[] = [
      { path: '/bandeja', label: 'Bandeja de Acciones', icon: 'Inbox', section: trabajoSection },
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', section: trabajoSection },
    ];

    if (role === 'estatal') {
      const munPath = selectedMunicipio
        ? `/municipios/${selectedMunicipio}`
        : '/municipios';
      const conPath = selectedContratista
        ? `/contratistas/${selectedContratista}`
        : '/contratistas';
      return [
        ...trabajoItems,
        ...portafolioItems,
        ...(solicitudesItem ? [solicitudesItem] : []),
        ...proaguaItems,
        { path: munPath, label: 'Municipios', icon: 'MapPin', section: 'Gestión' },
        { path: conPath, label: 'Contratistas', icon: 'Users', section: 'Gestión' },
        { path: '/admin/usuarios', label: 'Usuarios', icon: 'Shield', section: 'Gestión' },
        { path: '/alertas', label: 'Alertas', icon: 'Bell', section: 'Gestión' },
        { path: '/configurador-alertas', label: 'Configurador de Alertas', icon: 'BellRing', section: 'Gestión' },
      ];
    }

    if (role === 'municipal') {
      return [
        ...trabajoItems,
        ...portafolioItems,
        ...(solicitudesItem ? [solicitudesItem] : []),
        { path: '/anexos', label: 'Anexos XII/XIII', icon: 'FileStack', section: 'Programas' },
        { path: '/cierres-ejercicio', label: 'Cierre ejercicio', icon: 'Landmark', section: 'Programas' },
        {
          path: `/municipios/${user.municipioId ?? selectedMunicipio}`,
          label: 'Mi Municipio',
          icon: 'MapPin',
          section: 'Gestión',
        },
        { path: '/contratistas', label: 'Contratistas', icon: 'Users', section: 'Gestión' },
        { path: '/alertas', label: 'Alertas', icon: 'Bell', section: 'Gestión' },
        { path: '/configurador-alertas', label: 'Configurador de Alertas', icon: 'Settings', section: 'Gestión' },
      ];
    }

    return [
      ...trabajoItems,
      {
        path: '/acciones',
        label: `Mis ${entity.pluralCap}`,
        icon: 'HardHat',
        section: portafolioSection,
      },
      {
        path: '/obras',
        label: `Mis ${obraEntity.pluralCap}`,
        icon: 'Building2',
        section: portafolioSection,
      },
      {
        path: `/contratistas/${user.contratistaId ?? selectedContratista}`,
        label: 'Mi Empresa',
        icon: 'Users',
        section: 'Gestión',
      },
      { path: '/alertas', label: 'Alertas', icon: 'Bell', section: 'Gestión' },
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
