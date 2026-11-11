import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, FilmSlate } from '@phosphor-icons/react';
import { api, query } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { duracion, fechaLarga, fechaRelativa } from '../../utiles/formato.js';
import CordonPasos from '../../componentes/compra/CordonPasos.jsx';
import Marquesina from '../../componentes/marca/Marquesina.jsx';
import Afiche from '../../componentes/cartelera/Afiche.jsx';
import { Clasificacion, ListaFunciones } from '../../componentes/cartelera/Funciones.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './DetallePelicula.css';

/** P-03 Detalle de película y funciones · RF-03, CU-03 (pasos 3 a 5). */
export default function DetallePelicula() {
  const { id } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const fecha = parametros.get('fecha');
  const { datos: p, cargando, error, recargar } = useCarga(() => api.get(`/peliculas/${id}${query({ fecha })}`), [id, fecha]);

  if (cargando && !p) return <Cargando texto="Cargando la película…" />;
  if (error) {
    return (
      <div className="contenedor pagina">
        {error.estado === 404
          ? <Vacio icono={FilmSlate} titulo="Esta película no está en cartelera" accion={<Boton variante="secundario" a="/">Ver la cartelera</Boton>} />
          : <ErrorCarga error={error} alReintentar={recargar} />}
      </div>
    );
  }

  return (
    <div className="detalle">
      <div className="detalle__fondo" aria-hidden="true" style={p.afiche ? { backgroundImage: `url(${p.afiche})` } : undefined} />
      <div className="contenedor pagina detalle__contenido">
        <CordonPasos actual={2} />
        <Boton variante="texto" a={`/${p.fecha ? `?fecha=${p.fecha}` : ''}`} icono={<ArrowLeft />} className="detalle__volver">Volver a la cartelera</Boton>

        <section className="detalle__ficha">
          <div className="detalle__afiche"><Afiche pelicula={p} /></div>
          <div className="detalle__info">
            <span className="rotulo">{p.genero}</span>
            <h1 className="titulo-pantalla detalle__titulo">{p.titulo}</h1>
            <p className="detalle__meta">
              <Clasificacion valor={p.clasificacion} />
              <span className="detalle__duracion"><Clock aria-hidden="true" /> {duracion(p.duracionMin)}</span>
            </p>
            <p className="detalle__sinopsis">{p.sinopsis}</p>
          </div>
        </section>

        <section className="detalle__funciones" aria-labelledby="titulo-funciones">
          <div className="encabezado-pagina">
            <div>
              <span className="rotulo">Paso 2 · Elegí la función</span>
              <h2 id="titulo-funciones" className="subtitulo">Funciones de {fechaRelativa(p.fecha).toLowerCase() === 'hoy' ? 'hoy' : fechaLarga(p.fecha)}</h2>
            </div>
          </div>
          {p.fechas.length > 0 && (
            <Marquesina fechas={p.fechas.slice(0, 7)} seleccionada={p.fecha} alElegir={(f) => setParametros({ fecha: f }, { replace: true })} />
          )}
          {p.funciones.length > 0
            ? <ListaFunciones funciones={p.funciones} titulo={p.titulo} />
            : <Vacio titulo="No hay funciones disponibles para esta fecha">Elegí otra fecha de la marquesina.</Vacio>}
          <p className="texto-2 detalle__nota">Al elegir un horario vas a ver el mapa de la sala para elegir hasta 6 butacas.</p>
        </section>
      </div>
    </div>
  );
}
