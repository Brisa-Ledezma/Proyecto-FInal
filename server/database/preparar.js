// Creación y actualización de la base de datos de Golden Screen.
// - prepararBase({ reiniciar: true }): la borra y la crea desde cero (npm run db:setup).
// - prepararBase(): la crea y la siembra solo si está vacía; si ya tiene datos, solo
//   aplica los cambios de esquema pendientes. Es lo que corre al iniciar la API, así
//   un servidor nuevo (Docker o la nube) queda listo sin pasos manuales.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { opcionesConexion, SQL_ZONA_HORARIA } from '../src/db.js';
import { sembrar } from './seed.js';

const carpeta = path.dirname(fileURLToPath(import.meta.url));

// Triggers de auditoría (RNF-16): ingresos y validaciones no se modifican ni se eliminan.
const TRIGGERS = [
  `CREATE TRIGGER tr_ingreso_sin_modificar BEFORE UPDATE ON ingreso FOR EACH ROW
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los registros de ingreso no pueden modificarse.'`,
  `CREATE TRIGGER tr_ingreso_sin_eliminar BEFORE DELETE ON ingreso FOR EACH ROW
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los registros de ingreso no pueden eliminarse.'`,
  `CREATE TRIGGER tr_pago_sin_eliminar BEFORE DELETE ON pago FOR EACH ROW
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los pagos no pueden eliminarse.'`,
  `CREATE TRIGGER tr_entrada_validada_sin_modificar BEFORE UPDATE ON entrada FOR EACH ROW
   BEGIN
     IF OLD.estado = 'UTILIZADA' THEN
       SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una entrada utilizada no puede modificarse.';
     END IF;
   END`,
  `CREATE TRIGGER tr_entrada_validada_sin_eliminar BEFORE DELETE ON entrada FOR EACH ROW
   BEGIN
     IF OLD.estado = 'UTILIZADA' THEN
       SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una entrada utilizada no puede eliminarse.';
     END IF;
   END`,
];

// Tablas que se aseguran en cada arranque: cambios posteriores a la v1.0.0 y la tabla
// de sesiones. express-mysql-session intenta crearla al cargar el módulo, antes de que
// exista la base en un primer arranque, así que se crea acá.
const MIGRACIONES = [
  `CREATE TABLE IF NOT EXISTS sessions (
     session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
     expires    INT UNSIGNED NOT NULL,
     data       MEDIUMTEXT COLLATE utf8mb4_bin
   ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS archivo (
     nombre     VARCHAR(80)  NOT NULL PRIMARY KEY,
     tipo_mime  VARCHAR(40)  NOT NULL,
     datos      MEDIUMBLOB   NOT NULL,
     creado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB`,
];

async function crearTriggers(conexion) {
  for (const trigger of TRIGGERS) {
    try {
      await conexion.query(trigger);
    } catch (error) {
      // Con el registro binario activo, algunos proveedores exigen permisos de SUPER
      // para crear triggers. La API funciona igual: no modifica ni borra esos registros.
      if (error.code !== 'ER_BINLOG_CREATE_ROUTINE_NEED_SUPER') throw error;
      console.warn('⚠ El servidor de MySQL no permite crear triggers con este usuario (falta log_bin_trust_function_creators).');
      console.warn('  Los registros de auditoría (RNF-16) quedan protegidos solo por la API.');
      return;
    }
  }
}

/**
 * Prepara la base de datos y devuelve qué se hizo.
 * @returns {Promise<{ creada: boolean, resumen?: object }>}
 */
export async function prepararBase({ reiniciar = false } = {}) {
  const { database, ...acceso } = opcionesConexion;
  const conexion = await mysql.createConnection({ ...acceso, multipleStatements: true });
  try {
    await conexion.query(SQL_ZONA_HORARIA);
    if (reiniciar) await conexion.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await conexion.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conexion.query(`USE \`${database}\``);

    const [[{ tablas }]] = await conexion.query(
      "SELECT COUNT(*) AS tablas FROM information_schema.tables WHERE table_schema = ? AND table_name = 'usuario'",
      [database],
    );

    if (tablas > 0) {
      for (const migracion of MIGRACIONES) await conexion.query(migracion);
      return { creada: false };
    }

    console.log(`→ Creando las tablas de "${database}"…`);
    const esquema = await fs.readFile(path.join(carpeta, 'schema.sql'), 'utf8');
    await conexion.query(esquema);
    for (const migracion of MIGRACIONES) await conexion.query(migracion);
    await crearTriggers(conexion);

    console.log('→ Cargando datos de ejemplo…');
    const resumen = await sembrar(conexion);
    return { creada: true, resumen };
  } finally {
    await conexion.end();
  }
}
