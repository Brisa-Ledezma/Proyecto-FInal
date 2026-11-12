import crypto from 'node:crypto';
import multer from 'multer';
import { consultar, consultarUno } from '../db.js';
import { solicitudInvalida } from '../utils/errores.js';

const EXTENSIONES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const PREFIJO = '/uploads/';

/**
 * Subida del afiche de una película: JPG, PNG o WebP de hasta 3 MB.
 * El archivo queda en memoria y se guarda en la tabla `archivo` con guardarUpload(),
 * así sobrevive a los reinicios del servidor (el disco de la nube es efímero).
 */
export const subirAfiche = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, archivo, cb) => {
    if (EXTENSIONES[archivo.mimetype]) return cb(null, true);
    cb(solicitudInvalida('El afiche tiene que ser una imagen JPG, PNG o WebP.', { campos: { afiche: 'Elegí una imagen JPG, PNG o WebP.' } }));
  },
}).single('afiche');

/** Guarda el archivo subido y devuelve su ruta pública, o null si no hay archivo. */
export async function guardarUpload(archivo) {
  if (!archivo) return null;
  const nombre = `afiche-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXTENSIONES[archivo.mimetype]}`;
  await consultar('INSERT INTO archivo (nombre, tipo_mime, datos) VALUES (?, ?, ?)', [nombre, archivo.mimetype, archivo.buffer]);
  return `${PREFIJO}${nombre}`;
}

/** Borra un afiche anterior que ya no se usa. */
export async function borrarUpload(url) {
  if (!url?.startsWith(PREFIJO)) return;
  await consultar('DELETE FROM archivo WHERE nombre = ?', [url.slice(PREFIJO.length)]).catch(() => {});
}

/** GET /uploads/:nombre — entrega un archivo guardado en la base. */
export async function servirUpload(req, res, next) {
  try {
    const archivo = await consultarUno('SELECT tipo_mime, datos FROM archivo WHERE nombre = ?', [req.params.nombre]);
    if (!archivo) return res.status(404).end();
    // Cada nombre es único: si el afiche cambia, cambia la ruta. Se puede cachear sin vencimiento.
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(archivo.tipo_mime).send(archivo.datos);
  } catch (error) {
    next(error);
  }
}
