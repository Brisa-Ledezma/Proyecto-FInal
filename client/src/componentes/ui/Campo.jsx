import { useId } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import './Campo.css';

/**
 * Campo de formulario con etiqueta arriba, ayuda y mensaje de error debajo (RNF-07).
 * `como` puede ser 'input', 'select' o 'textarea'.
 */
export default function Campo({ etiqueta, ayuda, error, como = 'input', opcional = false, className = '', children, id, ...resto }) {
  const idGenerado = useId();
  const idCampo = id ?? `campo-${idGenerado}`;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;
  const describedBy = [idAyuda, idError].filter(Boolean).join(' ') || undefined;
  const Control = como;

  return (
    <div className={`campo ${error ? 'campo--error' : ''} ${className}`}>
      <label className="campo__etiqueta" htmlFor={idCampo}>
        {etiqueta}
        {opcional && <span className="campo__opcional"> (opcional)</span>}
      </label>
      <Control
        id={idCampo}
        className={`campo__control campo__control--${como}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...resto}
      >
        {children}
      </Control>
      {ayuda && !error && <p id={idAyuda} className="campo__ayuda">{ayuda}</p>}
      {error && (
        <p id={idError} className="campo__error">
          <WarningCircle weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Casilla de verificación con texto y error. */
export function Casilla({ children, error, className = '', ...resto }) {
  const id = useId();
  return (
    <div className={`casilla ${error ? 'campo--error' : ''} ${className}`}>
      <label className="casilla__etiqueta" htmlFor={id}>
        <input id={id} type="checkbox" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...resto} />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="campo__error">
          <WarningCircle weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
