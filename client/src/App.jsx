import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Cargando } from './componentes/ui/Estados.jsx';
import Layout from './componentes/layout/Layout.jsx';
import RutaProtegida from './componentes/layout/RutaProtegida.jsx';
import Acceso from './paginas/publico/Acceso.jsx';
import Cartelera from './paginas/publico/Cartelera.jsx';
import DetallePelicula from './paginas/publico/DetallePelicula.jsx';
import Verificar from './paginas/publico/Verificar.jsx';
import Privacidad from './paginas/publico/Privacidad.jsx';
import { NoEncontrada } from './paginas/SinPermiso.jsx';

// Las pantallas de cada rol se cargan recién cuando se necesitan (RNF-09).
const GuiaEstilos = lazy(() => import('./paginas/GuiaEstilos.jsx'));
const SeleccionButacas = lazy(() => import('./paginas/espectador/SeleccionButacas.jsx'));
const Pago = lazy(() => import('./paginas/espectador/Pago.jsx'));
const Confirmacion = lazy(() => import('./paginas/espectador/Confirmacion.jsx'));
const MisEntradas = lazy(() => import('./paginas/espectador/MisEntradas.jsx'));
const ControlIngreso = lazy(() => import('./paginas/encargado/ControlIngreso.jsx'));
const Peliculas = lazy(() => import('./paginas/admin/Peliculas.jsx'));
const Salas = lazy(() => import('./paginas/admin/Salas.jsx'));
const Funciones = lazy(() => import('./paginas/admin/Funciones.jsx'));
const Tablero = lazy(() => import('./paginas/admin/Tablero.jsx'));
const Reportes = lazy(() => import('./paginas/admin/Reportes.jsx'));
const Personal = lazy(() => import('./paginas/admin/Personal.jsx'));

const ESPECTADOR = ['ESPECTADOR'];
const ENCARGADO = ['ENCARGADO_SALA'];
const ADMIN = ['ADMINISTRADOR'];

export default function App() {
  return (
    <Suspense fallback={<Cargando />}>
    <Routes>
      <Route element={<Layout />}>
        {/* Públicas */}
        <Route path="/" element={<Cartelera />} />
        <Route path="/pelicula/:id" element={<DetallePelicula />} />
        <Route path="/acceso" element={<Acceso />} />
        <Route path="/verificar/:token" element={<Verificar />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/guia-de-estilos" element={<GuiaEstilos />} />

        {/* Espectador */}
        <Route element={<RutaProtegida roles={ESPECTADOR} />}>
          <Route path="/funcion/:id" element={<SeleccionButacas />} />
          <Route path="/reserva/:id/pago" element={<Pago />} />
          <Route path="/reserva/:id/confirmacion" element={<Confirmacion />} />
          <Route path="/mis-entradas" element={<MisEntradas />} />
        </Route>

        {/* Encargado de sala */}
        <Route element={<RutaProtegida roles={ENCARGADO} />}>
          <Route path="/control" element={<ControlIngreso />} />
        </Route>

        {/* Administración */}
        <Route element={<RutaProtegida roles={ADMIN} />}>
          <Route path="/admin/peliculas" element={<Peliculas />} />
          <Route path="/admin/salas" element={<Salas />} />
          <Route path="/admin" element={<Tablero />} />
          <Route path="/admin/funciones" element={<Funciones />} />
          <Route path="/admin/reportes" element={<Reportes />} />
          <Route path="/admin/reportes/:tipo" element={<Reportes />} />
          <Route path="/admin/personal" element={<Personal />} />
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
