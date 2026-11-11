/**
 * Error con código HTTP y mensaje pensado para mostrarse al usuario (RNF-07).
 * `campos` permite indicar el error de cada campo de un formulario.
 */
export class ErrorHttp extends Error {
  constructor(estado, mensaje, { campos, codigo, datos } = {}) {
    super(mensaje);
    this.estado = estado;
    this.campos = campos;
    this.codigo = codigo;
    this.datos = datos;
  }
}

export const solicitudInvalida = (mensaje, opciones) => new ErrorHttp(400, mensaje, opciones);
export const noAutenticado = (mensaje = 'Iniciá sesión para continuar.') => new ErrorHttp(401, mensaje, { codigo: 'SIN_SESION' });
export const prohibido = (mensaje = 'No tenés permiso para realizar esta acción.') => new ErrorHttp(403, mensaje, { codigo: 'SIN_PERMISO' });
export const noEncontrado = (mensaje = 'No encontramos lo que buscabas.') => new ErrorHttp(404, mensaje);
export const conflicto = (mensaje, opciones) => new ErrorHttp(409, mensaje, opciones);

/** Envuelve un controlador async para que sus errores lleguen al manejador central. */
export const manejar = (controlador) => (req, res, next) => {
  Promise.resolve(controlador(req, res, next)).catch(next);
};

/** Lanza un error 400 si hay errores de validación acumulados. */
export function verificarCampos(errores, mensaje = 'Revisá los datos marcados.') {
  if (Object.keys(errores).length > 0) {
    throw solicitudInvalida(mensaje, { campos: errores });
  }
}
