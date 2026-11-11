import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { carpetaUploads } from '../rutas.js';
import { solicitudInvalida } from '../utils/errores.js';

const EXTENSIONES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/** Subida del afiche de una película: JPG, PNG o WebP de hasta 3 MB. */
export const subirAfiche = multer({
  storage: multer.diskStorage({
    destination: carpetaUploads,
    filename: (req, archivo, cb) => cb(null, `afiche-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXTENSIONES[archivo.mimetype]}`),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, archivo, cb) => {
    if (EXTENSIONES[archivo.mimetype]) return cb(null, true);
    cb(solicitudInvalida('El afiche tiene que ser una imagen JPG, PNG o WebP.', { campos: { afiche: 'Elegí una imagen JPG, PNG o WebP.' } }));
  },
}).single('afiche');

/** Ruta pública de un archivo subido. */
export const urlUpload = (nombreArchivo) => (nombreArchivo ? `/uploads/${nombreArchivo}` : null);

/** Borra un afiche anterior que ya no se usa. */
export async function borrarUpload(url) {
  if (!url?.startsWith('/uploads/')) return;
  const nombre = path.basename(url);
  await fs.unlink(path.join(carpetaUploads, nombre)).catch(() => {});
}
