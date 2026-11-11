import { CheckCircle, Info, WarningCircle, Warning } from '@phosphor-icons/react';
import './Aviso.css';

const ICONOS = { error: WarningCircle, ok: CheckCircle, info: Info, advertencia: Warning };

/**
 * Mensaje en línea (P-15): ícono + título + texto, nunca solo color (RNF-08).
 * tipo: error | ok | info | advertencia
 */
export default function Aviso({ tipo = 'info', titulo, children, acciones, className = '', ...resto }) {
  const Icono = ICONOS[tipo];
  const rol = tipo === 'error' ? 'alert' : 'status';
  return (
    <div className={`aviso aviso--${tipo} ${className}`} role={rol} {...resto}>
      <Icono className="aviso__icono" weight="fill" aria-hidden="true" />
      <div className="aviso__cuerpo">
        {titulo && <p className="aviso__titulo">{titulo}</p>}
        {children && <div className="aviso__texto">{children}</div>}
        {acciones && <div className="aviso__acciones">{acciones}</div>}
      </div>
    </div>
  );
}
