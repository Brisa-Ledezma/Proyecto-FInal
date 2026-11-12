// Crea la base de datos desde cero, aplica el esquema, los triggers y carga datos de ejemplo.
// Uso: npm run db:setup  (¡borra la base golden_screen si ya existe!)
import { prepararBase } from './preparar.js';

async function main() {
  console.log('→ Reiniciando la base de datos…');
  const { resumen } = await prepararBase({ reiniciar: true });

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
