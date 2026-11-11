// Formatos en español de Argentina. Las fechas llegan de la API como 'AAAA-MM-DD HH:MM:SS' en hora local.

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const dos = (n) => String(n).padStart(2, '0');

export function aFecha(texto) {
  if (texto instanceof Date) return texto;
  const [dia, hora = '00:00:00'] = String(texto).split(/[ T]/);
  const [a, m, d] = dia.split('-').map(Number);
  const [h, mi, s = 0] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, h, mi, s);
}

/** 'AAAA-MM-DD' de una fecha. */
export function fechaISO(fecha = new Date()) {
  const f = aFecha(fecha);
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
}

export function sumarDias(fechaTexto, dias) {
  const f = aFecha(fechaTexto);
  f.setDate(f.getDate() + dias);
  return fechaISO(f);
}

export const diaCorto = (texto) => DIAS_CORTOS[aFecha(texto).getDay()];
export const numeroDia = (texto) => dos(aFecha(texto).getDate());
export const hora = (texto) => { const f = aFecha(texto); return `${dos(f.getHours())}:${dos(f.getMinutes())}`; };

/** "sábado 14 de noviembre" */
export function fechaLarga(texto) {
  const f = aFecha(texto);
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
}

/** "Sáb 14/11" */
export function fechaCorta(texto) {
  const f = aFecha(texto);
  return `${DIAS_CORTOS[f.getDay()]} ${dos(f.getDate())}/${dos(f.getMonth() + 1)}`;
}

/** "14/11/2026 17:00" */
export function fechaHora(texto) {
  const f = aFecha(texto);
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${hora(texto)}`;
}

/** "Hoy", "Mañana" o "sábado 14 de noviembre" */
export function fechaRelativa(texto) {
  const hoy = fechaISO();
  const dia = fechaISO(texto);
  if (dia === hoy) return 'Hoy';
  if (dia === sumarDias(hoy, 1)) return 'Mañana';
  const largo = fechaLarga(texto);
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}

const formatoMoneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const moneda = (n) => formatoMoneda.format(Number(n) || 0).replace(/\s/g, '');

const formatoNumero = new Intl.NumberFormat('es-AR');
export const numero = (n) => formatoNumero.format(Number(n) || 0);

export const porcentaje = (n) => `${formatoNumero.format(Math.round((Number(n) || 0) * 10) / 10)} %`;

/** "2 h 05 min" */
export function duracion(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h ? `${h} h ${dos(m)} min` : `${m} min`;
}

export const nombreCompleto = (u) => `${u.nombre} ${u.apellido}`.trim();

/** "F7" a partir de fila y número */
export const idButaca = (fila, numeroButaca) => `${fila}${numeroButaca}`;
