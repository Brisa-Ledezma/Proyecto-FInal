import { useParams } from 'react-router-dom';
import { SealCheck, SealWarning, LockKey, Ticket } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useSesion } from '../../contexto/SesionContexto.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Destellos from '../../componentes/ui/Destellos.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './EntradaPublica.css';

/**
 * Lo que ve cualquiera que escanee el QR de una entrada con la cámara del celular:
 * solo confirma que es una entrada única e intransferible de Golden Screen.
 * No muestra datos del titular ni de la función (RNF-14) y no valida nada:
 * eso lo hace el encargado de sala (RF-10).
 */
export default function EntradaPublica() {
  const { codigo } = useParams();
  const { usuario } = useSesion();
  const carga = useCarga(() => api.get(`/entradas/${encodeURIComponent(codigo)}/publica`), [codigo]);

  if (carga.cargando) return <Cargando texto="Consultando la entrada…" />;

  if (carga.error) {
    return (
      <div className="contenedor pagina entrada-publica">
        {carga.error.estado === 404 ? (
          <Vacio icono={SealWarning} titulo="No es una entrada de Golden Screen" accion={<Boton variante="secundario" a="/">Ver la cartelera</Boton>}>
            Este código no corresponde a ninguna entrada emitida por Golden Screen Cinema. Si te la ofrecieron, no la compres.
          </Vacio>
        ) : <ErrorCarga error={carga.error} alReintentar={carga.recargar} />}
      </div>
    );
  }

  return (
    <div className="contenedor pagina entrada-publica">
      <article className="entrada-publica__tarjeta tarjeta">
        <div className="entrada-publica__sello">
          <SealCheck weight="fill" aria-hidden="true" />
          <div>
            <span className="rotulo">Golden Screen Cinema</span>
            <h1 className="entrada-publica__titulo">Entrada única e intransferible</h1>
          </div>
        </div>

        <div className="ticket-regalo">
          <div className="ticket-regalo__papel">
            <Destellos cantidad={6} />
            <div className="ticket-regalo__talon" aria-hidden="true">
              <Ticket weight="duotone" />
              <span>Admite uno</span>
            </div>
            <p className="ticket-regalo__cuerpo">
              <span className="ticket-regalo__rotulo">Golden Screen · Regalo</span>
              <span className="ticket-regalo__texto">Dranuta les regala una entrada para el cine</span>
            </p>
          </div>
        </div>

        <p className="entrada-publica__texto">
          Este código corresponde a una entrada emitida por Golden Screen. Es <strong>única</strong>,
          <strong> no se puede transferir</strong> y se valida una sola vez, en el ingreso a la sala.
        </p>

        <p className="entrada-publica__nota">
          <LockKey weight="duotone" aria-hidden="true" />
          Por seguridad, no mostramos información de la entrada ni de su titular. Quien la compró la ve completa en «Mis entradas».
        </p>

        <div className="entrada-publica__acciones">
          {usuario?.rol === 'ENCARGADO_SALA'
            ? <Boton variante="ticket" a="/control">Ir al control de ingreso</Boton>
            : (
              <>
                <Boton variante="ticket" a="/mis-entradas">Ver mis entradas</Boton>
                <Boton variante="secundario" a="/">Ver la cartelera</Boton>
              </>
            )}
        </div>
      </article>
    </div>
  );
}
