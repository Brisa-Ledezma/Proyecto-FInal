import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react';
import './Notificaciones.css';

const NotificacionesContexto = createContext(null);
const ICONOS = { ok: CheckCircle, error: WarningCircle, info: Info };

/** Mensajes breves que confirman una acción ("Película guardada"). */
export function ProveedorNotificaciones({ children }) {
  const [lista, setLista] = useState([]);
  const siguienteId = useRef(1);

  const cerrar = useCallback((id) => setLista((actual) => actual.filter((n) => n.id !== id)), []);

  const notificar = useCallback((texto, tipo = 'ok') => {
    const id = siguienteId.current++;
    setLista((actual) => [...actual.slice(-2), { id, texto, tipo }]);
    setTimeout(() => cerrar(id), tipo === 'error' ? 7000 : 4500);
  }, [cerrar]);

  return (
    <NotificacionesContexto.Provider value={notificar}>
      {children}
      <div className="notificaciones" aria-live="polite">
        {lista.map(({ id, texto, tipo }) => {
          const Icono = ICONOS[tipo] ?? Info;
          return (
            <div key={id} className={`notificacion notificacion--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
              <Icono weight="fill" aria-hidden="true" />
              <span>{texto}</span>
              <button type="button" onClick={() => cerrar(id)} aria-label="Cerrar mensaje"><X /></button>
            </div>
          );
        })}
      </div>
    </NotificacionesContexto.Provider>
  );
}

export const useNotificar = () => useContext(NotificacionesContexto);
