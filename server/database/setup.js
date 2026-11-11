// Crea la base de datos desde cero, aplica el esquema, los triggers y carga datos de ejemplo.
// Uso: npm run db:setup  (¡borra la base golden_screen si ya existe!)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config } from '../src/config.js';
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

async function main() {
  const { database, ...acceso } = config.db;
  const conexion = await mysql.createConnection({ ...acceso, multipleStatements: true, dateStrings: true });

  console.log(`→ Creando la base "${database}"…`);
  await conexion.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await conexion.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await conexion.query(`USE \`${database}\``);

  console.log('→ Aplicando el esquema…');
  const esquema = await fs.readFile(path.join(carpeta, 'schema.sql'), 'utf8');
  await conexion.query(esquema);
  for (const trigger of TRIGGERS) await conexion.query(trigger);

  console.log('→ Cargando datos de ejemplo…');
  const resumen = await sembrar(conexion);
  await conexion.end();

  console.log('\n✓ Base de datos lista.\n');
  console.table(resumen.totales);
  console.log('Cuentas para probar el sistema:');
  console.table(resumen.cuentas);
}

main().catch((error) => {
  console.error('\n✗ No se pudo preparar la base de datos.');
  console.error(error.code === 'ER_ACCESS_DENIED_ERROR'
    ? '  Revisá DB_USER y DB_PASSWORD en server/.env'
    : error);
  process.exit(1);
});
