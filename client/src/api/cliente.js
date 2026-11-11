// Cliente HTTP de la API REST de Golden Screen.

export class ErrorApi extends Error {
  constructor(estado, cuerpo) {
    super(cuerpo?.mensaje ?? 'Ocurrió un problema. Volvé a intentar.');
    this.estado = estado;
    this.codigo = cuerpo?.codigo;
    this.campos = cuerpo?.campos ?? {};
    this.datos = cuerpo?.datos;
  }
}

export const EVENTO_SESION_VENCIDA = 'gs:sesion-vencida';
export const EVENTO_ACTIVIDAD = 'gs:actividad-api';

async function solicitar(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, credentials: 'same-origin', headers: {} };
  if (cuerpo instanceof FormData) {
    opciones.body = cuerpo;
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, opciones);
  } catch {
    throw new ErrorApi(0, { mensaje: 'No pudimos conectarnos con el servidor. Revisá tu conexión.' });
  }

  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : null;

  if (!respuesta.ok) {
    if (respuesta.status === 401 && datos?.codigo === 'SIN_SESION') {
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_VENCIDA));
    }
    throw new ErrorApi(respuesta.status, datos);
  }
  window.dispatchEvent(new CustomEvent(EVENTO_ACTIVIDAD));
  return datos;
}

export const api = {
  get: (ruta) => solicitar('GET', ruta),
  post: (ruta, cuerpo = {}) => solicitar('POST', ruta, cuerpo),
  put: (ruta, cuerpo) => solicitar('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo = {}) => solicitar('PATCH', ruta, cuerpo),
  delete: (ruta) => solicitar('DELETE', ruta),
};

/** Arma una query string ignorando valores vacíos. */
export function query(parametros) {
  const p = new URLSearchParams();
  Object.entries(parametros).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const texto = p.toString();
  return texto ? `?${texto}` : '';
}
