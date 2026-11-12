import { crearApp } from './app.js';
import { config } from './config.js';
import { prepararBase } from '../database/preparar.js';
import { iniciarTareasProgramadas } from './tareas/programadas.js';

async function iniciar() {
  try {
    // Una base vacía (primer arranque en Docker o en la nube) se crea y se siembra sola.
    const { creada } = await prepararBase();
    if (creada) console.log('✓ Base de datos creada con datos de ejemplo.');
  } catch (error) {
    console.error('No se pudo preparar la base de datos. Revisá que MySQL esté en ejecución y las variables DB_* (server/.env).');
    console.error(`Detalle: ${error.code ?? error.message}`);
    process.exit(1);
  }

  const app = crearApp();
  app.listen(config.puerto, '0.0.0.0', () => {
    console.log(`Golden Screen API escuchando en http://localhost:${config.puerto}`);
  });
  iniciarTareasProgramadas();
}

iniciar();
