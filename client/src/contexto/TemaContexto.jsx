import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const TemaContexto = createContext(null);
const CLAVE = 'gs-tema';

function leerGuardado() {
  // Permite forzar el tema con ?tema=claro u ?tema=oscuro (útil para capturas de pantalla).
  const forzado = new URLSearchParams(window.location.search).get('tema');
  if (forzado === 'claro' || forzado === 'oscuro') return forzado;
  try {
    const valor = localStorage.getItem(CLAVE);
    return valor === 'claro' || valor === 'oscuro' ? valor : null;
  } catch {
    return null;
  }
}

const temaDelSistema = () => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro');

/** Tema claro u oscuro. Sin elección guardada, sigue al sistema operativo. */
export function ProveedorTema({ children }) {
  const [elegido, setElegido] = useState(leerGuardado);
  const [sistema, setSistema] = useState(temaDelSistema);

  useEffect(() => {
    const consulta = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!consulta) return undefined;
    const cambio = () => setSistema(consulta.matches ? 'claro' : 'oscuro');
    consulta.addEventListener('change', cambio);
    return () => consulta.removeEventListener('change', cambio);
  }, []);

  useEffect(() => {
    if (elegido) document.documentElement.dataset.tema = elegido;
    else delete document.documentElement.dataset.tema;
  }, [elegido]);

  const tema = elegido ?? sistema;

  const alternar = useCallback(() => {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro';
    setElegido(nuevo);
    try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin almacenamiento disponible */ }
  }, [tema]);

  return <TemaContexto.Provider value={{ tema, alternar }}>{children}</TemaContexto.Provider>;
}

export const useTema = () => useContext(TemaContexto);
