import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSesion } from '../../contexto/SesionContexto.jsx';
import { Cargando } from '../ui/Estados.jsx';
import SinPermiso from '../../paginas/SinPermiso.jsx';

/**
 * Exige sesión iniciada y, si se indican, alguno de los roles.
 * La API aplica el mismo control (RNF-03); esto solo evita mostrar pantallas sin permiso.
 */
export default function RutaProtegida({ roles }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();

  if (cargando) return <Cargando texto="Verificando tu sesión…" />;
  if (!usuario) {
    const volver = encodeURIComponent(ubicacion.pathname + ubicacion.search);
    return <Navigate to={`/acceso?volver=${volver}`} replace />;
  }
  if (roles && !roles.includes(usuario.rol)) return <SinPermiso />;
  return <Outlet />;
}
