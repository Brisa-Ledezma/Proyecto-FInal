import { Route, Routes } from 'react-router-dom';
import Layout from './componentes/layout/Layout.jsx';
import RutaProtegida from './componentes/layout/RutaProtegida.jsx';
import Acceso from './paginas/publico/Acceso.jsx';
import Verificar from './paginas/publico/Verificar.jsx';
import Privacidad from './paginas/publico/Privacidad.jsx';
import GuiaEstilos from './paginas/GuiaEstilos.jsx';
import { NoEncontrada } from './paginas/SinPermiso.jsx';

const ESPECTADOR = ['ESPECTADOR'];
const ENCARGADO = ['ENCARGADO_SALA'];
const ADMIN = ['ADMINISTRADOR'];

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Públicas */}
        <Route path="/" element={<GuiaEstilos />} />
        <Route path="/acceso" element={<Acceso />} />
        <Route path="/verificar/:token" element={<Verificar />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/guia-de-estilos" element={<GuiaEstilos />} />

        {/* Espectador */}
        <Route element={<RutaProtegida roles={ESPECTADOR} />} />

        {/* Encargado de sala */}
        <Route element={<RutaProtegida roles={ENCARGADO} />} />

        {/* Administración */}
        <Route element={<RutaProtegida roles={ADMIN} />} />

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
