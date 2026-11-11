import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ticket } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { moneda } from '../../utiles/formato.js';
import CordonPasos from '../../componentes/compra/CordonPasos.jsx';
import MapaButacas from '../../componentes/compra/MapaButacas.jsx';
import ResumenCompra from '../../componentes/compra/ResumenCompra.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import Modal from '../../componentes/ui/Modal.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './SeleccionButacas.css';

const ACTUALIZAR_CADA_MS = 3000; // RNF-10: la disponibilidad se refleja en 3 segundos como máximo

/** P-04 Selección de butacas · RF-04, RF-05 · CU-04. */
export default function SeleccionButacas() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { datos, cargando, error, recargar } = useCarga(() => api.get(`/funciones/${id}/butacas`), [id]);
  const [seleccion, setSeleccion] = useState([]);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [cancelar, setCancelar] = useState(false);

  // Actualización periódica del mapa mientras la pestaña está visible.
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) recargar({ silenciosa: true }); }, ACTUALIZAR_CADA_MS);
    return () => clearInterval(t);
  }, [recargar]);

  const butacasPorId = useMemo(() => {
    const mapa = new Map();
    datos?.filas.forEach((f) => f.butacas.forEach((b) => mapa.set(b.id, { ...b, fila: f.letra })));
    return mapa;
  }, [datos]);

  // Si otra persona tomó una butaca que estaba seleccionada, se quita y se avisa (CU-04, A1).
  useEffect(() => {
    if (!datos) return;
    const perdidas = seleccion.filter((s) => butacasPorId.get(s)?.estado !== 'libre');
    if (perdidas.length) {
      setSeleccion((sel) => sel.filter((s) => !perdidas.includes(s)));
      const nombres = perdidas.map((p) => { const b = butacasPorId.get(p); return b ? `${b.fila}${b.numero}` : ''; }).join(', ');
      setAviso({ tipo: 'error', texto: `Otra persona tomó ${perdidas.length === 1 ? 'la butaca' : 'las butacas'} ${nombres}. Elegí otra.` });
    }
  }, [butacasPorId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cargando && !datos) return <Cargando texto="Cargando el mapa de la sala…" />;
  if (error) return <div className="contenedor pagina"><ErrorCarga error={error} alReintentar={recargar} /></div>;

  const { funcion, filas, maxPorReserva, reservaPendiente } = datos;
  const elegidas = seleccion.map((s) => butacasPorId.get(s)).filter(Boolean);
  const pendienteAqui = reservaPendiente?.idFuncion === funcion.id;

  const tocar = (butaca) => {
    setAviso(null);
    if (seleccion.includes(butaca.id)) {
      setSeleccion((s) => s.filter((x) => x !== butaca.id));
    } else if (seleccion.length >= maxPorReserva) {
      setAviso({ tipo: 'advertencia', texto: `Podés elegir hasta ${maxPorReserva} butacas por compra. Quitá una para sumar otra.` }); // CU-04, A2
    } else {
      setSeleccion((s) => [...s, butaca.id]);
    }
  };

  const confirmar = async () => {
    if (!seleccion.length) return;
    setEnviando(true);
    setAviso(null);
    try {
      const r = await api.post('/reservas', { idFuncion: funcion.id, butacas: seleccion });
      navegar(`/reserva/${r.id}/pago`, { state: { recienCreada: true } });
    } catch (err) {
      if (err.codigo === 'BUTACA_NO_DISPONIBLE') setSeleccion((s) => s.filter((x) => !err.datos?.butacas?.includes(x)));
      setAviso({ tipo: 'error', texto: err.message });
      recargar({ silenciosa: true });
    } finally {
      setEnviando(false);
    }
  };

  const cancelarPendiente = async () => {
    try {
      await api.post(`/reservas/${reservaPendiente.id}/cancelar`);
      setAviso({ tipo: 'ok', texto: 'Cancelaste la reserva. Las butacas quedaron libres.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setCancelar(false);
      recargar({ silenciosa: true });
    }
  };

  if (!funcion.reservable) {
    return (
      <div className="contenedor pagina">
        <Vacio titulo="Esta función ya no está disponible" accion={<Boton variante="secundario" a="/">Ver la cartelera</Boton>}>
          Solo se pueden reservar butacas de funciones programadas que todavía no comenzaron.
        </Vacio>
      </div>
    );
  }

  const textoBoton = seleccion.length ? `Confirmar ${seleccion.length} ${seleccion.length === 1 ? 'butaca' : 'butacas'}` : 'Elegí tus butacas';

  return (
    <div className="contenedor pagina seleccion">
      <CordonPasos actual={3} />
      <Boton variante="texto" a={`/pelicula/${funcion.pelicula.id}`} icono={<ArrowLeft />} className="seleccion__volver">Cambiar función</Boton>

      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Paso 3</span>
          <h1 className="titulo-pantalla">Elegí tus butacas</h1>
          <p className="texto-2">Podés elegir hasta {maxPorReserva}. Pasá el mouse o tocá una butaca para ver su fila y número.</p>
        </div>
      </div>

      {reservaPendiente && (
        <Aviso
          tipo="advertencia"
          titulo={pendienteAqui ? 'Ya tenés butacas reservadas en esta función' : 'Tenés una reserva pendiente de pago en otra función'}
          acciones={(
            <>
              <Boton variante="secundario" tamano="chico" a={`/reserva/${reservaPendiente.id}/pago`}>Continuar con el pago</Boton>
              <Boton variante="texto" onClick={() => setCancelar(true)}>Cancelar reserva</Boton>
            </>
          )}
        >
          Para hacer una reserva nueva, primero pagá o cancelá la que tenés pendiente.
        </Aviso>
      )}

      <div className="seleccion__grilla">
        <section className="seleccion__mapa tarjeta">
          <MapaButacas
            filas={filas}
            estadoDe={(b) => (seleccion.includes(b.id) ? 'seleccionada' : b.estado)}
            alTocar={reservaPendiente ? undefined : tocar}
          />
          <div aria-live="polite">{aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}</div>
        </section>

        <ResumenCompra funcion={funcion} butacas={elegidas}>
          <Aviso tipo="info">Al confirmar, tus butacas quedan bloqueadas y tenés <strong>30 minutos de sesión</strong> para completar la compra.</Aviso>
          <Boton variante="ticket" ancho icono={<Ticket weight="fill" />} disabled={!seleccion.length || Boolean(reservaPendiente)} cargando={enviando} onClick={confirmar} className="seleccion__confirmar">
            {textoBoton}
          </Boton>
        </ResumenCompra>
      </div>

      {/* Barra fija en el celular con el total y la acción principal */}
      <div className="seleccion__barra" aria-hidden={!seleccion.length}>
        <div>
          <span className="cifra seleccion__barra-total">{moneda(funcion.precio * seleccion.length)}</span>
          <span className="texto-2">{elegidas.map((b) => `${b.fila}${b.numero}`).join(' · ') || 'Tocá las butacas en el mapa'}</span>
        </div>
        <Boton variante="ticket" disabled={!seleccion.length || Boolean(reservaPendiente)} cargando={enviando} onClick={confirmar}>Confirmar</Boton>
      </div>

      <Modal
        abierto={cancelar}
        alCerrar={() => setCancelar(false)}
        ancho="chico"
        titulo="¿Cancelar la reserva?"
        pie={(
          <>
            <Boton variante="secundario" onClick={() => setCancelar(false)}>Volver</Boton>
            <Boton variante="peligro" onClick={cancelarPendiente}>Sí, cancelar</Boton>
          </>
        )}
      >
        <p>Las butacas de tu reserva pendiente se liberan y quedan disponibles para otras personas.</p>
      </Modal>
    </div>
  );
}
