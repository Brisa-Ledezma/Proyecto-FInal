import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { List, SignOut, UserCircle, X } from '@phosphor-icons/react';
import { useSesion } from '../../contexto/SesionContexto.jsx';
import { MarcaBarra } from '../marca/Logo.jsx';
import BotonTema from '../ui/BotonTema.jsx';
import Boton from '../ui/Boton.jsx';
import './Encabezado.css';

// Menú por rol (Tabla 33: navegación clara).
const MENUS = {
  VISITANTE: [{ a: '/', texto: 'Cartelera', fin: true }],
  ESPECTADOR: [{ a: '/', texto: 'Cartelera', fin: true }, { a: '/mis-entradas', texto: 'Mis entradas' }],
  ENCARGADO_SALA: [{ a: '/control', texto: 'Control de ingreso' }],
  ADMINISTRADOR: [
    { a: '/admin', texto: 'Tablero', fin: true },
    { a: '/admin/peliculas', texto: 'Películas' },
    { a: '/admin/salas', texto: 'Salas' },
    { a: '/admin/funciones', texto: 'Funciones' },
    { a: '/admin/reportes', texto: 'Reportes' },
    { a: '/admin/personal', texto: 'Personal' },
  ],
};

const NOMBRE_ROL = { ESPECTADOR: 'Espectador', ENCARGADO_SALA: 'Encargado de sala', ADMINISTRADOR: 'Administración' };

export default function Encabezado() {
  const { usuario, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const ubicacion = useLocation();
  const menu = MENUS[usuario?.rol ?? 'VISITANTE'];
  const inicio = menu[0].a;

  useEffect(() => { setAbierto(false); }, [ubicacion.pathname]);

  return (
    <header className="encabezado">
      <div className="encabezado__barra contenedor">
        <MarcaBarra a={inicio} />

        <nav className={`encabezado__nav ${abierto ? 'encabezado__nav--abierta' : ''}`} aria-label="Menú principal" id="menu-principal">
          <ul className="encabezado__lista">
            {menu.map((item) => (
              <li key={item.a}>
                <NavLink to={item.a} end={item.fin} className="encabezado__enlace">{item.texto}</NavLink>
              </li>
            ))}
          </ul>
          <div className="encabezado__cuenta">
            {usuario ? (
              <>
                <span className="encabezado__usuario">
                  <UserCircle weight="duotone" aria-hidden="true" />
                  <span>
                    <span className="encabezado__nombre">{usuario.nombre}</span>
                    <span className="encabezado__rol">{NOMBRE_ROL[usuario.rol]}</span>
                  </span>
                </span>
                <button type="button" className="encabezado__salir" onClick={() => cerrarSesion()}>
                  <SignOut aria-hidden="true" /> Cerrar sesión
                </button>
              </>
            ) : (
              <Boton variante="secundario" tamano="chico" a={`/acceso?volver=${encodeURIComponent(ubicacion.pathname)}`} className="encabezado__ingresar">
                Ingresar
              </Boton>
            )}
          </div>
        </nav>

        <div className="encabezado__acciones">
          <BotonTema />
          <button
            type="button"
            className="encabezado__hamburguesa"
            aria-expanded={abierto}
            aria-controls="menu-principal"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setAbierto((a) => !a)}
          >
            {abierto ? <X weight="bold" /> : <List weight="bold" />}
          </button>
        </div>
      </div>
    </header>
  );
}
