import { useState } from 'react';
import { CaretDown, Ticket } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useNotificar } from '../../contexto/NotificacionesContexto.jsx';
import { fechaRelativa, hora, moneda } from '../../utiles/formato.js';
import Afiche from '../../componentes/cartelera/Afiche.jsx';
import EntradaDigital from '../../componentes/compra/EntradaDigital.jsx';
import Estado from '../../componentes/ui/Estado.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Modal from '../../componentes/ui/Modal.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import { Cargando, ErrorCarga, Esqueleto, Vacio } from '../../componentes/ui/Estados.jsx';
import './MisEntradas.css';

function EntradasDeReserva({ id }) {
  const { datos, cargando, error, recargar } = useCarga(() => api.get(`/reservas/${id}`), [id]);
  if (cargando) return <Cargando texto="Cargando entradas…" />;
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />;
  return (
    <div className="mis-entradas__entradas">
      {datos.estado === 'ANULADA' && (
        <Aviso tipo="error" titulo="La función fue cancelada">El cambio o la devolución de estas entradas se realiza en forma presencial en la boletería.</Aviso>
      )}
      {datos.entradas.map((e) => <EntradaDigital key={e.id} entrada={e} funcion={datos.funcion} />)}
    </div>
  );
}

function FilaReserva({ reserva, alCancelar }) {
  const [abierta, setAbierta] = useState(false);
  const { funcion } = reserva;
  const conEntradas = reserva.estado === 'CONFIRMADA' || reserva.estado === 'ANULADA';

  return (
    <li className={`talon-reserva talon-reserva--${reserva.estado.toLowerCase()} ${reserva.proxima ? '' : 'talon-reserva--pasada'}`}>
      <div className="talon-reserva__fila">
        <Afiche pelicula={funcion.pelicula} tamano="chico" />
        <div className="talon-reserva__info">
          <h3 className="talon-reserva__titulo">{funcion.pelicula.titulo}</h3>
          <p className="texto-2">
            {fechaRelativa(funcion.inicio)} · <span className="cifra">{hora(funcion.inicio)}</span> · {funcion.sala.nombre}
          </p>
          <p className="talon-reserva__butacas">
            <span className="cifra">{reserva.butacas}</span>
            <span className="texto-2"> · {reserva.cantidad} {reserva.cantidad === 1 ? 'entrada' : 'entradas'} · {moneda(reserva.total)}</span>
          </p>
        </div>
        <div className="talon-reserva__acciones">
          <Estado estado={reserva.estado} />
          {reserva.estado === 'PENDIENTE_PAGO' && reserva.proxima && (
            <div className="talon-reserva__botones">
              <Boton variante="ticket" tamano="chico" a={`/reserva/${reserva.id}/pago`}>Pagar</Boton>
              <Boton variante="texto" onClick={() => alCancelar(reserva)}>Cancelar</Boton>
            </div>
          )}
          {conEntradas && (
            <Boton variante="secundario" tamano="chico" aria-expanded={abierta} onClick={() => setAbierta((a) => !a)} icono={<CaretDown className={abierta ? 'girado' : ''} />}>
              {abierta ? 'Ocultar' : 'Ver entradas'}
            </Boton>
          )}
        </div>
      </div>
      {abierta && <EntradasDeReserva id={reserva.id} />}
    </li>
  );
}

/** P-07 Mis entradas · RF-07, RF-09 · CU-07. */
export default function MisEntradas() {
  const notificar = useNotificar();
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/reservas'), []);
  const [vista, setVista] = useState('proximas');
  const [aCancelar, setACancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const confirmarCancelacion = async () => {
    setCancelando(true);
    try {
      await api.post(`/reservas/${aCancelar.id}/cancelar`);
      notificar('Cancelaste la reserva. Las butacas quedaron libres.');
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setCancelando(false);
      setACancelar(null);
      recargar({ silenciosa: true });
    }
  };

  const proximas = datos?.filter((r) => r.proxima && r.estado !== 'CANCELADA') ?? [];
  const historial = datos?.filter((r) => !r.proxima || r.estado === 'CANCELADA') ?? [];
  const lista = vista === 'proximas' ? proximas : historial;

  return (
    <div className="contenedor pagina mis-entradas">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Tu cuenta</span>
          <h1 className="titulo-pantalla">Mis entradas</h1>
          <p className="texto-2">Mostrá el código QR de cada entrada al encargado de sala en el ingreso.</p>
        </div>
        <div className="mis-entradas__pestanas" role="tablist" aria-label="Reservas">
          <button type="button" role="tab" aria-selected={vista === 'proximas'} onClick={() => setVista('proximas')}>Próximas <span className="cifra">({proximas.length})</span></button>
          <button type="button" role="tab" aria-selected={vista === 'historial'} onClick={() => setVista('historial')}>Historial <span className="cifra">({historial.length})</span></button>
        </div>
      </div>

      {cargando && !datos && <div className="mis-entradas__lista">{[0, 1].map((i) => <Esqueleto key={i} alto={110} radio={10} />)}</div>}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}

      {datos && lista.length === 0 && (
        <Vacio
          icono={Ticket}
          titulo={vista === 'proximas' ? 'No tenés entradas para próximas funciones' : 'Todavía no hay reservas en tu historial'}
          accion={<Boton variante="ticket" a="/">Ver la cartelera</Boton>}
        >
          Elegí una película, reservá tus butacas y tus entradas van a aparecer acá.
        </Vacio>
      )}

      {lista.length > 0 && (
        <ul className="mis-entradas__lista">
          {lista.map((r) => <FilaReserva key={r.id} reserva={r} alCancelar={setACancelar} />)}
        </ul>
      )}

      <Modal
        abierto={Boolean(aCancelar)}
        alCerrar={() => setACancelar(null)}
        ancho="chico"
        titulo="¿Cancelar la reserva?"
        pie={(
          <>
            <Boton variante="secundario" onClick={() => setACancelar(null)}>Volver</Boton>
            <Boton variante="peligro" onClick={confirmarCancelacion} cargando={cancelando}>Sí, cancelar</Boton>
          </>
        )}
      >
        <p>Las butacas <strong className="cifra">{aCancelar?.butacas}</strong> se liberan y quedan disponibles para otras personas.</p>
      </Modal>
    </div>
  );
}
