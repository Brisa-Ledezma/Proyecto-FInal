import { Moon, Sun } from '@phosphor-icons/react';
import { useTema } from '../../contexto/TemaContexto.jsx';
import './BotonTema.css';

export default function BotonTema() {
  const { tema, alternar } = useTema();
  const aClaro = tema === 'oscuro';
  return (
    <button
      type="button"
      className="boton-tema"
      onClick={alternar}
      aria-label={aClaro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={aClaro ? 'Tema claro' : 'Tema oscuro'}
    >
      {aClaro ? <Sun weight="duotone" /> : <Moon weight="duotone" />}
    </button>
  );
}
