import { useEffect, useMemo, useState } from 'react';

/**
 * Pagina una lista en el cliente. La paginación solo se activa cuando la
 * lista supera el límite por página (por defecto 10).
 */
export function usePaginacion(lista, porPagina = 10) {
  const [pagina, setPagina] = useState(1);
  const total = lista?.length ?? 0;
  const paginas = Math.max(1, Math.ceil(total / porPagina));

  // Si cambia la lista (filtros, búsqueda) y la página quedó fuera de rango, se ajusta.
  useEffect(() => { if (pagina > paginas) setPagina(paginas); }, [pagina, paginas]);

  const visibles = useMemo(
    () => (lista ?? []).slice((Math.min(pagina, paginas) - 1) * porPagina, Math.min(pagina, paginas) * porPagina),
    [lista, pagina, paginas, porPagina],
  );

  return { visibles, pagina: Math.min(pagina, paginas), paginas, total, porPagina, setPagina, activa: total > porPagina };
}
