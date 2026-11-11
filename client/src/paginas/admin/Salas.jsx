import { useMemo, useState } from 'react';
import { Armchair, PencilSimple, Plus } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useNotificar } from '../../contexto/NotificacionesContexto.jsx';
import MapaButacas from '../../componentes/compra/MapaButacas.jsx';
import Campo from '../../componentes/ui/Campo.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Admin.css';
import './Salas.css';

const letra = (i) => String.fromCharCode(65 + i);

function validar(v, limites) {
  const e = {};
  if (!v.nombre.trim()) e.nombre = 'Completá el nombre de la sala.';
  const f = Number(v.filas);
  const b = Number(v.butacasPorFila);
  if (!Number.isInteger(f) || f < 1 || f > limites.maxFilas) e.filas = `La cantidad de filas tiene que ser un número entre 1 y ${limites.maxFilas}.`; // CU-10 A1
  if (!Number.isInteger(b) || b < 1 || b > limites.maxButacasPorFila) e.butacasPorFila = `Las butacas por fila tienen que ser un número entre 1 y ${limites.maxButacasPorFila}.`;
  return e;
}

/** Editor de la sala: datos, plano generado e inhabilitación de butacas (CU-10, pasos 3 a 5). */
function EditorSala({ sala, limites, alGuardar, alCancelar }) {
  const [valores, setValores] = useState({
    nombre: sala?.nombre ?? '',
    filas: String(sala?.filas ?? 8),
    butacasPorFila: String(sala?.butacasPorFila ?? 12),
  });
  const [inhabilitadas, setInhabilitadas] = useState(() => new Set(sala?.inhabilitadas ?? []));
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const locales = validar(valores, limites);
  const errores = intentado ? { ...erroresServidor, ...locales } : erroresServidor;
  const filasNum = Math.min(Math.max(Number(valores.filas) || 0, 0), limites.maxFilas);
  const porFilaNum = Math.min(Math.max(Number(valores.butacasPorFila) || 0, 0), limites.maxButacasPorFila);

  // Plano generado: filas A, B, C… y butacas numeradas desde 1 (CU-10, paso 4)
  const plano = useMemo(() => Array.from({ length: filasNum }, (_, f) => ({
    letra: letra(f),
    butacas: Array.from({ length: porFilaNum }, (_, n) => ({ id: `${letra(f)}${n + 1}`, numero: n + 1 })),
  })), [filasNum, porFilaNum]);

  const vigentes = [...inhabilitadas].filter((id) => plano.some((f) => f.letra === id[0] && Number(id.slice(1)) <= porFilaNum));
  const capacidad = filasNum * porFilaNum - vigentes.length; // RN-11
  const cambioEstructura = sala && (Number(valores.filas) !== sala.filas || Number(valores.butacasPorFila) !== sala.butacasPorFila);

  const cambiar = (campo) => (e) => { setValores((v) => ({ ...v, [campo]: e.target.value })); setErroresServidor(({ [campo]: _, ...r }) => r); };
  const alternar = (b) => setInhabilitadas((s) => { const n = new Set(s); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); return n; });

  const guardar = async (e) => {
    e.preventDefault();
    setIntentado(true);
    setError(null);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    const cuerpo = { nombre: valores.nombre, filas: Number(valores.filas), butacasPorFila: Number(valores.butacasPorFila), inhabilitadas: vigentes };
    try {
      const r = sala ? await api.put(`/admin/salas/${sala.id}`, cuerpo) : await api.post('/admin/salas', cuerpo);
      alGuardar(r, Boolean(sala));
    } catch (err) {
      setErroresServidor(err.campos ?? {});
      setError(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="editor-sala tarjeta" onSubmit={guardar} noValidate aria-labelledby="titulo-editor">
      <div className="editor-sala__cabecera">
        <h2 id="titulo-editor" className="subtitulo">{sala ? `Editar ${sala.nombre}` : 'Nueva sala'}</h2>
        <div className="editor-sala__capacidad" aria-live="polite">
          <Armchair weight="duotone" aria-hidden="true" />
          <span><strong className="cifra">{capacidad > 0 ? capacidad : 0}</strong> butacas habilitadas</span>
        </div>
      </div>

      {error && !Object.keys(error.campos ?? {}).length && <Aviso tipo="error">{error.message}</Aviso>}
      {sala?.funcionesConVentas > 0 && (
        <Aviso tipo="info">
          La sala tiene {sala.funcionesConVentas} {sala.funcionesConVentas === 1 ? 'función futura' : 'funciones futuras'} con entradas vendidas: no se pueden cambiar las filas ni las butacas por fila, pero sí inhabilitar butacas libres.
        </Aviso>
      )}

      <div className="formulario__fila">
        <Campo etiqueta="Nombre" value={valores.nombre} onChange={cambiar('nombre')} error={errores.nombre} maxLength={40} placeholder="Ej.: Sala 5" />
        <Campo etiqueta="Cantidad de filas" type="number" min="1" max={limites.maxFilas} inputMode="numeric" value={valores.filas} onChange={cambiar('filas')} error={errores.filas} ayuda={`De 1 a ${limites.maxFilas} (filas A a ${letra(limites.maxFilas - 1)}).`} disabled={sala?.funcionesConVentas > 0} />
        <Campo etiqueta="Butacas por fila" type="number" min="1" max={limites.maxButacasPorFila} inputMode="numeric" value={valores.butacasPorFila} onChange={cambiar('butacasPorFila')} error={errores.butacasPorFila} ayuda={`De 1 a ${limites.maxButacasPorFila}.`} disabled={sala?.funcionesConVentas > 0} />
      </div>
      {cambioEstructura && <Aviso tipo="advertencia">Cambiaste la estructura de la sala. Al guardar se agregan o se quitan filas y butacas.</Aviso>}

      {plano.length > 0 && porFilaNum > 0 ? (
        <div className="editor-sala__plano">
          <p className="texto-2">Tocá una butaca para inhabilitarla (por ejemplo, si está rota) o para volver a habilitarla.</p>
          <MapaButacas
            filas={plano}
            editable
            estadoDe={(b) => (inhabilitadas.has(b.id) ? 'inhabilitada' : 'libre')}
            alTocar={alternar}
            estadosLeyenda={['libre', 'inhabilitada']}
          />
        </div>
      ) : <Vacio titulo="Completá las filas y las butacas por fila para ver el plano" />}

      <div className="formulario__acciones">
        <Boton variante="secundario" onClick={alCancelar}>Cancelar</Boton>
        <Boton variante="ticket" type="submit" cargando={guardando} disabled={intentado && Object.keys(locales).length > 0}>{sala ? 'Guardar cambios' : 'Guardar sala'}</Boton>
      </div>
    </form>
  );
}

/** P-11 Salas y butacas · RF-12 · CU-10. */
export default function Salas() {
  const notificar = useNotificar();
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/admin/salas'), []);
  const [editando, setEditando] = useState(null); // null | 'nueva' | sala con plano
  const [cargandoSala, setCargandoSala] = useState(null);

  const abrir = async (sala) => {
    setCargandoSala(sala.id);
    try { setEditando(await api.get(`/admin/salas/${sala.id}`)); } catch (err) { notificar(err.message, 'error'); } finally { setCargandoSala(null); }
  };

  if (cargando && !datos) return <Cargando texto="Cargando salas…" />;
  if (error) return <div className="contenedor pagina"><ErrorCarga error={error} alReintentar={recargar} /></div>;

  return (
    <div className="contenedor pagina admin">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Administración</span>
          <h1 className="titulo-pantalla">Salas y butacas</h1>
          <p className="texto-2">La capacidad de cada sala es la cantidad de butacas habilitadas.</p>
        </div>
        {!editando && <Boton variante="ticket" icono={<Plus weight="bold" />} onClick={() => setEditando('nueva')}>Nueva sala</Boton>}
      </div>

      {editando ? (
        <EditorSala
          key={editando === 'nueva' ? 'nueva' : editando.id}
          sala={editando === 'nueva' ? null : editando}
          limites={datos.limites}
          alCancelar={() => setEditando(null)}
          alGuardar={(s, edicion) => { setEditando(null); recargar({ silenciosa: true }); notificar(edicion ? `${s.nombre} actualizada. Capacidad: ${s.capacidad} butacas.` : `${s.nombre} creada con ${s.capacidad} butacas.`); }}
        />
      ) : (
        <ul className="salas">
          {datos.salas.map((s) => (
            <li key={s.id} className="sala-tarjeta">
              <div className="sala-tarjeta__pantalla" aria-hidden="true" />
              <h2 className="sala-tarjeta__nombre">{s.nombre}</h2>
              <p className="sala-tarjeta__capacidad"><strong className="cifra">{s.capacidad}</strong> butacas</p>
              <p className="texto-2 cifra">{s.filas} filas × {s.butacasPorFila} butacas</p>
              <p className="texto-2">{s.funcionesFuturas} {s.funcionesFuturas === 1 ? 'función programada' : 'funciones programadas'}</p>
              <Boton variante="secundario" tamano="chico" icono={<PencilSimple />} cargando={cargandoSala === s.id} onClick={() => abrir(s)}>Ver plano y editar</Boton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
