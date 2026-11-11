import multer from 'multer';
import { ErrorHttp } from '../utils/errores.js';

export function rutaNoEncontrada(req, res) {
  res.status(404).json({ mensaje: 'La ruta solicitada no existe.' });
}

// eslint-disable-next-line no-unused-vars
export function manejadorErrores(error, req, res, next) {
  if (error instanceof ErrorHttp) {
    return res.status(error.estado).json({
      mensaje: error.message,
      codigo: error.codigo,
      campos: error.campos,
      datos: error.datos,
    });
  }

  if (error instanceof multer.MulterError) {
    const mensaje = error.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen supera los 3 MB. Elegí una más liviana.'
      : 'No se pudo subir la imagen.';
    return res.status(400).json({ mensaje, campos: { afiche: mensaje } });
  }

  // Errores lanzados por los triggers de auditoría (RNF-16)
  if (error?.sqlState === '45000') {
    return res.status(409).json({ mensaje: error.sqlMessage });
  }

  console.error('[error]', error);
  res.status(500).json({ mensaje: 'Ocurrió un problema en el servidor. Volvé a intentar en unos minutos.' });
}
