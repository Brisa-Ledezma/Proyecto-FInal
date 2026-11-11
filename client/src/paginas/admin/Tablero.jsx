import { Link } from 'react-router-dom';
import { CalendarPlus, ChartBar, FilmSlate, Armchair, UsersThree, Ticket, CurrencyDollar, UserCheck, Gauge } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { diaCorto, fechaLarga, hora, moneda, numero, numeroDia } from '../../utiles/formato.js';
import GraficoBarras, { Medidor } from '../../componentes/admin/GraficoBarras.jsx';
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

/** P-09 Tablero de administración · RF-15, RF-16. */
export default function Tablero() {
  const { datos: t, cargando, error, recargar } = useCarga(() => api.get('/admin/reportes/tablero'), []);
  if (cargando && !t) return <Cargando texto="Cargando el tablero…" />;
  if (error) return <div className="contenedor pagina"><ErrorCarga error={error} alReintentar={recargar} /></div>;

  const kpis = [
    { titulo: 'Recaudación de hoy', valor: moneda(t.recaudacionHoy), detalle: `${numero(t.pagosHoy)} pagos aprobados`, Icono: CurrencyDollar },
    { titulo: 'Entradas vendidas hoy', valor: numero(t.entradasVendidasHoy), detalle: 'Para cualquier función', Icono: Ticket },
    { titulo: 'Ocupación de hoy', valor: `${String(t.ocupacionPromedioHoy).replace('.', ',')} %`, detalle: `Promedio de ${t.funcionesHoy.length} funciones`, Icono: Gauge },
    { titulo: 'Ingresos a sala hoy', valor: numero(t.validadosHoy), detalle: 'Entradas validadas', Icono: UserCheck },
  ];
  const maxTop = Math.max(...t.peliculasSemana.map((p) => p.total), 1);

  return (
    <div className="contenedor pagina admin tablero">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Administración · {fechaLarga(t.dia)}</span>
          <h1 className="titulo-pantalla">Tablero</h1>
        </div>
      </div>

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
        <section className="tarjeta tablero__panel">
          <div className="tablero__panel-cabecera">
            <h2 className="subtitulo">Recaudación de los últimos 7 días</h2>
            <Link to="/admin/reportes">Ver reporte</Link>
          </div>
          <GraficoBarras
            titulo="Recaudación por día de los últimos 7 días"
            datos={t.ultimosDias.map((d) => ({ clave: d.dia, etiqueta: `${diaCorto(d.dia)} ${numeroDia(d.dia)}`, etiquetaLarga: fechaLarga(d.dia), valor: d.total }))}
            formatoValor={moneda}
            formatoEje={monedaCorta}
            alto={230}
          />
        </section>

        <section className="tarjeta tablero__panel">
          <h2 className="subtitulo">Películas más vendidas de la semana</h2>
          {t.peliculasSemana.length === 0 ? <p className="texto-2">Todavía no hay ventas esta semana.</p> : (
            <ol className="tablero__ranking">
              {t.peliculasSemana.map((p, i) => (
                <li key={p.titulo}>
                  <span className="tablero__puesto cifra">{i + 1}</span>
                  <div>
                    <div className="tablero__ranking-fila"><strong>{p.titulo}</strong><span className="cifra">{moneda(p.total)}</span></div>
                    <span className="tablero__ranking-barra" aria-hidden="true"><span style={{ width: `${(p.total / maxTop) * 100}%` }} /></span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="tablero__funciones">
        <h2 className="subtitulo">Funciones de hoy</h2>
        {t.funcionesHoy.length === 0 ? <Vacio titulo="No hay funciones programadas para hoy" /> : (
          <Tabla
            titulo="Funciones de hoy"
            filas={t.funcionesHoy}
            columnas={[
              { clave: 'hora', titulo: 'Horario', render: (f) => <span className="cifra">{hora(f.inicio)}</span> },
              { clave: 'pelicula', titulo: 'Película', clase: 'ancho-completo', render: (f) => <strong>{f.pelicula}</strong> },
              { clave: 'sala', titulo: 'Sala', render: (f) => f.sala },
              { clave: 'vendidas', titulo: 'Vendidas', render: (f) => <span className="cifra">{f.vendidas} / {f.capacidad}</span> },
              { clave: 'ocupacion', titulo: 'Ocupación', clase: 'ancho-completo', render: (f) => <Medidor valor={f.ocupacion} etiqueta={`Ocupación ${f.ocupacion} %`} /> },
              { clave: 'validados', titulo: 'Ingresaron', render: (f) => <span className="cifra">{f.validados}</span> },
              { clave: 'estado', titulo: 'Estado', render: (f) => <Estado estado={f.estado} /> },
            ]}
          />
        )}
      </section>

      <nav className="tablero__accesos" aria-label="Módulos de administración">
        {ACCESOS.map(({ a, texto, Icono }) => (
          <Link key={a} to={a} className="tablero__acceso"><Icono weight="duotone" aria-hidden="true" /> {texto}</Link>
        ))}
      </nav>
    </div>
  );
}
