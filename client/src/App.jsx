import { Route, Routes } from 'react-router-dom';
import Layout from './componentes/layout/Layout.jsx';
import RutaProtegida from './componentes/layout/RutaProtegida.jsx';
import Acceso from './paginas/publico/Acceso.jsx';
import Cartelera from './paginas/publico/Cartelera.jsx';
import DetallePelicula from './paginas/publico/DetallePelicula.jsx';
import Verificar from './paginas/publico/Verificar.jsx';
import Privacidad from './paginas/publico/Privacidad.jsx';
import GuiaEstilos from './paginas/GuiaEstilos.jsx';
import SeleccionButacas from './paginas/espectador/SeleccionButacas.jsx';
import Pago from './paginas/espectador/Pago.jsx';
import Confirmacion from './paginas/espectador/Confirmacion.jsx';
import MisEntradas from './paginas/espectador/MisEntradas.jsx';
import ControlIngreso from './paginas/encargado/ControlIngreso.jsx';
import Peliculas from './paginas/admin/Peliculas.jsx';
import Salas from './paginas/admin/Salas.jsx';
import { NoEncontrada } from './paginas/SinPermiso.jsx';

const ESPECTADOR = ['ESPECTADOR'];
const ENCARGADO = ['ENCARGADO_SALA'];
const ADMIN = ['ADMINISTRADOR'];

export default function App() {
  return (
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
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
