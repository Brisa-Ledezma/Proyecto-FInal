import { CalendarBlank, Clock, MonitorPlay } from '@phosphor-icons/react';
import { fechaRelativa, hora, moneda } from '../../utiles/formato.js';
import Afiche from '../cartelera/Afiche.jsx';
import { Clasificacion } from '../cartelera/Funciones.jsx';
import './ResumenCompra.css';

/** Resumen de la función, las butacas y el importe (RN-05: precio × cantidad). */
export default function ResumenCompra({ funcion, butacas, children, titulo = 'Tu función' }) {
  const cantidad = butacas.length;
  const total = funcion.precio * cantidad;
  return (
    <aside className="resumen-compra" aria-label="Resumen de la compra">
      <div className="resumen-compra__funcion">
        <Afiche pelicula={funcion.pelicula} tamano="chico" />
        <div>
          <span className="rotulo">{titulo}</span>
          <h2 className="resumen-compra__titulo">{funcion.pelicula.titulo}</h2>
          <Clasificacion valor={funcion.pelicula.clasificacion} />
        </div>
      </div>
      <ul className="resumen-compra__datos">
        <li><MonitorPlay aria-hidden="true" /> {funcion.sala.nombre}</li>
        <li><CalendarBlank aria-hidden="true" /> {fechaRelativa(funcion.inicio)}</li>
        <li><Clock aria-hidden="true" /> <span className="cifra">{hora(funcion.inicio)}</span></li>
      </ul>
      <div className="resumen-compra__butacas">
        <span className="rotulo">Butacas</span>
        <p className="resumen-compra__lista cifra">
          {cantidad ? butacas.map((b) => `${b.fila}${b.numero}`).join(' · ') : <span className="texto-2">Elegí en el mapa</span>}
        </p>
        <p className="resumen-compra__linea">
          <span className="cifra">{cantidad} × {moneda(funcion.precio)}</span>
          <span className="cifra">{moneda(total)}</span>
        </p>
      </div>
      <div className="resumen-compra__total">
        <span className="rotulo">Total</span>
        <strong className="cifra">{moneda(total)}</strong>
      </div>
      {children && <div className="resumen-compra__acciones">{children}</div>}
    </aside>
  );
}
