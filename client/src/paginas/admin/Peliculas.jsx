import { useMemo, useState } from 'react';
import { PencilSimple, Plus, Power, MagnifyingGlass } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useNotificar } from '../../contexto/NotificacionesContexto.jsx';
import { duracion } from '../../utiles/formato.js';
import Tabla from '../../componentes/admin/Tabla.jsx';
import SelectorAfiche from '../../componentes/admin/SelectorAfiche.jsx';
import Afiche from '../../componentes/cartelera/Afiche.jsx';
import { Clasificacion } from '../../componentes/cartelera/Funciones.jsx';
import Campo from '../../componentes/ui/Campo.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import Estado from '../../componentes/ui/Estado.jsx';
import Modal from '../../componentes/ui/Modal.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Admin.css';

const VACIA = { titulo: '', sinopsis: '', genero: '', clasificacion: '', duracionMin: '' };

function validar(v) {
  const e = {};
  if (!v.titulo.trim()) e.titulo = 'Completá el título.';
  if (!v.sinopsis.trim()) e.sinopsis = 'Completá la sinopsis.';
  if (!v.genero) e.genero = 'Elegí un género.';
  if (!v.clasificacion) e.clasificacion = 'Elegí la clasificación.';
  const d = Number(v.duracionMin);
  if (v.duracionMin === '' || v.duracionMin === null) e.duracionMin = 'Completá la duración en minutos.';
  else if (!Number.isInteger(d) || d <= 0) e.duracionMin = 'La duración tiene que ser un número entero mayor a 0.';
  return e;
}

/** Formulario de alta y modificación (CU-09, pasos 3 a 5). */
function FormularioPelicula({ pelicula, generos, clasificaciones, alGuardar, alCerrar }) {
  const [valores, setValores] = useState(pelicula ? {
    titulo: pelicula.titulo, sinopsis: pelicula.sinopsis, genero: pelicula.genero, clasificacion: pelicula.clasificacion, duracionMin: String(pelicula.duracionMin),
  } : VACIA);
  const [archivo, setArchivo] = useState(null);
  const [quitarAfiche, setQuitarAfiche] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const locales = validar(valores);
  const errores = intentado ? { ...erroresServidor, ...locales } : erroresServidor;
  const cambiar = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    setErroresServidor(({ [campo]: _, ...resto }) => resto);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setIntentado(true);
    setError(null);
    if (Object.keys(locales).length) return;
    const datos = new FormData();
    Object.entries(valores).forEach(([k, v]) => datos.append(k, v));
    if (archivo) datos.append('afiche', archivo);
    if (quitarAfiche && !archivo) datos.append('quitarAfiche', 'true');
    setGuardando(true);
    try {
      const guardada = pelicula ? await api.put(`/admin/peliculas/${pelicula.id}`, datos) : await api.post('/admin/peliculas', datos);
      alGuardar(guardada, Boolean(pelicula));
    } catch (err) {
      setErroresServidor(err.campos ?? {});
      setError(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      abierto
      ancho="grande"
      alCerrar={alCerrar}
      titulo={pelicula ? 'Editar película' : 'Nueva película'}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="ticket" type="submit" form="form-pelicula" cargando={guardando} disabled={intentado && Object.keys(locales).length > 0}>
            {pelicula ? 'Guardar cambios' : 'Guardar película'}
          </Boton>
        </>
      )}
    >
      <form id="form-pelicula" className="form-admin form-admin--con-afiche" onSubmit={guardar} noValidate>
        <SelectorAfiche
          actual={pelicula?.afiche}
          error={errores.afiche}
          alCambiar={(a, quitado) => { setArchivo(a); setQuitarAfiche(quitado); }}
        />
        <div className="formulario">
          {error && !Object.keys(error.campos ?? {}).length && <Aviso tipo="error">{error.message}</Aviso>}
          <Campo etiqueta="Título" value={valores.titulo} onChange={cambiar('titulo')} error={errores.titulo} maxLength={150} />
          <div className="formulario__fila">
            <Campo etiqueta="Género" como="select" value={valores.genero} onChange={cambiar('genero')} error={errores.genero}>
              <option value="">Elegí un género</option>
              {generos.map((g) => <option key={g} value={g}>{g}</option>)}
            </Campo>
            <Campo etiqueta="Clasificación" como="select" value={valores.clasificacion} onChange={cambiar('clasificacion')} error={errores.clasificacion}>
              <option value="">Elegí</option>
              {clasificaciones.map((c) => <option key={c} value={c}>{c}</option>)}
            </Campo>
            <Campo etiqueta="Duración (minutos)" type="number" min="1" inputMode="numeric" value={valores.duracionMin} onChange={cambiar('duracionMin')} error={errores.duracionMin} />
          </div>
          <Campo etiqueta="Sinopsis" como="textarea" rows={5} value={valores.sinopsis} onChange={cambiar('sinopsis')} error={errores.sinopsis} maxLength={1200} ayuda={`${valores.sinopsis.length}/1200 caracteres`} />
          {pelicula?.funcionesProximas > 0 && (
            <Aviso tipo="info">La película tiene {pelicula.funcionesProximas} funciones programadas. Un cambio de duración se aplica a las funciones que programes de ahora en más.</Aviso>
          )}
        </div>
      </form>
    </Modal>
  );
}

