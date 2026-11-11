import { Router } from 'express';
import { requerirRol, ROLES } from '../../middlewares/sesion.js';
import { rutasPeliculas } from './peliculas.rutas.js';
import { rutasSalas } from './salas.rutas.js';
import { rutasFunciones } from './funciones.rutas.js';
import { rutasReportes } from '../reportes/reportes.rutas.js';
import { rutasPersonal } from './personal.rutas.js';

/** Rutas de administración: todas exigen el rol de administrador (RNF-03). */
export const rutasAdmin = Router();
rutasAdmin.use(requerirRol(ROLES.ADMIN));
rutasAdmin.use('/peliculas', rutasPeliculas);
rutasAdmin.use('/salas', rutasSalas);
rutasAdmin.use('/funciones', rutasFunciones);
rutasAdmin.use('/reportes', rutasReportes);
rutasAdmin.use('/personal', rutasPersonal);
