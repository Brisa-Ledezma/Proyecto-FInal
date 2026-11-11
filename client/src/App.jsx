import { Route, Routes } from 'react-router-dom';
import GuiaEstilos from './paginas/GuiaEstilos.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<GuiaEstilos />} />
    </Routes>
  );
}
