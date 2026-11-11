import { useState } from 'react';
import { Ticket } from '@phosphor-icons/react';
import Boton from '../componentes/ui/Boton.jsx';
import Campo, { Casilla } from '../componentes/ui/Campo.jsx';
import Aviso from '../componentes/ui/Aviso.jsx';
import Estado from '../componentes/ui/Estado.jsx';
import BotonTema from '../componentes/ui/BotonTema.jsx';
import Destellos from '../componentes/ui/Destellos.jsx';
import CordonPasos from '../componentes/compra/CordonPasos.jsx';
import Marquesina from '../componentes/marca/Marquesina.jsx';
import Telon from '../componentes/marca/Telon.jsx';
import { LogoCompleto } from '../componentes/marca/Logo.jsx';
import { fechaISO, sumarDias } from '../utiles/formato.js';
import './GuiaEstilos.css';

/** Guía de estilos interna: muestra los componentes del sistema en el tema actual (Tabla 33). */
export default function GuiaEstilos() {
  const hoy = fechaISO();
  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
  const [fecha, setFecha] = useState(hoy);

  return (
    <div className="guia">
      <Telon>
        <div className="guia__hero">
          <LogoCompleto ancho={240} />
          <h1 className="titulo-pantalla texto-oro">Guía de estilos</h1>
          <p>Componentes de la interfaz de Golden Screen.</p>
          <BotonTema />
        </div>
      </Telon>

      <div className="contenedor pagina">
        <section className="guia__bloque">
          <h2 className="subtitulo">Botones</h2>
          <div className="guia__fila">
            <Boton variante="ticket" icono={<Ticket weight="fill" />}>Elegí tus butacas</Boton>
            <Boton variante="secundario">Ver funciones</Boton>
            <Boton variante="texto">Crear cuenta</Boton>
            <Boton variante="peligro">Cancelar reserva</Boton>
            <Boton variante="ticket" disabled>Pagar</Boton>
            <Boton variante="ticket" cargando>Procesando</Boton>
          </div>
        </section>

        <section className="guia__bloque">
          <h2 className="subtitulo">Pasos de la compra</h2>
          <CordonPasos actual={3} />
        </section>

        <section className="guia__bloque">
          <h2 className="subtitulo">Marquesina de fechas</h2>
          <Marquesina fechas={fechas} seleccionada={fecha} alElegir={setFecha} />
        </section>

        <section className="guia__bloque guia__dos">
          <form className="formulario tarjeta guia__form" onSubmit={(e) => e.preventDefault()} noValidate>
            <Campo etiqueta="Correo electrónico" type="email" defaultValue="marina@correo" error="Ingresá un correo válido, por ejemplo nombre@gmail.com." />
            <Campo etiqueta="Contraseña" type="password" ayuda="Al menos 8 caracteres." />
            <Campo etiqueta="Clasificación" como="select" defaultValue="+13">
              <option value="ATP">ATP</option>
              <option value="+13">+13</option>
            </Campo>
            <Casilla>Acepto la política de privacidad</Casilla>
            <Boton variante="ticket" type="submit" ancho>Crear cuenta</Boton>
          </form>
          <div className="guia__avisos">
            <Aviso tipo="error" titulo="El pago fue rechazado">Tus butacas siguen bloqueadas. Podés reintentar o cancelar la reserva.</Aviso>
            <Aviso tipo="ok" titulo="Reserva confirmada">Tus entradas están en Mis entradas.</Aviso>
            <Aviso tipo="info">Tenés 30 minutos de sesión para completar la compra.</Aviso>
            <Aviso tipo="advertencia" titulo="Tu sesión está por vencer">Seguí navegando para mantenerla activa.</Aviso>
            <div className="guia__fila">
              {['PENDIENTE_PAGO', 'CONFIRMADA', 'CANCELADA', 'ANULADA', 'VALIDA', 'UTILIZADA', 'PROGRAMADA', 'FINALIZADA'].map((e) => <Estado key={e} estado={e} />)}
            </div>
          </div>
        </section>

        <section className="guia__bloque guia__brillo">
          <Destellos />
          <h2 className="titulo-pantalla texto-oro">Destellos dorados</h2>
        </section>
      </div>
    </div>
  );
}
