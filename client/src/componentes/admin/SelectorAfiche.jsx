import { useEffect, useId, useRef, useState } from 'react';
import { ImageSquare, Trash, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import './SelectorAfiche.css';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAXIMO = 3 * 1024 * 1024;

/**
 * Carga del afiche (RF-11): clic o arrastrar y soltar, con vista previa.
 * `actual` es la URL del afiche guardado; `alCambiar(archivo | null, quitado)`.
 */
export default function SelectorAfiche({ actual, alCambiar, error }) {
  const id = useId();
  const entrada = useRef(null);
  const [vista, setVista] = useState(actual);
  const [arrastrando, setArrastrando] = useState(false);
  const [errorLocal, setErrorLocal] = useState(null);

  useEffect(() => () => { if (vista?.startsWith('blob:')) URL.revokeObjectURL(vista); }, [vista]);

  const elegir = (archivo) => {
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) { setErrorLocal('Elegí una imagen JPG, PNG o WebP.'); return; }
    if (archivo.size > MAXIMO) { setErrorLocal('La imagen supera los 3 MB. Elegí una más liviana.'); return; }
    setErrorLocal(null);
    setVista(URL.createObjectURL(archivo));
    alCambiar(archivo, false);
  };

  const quitar = () => {
    setVista(null);
    if (entrada.current) entrada.current.value = '';
    alCambiar(null, true);
  };

  const mensaje = errorLocal ?? error;

  return (
    <div className="selector-afiche">
      <span className="campo__etiqueta" id={`${id}-etiqueta`}>Afiche <span className="campo__opcional">(opcional)</span></span>
      <label
        htmlFor={id}
        className={`selector-afiche__zona ${arrastrando ? 'selector-afiche__zona--arrastrando' : ''} ${mensaje ? 'selector-afiche__zona--error' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files?.[0]); }}
      >
        {vista ? <img src={vista} alt="Vista previa del afiche" /> : (
          <span className="selector-afiche__vacio">
            <ImageSquare weight="duotone" aria-hidden="true" />
            <span>Arrastrá una imagen o hacé clic para elegirla</span>
            <span className="texto-2">JPG, PNG o WebP · hasta 3 MB · vertical 2:3</span>
          </span>
        )}
      </label>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept={TIPOS.join(',')}
        className="solo-lector"
        aria-labelledby={`${id}-etiqueta`}
        aria-invalid={mensaje ? true : undefined}
        onChange={(e) => elegir(e.target.files?.[0])}
      />
      <div className="selector-afiche__acciones">
        <button type="button" className="boton boton--secundario boton--chico" onClick={() => entrada.current?.click()}>
          <UploadSimple aria-hidden="true" /> {vista ? 'Cambiar' : 'Elegir imagen'}
        </button>
        {vista && (
          <button type="button" className="boton boton--peligro boton--chico" onClick={quitar}>
            <Trash aria-hidden="true" /> Quitar
          </button>
        )}
      </div>
      {mensaje && <p className="campo__error"><WarningCircle weight="fill" aria-hidden="true" /> <span>{mensaje}</span></p>}
    </div>
  );
}
