import { useMemo, useState } from 'react';

/**
 * Estado de formulario con validación visible (RNF-07, Tabla 33):
 * los errores aparecen después del primer intento de envío y el botón
 * queda bloqueado hasta que se corrigen.
 */
export function useFormulario(inicial, validar) {
  const [valores, setValores] = useState(inicial);
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState({});

  const erroresLocales = useMemo(() => (validar ? validar(valores) : {}), [valores, validar]);
  const errores = intentado ? { ...erroresServidor, ...erroresLocales } : erroresServidor;
  const bloqueado = intentado && Object.keys(erroresLocales).length > 0;

  const cambiar = (campo) => (evento) => {
    const valor = evento?.target ? (evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value) : evento;
    setValores((v) => ({ ...v, [campo]: valor }));
    if (erroresServidor[campo]) setErroresServidor(({ [campo]: _, ...resto }) => resto);
  };

  /** Marca el intento y devuelve true si se puede enviar. */
  const intentar = () => {
    setIntentado(true);
    return Object.keys(erroresLocales).length === 0;
  };

  return {
    valores, setValores, errores, bloqueado, cambiar, intentar,
    setErroresServidor, reiniciar: () => { setValores(inicial); setIntentado(false); setErroresServidor({}); },
  };
}
