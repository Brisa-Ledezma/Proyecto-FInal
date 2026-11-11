/** Letra de la fila según su posición: 0 → A, 1 → B… (RN-11). */
export const letraDeFila = (indice) => String.fromCharCode(65 + indice);

/**
 * Genera las filas y butacas de una sala (CU-10, paso 4).
 * `inhabilitadas` es una lista de identificadores como "A1" o "C12".
 */
export async function generarPlano(conexion, idSala, cantidadFilas, butacasPorFila, inhabilitadas = []) {
  const deshabilitar = new Set(inhabilitadas.map((id) => id.toUpperCase()));
  for (let f = 0; f < cantidadFilas; f += 1) {
    const letra = letraDeFila(f);
    const [resultado] = await conexion.query(
      'INSERT INTO fila (id_sala, letra, orden) VALUES (?, ?, ?)',
      [idSala, letra, f + 1],
    );
    const valores = [];
    for (let n = 1; n <= butacasPorFila; n += 1) {
      valores.push([resultado.insertId, n, deshabilitar.has(`${letra}${n}`) ? 0 : 1]);
    }
    await conexion.query('INSERT INTO butaca (id_fila, numero, habilitada) VALUES ?', [valores]);
  }
}
