import { config } from '../config.js';

// Las fechas se manejan en hora local del cine con el formato de MySQL: 'AAAA-MM-DD HH:MM:SS'.

const dosDigitos = (n) => String(n).padStart(2, '0');

export function aTextoSql(fecha) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())} `
    + `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}:${dosDigitos(fecha.getSeconds())}`;
}

export function desdeTextoSql(texto) {
  const [dia, hora = '00:00:00'] = String(texto).trim().split(/[ T]/);
  const [a, m, d] = dia.split('-').map(Number);
  const [h, min, s = 0] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, h, min, s);
}

export function sumarMinutos(texto, minutos) {
  const fecha = desdeTextoSql(texto);
  fecha.setMinutes(fecha.getMinutes() + minutos);
  return aTextoSql(fecha);
}

/** RN-12: fin = inicio + duración de la película + 15 minutos de limpieza. */
export function calcularFin(inicio, duracionMin) {
  return sumarMinutos(inicio, duracionMin + config.reglas.minutosLimpieza);
}

export function ahoraSql() {
  return aTextoSql(new Date());
}

export function esFechaValida(texto) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(desdeTextoSql(texto).getTime());
}

/** Edad cumplida a hoy a partir de 'AAAA-MM-DD'. */
export function edadCumplida(fechaNacimiento, hoy = new Date()) {
  const nac = desdeTextoSql(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const antesDelCumple = hoy.getMonth() < nac.getMonth()
    || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate());
  if (antesDelCumple) edad -= 1;
  return edad;
}
