import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, EVENTO_SESION_VENCIDA } from '../api/cliente.js';

const SesionContexto = createContext(null);

/** Pantalla de inicio según el rol (CU-02, paso 5). */
export const inicioDeRol = (rol) => ({ ADMINISTRADOR: '/admin', ENCARGADO_SALA: '/control' }[rol] ?? '/');

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const navegar = useNavigate();

  useEffect(() => {
    api.get('/auth/sesion')
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  // Si la API informa que la sesión venció, se vuelve al acceso con el motivo (RNF-04).
  useEffect(() => {
    const alVencer = () => {
      setUsuario((actual) => {
        if (actual) navegar(`/acceso?motivo=vencida&volver=${encodeURIComponent(window.location.pathname)}`, { replace: true });
        return null;
      });
    };
    window.addEventListener(EVENTO_SESION_VENCIDA, alVencer);
    return () => window.removeEventListener(EVENTO_SESION_VENCIDA, alVencer);
  }, [navegar]);

  const iniciarSesion = useCallback(async (email, contrasena) => {
    const { usuario: u } = await api.post('/auth/login', { email, contrasena });
    setUsuario(u);
    return u;
  }, []);

  const confirmarCuenta = useCallback(async (token) => {
    const { usuario: u } = await api.post('/auth/verificar', { token });
    setUsuario(u);
    return u;
  }, []);

  const cerrarSesion = useCallback(async ({ motivo } = {}) => {
    try { await api.post('/auth/logout'); } catch { /* la sesión ya no existía */ }
    setUsuario(null);
    navegar(motivo ? `/acceso?motivo=${motivo}` : '/', { replace: true });
  }, [navegar]);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, confirmarCuenta, cerrarSesion }),
    [usuario, cargando, iniciarSesion, confirmarCuenta, cerrarSesion],
  );
  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export const useSesion = () => useContext(SesionContexto);
