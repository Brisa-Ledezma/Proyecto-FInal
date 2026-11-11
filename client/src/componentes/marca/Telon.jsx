import './Telon.css';

/**
 * Escenario con telones a los costados y bambalina con festones.
 * Los telones se abren al montar (salvo con movimiento reducido).
 */
export default function Telon({ children, className = '', compacto = false }) {
  return (
    <section className={`telon-escena ${compacto ? 'telon-escena--compacto' : ''} ${className}`}>
      <div className="telon-escena__bambalina" aria-hidden="true" />
      <div className="telon-escena__festones" aria-hidden="true" />
      <div className="telon-escena__pano telon-escena__pano--izq" aria-hidden="true" />
      <div className="telon-escena__pano telon-escena__pano--der" aria-hidden="true" />
      <div className="telon-escena__luz" aria-hidden="true" />
      <div className="telon-escena__contenido">{children}</div>
    </section>
  );
}