/** Confirmación de la desactivación con el impacto (CU-09, A2; RN-15). */
function DesactivarPelicula({ pelicula, alCerrar, alConfirmar }) {
  const { datos, cargando } = useCarga(() => api.get(`/admin/peliculas/${pelicula.id}/impacto`), [pelicula.id]);
  const [enviando, setEnviando] = useState(false);
  return (
    <Modal
      abierto
      ancho="chico"
      alCerrar={alCerrar}
      titulo="¿Desactivar la película?"
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar}>Volver</Boton>
          <Boton variante="peligro" cargando={enviando} disabled={cargando} onClick={async () => { setEnviando(true); await alConfirmar(); }}>Sí, desactivar</Boton>
        </>
      )}
    >
      <p><strong>{pelicula.titulo}</strong> deja de aparecer en la cartelera y no se puede programar.</p>
      {cargando ? <Cargando texto="Calculando el impacto…" /> : datos.funciones > 0 ? (
        <Aviso tipo="advertencia" titulo={`Se cancelan ${datos.funciones} funciones futuras`}>
          Se anulan {datos.entradas} entradas vendidas de {datos.compradores} {datos.compradores === 1 ? 'comprador' : 'compradores'}. Les avisamos por correo que el cambio o la devolución se realiza en forma presencial.
        </Aviso>
      ) : <Aviso tipo="info">No tiene funciones futuras programadas.</Aviso>}
    </Modal>
  );
}

