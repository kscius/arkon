import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor ingrese su correo y contrasena');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo iniciar sesion. Verifique sus credenciales.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F8FA] to-[#E2E8F0] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header with banner */}
          <div className="bg-[#8B1538] p-6 flex flex-col items-center">
            <img
              src="/images/ceaspue-logo.png"
              alt="CEASPUE"
              className="h-16 object-contain brightness-0 invert mb-2"
            />
            <p className="text-white/80 text-xs text-center mt-1">
              Sistema de Gestión de Obras Públicas
            </p>
          </div>

          <div className="p-8">
            {/* Banner institucional */}
            <div className="mb-6">
              <img
                src="/images/ceaspue-banner.png"
                alt="Gobierno del Estado de Puebla"
                className="w-full object-contain"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Correo electronico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="usuario@ceaspue.gob.mx"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
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
                className="w-full h-11 bg-[#8B1538] hover:bg-[#6B1028] text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
