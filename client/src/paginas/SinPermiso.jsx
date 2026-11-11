import { LockKey, MagnifyingGlass } from '@phosphor-icons/react';
import { useSesion, inicioDeRol } from '../contexto/SesionContexto.jsx';
import { Vacio } from '../componentes/ui/Estados.jsx';
import Boton from '../componentes/ui/Boton.jsx';

export default function SinPermiso() {
  const { usuario } = useSesion();
  return (
    <div className="contenedor pagina">
      <Vacio
        icono={LockKey}
        titulo="No tenés permiso para ver esta pantalla"
        accion={<Boton variante="secundario" a={inicioDeRol(usuario?.rol)}>Ir a mi inicio</Boton>}
      >
        Esta sección es solo para el personal del cine con el rol correspondiente.
      </Vacio>
    </div>
  );
}

export function NoEncontrada() {
  const { usuario } = useSesion();
  return (
    <div className="contenedor pagina">
      <Vacio
        icono={MagnifyingGlass}
        titulo="No encontramos esta página"
        accion={<Boton variante="secundario" a={inicioDeRol(usuario?.rol)}>Volver al inicio</Boton>}
      >
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </Vacio>
    </div>
  );
}
