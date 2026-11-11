import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CreditCard, LockKey, Wallet } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useNotificar } from '../../contexto/NotificacionesContexto.jsx';
import { moneda } from '../../utiles/formato.js';
import CordonPasos from '../../componentes/compra/CordonPasos.jsx';
import ResumenCompra from '../../componentes/compra/ResumenCompra.jsx';
import RelojPago from '../../componentes/compra/RelojPago.jsx';
import Campo from '../../componentes/ui/Campo.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import Modal from '../../componentes/ui/Modal.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Pago.css';

const marcaTarjeta = (numero) => {
  const n = numero.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'American Express';
  return null;
};
const formatearNumero = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatearVencimiento = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

function validarTarjeta(t) {
  const e = {};
  const n = t.numero.replace(/\D/g, '');
  if (!n) e.numero = 'Completá el número de la tarjeta.';
  else if (n.length < 13) e.numero = 'El número de tarjeta está incompleto.';
  if (!t.titular.trim()) e.titular = 'Completá el nombre como figura en la tarjeta.';
  if (!/^\d{2}\/\d{2}$/.test(t.vencimiento)) e.vencimiento = 'Ingresá el vencimiento con el formato MM/AA.';
  const largo = /^3[47]/.test(n) ? 4 : 3;
  if (!new RegExp(`^\\d{${largo}}$`).test(t.cvv)) e.cvv = `El código de seguridad tiene ${largo} dígitos.`;
  return e;
}

