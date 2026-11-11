import { useEffect, useRef, useState } from 'react';
import { api, EVENTO_ACTIVIDAD } from '../../api/cliente.js';
import { useSesion } from '../../contexto/SesionContexto.jsx';
import Modal from '../ui/Modal.jsx';
import Boton from '../ui/Boton.jsx';

const MINUTO = 60 * 1000;
const DURACION = 30 * MINUTO; // RNF-04
const AVISO_ANTES = 2 * MINUTO;
const RENOVAR_CADA = 5 * MINUTO;

/**
 * Controla la inactividad: avisa 2 minutos antes del vencimiento y, a los 30 minutos
 * sin actividad, cierra la sesión (lo que cancela la reserva pendiente, RF-06).
 */
export default function AvisoSesion() {
  const { usuario, cerrarSesion } = useSesion();
  const ultimaInteraccion = useRef(Date.now());
  const ultimaSolicitud = useRef(Date.now());
  const [restante, setRestante] = useState(null);

  useEffect(() => {
    if (!usuario) return undefined;
    ultimaInteraccion.current = Date.now();
    ultimaSolicitud.current = Date.now();

    const marcarInteraccion = () => { ultimaInteraccion.current = Date.now(); };
    const marcarSolicitud = () => { ultimaSolicitud.current = Date.now(); ultimaInteraccion.current = Date.now(); };
    const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    eventos.forEach((e) => window.addEventListener(e, marcarInteraccion, { passive: true }));
    window.addEventListener(EVENTO_ACTIVIDAD, marcarSolicitud);

    const reloj = setInterval(() => {
      const ahora = Date.now();
      const inactivo = ahora - ultimaInteraccion.current;
      if (inactivo >= DURACION) {
        clearInterval(reloj);
        cerrarSesion({ motivo: 'vencida' });
        return;
      }
      if (inactivo >= DURACION - AVISO_ANTES) {
        setRestante(Math.ceil((DURACION - inactivo) / 1000));
        return;
      }
      setRestante(null);
      // Si la persona está usando la página, se renueva la sesión del servidor.
      if (ahora - ultimaSolicitud.current > RENOVAR_CADA && inactivo < RENOVAR_CADA) {
        api.get('/auth/sesion').catch(() => {});
      }
    }, 1000);

    return () => {
      clearInterval(reloj);
      eventos.forEach((e) => window.removeEventListener(e, marcarInteraccion));
      window.removeEventListener(EVENTO_ACTIVIDAD, marcarSolicitud);
    };
  }, [usuario, cerrarSesion]);

  if (!usuario || restante === null) return null;
  const minutos = Math.floor(restante / 60);
  const segundos = String(restante % 60).padStart(2, '0');

  return (
    <Modal
      abierto
      cerrable={false}
      ancho="chico"
      titulo="Tu sesión está por vencer"
      pie={(
        <>
          <Boton variante="secundario" onClick={() => cerrarSesion()}>Cerrar sesión</Boton>
          <Boton variante="ticket" onClick={() => { ultimaInteraccion.current = Date.now(); api.get('/auth/sesion').catch(() => {}); setRestante(null); }}>
            Seguir conectado
          </Boton>
        </>
      )}
    >
      <p>
        Por seguridad, la sesión se cierra después de 30 minutos sin actividad. Se va a cerrar en{' '}
        <strong className="cifra">{minutos}:{segundos}</strong>.
      </p>
      <p className="texto-2">Si tenés una reserva pendiente de pago, al cerrarse la sesión se cancela y las butacas se liberan.</p>
    </Modal>
  );
}
