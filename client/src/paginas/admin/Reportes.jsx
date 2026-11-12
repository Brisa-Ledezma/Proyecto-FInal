import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowCounterClockwise, ChartBar, UsersThree } from '@phosphor-icons/react';
import { api, query } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { aFecha, diaCorto, fechaCorta, fechaISO, fechaLarga, hora, moneda, numero, numeroDia, sumarDias } from '../../utiles/formato.js';
import GraficoBarras, { Medidor } from '../../componentes/admin/GraficoBarras.jsx';
import GraficoTorta, { agrupar } from '../../componentes/admin/GraficoTorta.jsx';
import Tabla from '../../componentes/admin/Tabla.jsx';
import { SelectorRango } from '../../componentes/ui/Calendario.jsx';
import Campo from '../../componentes/ui/Campo.jsx';
import Estado from '../../componentes/ui/Estado.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Admin.css';
import './Reportes.css';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const monedaCorta = (v) => (v >= 1000000 ? `$${numero(Math.round(v / 100000) / 10)} M` : v >= 1000 ? `$${numero(Math.round(v / 1000))} mil` : moneda(v));
const pct = (v) => `${String(v).replace('.', ',')} %`;

/** "del 5 al 11 de noviembre", "del 28 de octubre al 3 de noviembre" o "el 11 de noviembre" */
function periodoEnTexto(desde, hasta) {
  const a = aFecha(desde);
  const b = aFecha(hasta);
  if (desde === hasta) return `el ${b.getDate()} de ${MESES[b.getMonth()]}`;
  const anio = a.getFullYear() !== b.getFullYear();
  if (a.getMonth() === b.getMonth() && !anio) return `del ${a.getDate()} al ${b.getDate()} de ${MESES[b.getMonth()]}`;
  return `del ${a.getDate()} de ${MESES[a.getMonth()]}${anio ? ` de ${a.getFullYear()}` : ''} al ${b.getDate()} de ${MESES[b.getMonth()]}${anio ? ` de ${b.getFullYear()}` : ''}`;
}

function Cifra({ titulo, valor, detalle }) {
  return (
    <div className="reporte-cifra brilla">
      <span className="rotulo">{titulo}</span>
      <strong className="cifra">{valor}</strong>
      {detalle && <span className="texto-2">{detalle}</span>}
    </div>
  );
}

