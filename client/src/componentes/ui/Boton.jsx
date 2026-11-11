import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './Boton.css';

/**
 * Botones del sistema.
 * - ticket: acción principal de la pantalla (uno por pantalla, Tabla 33).
 * - secundario: acción alternativa.
 * - texto: acción menor o enlace.
 * - peligro: acción destructiva (cancelar, desactivar).
 */
const Boton = forwardRef(function Boton(
  { variante = 'secundario', tamano, ancho = false, cargando = false, icono, a, children, className = '', disabled, type = 'button', ...resto },
  ref,
) {
  const clases = ['boton', `boton--${variante}`, tamano && `boton--${tamano}`, ancho && 'boton--ancho', cargando && 'boton--cargando', className]
    .filter(Boolean).join(' ');
  const contenido = (
    <>
      {icono && <span className="boton__icono" aria-hidden="true">{icono}</span>}
      <span className="boton__texto">{children}</span>
    </>
  );

  if (a) {
    return <Link ref={ref} to={a} className={clases} {...resto}>{contenido}</Link>;
  }
  return (
    <button ref={ref} type={type} className={clases} disabled={disabled || cargando} aria-busy={cargando || undefined} {...resto}>
      {contenido}
    </button>
  );
});

export default Boton;
