import { Link } from 'react-router-dom';
import { CalendarPlus, ChartBar, FilmSlate, Armchair, UsersThree, Ticket, CurrencyDollar, UserCheck, Gauge } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { diaCorto, fechaLarga, hora, moneda, numero, numeroDia } from '../../utiles/formato.js';
import GraficoBarras, { Medidor } from '../../componentes/admin/GraficoBarras.jsx';
import GraficoTorta, { agrupar } from '../../componentes/admin/GraficoTorta.jsx';
import Tabla from '../../componentes/admin/Tabla.jsx';
import Estado from '../../componentes/ui/Estado.jsx';
import Destellos from '../../componentes/ui/Destellos.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Admin.css';
import './Tablero.css';

const monedaCorta = (v) => (v >= 1000000 ? `$${numero(Math.round(v / 100000) / 10)} M` : v >= 1000 ? `$${numero(Math.round(v / 1000))} mil` : moneda(v));

const ACCESOS = [
  { a: '/admin/funciones', texto: 'Programar funciones', Icono: CalendarPlus },
  { a: '/admin/peliculas', texto: 'Películas', Icono: FilmSlate },
  { a: '/admin/salas', texto: 'Salas y butacas', Icono: Armchair },
  { a: '/admin/reportes', texto: 'Reportes', Icono: ChartBar },
  { a: '/admin/personal', texto: 'Personal', Icono: UsersThree },
];

