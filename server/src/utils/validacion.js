// Validaciones con mensajes claros y sin códigos técnicos (RNF-07).

export const esEmail = (texto) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(texto ?? '').trim());

export const limpiar = (texto) => String(texto ?? '').trim();

export function textoRequerido(errores, campo, valor, nombre, { max = 120, min = 1 } = {}) {
  const v = limpiar(valor);
  if (v.length < min) errores[campo] = `Completá ${nombre}.`;
  else if (v.length > max) errores[campo] = `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} puede tener hasta ${max} caracteres.`;
  return v;
}

export function enteroEnRango(errores, campo, valor, { min, max, mensaje }) {
  const n = Number(valor);
  if (valor === '' || valor === null || valor === undefined || !Number.isInteger(n) || n < min || n > max) {
    errores[campo] = mensaje;
    return null;
  }
  return n;
}

export function validarContrasena(errores, campo, valor) {
  const v = String(valor ?? '');
  if (v.length < 8) errores[campo] = 'La contraseña tiene que tener al menos 8 caracteres.';
  else if (v.length > 72) errores[campo] = 'La contraseña puede tener hasta 72 caracteres.';
  return v;
}

export function validarEmail(errores, campo, valor) {
  const v = limpiar(valor).toLowerCase();
  if (!v) errores[campo] = 'Completá tu correo electrónico.';
  else if (!esEmail(v)) errores[campo] = 'Ingresá un correo válido, por ejemplo nombre@gmail.com.';
  return v;
}

export const idValido = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};
