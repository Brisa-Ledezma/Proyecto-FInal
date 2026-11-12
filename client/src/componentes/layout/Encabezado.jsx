import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Armchair, CalendarBlank, ChartBar, ChartPieSlice, FilmSlate, FilmStrip, List, Moon, QrCode, SignIn, SignOut, Sun, Ticket, UsersThree, X,
} from '@phosphor-icons/react';
import { useSesion } from '../../contexto/SesionContexto.jsx';
import { useTema } from '../../contexto/TemaContexto.jsx';
import { MarcaBarra } from '../marca/Logo.jsx';
import BotonTema from '../ui/BotonTema.jsx';
import Boton from '../ui/Boton.jsx';
import './Encabezado.css';

// Menú por rol (Tabla 33: navegación clara).
const MENUS = {
  VISITANTE: [{ a: '/', texto: 'Cartelera', fin: true, Icono: FilmStrip }],
  ESPECTADOR: [{ a: '/', texto: 'Cartelera', fin: true, Icono: FilmStrip }, { a: '/mis-entradas', texto: 'Mis entradas', Icono: Ticket }],
  ENCARGADO_SALA: [{ a: '/control', texto: 'Control de ingreso', Icono: QrCode }],
  ADMINISTRADOR: [
    { a: '/admin', texto: 'Dashboard', fin: true, Icono: ChartPieSlice },
    { a: '/admin/peliculas', texto: 'Películas', Icono: FilmSlate },
    { a: '/admin/salas', texto: 'Salas', Icono: Armchair },
    { a: '/admin/funciones', texto: 'Funciones', Icono: CalendarBlank },
    { a: '/admin/reportes', texto: 'Reportes', Icono: ChartBar },
    { a: '/admin/personal', texto: 'Personal', Icono: UsersThree },
  ],
};

const NOMBRE_ROL = { ESPECTADOR: 'Espectador', ENCARGADO_SALA: 'Encargado de sala', ADMINISTRADOR: 'Administración' };

function Iniciales({ usuario }) {
  const letras = `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase() || '·';
  return <span className="encabezado__avatar" aria-hidden="true">{letras}</span>;
}

/** Interruptor de tema dentro del menú lateral. */
function InterruptorTema() {
  const { tema, alternar } = useTema();
  const oscuro = tema === 'oscuro';
  return (
    <button type="button" className="menu-lateral__tema" role="switch" aria-checked={oscuro} onClick={alternar}>
      {oscuro ? <Moon weight="duotone" aria-hidden="true" /> : <Sun weight="duotone" aria-hidden="true" />}
      <span>Modo oscuro</span>
      <span className="menu-lateral__switch" aria-hidden="true"><span /></span>
    </button>
  );
}

/** Menú lateral del celular: se abre desde la izquierda y difumina el resto de la pantalla. */
function MenuLateral({ abierto, alCerrar, menu, usuario, alSalir, volver }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className="menu-lateral"
      id="menu-lateral"
      aria-label="Menú principal"
      onCancel={(e) => { e.preventDefault(); alCerrar(); }}
      onClick={(e) => { if (e.target === ref.current) alCerrar(); }}
    >
      <div className="menu-lateral__panel">
        <div className="menu-lateral__cabecera">
          <MarcaBarra a={menu[0].a} />
          <button type="button" className="menu-lateral__cerrar" onClick={alCerrar} aria-label="Cerrar menú"><X weight="bold" /></button>
        </div>

        {usuario && (
          <div className="menu-lateral__usuario">
            <Iniciales usuario={usuario} />
            <span>
              <strong>{usuario.nombre} {usuario.apellido}</strong>
              <span>{NOMBRE_ROL[usuario.rol]}</span>
            </span>
          </div>
        )}

        <nav aria-label="Secciones">
          <ul className="menu-lateral__lista">
            {menu.map(({ a, texto, fin, Icono }, i) => (
              <li key={a} style={{ '--i': i }}>
                <NavLink to={a} end={fin} className="menu-lateral__enlace" onClick={alCerrar}>
                  <Icono weight="duotone" aria-hidden="true" />
                  {texto}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="menu-lateral__pie">
          <InterruptorTema />
          {usuario ? (
            <button type="button" className="menu-lateral__salir" onClick={alSalir}>
              <SignOut weight="bold" aria-hidden="true" /> Cerrar sesión
            </button>
          ) : (
            <Boton variante="ticket" ancho a={`/acceso?volver=${encodeURIComponent(volver)}`} icono={<SignIn weight="bold" />} onClick={alCerrar}>Ingresar</Boton>
          )}
        </div>
      </div>
    </dialog>
  );
}

export default function Encabezado() {
  const { usuario, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const ubicacion = useLocation();
  const menu = MENUS[usuario?.rol ?? 'VISITANTE'];
  const inicio = menu[0].a;

  useEffect(() => { setAbierto(false); }, [ubicacion.pathname]);

  const salir = () => { setAbierto(false); cerrarSesion(); };

  return (
    <header className="encabezado">
      <div className="encabezado__barra">
        <button
          type="button"
          className="encabezado__hamburguesa"
          aria-expanded={abierto}
          aria-controls="menu-lateral"
          aria-label="Abrir menú"
          onClick={() => setAbierto(true)}
        >
          <List weight="bold" />
        </button>

        <div className="encabezado__marca"><MarcaBarra a={inicio} /></div>

        <nav className="encabezado__nav" aria-label="Menú principal">
          <ul className="encabezado__lista">
            {menu.map((item) => (
              <li key={item.a}>
                <NavLink to={item.a} end={item.fin} className="encabezado__enlace">{item.texto}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="encabezado__cuenta">
          {usuario ? (
            <span className="encabezado__usuario" title={`${usuario.nombre} ${usuario.apellido}`}>
              <Iniciales usuario={usuario} />
              <span className="encabezado__usuario-texto">
                <span className="encabezado__nombre">{usuario.nombre}</span>
                <span className="encabezado__rol">{NOMBRE_ROL[usuario.rol]}</span>
              </span>
            </span>
          ) : (
            <Boton variante="secundario" tamano="chico" a={`/acceso?volver=${encodeURIComponent(ubicacion.pathname)}`} className="encabezado__ingresar" icono={<SignIn weight="bold" />}>
              Ingresar
            </Boton>
          )}
          <span className="encabezado__tema"><BotonTema /></span>
          {usuario && (
            <button type="button" className="encabezado__salir" onClick={() => cerrarSesion()} aria-label="Cerrar sesión" title="Cerrar sesión">
              <SignOut weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <MenuLateral abierto={abierto} alCerrar={() => setAbierto(false)} menu={menu} usuario={usuario} alSalir={salir} volver={ubicacion.pathname} />
    </header>
  );
}
