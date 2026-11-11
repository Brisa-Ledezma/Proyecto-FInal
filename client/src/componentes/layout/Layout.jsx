import { Link, Outlet } from 'react-router-dom';
import Encabezado from './Encabezado.jsx';
import AvisoSesion from './AvisoSesion.jsx';
import './Layout.css';

export default function Layout() {
  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <Encabezado />
      <main id="contenido" className="layout__principal">
        <Outlet />
      </main>
      <footer className="pie">
        <div className="contenedor pie__contenido">
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
