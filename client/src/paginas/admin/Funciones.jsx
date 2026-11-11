import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PencilSimple, Plus, Prohibit } from '@phosphor-icons/react';
import { api, query } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useNotificar } from '../../contexto/NotificacionesContexto.jsx';
import { duracion, fechaISO, fechaLarga, fechaRelativa, hora, moneda, sumarDias } from '../../utiles/formato.js';
import Marquesina from '../../componentes/marca/Marquesina.jsx';
import TiraFunciones from '../../componentes/admin/TiraFunciones.jsx';
import Tabla from '../../componentes/admin/Tabla.jsx';
import Campo from '../../componentes/ui/Campo.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import Estado from '../../componentes/ui/Estado.jsx';
import Modal from '../../componentes/ui/Modal.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Admin.css';

function validar(v) {
  const e = {};
  if (!v.idPelicula) e.idPelicula = 'Elegí una película.';
  if (!v.idSala) e.idSala = 'Elegí una sala.';
  if (!v.fecha) e.fecha = 'Elegí la fecha.';
  if (!v.hora) e.hora = 'Elegí la hora de inicio.';
  if (v.precio === '' || Number(v.precio) <= 0) e.precio = 'El precio tiene que ser mayor a 0.';
  return e;
}

/** Formulario para programar o modificar una función (CU-11, CU-12) con verificación en vivo. */
function FormularioFuncion({ funcion, fechaInicial, salas, peliculas, alGuardar, alCerrar }) {
  const [valores, setValores] = useState(funcion ? {
    idPelicula: String(funcion.pelicula.id), idSala: String(funcion.sala.id), fecha: funcion.inicio.slice(0, 10), hora: hora(funcion.inicio), precio: String(funcion.precio),
  } : { idPelicula: '', idSala: '', fecha: fechaInicial, hora: '', precio: '' });
  const [verificacion, setVerificacion] = useState(null);
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const bloqueada = funcion?.conVentas;

  const locales = validar(valores);
  const errores = intentado ? { ...erroresServidor, ...locales } : erroresServidor;
  const cambiar = (campo) => (e) => { setValores((v) => ({ ...v, [campo]: e.target.value })); setErroresServidor({}); setError(null); };

  // Fin calculado y superposición mientras se completa (RN-12, RN-13).
  useEffect(() => {
    if (!valores.idPelicula || !valores.idSala || !valores.fecha || !valores.hora) { setVerificacion(null); return undefined; }
    const t = setTimeout(() => {
      api.post('/admin/funciones/verificar', { ...valores, precio: valores.precio || 1, excluir: funcion?.id })
        .then(setVerificacion).catch(() => setVerificacion(null));
    }, 350);
    return () => clearTimeout(t);
  }, [valores, funcion]);

  const guardar = async (e) => {
    e.preventDefault();
    setIntentado(true);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      const r = funcion ? await api.put(`/admin/funciones/${funcion.id}`, valores) : await api.post('/admin/funciones', valores);
      alGuardar(r, Boolean(funcion));
    } catch (err) {
      setErroresServidor(err.campos ?? {});
      setError(err);
    } finally {
      setGuardando(false);
    }
  };

  const pelicula = peliculas.find((p) => String(p.id) === valores.idPelicula);
  const peliculasDisponibles = funcion && !peliculas.some((p) => p.id === funcion.pelicula.id)
    ? [{ id: funcion.pelicula.id, titulo: `${funcion.pelicula.titulo} (desactivada)`, duracionMin: funcion.pelicula.duracionMin }, ...peliculas]
    : peliculas;

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={funcion ? 'Modificar función' : 'Nueva función'}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="ticket" type="submit" form="form-funcion" cargando={guardando} disabled={(intentado && Object.keys(locales).length > 0) || Boolean(verificacion?.conflicto)}>
            {funcion ? 'Guardar cambios' : 'Programar función'}
          </Boton>
        </>
      )}
    >
      <form id="form-funcion" className="formulario" onSubmit={guardar} noValidate>
        {bloqueada && <Aviso tipo="info">La función tiene entradas vendidas: solo podés cambiar el precio. Para cambiar película, sala u horario, cancelala.</Aviso>}
        {error && <Aviso tipo="error" titulo={error.codigo === 'SUPERPOSICION' ? 'No se puede guardar la función' : undefined}>{error.message}</Aviso>}
        <Campo etiqueta="Película" como="select" value={valores.idPelicula} onChange={cambiar('idPelicula')} error={errores.idPelicula} disabled={bloqueada}>
          <option value="">Elegí una película</option>
          {peliculasDisponibles.map((p) => <option key={p.id} value={p.id}>{p.titulo} · {duracion(p.duracionMin)}</option>)}
        </Campo>
        <Campo etiqueta="Sala" como="select" value={valores.idSala} onChange={cambiar('idSala')} error={errores.idSala} disabled={bloqueada}>
          <option value="">Elegí una sala</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Campo>
        <div className="formulario__fila">
          <Campo etiqueta="Fecha" type="date" min={fechaISO()} value={valores.fecha} onChange={cambiar('fecha')} error={errores.fecha} disabled={bloqueada} />
          <Campo etiqueta="Hora de inicio" type="time" step="300" value={valores.hora} onChange={cambiar('hora')} error={errores.hora ?? verificacion?.errores?.hora} disabled={bloqueada} />
          <Campo etiqueta="Precio por entrada ($)" type="number" min="1" step="100" inputMode="numeric" value={valores.precio} onChange={cambiar('precio')} error={errores.precio} />
        </div>
        {verificacion?.fin && !verificacion.conflicto && (
          <Aviso tipo="ok" titulo={`Termina a las ${hora(verificacion.fin)}`}>
            {pelicula ? `${duracion(pelicula.duracionMin)} de película más 15 minutos de limpieza de sala.` : 'Incluye 15 minutos de limpieza de sala.'} La sala está libre en ese horario.
          </Aviso>
        )}
        {verificacion?.conflicto && <Aviso tipo="error" titulo="El horario se superpone">{verificacion.conflicto}</Aviso>}
      </form>
    </Modal>
  );
}

