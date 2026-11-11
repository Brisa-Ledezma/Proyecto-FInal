import { Link } from 'react-router-dom';
import { hora, moneda } from '../../utiles/formato.js';
import './Funciones.css';

const DESCRIPCION_CLASIFICACION = {
  ATP: 'Apta para todo público',
  '+13': 'Apta para mayores de 13 años',
  '+16': 'Apta para mayores de 16 años',
  '+18': 'Apta para mayores de 18 años',
};

export function Clasificacion({ valor }) {
  return <abbr className="clasificacion" title={DESCRIPCION_CLASIFICACION[valor]}>{valor}</abbr>;
}

/** Función como talón de entrada: horario, sala, precio y butacas libres (RF-03). */
export function TalonFuncion({ funcion, titulo }) {
  const pocas = !funcion.agotada && funcion.libres <= Math.max(10, funcion.capacidad * 0.1);
  const contenido = (
    <>
      <span className="talon-funcion__hora cifra">{hora(funcion.inicio)}</span>
      <span className="talon-funcion__datos">
        <span>{funcion.sala.nombre}</span>
        <span className="cifra">{moneda(funcion.precio)}</span>
      </span>
      <span className={`talon-funcion__libres ${pocas ? 'talon-funcion__libres--pocas' : ''}`}>
        {funcion.agotada ? 'Agotada' : `${funcion.libres} libres`}
      </span>
    </>
  );

  if (funcion.agotada) {
    return (
      <span className="talon-funcion talon-funcion--agotada" aria-label={`${hora(funcion.inicio)}, ${funcion.sala.nombre}, función agotada`}>
        {contenido}
      </span>
    );
  }
  return (
    <Link
      to={`/funcion/${funcion.id}`}
      className="talon-funcion"
      aria-label={`${titulo ? `${titulo}, ` : ''}${hora(funcion.inicio)} en ${funcion.sala.nombre}, ${moneda(funcion.precio)}, ${funcion.libres} butacas libres. Elegir butacas`}
    >
      {contenido}
    </Link>
  );
}

export function ListaFunciones({ funciones, titulo }) {
  return (
    <ul className="lista-funciones">
      {funciones.map((f) => <li key={f.id}><TalonFuncion funcion={f} titulo={titulo} /></li>)}
    </ul>
  );
}
