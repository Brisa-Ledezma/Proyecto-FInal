// Validaciones del lado del cliente: las mismas reglas que aplica la API, con los mismos mensajes.

export const esEmail = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(t ?? '').trim());

export function edadCumplida(fechaNacimiento, hoy = new Date()) {
  const [a, m, d] = fechaNacimiento.split('-').map(Number);
  let edad = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad -= 1;
  return edad;
}

export function validarRegistro(v) {
  const e = {};
  if (!v.nombre.trim()) e.nombre = 'Completá tu nombre.';
  if (!v.apellido.trim()) e.apellido = 'Completá tu apellido.';
  if (!v.email.trim()) e.email = 'Completá tu correo electrónico.';
  else if (!esEmail(v.email)) e.email = 'Ingresá un correo válido, por ejemplo nombre@gmail.com.';
  if (!v.fechaNacimiento) e.fechaNacimiento = 'Ingresá tu fecha de nacimiento.';
  else if (edadCumplida(v.fechaNacimiento) < 16) e.fechaNacimiento = 'Para registrarte tenés que tener 16 años o más.';
  else if (edadCumplida(v.fechaNacimiento) > 110) e.fechaNacimiento = 'Revisá la fecha de nacimiento.';
  if (v.contrasena.length < 8) e.contrasena = 'La contraseña tiene que tener al menos 8 caracteres.';
  if (!v.aceptaPrivacidad) e.aceptaPrivacidad = 'Para crear la cuenta tenés que aceptar la política de privacidad.';
  return e;
}

export function validarLogin(v) {
  const e = {};
  if (!v.email.trim()) e.email = 'Completá tu correo electrónico.';
  if (!v.contrasena) e.contrasena = 'Completá tu contraseña.';
  return e;
}

export const hayErrores = (e) => Object.keys(e).length > 0;
