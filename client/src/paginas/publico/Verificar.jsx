import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSesion } from '../../contexto/SesionContexto.jsx';
import Telon from '../../componentes/marca/Telon.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import Destellos from '../../componentes/ui/Destellos.jsx';
import { Cargando } from '../../componentes/ui/Estados.jsx';

/** Confirmación del correo desde el enlace recibido (RF-01, RN-16). */
export default function Verificar() {
  const { token } = useParams();
  const { confirmarCuenta } = useSesion();
  const [estado, setEstado] = useState({ cargando: true });
  const ejecutado = useRef(false);

  useEffect(() => {
    if (ejecutado.current) return;
    ejecutado.current = true;
    confirmarCuenta(token)
      .then((usuario) => setEstado({ usuario }))
      .catch((error) => setEstado({ error }));
  }, [token, confirmarCuenta]);

  return (
    <Telon>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center', position: 'relative' }}>
        {estado.cargando && <Cargando texto="Confirmando tu cuenta…" />}
        {estado.usuario && (
          <>
            <Destellos />
            <h1 className="titulo-pantalla texto-oro">¡Listo, {estado.usuario.nombre}!</h1>
            <p>Tu cuenta quedó confirmada y ya iniciaste sesión. Elegí una película y reservá tus butacas.</p>
            <Boton variante="ticket" a="/">Ver la cartelera</Boton>
          </>
        )}
        {estado.error && (
          <>
            <Aviso tipo="error" titulo="No pudimos confirmar tu cuenta">{estado.error.message}</Aviso>
            <Boton variante="secundario" a="/acceso">Ir a iniciar sesión</Boton>
          </>
        )}
      </div>
    </Telon>
  );
}
