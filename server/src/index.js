import { crearApp } from './app.js';
import { config } from './config.js';

const app = crearApp();

app.listen(config.puerto, () => {
  console.log(`Golden Screen API escuchando en http://localhost:${config.puerto}`);
});