/** P-09 Dashboard (tablero) de administración · RF-15, RF-16. */
export default function Tablero() {
  const { datos: t, cargando, error, recargar } = useCarga(() => api.get('/admin/reportes/tablero'), []);
  if (cargando && !t) return <Cargando texto="Cargando el dashboard…" />;
  if (error) return <div className="contenedor pagina"><ErrorCarga error={error} alReintentar={recargar} /></div>;

  const kpis = [
    { titulo: 'Recaudación de hoy', valor: moneda(t.recaudacionHoy), detalle: `${numero(t.pagosHoy)} ${t.pagosHoy === 1 ? 'pago aprobado' : 'pagos aprobados'}`, Icono: CurrencyDollar },
    { titulo: 'Entradas vendidas hoy', valor: numero(t.entradasVendidasHoy), detalle: 'Para cualquier función', Icono: Ticket },
    { titulo: 'Ocupación de hoy', valor: `${String(t.ocupacionPromedioHoy).replace('.', ',')} %`, detalle: `Promedio de ${t.funcionesHoy.length} funciones`, Icono: Gauge },
    { titulo: 'Ingresos a sala hoy', valor: numero(t.validadosHoy), detalle: 'Entradas validadas', Icono: UserCheck },
  ];
  const capacidadHoy = t.funcionesHoy.reduce((a, f) => a + f.capacidad, 0);
  const vendidasHoy = t.funcionesHoy.reduce((a, f) => a + f.vendidas, 0);
  const validadosHoy = t.funcionesHoy.reduce((a, f) => a + f.validados, 0);
  const porSala = Object.values(t.funcionesHoy.reduce((acc, f) => {
    const s = acc[f.sala] ?? (acc[f.sala] = { sala: f.sala, capacidad: 0, vendidas: 0, funciones: 0 });
    s.capacidad += f.capacidad; s.vendidas += f.vendidas; s.funciones += 1;
    return acc;
  }, {})).map((s) => ({ ...s, ocupacion: s.capacidad ? Math.round((s.vendidas / s.capacidad) * 1000) / 10 : 0 }))
    .sort((a, b) => a.sala.localeCompare(b.sala, 'es', { numeric: true }));

  return (
    <div className="contenedor pagina admin tablero">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Administración · {fechaLarga(t.dia)}</span>
          <h1 className="titulo-pantalla">Dashboard</h1>
        </div>
      </div>

      <nav className="tablero__accesos" aria-label="Módulos de administración">
        {ACCESOS.map(({ a, texto, Icono }) => (
          <Link key={a} to={a} className="tablero__acceso brilla"><Icono weight="duotone" aria-hidden="true" /> {texto}</Link>
        ))}
      </nav>

      <section className="tablero__marquesina" aria-label="Resumen del día">
        <Destellos cantidad={5} />
        {kpis.map(({ titulo, valor, detalle, Icono }) => (
          <div key={titulo} className="tablero__kpi">
            <Icono weight="duotone" aria-hidden="true" />
            <span className="tablero__kpi-titulo">{titulo}</span>
            <strong className="tablero__kpi-valor cifra">{valor}</strong>
            <span className="tablero__kpi-detalle">{detalle}</span>
          </div>
        ))}
      </section>

      <div className="tablero__grilla">
        <section className="tarjeta tablero__panel brilla">
          <div className="tablero__panel-cabecera">
            <h2 className="subtitulo">Recaudación de los últimos 7 días</h2>
            <Link to="/admin/reportes">Ver reporte</Link>
          </div>
          <GraficoBarras
            titulo="Recaudación por día de los últimos 7 días"
            datos={t.ultimosDias.map((d) => ({ clave: d.dia, etiqueta: `${diaCorto(d.dia)} ${numeroDia(d.dia)}`, etiquetaLarga: fechaLarga(d.dia), valor: d.total }))}
            formatoValor={moneda}
            formatoEje={monedaCorta}
            alto={300}
          />
        </section>

        <section className="tarjeta tablero__panel brilla">
          <h2 className="subtitulo">Recaudación de la semana por película</h2>
          {t.peliculasSemana.length === 0 ? <p className="texto-2">Todavía no hay ventas esta semana.</p> : (
            <GraficoTorta
              titulo="Recaudación de la semana por película"
              datos={agrupar(t.peliculasSemana, { maximo: 5, clave: (p) => p.titulo, etiqueta: (p) => p.titulo, valor: (p) => p.total, textoOtras: 'Otras' })}
              formatoValor={monedaCorta}
              centro={{ etiqueta: 'Semana', valor: monedaCorta(t.peliculasSemana.reduce((a, p) => a + p.total, 0)) }}
              tamano={180}
            />
          )}
        </section>
      </div>

      <div className="tablero__grilla tablero__grilla--pareja">
        <section className="tarjeta tablero__panel brilla">
          <h2 className="subtitulo">Butacas de las funciones de hoy</h2>
          {capacidadHoy === 0 ? <p className="texto-2">No hay funciones programadas para hoy.</p> : (
            <GraficoTorta
              titulo="Butacas de las funciones de hoy"
              datos={[
                { clave: 'ingresaron', etiqueta: 'Ya ingresaron', valor: validadosHoy, color: 'var(--serie-2)' },
                { clave: 'vendidas', etiqueta: 'Vendidas, sin ingresar', valor: vendidasHoy - validadosHoy, color: 'var(--serie-1)' },
                { clave: 'libres', etiqueta: 'Libres', valor: Math.max(0, capacidadHoy - vendidasHoy), color: 'var(--serie-otras)' },
              ]}
              formatoValor={numero}
              centro={{ etiqueta: 'Capacidad', valor: numero(capacidadHoy) }}
              tamano={180}
            />
          )}
        </section>

        <section className="tarjeta tablero__panel brilla">
          <h2 className="subtitulo">Ocupación por sala hoy</h2>
          {porSala.length === 0 ? <p className="texto-2">No hay funciones programadas para hoy.</p> : (
            <ul className="tablero__salas">
              {porSala.map((s) => (
                <li key={s.sala}>
                  <div className="tablero__sala-fila"><strong>{s.sala}</strong><span className="texto-2 cifra">{numero(s.vendidas)} / {numero(s.capacidad)} · {s.funciones} {s.funciones === 1 ? 'función' : 'funciones'}</span></div>
                  <Medidor valor={s.ocupacion} etiqueta={`Ocupación de ${s.sala}: ${s.ocupacion} %`} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="tablero__funciones">
        <h2 className="subtitulo">Funciones de hoy</h2>
        {t.funcionesHoy.length === 0 ? <Vacio titulo="No hay funciones programadas para hoy" /> : (
          <Tabla
            titulo="Funciones de hoy"
            unidad="funciones"
            porPagina={5}
            filas={t.funcionesHoy}
            columnas={[
              { clave: 'hora', titulo: 'Horario', render: (f) => <span className="cifra">{hora(f.inicio)}</span> },
              { clave: 'pelicula', titulo: 'Película', clase: 'ancho-completo', movil: 'principal', render: (f) => <strong>{f.pelicula}</strong> },
              { clave: 'sala', titulo: 'Sala', render: (f) => f.sala },
              { clave: 'vendidas', titulo: 'Vendidas', render: (f) => <span className="cifra">{f.vendidas} / {f.capacidad}</span> },
              { clave: 'ocupacion', titulo: 'Ocupación', clase: 'ancho-completo', render: (f) => <Medidor valor={f.ocupacion} etiqueta={`Ocupación ${f.ocupacion} %`} /> },
              { clave: 'validados', titulo: 'Ingresaron', movil: 'oculta', render: (f) => <span className="cifra">{f.validados}</span> },
              { clave: 'estado', titulo: 'Estado', movil: 'esquina', render: (f) => <Estado estado={f.estado} /> },
            ]}
          />
        )}
      </section>

    </div>
  );
}
