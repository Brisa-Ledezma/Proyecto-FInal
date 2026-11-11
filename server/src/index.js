import { crearApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { iniciarTareasProgramadas } from './tareas/programadas.js';

async function iniciar() {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('No se pudo conectar a MySQL. Revisá que el servicio esté iniciado y los datos de server/.env.');
    console.error(`Detalle: ${error.code ?? error.message}`);
    process.exit(1);
  }

  const app = crearApp();
  app.listen(config.puerto, () => {
    console.log(`Golden Screen API escuchando en http://localhost:${config.puerto}`);
  });
  iniciarTareasProgramadas();
}

iniciar();
