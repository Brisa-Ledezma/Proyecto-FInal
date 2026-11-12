import crypto from 'node:crypto';

// Sin letras ni números que se confundan al leerlos (0/O, 1/I/L) para que el
// encargado de sala pueda tipear el código impreso debajo del QR (RF-10).
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function aleatorio(largo) {
  const bytes = crypto.randomBytes(largo);
  let texto = '';
  for (let i = 0; i < largo; i += 1) texto += ALFABETO[bytes[i] % ALFABETO.length];
  return texto;
}

/** Código de entrada con formato GS-XXXX-XXXX (12 caracteres). */
export function generarCodigoEntrada() {
  return `GS-${aleatorio(4)}-${aleatorio(4)}`;
}

/**
 * Normaliza lo que lee o tipea el encargado: mayúsculas, sin espacios y con guiones.
 * El QR guarda el enlace público de la entrada (…/entrada/GS-XXXX-XXXX): de ese texto
 * se toma solo el código. Los QR que guardaban el código solo siguen funcionando.
 */
export function normalizarCodigoEntrada(texto) {
  const mayusculas = String(texto ?? '').toUpperCase();
  const enEnlace = mayusculas.match(/(?<![0-9A-Z])GS-([0-9A-Z]{4})-([0-9A-Z]{4})(?![0-9A-Z])/);
  if (enEnlace) return `GS-${enEnlace[1]}-${enEnlace[2]}`;
  const limpio = mayusculas.replace(/[^0-9A-Z]/g, '');
  const sinPrefijo = limpio.startsWith('GS') ? limpio.slice(2) : limpio;
  if (sinPrefijo.length !== 8) return null;
  return `GS-${sinPrefijo.slice(0, 4)}-${sinPrefijo.slice(4)}`;
}

export function generarIdTransaccion() {
  return `TX-${Date.now().toString(36).toUpperCase()}-${aleatorio(6)}`;
}

export function generarToken() {
  return crypto.randomBytes(32).toString('hex');
}