/** P-12 Funciones (listado y programación) · RF-13, RF-14 · CU-11, CU-12. */
export default function Funciones() {
  const notificar = useNotificar();
  const [parametros, setParametros] = useSearchParams();
  const hoy = fechaISO();
  const fecha = parametros.get('fecha') ?? hoy;
  const sala = parametros.get('sala') ?? '';
  const { datos, cargando, error, recargar } = useCarga(() => api.get(`/admin/funciones${query({ fecha })}`), [fecha]);
  const [editando, setEditando] = useState(null);
  const [cancelando, setCancelando] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const fechas = useMemo(() => Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i)), [hoy]);
  const cambiarParam = (clave, valor) => {
    const p = new URLSearchParams(parametros);
    if (valor) p.set(clave, valor); else p.delete(clave);
    setParametros(p, { replace: true });
  };

  if (cargando && !datos) return <Cargando texto="Cargando la programación…" />;
  if (error) return <div className="contenedor pagina"><ErrorCarga error={error} alReintentar={recargar} /></div>;

  const funciones = datos.funciones.filter((f) => !sala || String(f.sala.id) === sala);
  const salasVisibles = datos.salas.filter((s) => !sala || String(s.id) === sala);

  const cancelar = async () => {
    setEnviando(true);
    try {
      const r = await api.post(`/admin/funciones/${cancelando.id}/cancelar`);
      notificar(r.entradasAnuladas ? `Función cancelada. Se anularon ${r.entradasAnuladas} entradas y se avisó por correo a ${r.avisosEnviados} compradores.` : 'Función cancelada.');
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setEnviando(false);
      setCancelando(null);
      recargar({ silenciosa: true });
    }
  };

  const columnas = [
    { clave: 'hora', titulo: 'Horario', render: (f) => <span className="cifra">{hora(f.inicio)} a {hora(f.fin)}</span> },
    { clave: 'pelicula', titulo: 'Película', clase: 'ancho-completo', render: (f) => <div className="celda-titulo"><strong>{f.pelicula.titulo}</strong><span className="texto-2">{duracion(f.pelicula.duracionMin)} + 15 min de limpieza</span></div> },
    { clave: 'sala', titulo: 'Sala', render: (f) => f.sala.nombre },
    { clave: 'precio', titulo: 'Precio', render: (f) => <span className="cifra">{moneda(f.precio)}</span> },
    { clave: 'vendidas', titulo: 'Vendidas', render: (f) => <span className="cifra">{f.vendidas} / {f.capacidad}</span> },
    { clave: 'estado', titulo: 'Estado', render: (f) => <Estado estado={f.estado} /> },
    {
      clave: 'acciones', titulo: 'Acciones', alinear: 'right', clase: 'ancho-completo sin-etiqueta',
      render: (f) => f.estado === 'PROGRAMADA' && (
        <div className="tabla-gestion__acciones">
          <Boton variante="secundario" tamano="chico" icono={<PencilSimple />} onClick={() => setEditando(f)}>Modificar</Boton>
          <Boton variante="peligro" tamano="chico" icono={<Prohibit />} onClick={() => setCancelando(f)}>Cancelar</Boton>
        </div>
      ),
    },
  ];

  return (
    <div className="contenedor pagina admin">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Administración</span>
          <h1 className="titulo-pantalla">Funciones</h1>
          <p className="texto-2">El fin de cada función se calcula con la duración de la película más 15 minutos de limpieza.</p>
        </div>
        <Boton variante="ticket" icono={<Plus weight="bold" />} onClick={() => setEditando('nueva')}>Nueva función</Boton>
      </div>

      <Marquesina fechas={fechas.includes(fecha) ? fechas : [fecha, ...fechas]} seleccionada={fecha} alElegir={(f) => cambiarParam('fecha', f === hoy ? '' : f)} etiqueta="Fecha de la programación" />

      <div className="admin__filtros">
        <h2 className="subtitulo" style={{ flex: 1 }}>
          {['Hoy', 'Mañana'].includes(fechaRelativa(fecha)) ? `${fechaRelativa(fecha)} · ${fechaLarga(fecha)}` : fechaRelativa(fecha)}
        </h2>
        <Campo etiqueta="Sala" como="select" value={sala} onChange={(e) => cambiarParam('sala', e.target.value)}>
          <option value="">Todas las salas</option>
          {datos.salas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Campo>
      </div>

      {funciones.length === 0 ? (
        <Vacio titulo="No hay funciones programadas para esta fecha" accion={<Boton variante="secundario" icono={<Plus />} onClick={() => setEditando('nueva')}>Programar una función</Boton>} />
      ) : (
        <>
          <TiraFunciones fecha={fecha} salas={salasVisibles} funciones={funciones} alElegir={(f) => f.estado === 'PROGRAMADA' && setEditando(f)} />
          <Tabla titulo="Funciones del día" columnas={columnas} filas={funciones} claseFila={(f) => (f.estado === 'PROGRAMADA' ? '' : 'inactiva')} />
        </>
      )}

      {editando && (
        <FormularioFuncion
          funcion={editando === 'nueva' ? null : editando}
          fechaInicial={fecha < hoy ? hoy : fecha}
          salas={datos.salas}
          peliculas={datos.peliculas}
          alCerrar={() => setEditando(null)}
          alGuardar={(f, edicion) => {
            setEditando(null);
            notificar(edicion ? 'Función actualizada.' : `Función programada: ${f.pelicula.titulo}, ${fechaRelativa(f.inicio).toLowerCase()} a las ${hora(f.inicio)}. Ya está en la cartelera.`);
            if (f.inicio.slice(0, 10) !== fecha) cambiarParam('fecha', f.inicio.slice(0, 10)); else recargar({ silenciosa: true });
          }}
        />
      )}

      <Modal
        abierto={Boolean(cancelando)}
        alCerrar={() => setCancelando(null)}
        ancho="chico"
        titulo="¿Cancelar la función?"
        pie={(
          <>
            <Boton variante="secundario" onClick={() => setCancelando(null)}>Volver</Boton>
            <Boton variante="peligro" cargando={enviando} onClick={cancelar}>Sí, cancelar función</Boton>
          </>
        )}
      >
        {cancelando && (
          <>
            <p><strong>{cancelando.pelicula.titulo}</strong> · {cancelando.sala.nombre} · {fechaRelativa(cancelando.inicio)} a las {hora(cancelando.inicio)}.</p>
            {cancelando.vendidas > 0
              ? <Aviso tipo="advertencia" titulo={`Tiene ${cancelando.vendidas} entradas vendidas`}>Las reservas y entradas quedan anuladas y avisamos por correo a los compradores que el cambio o la devolución se realiza en forma presencial.</Aviso>
              : <Aviso tipo="info">No tiene entradas vendidas.</Aviso>}
          </>
        )}
      </Modal>
    </div>
  );
}
