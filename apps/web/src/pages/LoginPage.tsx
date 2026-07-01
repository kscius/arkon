import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/lib/api-client';
import { getBrand } from '@/config/brand';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const brand = getBrand();
  const [email, setEmail] = useState(brand.demoEmail);
  const [password, setPassword] = useState(brand.demoPasswordHint);
  const [logoFailed, setLogoFailed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Ingrese su correo electrónico.');
      return;
    }
    if (!password) {
      setError('Ingrese su contraseña.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/bandeja');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo iniciar sesión. Verifique sus credenciales.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(to bottom right, ${brand.colors.surface}, ${brand.colors.surfaceDark})`,
      }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            {brand.logoSrc && !logoFailed ? (
              <img
                src={brand.logoSrc}
                alt={brand.logoAlt}
                onError={() => setLogoFailed(true)}
                className="h-16 w-auto max-w-[240px] mx-auto mb-4 object-contain"
              />
            ) : (
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: brand.colors.primary }}
              >
                {brand.productShortName.slice(0, 1)}
              </div>
            )}
            <h1
              className="text-2xl font-bold"
              style={{ color: brand.colors.primary }}
            >
              {brand.productName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{brand.loginSubtitle}</p>
            <p className="text-xs text-gray-400">{brand.tagline}</p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-gray-600 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  placeholder="usuario@institucion.gob.mx"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-gray-600 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-white font-medium cursor-pointer"
              style={{
                backgroundColor: brand.colors.primary,
              }}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="text-center text-[11px] text-gray-400 mt-4">
            Demo: {brand.demoEmail} / {brand.demoPasswordHint}
          </p>
        </div>
      </div>
    </div>
  );
}
