import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Carpetas del servidor, en un módulo aparte para evitar dependencias circulares.
const raiz = path.dirname(fileURLToPath(import.meta.url));
export const carpetaUploads = path.resolve(raiz, '../uploads');
export const carpetaCliente = path.resolve(raiz, '../../client/dist');
