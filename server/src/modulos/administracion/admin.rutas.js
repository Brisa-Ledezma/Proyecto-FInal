import { Router } from 'express';
import { requerirRol, ROLES } from '../../middlewares/sesion.js';
import { rutasPeliculas } from './peliculas.rutas.js';

/** Rutas de administración: todas exigen el rol de administrador (RNF-03). */
export const rutasAdmin = Router();
rutasAdmin.use(requerirRol(ROLES.ADMIN));
rutasAdmin.use('/peliculas', rutasPeliculas);
