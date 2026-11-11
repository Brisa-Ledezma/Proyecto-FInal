import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos de la API con estados de carga y error.
 * `dependencias` vuelve a ejecutar la carga cuando cambian.
 */
export function useCarga(cargar, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const vigente = useRef(0);

  const ejecutar = useCallback(async ({ silenciosa = false } = {}) => {
    const id = ++vigente.current;
    if (!silenciosa) setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await cargar();
      if (id === vigente.current) setEstado({ datos, cargando: false, error: null });
    } catch (error) {
      if (id === vigente.current) setEstado((e) => ({ ...e, cargando: false, error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => { ejecutar(); }, [ejecutar]);

  return { ...estado, recargar: ejecutar, setDatos: (datos) => setEstado((e) => ({ ...e, datos })) };
}

/** Errores de campos devueltos por la API, listos para los componentes Campo. */
export function erroresDeApi(error) {
  return error?.campos ?? {};
}
