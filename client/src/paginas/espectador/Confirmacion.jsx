import { Navigate, useParams } from 'react-router-dom';
import { Ticket } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { fechaRelativa, hora, moneda } from '../../utiles/formato.js';
import CordonPasos from '../../componentes/compra/CordonPasos.jsx';
import EntradaDigital from '../../componentes/compra/EntradaDigital.jsx';
import Telon from '../../componentes/marca/Telon.jsx';
import Destellos from '../../componentes/ui/Destellos.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import { Cargando, ErrorCarga } from '../../componentes/ui/Estados.jsx';
import './Confirmacion.css';

/** P-06 Confirmación y entrada digital · RF-08, RF-09. */
export default function Confirmacion() {
  const { id } = useParams();
  const { datos: r, cargando, error, recargar } = useCarga(() => api.get(`/reservas/${id}`), [id]);

  if (cargando && !r) return <Cargando texto="Cargando tus entradas…" />;
  if (error) return <div className="contenedor pagina"><ErrorCarga error={error} alReintentar={recargar} /></div>;
  if (r.estado === 'PENDIENTE_PAGO') return <Navigate to={`/reserva/${id}/pago`} replace />;

  const cantidad = r.entradas.length;

  return (
    <>
      <Telon compacto className="confirmacion__escena">
        <div className="confirmacion__hero">
          <Destellos />
          <Destellos tono="petroleo" cantidad={4} />
          <span className="confirmacion__sello">Compra confirmada</span>
          <h1 className="confirmacion__titulo texto-oro">¡Nos vemos en la sala!</h1>
          <p>
            {cantidad} {cantidad === 1 ? 'entrada' : 'entradas'} para <strong>{r.funcion.pelicula.titulo}</strong>,{' '}
            {fechaRelativa(r.funcion.inicio).toLowerCase()} a las <span className="cifra">{hora(r.funcion.inicio)}</span> en la {r.funcion.sala.nombre}.
          </p>
        </div>
      </Telon>

      <div className="contenedor pagina confirmacion">
        <CordonPasos actual={6} />

        <section className="confirmacion__entradas" aria-labelledby="titulo-entradas">
          <div className="encabezado-pagina">
            <div>
              <span className="rotulo">Paso 5 · Tus entradas</span>
              <h2 id="titulo-entradas" className="subtitulo">Mostrá el código QR de cada entrada al ingresar a la sala</h2>
            </div>
          </div>
          <div className="confirmacion__lista">
            {r.entradas.map((e) => <EntradaDigital key={e.id} entrada={e} funcion={r.funcion} />)}
          </div>
        </section>

        <div className="confirmacion__pie tarjeta">
          <div>
            <span className="rotulo">Total abonado</span>
            <strong className="cifra confirmacion__total">{moneda(r.total)}</strong>
            {r.ultimoPago && (
              <span className="texto-2">
                {r.ultimoPago.medio === 'TARJETA' ? 'Tarjeta' : 'Mercado Pago'} · Operación <span className="cifra">{r.ultimoPago.transaccion}</span>
              </span>
            )}
          </div>
          <p className="texto-2">Tus entradas quedan guardadas en «Mis entradas». Se pueden validar desde 30 minutos antes de la función.</p>
          <div className="confirmacion__acciones">
            <Boton variante="ticket" a="/mis-entradas" icono={<Ticket weight="fill" />}>Ver mis entradas</Boton>
            <Boton variante="secundario" a="/">Volver a la cartelera</Boton>
          </div>
        </div>
      </div>
    </>
  );
}