/** P-10 Películas (listado y formulario) · RF-11 · CU-09. */
export default function Peliculas() {
  const notificar = useNotificar();
  const { datos, cargando, error, recargar, setDatos } = useCarga(() => api.get('/admin/peliculas'), []);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('activas');
  const [editando, setEditando] = useState(null); // null | 'nueva' | película
  const [desactivando, setDesactivando] = useState(null);

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (datos?.peliculas ?? [])
      .filter((p) => (filtro === 'todas' ? true : filtro === 'activas' ? p.activa : !p.activa))
      .filter((p) => !texto || p.titulo.toLowerCase().includes(texto) || p.genero.toLowerCase().includes(texto));
  }, [datos, busqueda, filtro]);

  if (cargando && !datos) return <Cargando texto="Cargando películas…" />;
  if (error) return <div className="contenedor pagina"><ErrorCarga error={error} alReintentar={recargar} /></div>;

  const alGuardar = (pelicula, edicion) => {
    setDatos({ ...datos, peliculas: edicion ? datos.peliculas.map((p) => (p.id === pelicula.id ? pelicula : p)) : [pelicula, ...datos.peliculas] });
    setEditando(null);
    notificar(edicion ? 'Película actualizada.' : 'Película guardada. Ya podés programar sus funciones.');
  };

  const desactivar = async () => {
    try {
      const r = await api.post(`/admin/peliculas/${desactivando.id}/desactivar`);
      notificar(r.funcionesCanceladas
        ? `Película desactivada. Se cancelaron ${r.funcionesCanceladas} funciones y se avisó a ${r.avisosEnviados} compradores.`
        : 'Película desactivada.');
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setDesactivando(null);
      recargar({ silenciosa: true });
    }
  };

  const activar = async (p) => {
    try { await api.post(`/admin/peliculas/${p.id}/activar`); notificar('Película activada.'); } catch (err) { notificar(err.message, 'error'); }
    recargar({ silenciosa: true });
  };

  const columnas = [
    { clave: 'afiche', titulo: 'Afiche', clase: 'sin-etiqueta col-afiche', render: (p) => <Afiche pelicula={p} tamano="chico" /> },
    { clave: 'titulo', titulo: 'Película', render: (p) => (<div className="celda-titulo"><strong>{p.titulo}</strong><span className="texto-2">{p.genero}</span></div>) },
    { clave: 'clasificacion', titulo: 'Clasif.', render: (p) => <Clasificacion valor={p.clasificacion} /> },
    { clave: 'duracion', titulo: 'Duración', render: (p) => <span className="cifra">{duracion(p.duracionMin)}</span> },
    { clave: 'funciones', titulo: 'Funciones próximas', alinear: 'center', render: (p) => <span className="cifra">{p.funcionesProximas}</span> },
    { clave: 'estado', titulo: 'Estado', render: (p) => <Estado estado={p.activa ? 'ACTIVA' : 'INACTIVA'} /> },
    {
      clave: 'acciones', titulo: 'Acciones', clase: 'ancho-completo sin-etiqueta', alinear: 'right',
      render: (p) => (
        <div className="tabla-gestion__acciones">
          <Boton variante="secundario" tamano="chico" icono={<PencilSimple />} onClick={() => setEditando(p)} aria-label={`Editar ${p.titulo}`}>Editar</Boton>
          {p.activa
            ? <Boton variante="peligro" tamano="chico" icono={<Power />} onClick={() => setDesactivando(p)} aria-label={`Desactivar ${p.titulo}`}>Desactivar</Boton>
            : <Boton variante="secundario" tamano="chico" icono={<Power />} onClick={() => activar(p)} aria-label={`Activar ${p.titulo}`}>Activar</Boton>}
        </div>
      ),
    },
  ];

  return (
    <div className="contenedor pagina admin">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Administración</span>
          <h1 className="titulo-pantalla">Películas</h1>
          <p className="texto-2">Catálogo de películas que se pueden programar.</p>
        </div>
        <Boton variante="ticket" icono={<Plus weight="bold" />} onClick={() => setEditando('nueva')}>Nueva película</Boton>
      </div>

      <div className="admin__filtros">
        <div className="admin__busqueda">
          <MagnifyingGlass aria-hidden="true" />
          <Campo etiqueta="Buscar" placeholder="Título o género" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Campo etiqueta="Mostrar" como="select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="activas">Activas</option>
          <option value="inactivas">Desactivadas</option>
          <option value="todas">Todas</option>
        </Campo>
      </div>

      {lista.length === 0
        ? <Vacio titulo="No hay películas para mostrar">{busqueda ? 'Probá con otra búsqueda.' : 'Cargá la primera película con «Nueva película».'}</Vacio>
        : <Tabla titulo="Películas" columnas={columnas} filas={lista} claseFila={(p) => (p.activa ? '' : 'inactiva')} />}

      {editando && (
        <FormularioPelicula
          pelicula={editando === 'nueva' ? null : editando}
          generos={datos.generos}
          clasificaciones={datos.clasificaciones}
          alGuardar={alGuardar}
          alCerrar={() => setEditando(null)}
        />
      )}
      {desactivando && <DesactivarPelicula pelicula={desactivando} alCerrar={() => setDesactivando(null)} alConfirmar={desactivar} />}
    </div>
  );
}
