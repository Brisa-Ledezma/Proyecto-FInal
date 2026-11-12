import { Navigate, Outlet } from 'react-router-dom';
import { useSesion, inicioDeRol } from '../../contexto/SesionContexto.jsx';
import { Cargando } from '../ui/Estados.jsx';

// Roles que no usan las pantallas del público (cartelera y compra).
const EXCLUIDOS = ['ENCARGADO_SALA'];

/**
 * Pantallas del público: el encargado de sala solo trabaja en el control de ingreso,
 * así que si entra a la cartelera o al detalle de una película vuelve a su inicio.
 */
export default function RutaPublico() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando texto="Verificando tu sesión…" />;
  if (usuario && EXCLUIDOS.includes(usuario.rol)) return <Navigate to={inicioDeRol(usuario.rol)} replace />;
  return <Outlet />;
}
