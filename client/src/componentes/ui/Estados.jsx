import { FilmSlate } from '@phosphor-icons/react';
import Aviso from './Aviso.jsx';
import Boton from './Boton.jsx';
import './Estados.css';

/** Bloques de carga con la forma del contenido final. */
export function Esqueleto({ alto = 20, ancho = '100%', radio, className = '' }) {
  return <span className={`esqueleto ${className}`} style={{ height: alto, width: ancho, borderRadius: radio }} aria-hidden="true" />;
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status">
      <span className="cargando__rollo" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

/** Estado vacío: explica qué falta y ofrece el siguiente paso. */
export function Vacio({ titulo, children, accion, icono: Icono = FilmSlate }) {
  return (
    <div className="vacio">
      <Icono className="vacio__icono" weight="duotone" aria-hidden="true" />
      <p className="vacio__titulo">{titulo}</p>
      {children && <p className="vacio__texto">{children}</p>}
      {accion}
    </div>
  );
}

/** Error al cargar datos, con opción de reintentar. */
export function ErrorCarga({ error, alReintentar }) {
  return (
    <Aviso
      tipo="error"
      titulo="No pudimos cargar esta información"
      acciones={alReintentar && <Boton variante="secundario" tamano="chico" onClick={alReintentar}>Reintentar</Boton>}
    >
      {error?.message ?? 'Revisá tu conexión y volvé a intentar.'}
    </Aviso>
  );
}
