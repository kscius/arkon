import { Navigate } from 'react-router-dom';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchContratistas, fetchMunicipios } from '@/lib/api';

export function MunicipiosRedirect() {
  const { user, selectedMunicipio } = useApp();
  const { data, loading, error, reload } = useAsyncData(fetchMunicipios, []);

  if (user?.municipioId) {
    return <Navigate to={`/municipios/${user.municipioId}`} replace />;
  }
  if (selectedMunicipio) {
    return <Navigate to={`/municipios/${selectedMunicipio}`} replace />;
  }
  if (!data) {
    return (
      <PageState loading={loading} error={error} onRetry={reload}>
        <span />
      </PageState>
    );
  }
  if (data[0]) {
    return <Navigate to={`/municipios/${data[0].id}`} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export function ContratistasRedirect() {
  const { user, selectedContratista } = useApp();
  const { data, loading, error, reload } = useAsyncData(fetchContratistas, []);

  if (user?.contratistaId) {
    return <Navigate to={`/contratistas/${user.contratistaId}`} replace />;
  }
  if (selectedContratista) {
    return <Navigate to={`/contratistas/${selectedContratista}`} replace />;
  }
  if (!data) {
    return (
      <PageState loading={loading} error={error} onRetry={reload}>
        <span />
      </PageState>
    );
  }
  if (data[0]) {
    return <Navigate to={`/contratistas/${data[0].id}`} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}
