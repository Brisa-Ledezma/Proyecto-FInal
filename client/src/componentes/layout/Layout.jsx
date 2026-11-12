import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Encabezado from './Encabezado.jsx';
import AvisoSesion from './AvisoSesion.jsx';
import './Layout.css';

/** El halo de las superficies .brilla sigue al cursor (un solo listener para toda la app). */
function useBrilloCursor() {
  useEffect(() => {
    const mover = (e) => {
      const el = e.target instanceof Element ? e.target.closest('.brilla') : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    window.addEventListener('pointermove', mover, { passive: true });
    return () => window.removeEventListener('pointermove', mover);
  }, []);
}

export default function Layout() {
  const { pathname } = useLocation();
  useBrilloCursor();

  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <Encabezado />
      <main id="contenido" className="layout__principal">
        <div key={pathname} className="transicion-pantalla">
          <Outlet />
        </div>
      </main>
      <footer className="pie">
        <div className="pie__contenido">
          <span>Golden Screen Cinema · Venta y reserva de entradas en línea</span>
          <nav aria-label="Enlaces legales" className="pie__enlaces">
            <Link to="/privacidad">Política de privacidad</Link>
          </nav>
        </div>
      </footer>
      <AvisoSesion />
    </>
  );
}
