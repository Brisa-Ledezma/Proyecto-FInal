import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, query } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { diaCorto, fechaCorta, fechaISO, fechaLarga, hora, moneda, numero, numeroDia, sumarDias } from '../../utiles/formato.js';
import GraficoBarras, { Medidor } from '../../componentes/admin/GraficoBarras.jsx';
import Tabla from '../../componentes/admin/Tabla.jsx';
import Campo from '../../componentes/ui/Campo.jsx';
import Estado from '../../componentes/ui/Estado.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Admin.css';
import './Reportes.css';

const monedaCorta = (v) => (v >= 1000000 ? `$${numero(Math.round(v / 100000) / 10)} M` : v >= 1000 ? `$${numero(Math.round(v / 1000))} mil` : moneda(v));

function Cifra({ titulo, valor, detalle }) {
  return (
    <div className="reporte-cifra">
      <span className="rotulo">{titulo}</span>
      <strong className="cifra">{valor}</strong>
      {detalle && <span className="texto-2">{detalle}</span>}
    </div>
  );
}

/** CU-13: reporte de ingresos. */
function ReporteIngresos({ datos }) {
  const [vistaDetalle, setVistaDetalle] = useState('dia');
  if (!datos.pagos) return <Vacio titulo="No hay ingresos para los filtros elegidos">Probá con otro rango de fechas, sala o película.</Vacio>;
  return (
    <>
      <div className="admin__resumen">
        <Cifra titulo="Total del período" valor={moneda(datos.total)} detalle="Suma de los pagos aprobados" />
        <Cifra titulo="Pagos aprobados" valor={numero(datos.pagos)} />
        <Cifra titulo="Entradas vendidas" valor={numero(datos.entradas)} />
        <Cifra titulo="Promedio por día" valor={moneda(Math.round(datos.total / datos.porDia.length))} />
      </div>

      <section className="tarjeta reporte-panel">
        <h2 className="subtitulo">Recaudación por día</h2>
        <GraficoBarras
          titulo="Recaudación por día del período"
          datos={datos.porDia.map((d) => ({ clave: d.dia, etiqueta: `${diaCorto(d.dia)} ${numeroDia(d.dia)}`, etiquetaLarga: fechaLarga(d.dia), valor: d.total }))}
          formatoValor={moneda}
          formatoEje={monedaCorta}
        />
      </section>

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
            claveFila={(d) => d.dia}
            filas={datos.porDia}
            columnas={[
              { clave: 'dia', titulo: 'Día', clase: 'ancho-completo', render: (d) => fechaLarga(d.dia) },
              { clave: 'pagos', titulo: 'Pagos', alinear: 'right', render: (d) => <span className="cifra">{numero(d.pagos)}</span> },
              { clave: 'total', titulo: 'Recaudación', alinear: 'right', render: (d) => <strong className="cifra">{moneda(d.total)}</strong> },
            ]}
          />
        ) : (
          <Tabla
            titulo="Ingresos por función"
            filas={datos.porFuncion}
            columnas={[
              { clave: 'fecha', titulo: 'Función', render: (f) => <span className="cifra">{fechaCorta(f.inicio)} · {hora(f.inicio)}</span> },
              { clave: 'pelicula', titulo: 'Película', clase: 'ancho-completo', render: (f) => <strong>{f.pelicula}</strong> },
              { clave: 'sala', titulo: 'Sala', render: (f) => f.sala },
              { clave: 'entradas', titulo: 'Entradas', alinear: 'right', render: (f) => <span className="cifra">{numero(f.entradas)}</span> },
              { clave: 'total', titulo: 'Importe', alinear: 'right', render: (f) => <strong className="cifra">{moneda(f.total)}</strong> },
              { clave: 'estado', titulo: 'Estado', render: (f) => <Estado estado={f.estado} /> },
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
function ReporteAsistencia({ datos }) {
  const [orden, setOrden] = useState({ por: 'inicio', sentido: 'asc' });
  const filas = useMemo(() => {
    const copia = [...datos.funciones];
    copia.sort((a, b) => {
      const va = a[orden.por]; const vb = b[orden.por];
      const r = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return orden.sentido === 'asc' ? r : -r;
    });
    return copia;
  }, [datos, orden]);
  const ordenar = (clave) => setOrden((o) => ({ por: clave, sentido: o.por === clave && o.sentido === 'asc' ? 'desc' : 'asc' }));

  if (!datos.funciones.length) return <Vacio titulo="No hay funciones en el período elegido">Probá con otro rango de fechas, sala o película.</Vacio>;
  return (
    <>
      <div className="admin__resumen">
        <Cifra titulo="Ocupación promedio" valor={`${String(datos.promedioOcupacion).replace('.', ',')} %`} detalle={`${datos.funciones.length} funciones`} />
        <Cifra titulo="Entradas vendidas" valor={numero(datos.totalVendidas)} />
        <Cifra titulo="Ingresos validados" valor={numero(datos.totalValidados)} detalle="Asistencia real en sala" />
        <Cifra titulo="Asistencia sobre vendidas" valor={`${datos.totalVendidas ? String(Math.round((datos.totalValidados / datos.totalVendidas) * 1000) / 10).replace('.', ',') : 0} %`} />
      </div>
      <p className="texto-2">Tocá los títulos de las columnas para ordenar. Ordenar por ocupación ayuda a encontrar las funciones con baja demanda.</p>
      <Tabla
        titulo="Asistencia por función"
        filas={filas}
        ordenarPor={orden.por}
        orden={orden.sentido}
        alOrdenar={ordenar}
        columnas={[
          { clave: 'inicio', titulo: 'Función', ordenable: true, render: (f) => <span className="cifra">{fechaCorta(f.inicio)} · {hora(f.inicio)}</span> },
          { clave: 'pelicula', titulo: 'Película', ordenable: true, clase: 'ancho-completo', render: (f) => <strong>{f.pelicula}</strong> },
          { clave: 'sala', titulo: 'Sala', ordenable: true, render: (f) => f.sala },
          { clave: 'vendidas', titulo: 'Vendidas', ordenable: true, alinear: 'right', render: (f) => <span className="cifra">{f.vendidas}</span> },
          { clave: 'validados', titulo: 'Ingresaron', ordenable: true, alinear: 'right', render: (f) => <span className="cifra">{f.validados}</span> },
          { clave: 'capacidad', titulo: 'Capacidad', alinear: 'right', render: (f) => <span className="cifra">{f.capacidad}</span> },
          { clave: 'ocupacion', titulo: 'Ocupación', ordenable: true, clase: 'ancho-completo col-ocupacion', render: (f) => <Medidor valor={f.ocupacion} etiqueta={`Ocupación ${f.ocupacion} %`} /> },
        ]}
      />
    </>
  );
}

/** P-13 Reportes · RF-15, RF-16 · CU-13, CU-14. */
export default function Reportes() {
  const [parametros, setParametros] = useSearchParams();
  const hoy = fechaISO();
  const tipo = parametros.get('tipo') === 'asistencia' ? 'asistencia' : 'ingresos';
  const filtros = {
    desde: parametros.get('desde') ?? sumarDias(hoy, -6),
    hasta: parametros.get('hasta') ?? hoy,
    sala: parametros.get('sala') ?? '',
    pelicula: parametros.get('pelicula') ?? '',
  };
  const rangoInvalido = filtros.desde > filtros.hasta;
  const { datos, cargando, error, recargar } = useCarga(
    () => (rangoInvalido ? Promise.resolve(null) : api.get(`/admin/reportes/${tipo}${query(filtros)}`)),
    [tipo, filtros.desde, filtros.hasta, filtros.sala, filtros.pelicula],
  );
  const cambiar = (clave, valor) => {
    const p = new URLSearchParams(parametros);
    if (valor) p.set(clave, valor); else p.delete(clave);
    setParametros(p, { replace: true });
  };
  const opciones = datos?.opciones;

  return (
    <div className="contenedor pagina admin reportes">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Administración</span>
          <h1 className="titulo-pantalla">Reportes</h1>
          <p className="texto-2">Recaudación a partir de los pagos aprobados y asistencia a partir de las entradas validadas.</p>
        </div>
        <div className="reporte-pestanas reporte-pestanas--grandes" role="tablist" aria-label="Tipo de reporte">
          <button type="button" role="tab" aria-selected={tipo === 'ingresos'} onClick={() => cambiar('tipo', '')}>Ingresos</button>
          <button type="button" role="tab" aria-selected={tipo === 'asistencia'} onClick={() => cambiar('tipo', 'asistencia')}>Asistencia</button>
        </div>
      </div>

      <form className="reportes__filtros tarjeta" onSubmit={(e) => e.preventDefault()} aria-label="Filtros del reporte">
        <Campo etiqueta="Desde" type="date" value={filtros.desde} max={hoy} onChange={(e) => cambiar('desde', e.target.value)} error={rangoInvalido ? 'Tiene que ser anterior o igual a la fecha final.' : undefined} />
        <Campo etiqueta="Hasta" type="date" value={filtros.hasta} onChange={(e) => cambiar('hasta', e.target.value)} />
        <Campo etiqueta="Sala" como="select" value={filtros.sala} onChange={(e) => cambiar('sala', e.target.value)}>
          <option value="">Todas</option>
          {opciones?.salas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Campo>
        <Campo etiqueta="Película" como="select" value={filtros.pelicula} onChange={(e) => cambiar('pelicula', e.target.value)}>
          <option value="">Todas</option>
          {opciones?.peliculas.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
        </Campo>
      </form>

      {rangoInvalido && <Aviso tipo="error" titulo="Revisá el rango de fechas">La fecha inicial no puede ser posterior a la final.</Aviso>}
      {!rangoInvalido && cargando && !datos && <Cargando texto="Generando el reporte…" />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && !rangoInvalido && (
        <div className="reportes__contenido" aria-busy={cargando}>
          {tipo === 'ingresos' ? <ReporteIngresos datos={datos} /> : <ReporteAsistencia datos={datos} />}
        </div>
      )}
    </div>
  );
}
