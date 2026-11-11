import { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';
import './Modal.css';

/**
 * Diálogo modal accesible basado en <dialog>.
 * Se cierra con Escape, con el botón de cerrar o tocando fuera del panel.
 */
export default function Modal({ abierto, alCerrar, titulo, children, pie, ancho = 'medio', cerrable = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className={`modal modal--${ancho}`}
      aria-labelledby="modal-titulo"
      onCancel={(e) => { e.preventDefault(); if (cerrable) alCerrar?.(); }}
      onClick={(e) => { if (cerrable && e.target === ref.current) alCerrar?.(); }}
    >
      {abierto && (
        <div className="modal__panel">
          <header className="modal__cabecera">
            <h2 id="modal-titulo" className="modal__titulo">{titulo}</h2>
            {cerrable && (
              <button type="button" className="modal__cerrar" onClick={alCerrar} aria-label="Cerrar">
                <X weight="bold" />
              </button>
            )}
          </header>
          <div className="modal__cuerpo">{children}</div>
          {pie && <footer className="modal__pie">{pie}</footer>}
        </div>
      )}
    </dialog>
  );
}
