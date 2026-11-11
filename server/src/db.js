import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // Las fechas viajan como 'AAAA-MM-DD HH:MM:SS' en hora local del cine
  decimalNumbers: true,
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
