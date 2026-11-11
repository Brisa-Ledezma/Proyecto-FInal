import { useEffect, useRef, useState } from 'react';
import { Camera, CameraSlash } from '@phosphor-icons/react';
import Boton from '../ui/Boton.jsx';
import Aviso from '../ui/Aviso.jsx';
import './EscanerQR.css';

const ID_LECTOR = 'lector-qr';

/**
 * Lector de códigos QR con la cámara del dispositivo (RF-10).
 * Requiere HTTPS o localhost. Ignora lecturas repetidas del mismo código por 3 segundos.
 */
export default function EscanerQR({ alLeer, deshabilitado = false }) {
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState(null);
  const lector = useRef(null);
  const ultima = useRef({ codigo: null, momento: 0 });
  const alLeerRef = useRef(alLeer);
  alLeerRef.current = alLeer;

  useEffect(() => {
    if (!activo) return undefined;
    let cancelado = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelado) return;
        lector.current = new Html5Qrcode(ID_LECTOR, { verbose: false });
        await lector.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w, h) => { const lado = Math.floor(Math.min(w, h) * 0.7); return { width: lado, height: lado }; } },
          (texto) => {
            const ahora = Date.now();
            if (texto === ultima.current.codigo && ahora - ultima.current.momento < 3000) return;
            ultima.current = { codigo: texto, momento: ahora };
            alLeerRef.current(texto);
          },
          () => {},
        );
      } catch (e) {
        setActivo(false);
        setError(window.isSecureContext
          ? 'No se pudo usar la cámara. Revisá que el navegador tenga permiso o ingresá el código impreso.'
          : 'La cámara solo funciona con una conexión segura (HTTPS). Ingresá el código impreso debajo del QR.');
        console.warn(e);
      }
    })();
    return () => {
      cancelado = true;
      const l = lector.current;
      lector.current = null;
      if (l?.isScanning) l.stop().then(() => l.clear()).catch(() => {});
    };
  }, [activo]);

  return (
    <div className="escaner">
      <div className={`escaner__visor ${activo ? 'escaner__visor--activo' : ''}`}>
        <div id={ID_LECTOR} className="escaner__video" />
        {!activo && (
          <div className="escaner__reposo">
            <Camera weight="duotone" aria-hidden="true" />
            <p>Activá la cámara y apuntá al código QR de la entrada.</p>
          </div>
        )}
        <span className="escaner__esquinas" aria-hidden="true" />
      </div>
      {error && <Aviso tipo="advertencia">{error}</Aviso>}
      <Boton
        variante={activo ? 'secundario' : 'ticket'}
        ancho
        disabled={deshabilitado}
        icono={activo ? <CameraSlash /> : <Camera weight="fill" />}
        onClick={() => { setError(null); setActivo((a) => !a); }}
      >
        {activo ? 'Detener cámara' : 'Escanear con la cámara'}
      </Boton>
    </div>
  );
}