/** CU-13: reporte de ingresos. */
function ReporteIngresos({ datos, filtros }) {
  const [vistaDetalle, setVistaDetalle] = useState('dia');
  const porPelicula = useMemo(() => Object.values(datos.porFuncion.reduce((acc, f) => {
    const p = acc[f.pelicula] ?? (acc[f.pelicula] = { pelicula: f.pelicula, total: 0, entradas: 0 });
    p.total += f.total; p.entradas += f.entradas;
    return acc;
  }, {})), [datos]);
  const porSala = useMemo(() => Object.values(datos.porFuncion.reduce((acc, f) => {
    const s = acc[f.sala] ?? (acc[f.sala] = { sala: f.sala, total: 0 });
    s.total += f.total;
    return acc;
  }, {})).sort((a, b) => a.sala.localeCompare(b.sala, 'es', { numeric: true })), [datos]);

  if (!datos.pagos) return <Vacio titulo="No hay ingresos para los filtros elegidos">Probá con otro período, sala o película.</Vacio>;
  const mejorDia = datos.porDia.reduce((m, d) => (d.total > m.total ? d : m), datos.porDia[0]);

  return (
    <>
      <p className="reporte-frase">
        <span>{periodoEnTexto(filtros.desde, filtros.hasta).replace(/^./, (c) => c.toUpperCase())} recaudamos</span>
        <strong className="cifra texto-oro">{moneda(datos.total)}</strong>
        <span>con {numero(datos.entradas)} entradas vendidas en {numero(datos.pagos)} pagos.</span>
      </p>

      <div className="admin__resumen">
        <Cifra titulo="Total del período" valor={moneda(datos.total)} detalle="Suma de los pagos aprobados" />
        <Cifra titulo="Promedio por día" valor={moneda(Math.round(datos.total / datos.porDia.length))} detalle={`${datos.porDia.length} ${datos.porDia.length === 1 ? 'día' : 'días'}`} />
        <Cifra titulo="Mejor día" valor={moneda(mejorDia.total)} detalle={fechaLarga(mejorDia.dia)} />
        <Cifra titulo="Ticket promedio" valor={moneda(Math.round(datos.total / datos.pagos))} detalle="Por compra" />
      </div>

      <div className="reportes__graficos">
        <section className="tarjeta reporte-panel brilla">
          <h2 className="subtitulo">Recaudación por día</h2>
          <GraficoBarras
            titulo="Recaudación por día del período"
            datos={datos.porDia.map((d) => ({ clave: d.dia, etiqueta: `${diaCorto(d.dia)} ${numeroDia(d.dia)}`, etiquetaLarga: fechaLarga(d.dia), valor: d.total }))}
            formatoValor={moneda}
            formatoEje={monedaCorta}
            alto={280}
          />
        </section>
        <section className="tarjeta reporte-panel brilla">
          <h2 className="subtitulo">Por película</h2>
          <GraficoTorta
            titulo="Recaudación del período por película"
            datos={agrupar(porPelicula, { maximo: 5, clave: (p) => p.pelicula, etiqueta: (p) => p.pelicula, valor: (p) => p.total })}
            formatoValor={monedaCorta}
            centro={{ etiqueta: 'Total', valor: monedaCorta(datos.total) }}
            tamano={170}
          />
        </section>
      </div>

      {porSala.length > 1 && (
        <section className="tarjeta reporte-panel brilla">
          <h2 className="subtitulo">Por sala</h2>
          <ul className="reporte-salas">
            {porSala.map((s) => (
              <li key={s.sala}>
                <span className="reporte-salas__nombre">{s.sala}</span>
                <span className="reporte-salas__pista"><span style={{ width: `${(s.total / Math.max(...porSala.map((x) => x.total))) * 100}%` }} /></span>
                <strong className="cifra">{moneda(s.total)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="reporte-detalle">
        <div className="reporte-detalle__cabecera">
          <h2 className="subtitulo">Detalle</h2>
          <div className="reporte-pestanas" role="tablist" aria-label="Detalle del reporte">
            <button type="button" role="tab" aria-selected={vistaDetalle === 'dia'} onClick={() => setVistaDetalle('dia')}>Por día</button>
            <button type="button" role="tab" aria-selected={vistaDetalle === 'funcion'} onClick={() => setVistaDetalle('funcion')}>Por función</button>
          </div>
        </div>
        {vistaDetalle === 'dia' ? (
          <Tabla
            titulo="Ingresos por día"
            unidad="días"
            claveFila={(d) => d.dia}
            filas={datos.porDia}
            columnas={[
              { clave: 'dia', titulo: 'Día', clase: 'ancho-completo', movil: 'principal', render: (d) => fechaLarga(d.dia) },
              { clave: 'pagos', titulo: 'Pagos', alinear: 'right', render: (d) => <span className="cifra">{numero(d.pagos)}</span> },
              { clave: 'total', titulo: 'Recaudación', alinear: 'right', render: (d) => <strong className="cifra">{moneda(d.total)}</strong> },
            ]}
          />
        ) : (
          <Tabla
            titulo="Ingresos por función"
            unidad="funciones"
            filas={datos.porFuncion}
            columnas={[
              { clave: 'fecha', titulo: 'Función', render: (f) => <span className="cifra">{fechaCorta(f.inicio)} · {hora(f.inicio)}</span> },
              { clave: 'pelicula', titulo: 'Película', clase: 'ancho-completo', movil: 'principal', render: (f) => <strong>{f.pelicula}</strong> },
              { clave: 'sala', titulo: 'Sala', render: (f) => f.sala },
              { clave: 'entradas', titulo: 'Entradas', alinear: 'right', render: (f) => <span className="cifra">{numero(f.entradas)}</span> },
              { clave: 'total', titulo: 'Importe', alinear: 'right', render: (f) => <strong className="cifra">{moneda(f.total)}</strong> },
              { clave: 'estado', titulo: 'Estado', movil: 'esquina', render: (f) => <Estado estado={f.estado} /> },
            ]}
          />
        )}
        <p className="reporte-total">
          <span>Total del período</span>
          <strong className="cifra">{moneda(datos.total)}</strong>
        </p>
      </section>
    </>
  );
}

/** CU-14: reporte de asistencia y ocupación, ordenable por ocupación. */
function ReporteAsistencia({ datos, filtros }) {
  const [orden, setOrden] = useState({ por: 'inicio', sentido: 'asc' });
  const funciones = datos.funciones ?? [];
  const filas = useMemo(() => {
    const copia = [...funciones];
    copia.sort((a, b) => {
      const va = a[orden.por]; const vb = b[orden.por];
      const r = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return orden.sentido === 'asc' ? r : -r;
    });
    return copia;
  }, [funciones, orden]);
  const ordenar = (clave) => setOrden((o) => ({ por: clave, sentido: o.por === clave && o.sentido === 'asc' ? 'desc' : 'asc' }));

  if (!funciones.length) return <Vacio titulo="No hay funciones en el período elegido">Probá con otro período, sala o película.</Vacio>;
  const capacidad = funciones.reduce((a, f) => a + f.capacidad, 0);
  const asistencia = datos.totalVendidas ? Math.round((datos.totalValidados / datos.totalVendidas) * 1000) / 10 : 0;
  const baja = funciones.filter((f) => f.ocupacion < 25).length;

  return (
    <>
      <p className="reporte-frase">
        <span>{periodoEnTexto(filtros.desde, filtros.hasta).replace(/^./, (c) => c.toUpperCase())} las salas se ocuparon en promedio un</span>
        <strong className="cifra texto-oro">{pct(datos.promedioOcupacion)}</strong>
        <span>y entraron {numero(datos.totalValidados)} de las {numero(datos.totalVendidas)} personas con entrada.</span>
      </p>

      <div className="admin__resumen">
        <Cifra titulo="Ocupación promedio" valor={pct(datos.promedioOcupacion)} detalle={`${funciones.length} funciones`} />
        <Cifra titulo="Entradas vendidas" valor={numero(datos.totalVendidas)} />
        <Cifra titulo="Ingresos validados" valor={numero(datos.totalValidados)} detalle="Asistencia real en sala" />
        <Cifra titulo="Asistencia sobre vendidas" valor={pct(asistencia)} detalle={baja ? `${baja} ${baja === 1 ? 'función' : 'funciones'} con menos del 25 %` : undefined} />
      </div>

      <div className="reportes__graficos reportes__graficos--pareja">
        <section className="tarjeta reporte-panel brilla">
          <h2 className="subtitulo">Butacas del período</h2>
          <GraficoTorta
            titulo="Butacas del período"
            datos={[
              { clave: 'ingresaron', etiqueta: 'Ingresaron', valor: datos.totalValidados, color: 'var(--serie-2)' },
              { clave: 'ausentes', etiqueta: 'Vendidas, sin ingresar', valor: datos.totalVendidas - datos.totalValidados, color: 'var(--serie-1)' },
              { clave: 'libres', etiqueta: 'Libres', valor: Math.max(0, capacidad - datos.totalVendidas), color: 'var(--serie-otras)' },
            ]}
            formatoValor={numero}
            centro={{ etiqueta: 'Capacidad', valor: numero(capacidad) }}
            tamano={170}
          />
        </section>
        <section className="tarjeta reporte-panel brilla">
          <h2 className="subtitulo">Entradas vendidas por película</h2>
          <GraficoTorta
            titulo="Entradas vendidas por película"
            datos={agrupar(Object.values(funciones.reduce((acc, f) => {
              const p = acc[f.pelicula] ?? (acc[f.pelicula] = { pelicula: f.pelicula, vendidas: 0 });
              p.vendidas += f.vendidas;
              return acc;
            }, {})), { maximo: 5, clave: (p) => p.pelicula, etiqueta: (p) => p.pelicula, valor: (p) => p.vendidas })}
            formatoValor={numero}
            centro={{ etiqueta: 'Vendidas', valor: numero(datos.totalVendidas) }}
            tamano={170}
          />
        </section>
      </div>

      <section className="reporte-detalle">
        <div className="reporte-detalle__cabecera">
          <h2 className="subtitulo">Asistencia por función</h2>
          <p className="texto-2">Tocá los títulos para ordenar. Ordenar por ocupación ayuda a encontrar las funciones con baja demanda.</p>
        </div>
        <Tabla
          titulo="Asistencia por función"
          unidad="funciones"
          filas={filas}
          ordenarPor={orden.por}
          orden={orden.sentido}
          alOrdenar={ordenar}
          columnas={[
            { clave: 'inicio', titulo: 'Función', ordenable: true, render: (f) => <span className="cifra">{fechaCorta(f.inicio)} · {hora(f.inicio)}</span> },
            { clave: 'pelicula', titulo: 'Película', ordenable: true, clase: 'ancho-completo', movil: 'principal', render: (f) => <strong>{f.pelicula}</strong> },
            { clave: 'sala', titulo: 'Sala', ordenable: true, render: (f) => f.sala },
            { clave: 'vendidas', titulo: 'Vendidas', ordenable: true, alinear: 'right', render: (f) => <span className="cifra">{f.vendidas}</span> },
            { clave: 'validados', titulo: 'Ingresaron', ordenable: true, alinear: 'right', render: (f) => <span className="cifra">{f.validados}</span> },
            { clave: 'capacidad', titulo: 'Capacidad', movil: 'oculta', alinear: 'right', render: (f) => <span className="cifra">{f.capacidad}</span> },
            { clave: 'ocupacion', titulo: 'Ocupación', ordenable: true, clase: 'ancho-completo col-ocupacion', render: (f) => <Medidor valor={f.ocupacion} etiqueta={`Ocupación ${f.ocupacion} %`} /> },
          ]}
        />
      </section>
    </>
  );
}

/** P-13 Reportes · RF-15, RF-16 · CU-13, CU-14. */
export default function Reportes() {
  const { tipo: tipoRuta } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const hoy = fechaISO();
  const tipo = (tipoRuta ?? parametros.get('tipo')) === 'asistencia' ? 'asistencia' : 'ingresos';
  const porDefecto = { desde: sumarDias(hoy, -6), hasta: hoy };
  const filtros = {
    desde: parametros.get('desde') ?? porDefecto.desde,
    hasta: parametros.get('hasta') ?? porDefecto.hasta,
    sala: parametros.get('sala') ?? '',
    pelicula: parametros.get('pelicula') ?? '',
  };
  const { datos, cargando, error, recargar } = useCarga(
    // Cada respuesta lleva su tipo: así nunca se muestra un reporte con los datos del otro.
    () => api.get(`/admin/reportes/${tipo}${query(filtros)}`).then((r) => ({ ...r, tipo })),
    [tipo, filtros.desde, filtros.hasta, filtros.sala, filtros.pelicula],
  );
  const vigentes = datos?.tipo === tipo ? datos : null;
  const cambiar = (cambios) => {
    const p = new URLSearchParams(parametros);
    p.delete('tipo');
    Object.entries(cambios).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    setParametros(p, { replace: true });
  };
  const opciones = datos?.opciones;
  const filtrado = filtros.sala || filtros.pelicula || filtros.desde !== porDefecto.desde || filtros.hasta !== porDefecto.hasta;
  const busqueda = (() => { const p = new URLSearchParams(parametros); p.delete('tipo'); const t = p.toString(); return t ? `?${t}` : ''; })();

  return (
    <div className="contenedor pagina admin reportes">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Administración</span>
          <h1 className="titulo-pantalla">Reportes</h1>
          <p className="texto-2">Recaudación a partir de los pagos aprobados y asistencia a partir de las entradas validadas.</p>
        </div>
        <nav className="reporte-pestanas reporte-pestanas--grandes" aria-label="Tipo de reporte">
          <Link to={`/admin/reportes/ingresos${busqueda}`} replace aria-current={tipo === 'ingresos' ? 'page' : undefined}><ChartBar weight="bold" aria-hidden="true" /> Ingresos</Link>
          <Link to={`/admin/reportes/asistencia${busqueda}`} replace aria-current={tipo === 'asistencia' ? 'page' : undefined}><UsersThree weight="bold" aria-hidden="true" /> Asistencia</Link>
        </nav>
      </div>

      <form className="reportes__filtros" onSubmit={(e) => e.preventDefault()} aria-label="Filtros del reporte">
        <SelectorRango desde={filtros.desde} hasta={filtros.hasta} max={hoy} alCambiar={(r) => cambiar(r)} />
        <Campo etiqueta="Sala" como="select" value={filtros.sala} onChange={(e) => cambiar({ sala: e.target.value })} className="reportes__filtro">
          <option value="">Todas las salas</option>
          {opciones?.salas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Campo>
        <Campo etiqueta="Película" como="select" value={filtros.pelicula} onChange={(e) => cambiar({ pelicula: e.target.value })} className="reportes__filtro">
          <option value="">Todas las películas</option>
          {opciones?.peliculas.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
        </Campo>
        {filtrado && (
          <button type="button" className="reportes__limpiar" onClick={() => cambiar({ desde: '', hasta: '', sala: '', pelicula: '' })}>
            <ArrowCounterClockwise weight="bold" aria-hidden="true" /> Limpiar filtros
          </button>
        )}
      </form>

      {cargando && !vigentes && <Cargando texto="Generando el reporte…" />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {vigentes && (
        <div className="reportes__contenido" aria-busy={cargando}>
          {tipo === 'ingresos' ? <ReporteIngresos datos={vigentes} filtros={filtros} /> : <ReporteAsistencia datos={vigentes} filtros={filtros} />}
        </div>
      )}
    </div>
  );
}
