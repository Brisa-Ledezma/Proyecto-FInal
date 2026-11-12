import mysql from 'mysql2/promise';
import { config } from './config.js';

const { timezone, ...acceso } = config.db;

/** Datos de conexión comunes a la API y a los scripts de la base. */
export const opcionesConexion = {
  ...acceso,
  dateStrings: true, // Las fechas viajan como 'AAAA-MM-DD HH:MM:SS' en hora local del cine
  decimalNumbers: true,
};

/** Fija la zona horaria de la sesión de MySQL en la hora del cine. */
export const SQL_ZONA_HORARIA = `SET time_zone = '${timezone.replace(/[^0-9:+-]/g, '')}'`;

export const pool = mysql.createPool({
  ...opcionesConexion,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
});

// Cada conexión nueva del pool arranca con la zona horaria del cine.
pool.pool.on('connection', (conexion) => {
  conexion.query(SQL_ZONA_HORARIA);
});

/** Ejecuta una consulta y devuelve las filas. */
export async function consultar(sql, parametros = []) {
  const [filas] = await pool.query(sql, parametros);
  return filas;
}

/** Devuelve la primera fila de la consulta o null. */
export async function consultarUno(sql, parametros = []) {
  const filas = await consultar(sql, parametros);
  return filas[0] ?? null;
}

/**
 * Ejecuta una función dentro de una transacción.
 * Si la función lanza un error, se deshacen todos los cambios.
 */
export async function enTransaccion(trabajo) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
