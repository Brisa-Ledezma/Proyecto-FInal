import { Link } from 'react-router-dom';
import logoCompleto from '../../assets/logo-golden-screen.png';
import icono from '../../assets/icono-golden-screen.png';
import './Logo.css';

/** Marca para la barra superior: ícono + nombre con brillo metálico. */
export function MarcaBarra({ a = '/' }) {
  return (
    <Link to={a} className="marca-barra" aria-label="Golden Screen Cinema, ir al inicio">
      <img src={icono} alt="" className="marca-barra__icono" width="62" height="38" />
      <span className="marca-barra__texto" aria-hidden="true">
        <span className="marca-barra__nombre">Golden Screen</span>
        <span className="marca-barra__sub">Cinema</span>
      </span>
    </Link>
  );
}

/** Logo completo, para pantallas de acceso y confirmación. */
export function LogoCompleto({ ancho = 260, className = '' }) {
  return <img src={logoCompleto} alt="Golden Screen Cinema" width={ancho} height={Math.round(ancho * 0.655)} className={`logo-completo ${className}`} />;
}