/** P-05 Pago (simulado) · RF-07, RF-08 · CU-05 y CU-06. */
export default function Pago() {
  const { id } = useParams();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const notificar = useNotificar();
  const { datos: reserva, cargando, error, recargar } = useCarga(() => api.get(`/reservas/${id}`), [id]);

  const [reloj, setReloj] = useState(null); // { segundos, total, intento }
  const [fase, setFase] = useState('formulario'); // formulario | procesando | fallo
  const [fallo, setFallo] = useState(null);
  const [medio, setMedio] = useState('TARJETA');
  const [tarjeta, setTarjeta] = useState({ numero: '', titular: '', vencimiento: '', cvv: '' });
  const [cuenta, setCuenta] = useState('con-saldo');
  const [errores, setErrores] = useState({});
  const [intentado, setIntentado] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const iniciarReloj = useCallback(async (reiniciar = false) => {
    const r = await api.post(`/reservas/${id}/iniciar-pago`, { reiniciar });
    setReloj((anterior) => ({ segundos: r.segundosRestantes, total: r.segundosTotales, intento: (anterior?.intento ?? 0) + 1 }));
    if (r.segundosRestantes === 0) { setFase('fallo'); setFallo({ titulo: 'Se terminó el tiempo para pagar' }); }
  }, [id]);

  useEffect(() => {
    if (reserva?.estado === 'PENDIENTE_PAGO' && !reloj) iniciarReloj().catch(() => recargar());
  }, [reserva, reloj, iniciarReloj, recargar]);

  const alTerminarReloj = useCallback(() => {
    setFase((f) => (f === 'formulario' ? 'fallo' : f));
    setFallo((f) => f ?? { titulo: 'Se terminó el tiempo para pagar' });
  }, []);

  if (cargando && !reserva) return <Cargando texto="Preparando el pago…" />;
  if (error) {
    return <div className="contenedor pagina">{error.estado === 404 ? <Vacio titulo="No encontramos esta reserva" accion={<Boton variante="secundario" a="/">Ver la cartelera</Boton>} /> : <ErrorCarga error={error} alReintentar={recargar} />}</div>;
  }
  if (reserva.estado === 'CONFIRMADA') return <Navigate to={`/reserva/${id}/confirmacion`} replace />;
  if (reserva.estado !== 'PENDIENTE_PAGO') {
    return (
      <div className="contenedor pagina">
        <Vacio titulo={reserva.estado === 'ANULADA' ? 'Esta reserva fue anulada' : 'Esta reserva fue cancelada'} accion={<Boton variante="secundario" a="/">Ver la cartelera</Boton>}>
          Sus butacas ya se liberaron. Podés hacer una reserva nueva desde la cartelera.
        </Vacio>
      </div>
    );
  }

  const erroresTarjeta = intentado && medio === 'TARJETA' ? { ...errores, ...validarTarjeta(tarjeta) } : errores;
  const cambiarTarjeta = (campo, formato = (v) => v) => (e) => {
    setTarjeta((t) => ({ ...t, [campo]: formato(e.target.value) }));
    setErrores(({ [campo]: _, ...resto }) => resto);
  };

  const pagar = async (e) => {
    e.preventDefault();
    setIntentado(true);
    if (medio === 'TARJETA' && Object.keys(validarTarjeta(tarjeta)).length) return;
    setFase('procesando');
    try {
      await api.post(`/reservas/${id}/pago`, medio === 'TARJETA' ? { medio, tarjeta } : { medio, cuenta });
      navegar(`/reserva/${id}/confirmacion`, { replace: true, state: { recienPagada: true } });
    } catch (err) {
      if (err.codigo === 'YA_CONFIRMADA') { navegar(`/reserva/${id}/confirmacion`, { replace: true }); return; }
      if (err.campos && Object.keys(err.campos).length) { setErrores(err.campos); setFase('formulario'); return; }
      if (err.codigo === 'PAGO_RECHAZADO' || err.codigo === 'TIEMPO_AGOTADO') {
        setFase('fallo');
        setFallo(err.codigo === 'PAGO_RECHAZADO'
          ? { titulo: err.message, texto: 'Tus butacas siguen bloqueadas. Podés reintentar con otro medio de pago o cancelar la reserva.' }
          : { titulo: 'Se terminó el tiempo para pagar', texto: err.message });
        return;
      }
      setFase('formulario');
      notificar(err.message, 'error');
      recargar({ silenciosa: true });
    }
  };

  const reintentar = async () => {
    setFallo(null);
    setFase('formulario');
    setTarjeta((t) => ({ ...t, cvv: '' }));
    try { await iniciarReloj(true); } catch (err) { notificar(err.message, 'error'); recargar(); }
  };

  const cancelarReserva = async () => {
    setCancelando(true);
    try {
      await api.post(`/reservas/${id}/cancelar`);
      notificar('Cancelaste la reserva. Las butacas quedaron libres.');
      navegar('/', { replace: true });
    } catch (err) {
      setConfirmarCancelar(false);
      if (err.codigo === 'YA_CONFIRMADA') { navegar(`/reserva/${id}/confirmacion`, { replace: true }); return; }
      notificar(err.message, 'error');
    } finally {
      setCancelando(false);
    }
  };

  const butacas = reserva.butacas;
  const marca = marcaTarjeta(tarjeta.numero);

  return (
    <div className="contenedor pagina pago">
      <CordonPasos actual={4} />

      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Paso 4</span>
          <h1 className="titulo-pantalla">Pagá tus entradas</h1>
        </div>
      </div>

      {ubicacion.state?.recienCreada && fase === 'formulario' && (
        <Aviso tipo="info" titulo="Tus butacas quedaron bloqueadas">
          Tenés 30 minutos de sesión para completar la compra. Si cerrás sesión o pasan 30 minutos sin actividad, la reserva se cancela.
        </Aviso>
      )}

      <div className="pago__grilla">
        <section className="pago__panel tarjeta">
          <div className="pago__reloj">
            {reloj && <RelojPago key={reloj.intento} segundos={reloj.segundos} total={reloj.total} pausado={fase !== 'formulario'} alTerminar={alTerminarReloj} />}
            <div>
              <p className="subtitulo">Completá el pago en 5 minutos</p>
              <p className="texto-2">Si el tiempo llega a cero, podés reintentar: tus butacas siguen bloqueadas.</p>
            </div>
          </div>

          {fase === 'fallo' ? (
            <Aviso
              tipo="error"
              titulo={fallo?.titulo}
              acciones={(
                <>
                  <Boton variante="ticket" onClick={reintentar}>Reintentar</Boton>
                  <Boton variante="peligro" onClick={() => setConfirmarCancelar(true)}>Cancelar reserva</Boton>
                </>
              )}
            >
              {fallo?.texto ?? 'Tus butacas siguen bloqueadas. Podés reintentar el pago o cancelar la reserva.'}
            </Aviso>
          ) : (
            <form className="formulario" onSubmit={pagar} noValidate>
              <fieldset className="pago__medios">
                <legend className="campo__etiqueta">Medio de pago</legend>
                <label className={`pago__medio ${medio === 'TARJETA' ? 'pago__medio--activo' : ''}`}>
                  <input type="radio" name="medio" value="TARJETA" checked={medio === 'TARJETA'} onChange={() => setMedio('TARJETA')} />
                  <CreditCard weight="duotone" aria-hidden="true" />
                  <span><strong>Tarjeta</strong><span>Crédito o débito</span></span>
                </label>
                <label className={`pago__medio ${medio === 'MERCADO_PAGO' ? 'pago__medio--activo' : ''}`}>
                  <input type="radio" name="medio" value="MERCADO_PAGO" checked={medio === 'MERCADO_PAGO'} onChange={() => setMedio('MERCADO_PAGO')} />
                  <Wallet weight="duotone" aria-hidden="true" />
                  <span><strong>Mercado Pago</strong><span>Dinero en cuenta</span></span>
                </label>
              </fieldset>

              {medio === 'TARJETA' ? (
                <>
                  <Campo etiqueta="Número de tarjeta" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={tarjeta.numero} onChange={cambiarTarjeta('numero', formatearNumero)} error={erroresTarjeta.numero} ayuda={marca ? `Tarjeta ${marca}` : undefined} />
                  <Campo etiqueta="Nombre del titular" autoComplete="cc-name" placeholder="Como figura en la tarjeta" value={tarjeta.titular} onChange={cambiarTarjeta('titular')} error={erroresTarjeta.titular} />
                  <div className="formulario__fila">
                    <Campo etiqueta="Vencimiento" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={tarjeta.vencimiento} onChange={cambiarTarjeta('vencimiento', formatearVencimiento)} error={erroresTarjeta.vencimiento} />
                    <Campo etiqueta="Código de seguridad" inputMode="numeric" autoComplete="cc-csc" placeholder="CVV" maxLength={4} value={tarjeta.cvv} onChange={cambiarTarjeta('cvv', (v) => v.replace(/\D/g, '').slice(0, 4))} error={erroresTarjeta.cvv} />
                  </div>
                </>
              ) : (
                <fieldset className="pago__cuentas">
                  <legend className="campo__etiqueta">Cuenta de Mercado Pago</legend>
                  {[['con-saldo', 'Cuenta de prueba con saldo', 'marina.prueba@mercadopago'], ['sin-saldo', 'Cuenta de prueba sin saldo', 'cuenta.sin.saldo@mercadopago']].map(([valor, titulo, detalle]) => (
                    <label key={valor} className={`pago__cuenta ${cuenta === valor ? 'pago__cuenta--activa' : ''}`}>
                      <input type="radio" name="cuenta" value={valor} checked={cuenta === valor} onChange={() => setCuenta(valor)} />
                      <span><strong>{titulo}</strong><span className="texto-2">{detalle}</span></span>
                    </label>
                  ))}
                </fieldset>
              )}

              <p className="pago__seguro"><LockKey aria-hidden="true" /> No guardamos los datos de tu tarjeta.</p>

              <Boton variante="ticket" type="submit" ancho cargando={fase === 'procesando'}>
                {fase === 'procesando' ? 'Procesando el pago…' : `Pagar ${moneda(reserva.total)}`}
              </Boton>

              <details className="pago__prueba">
                <summary>Pago simulado: datos de prueba</summary>
                <p>En esta versión no se realiza ningún cobro (S-03). Para probar los resultados:</p>
                <ul>
                  <li>Tarjeta Visa <span className="cifra">4509 9535 6623 3704</span>, vencimiento <span className="cifra">11/30</span>, código <span className="cifra">123</span>.</li>
                  <li>Titular <strong>APRO</strong> (o cualquier nombre): pago aprobado.</li>
                  <li>Titular <strong>FUND</strong>: fondos insuficientes · <strong>SECU</strong>: código inválido · <strong>OTHE</strong>: error general.</li>
                  <li>Mercado Pago: la cuenta sin saldo rechaza el pago.</li>
                </ul>
              </details>
            </form>
          )}

          {fase === 'formulario' && (
            <Boton variante="texto" className="pago__cancelar" onClick={() => setConfirmarCancelar(true)}>Cancelar reserva</Boton>
          )}
        </section>

        <ResumenCompra funcion={reserva.funcion} butacas={butacas.map((b) => ({ fila: b.fila, numero: b.numero }))} titulo="Resumen de tu reserva" />
      </div>

      <Modal
        abierto={confirmarCancelar}
        alCerrar={() => setConfirmarCancelar(false)}
        ancho="chico"
        titulo="¿Cancelar la reserva?"
        pie={(
          <>
            <Boton variante="secundario" onClick={() => setConfirmarCancelar(false)}>Volver al pago</Boton>
            <Boton variante="peligro" onClick={cancelarReserva} cargando={cancelando}>Sí, cancelar</Boton>
          </>
        )}
      >
        <p>Las butacas <strong className="cifra">{butacas.map((b) => `${b.fila}${b.numero}`).join(', ')}</strong> se liberan y quedan disponibles para otras personas.</p>
      </Modal>
    </div>
  );
}
