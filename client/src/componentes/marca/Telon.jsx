import { useId } from 'react';
import './Telon.css';

/** Cordón dorado que abraza la tela recogida, con su borla colgando. */
function Cordon() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="telon__cordon" viewBox="0 0 120 170" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`oro-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a5a1c" />
          <stop offset="0.35" stopColor="#f1d592" />
          <stop offset="0.55" stopColor="#d6a84e" />
          <stop offset="0.8" stopColor="#fbe7a8" />
          <stop offset="1" stopColor="#8a6420" />
        </linearGradient>
        <linearGradient id={`borla-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a5a1c" />
          <stop offset="0.45" stopColor="#f1d592" />
          <stop offset="1" stopColor="#8a6420" />
        </linearGradient>
      </defs>
      {/* Lazo: desde este lado solo se ve la parte de la soga que pasa por delante de la tela */}
      <path d="M104 40 C 80 58, 34 60, 6 52" fill="none" stroke={`url(#oro-${id})`} strokeWidth="7" strokeLinecap="round" />
      <path d="M104 40 C 80 58, 34 60, 6 52" fill="none" stroke="#5a3f10" strokeWidth="7" strokeDasharray="2 6" strokeLinecap="round" opacity="0.5" />
      {/* Nudo */}
      <circle cx="86" cy="50" r="9" fill={`url(#oro-${id})`} />
      <circle cx="83" cy="47" r="3" fill="#fff6dc" opacity="0.7" />
      {/* Borla */}
      <path d="M86 58 L86 72" stroke={`url(#oro-${id})`} strokeWidth="4" />
      <path d="M78 72 Q86 64 94 72 L96 86 Q86 92 76 86 Z" fill={`url(#borla-${id})`} />
      <g className="telon__flecos" stroke={`url(#borla-${id})`} strokeWidth="2.2" strokeLinecap="round">
        <path d="M77 88 L74 140" /><path d="M80 89 L79 146" /><path d="M83 90 L83 150" /><path d="M86 90 L87 152" />
        <path d="M89 90 L91 150" /><path d="M92 89 L95 146" /><path d="M95 88 L99 140" />
      </g>
      <path d="M75 88 Q86 96 97 88" fill="none" stroke="#fbe7a8" strokeWidth="2" opacity="0.8" />
    </svg>
  );
}

function Pano({ lado }) {
  return (
    <div className={`telon__pano telon__pano--${lado}`} aria-hidden="true">
      <div className="telon__tela">
        <div className="telon__recogida" />
      </div>
      <Cordon />
    </div>
  );
}

/**
 * Escenario con telón de tela: al cargar la pantalla los paños se corren hacia
 * los costados, se recogen y quedan atados con un cordón dorado. Con movimiento
 * reducido el telón aparece directamente abierto.
 */
export default function Telon({ children, className = '', compacto = false }) {
  return (
    <section className={`telon ${compacto ? 'telon--compacto' : ''} ${className}`}>
      <div className="telon__fondo" aria-hidden="true" />
      <div className="telon__haz" aria-hidden="true" />
      <div className="telon__contenido">{children}</div>
      <Pano lado="izq" />
      <Pano lado="der" />
      <div className="telon__bambalina" aria-hidden="true" />
      <div className="telon__proscenio" aria-hidden="true" />
    </section>
  );
}
