import { useEffect, useRef, useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { aFecha, fechaISO, fechaLarga, sumarDias } from '../../utiles/formato.js';
import './Calendario.css';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const primeroDelMes = (iso) => `${iso.slice(0, 7)}-01`;
function sumarMeses(iso, n) {
  const f = aFecha(primeroDelMes(iso));
  f.setMonth(f.getMonth() + n);
  return fechaISO(f);
}

/** "5 nov" */
export const diaMesCorto = (iso) => { const f = aFecha(iso); return `${f.getDate()} ${MESES_CORTOS[f.getMonth()]}`; };

/**
 * Calendario mensual. En modo "dia" elige una fecha; en modo "rango" el primer
 * toque marca el inicio y el segundo el final. Se recorre con las flechas del teclado.
 */
export function Calendario({ modo = 'dia', valor, rango, alElegir, marcados = {}, min, max }) {
  const hoy = fechaISO();
  const [mes, setMes] = useState(() => primeroDelMes(modo === 'rango' ? (rango?.hasta ?? hoy) : (valor ?? hoy)));
  const [inicioRango, setInicioRango] = useState(null);
  const [pasando, setPasando] = useState(null);
  const [foco, setFoco] = useState(modo === 'rango' ? (rango?.hasta ?? hoy) : (valor ?? hoy));
  const grilla = useRef(null);

  const base = aFecha(mes);
  const desfase = (base.getDay() + 6) % 7; // la semana empieza el lunes
  const diasMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const celdas = [...Array(desfase).fill(null), ...Array.from({ length: diasMes }, (_, i) => sumarDias(mes, i))];
  const fueraDeRango = (d) => (min && d < min) || (max && d > max);

  const desde = inicioRango ?? rango?.desde;
  const hasta = inicioRango ? (pasando && pasando >= inicioRango ? pasando : inicioRango) : rango?.hasta;

  const elegir = (d) => {
    if (fueraDeRango(d)) return;
    setFoco(d);
    if (modo === 'dia') { alElegir(d); return; }
    if (!inicioRango) { setInicioRango(d); return; }
    const [a, b] = d < inicioRango ? [d, inicioRango] : [inicioRango, d];
    setInicioRango(null);
    alElegir({ desde: a, hasta: b });
  };

  const mover = (e) => {
    const pasos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!pasos) return;
    e.preventDefault();
    const nuevo = sumarDias(foco, pasos);
    setFoco(nuevo);
    if (nuevo.slice(0, 7) !== mes.slice(0, 7)) setMes(primeroDelMes(nuevo));
  };

  useEffect(() => {
    grilla.current?.querySelector(`[data-dia="${foco}"]`)?.focus({ preventScroll: true });
  }, [foco, mes]);

  return (
    <div className="calendario">
      <div className="calendario__cabecera">
        <button type="button" className="calendario__mes-btn" onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior"><CaretLeft weight="bold" /></button>
        <span className="calendario__mes" aria-live="polite">{MESES[base.getMonth()]} {base.getFullYear()}</span>
        <button type="button" className="calendario__mes-btn" onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente"><CaretRight weight="bold" /></button>
      </div>
      <div className="calendario__semana" aria-hidden="true">{DIAS.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="calendario__grilla" ref={grilla} role="grid" onKeyDown={mover} onMouseLeave={() => setPasando(null)}>
        {celdas.map((d, i) => {
          if (!d) return <span key={`v${i}`} />;
          const dentro = desde && hasta && d >= desde && d <= hasta;
          const extremo = d === desde || d === hasta;
          const elegido = modo === 'dia' ? d === valor : extremo;
          const cantidad = marcados[d];
          const f = aFecha(d);
          return (
            <button
              key={d}
              type="button"
              data-dia={d}
              tabIndex={d === foco ? 0 : -1}
              className={[
                'calendario__dia',
                d === hoy && 'calendario__dia--hoy',
                elegido && 'calendario__dia--elegido',
                modo === 'rango' && dentro && 'calendario__dia--en-rango',
                modo === 'rango' && d === desde && 'calendario__dia--desde',
                modo === 'rango' && d === hasta && 'calendario__dia--hasta',
              ].filter(Boolean).join(' ')}
              disabled={fueraDeRango(d)}
              aria-pressed={elegido}
              aria-label={`${DIAS_LARGOS[(f.getDay() + 6) % 7]} ${f.getDate()} de ${MESES[f.getMonth()]}${cantidad ? `, ${cantidad} funciones` : ''}${d === hoy ? ', hoy' : ''}`}
              onClick={() => elegir(d)}
              onMouseEnter={() => setPasando(d)}
            >
              {f.getDate()}
              {cantidad > 0 && <span className="calendario__punto" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {modo === 'rango' && <p className="calendario__ayuda">{inicioRango ? 'Ahora elegí el último día.' : 'Elegí el primer día y después el último.'}</p>}
    </div>
  );
}

/** Ventanita desplegable que se cierra con Escape o tocando afuera. */
export function Desplegable({ abierto, alCerrar, children, alineacion = 'inicio', etiqueta }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (ref.current && !ref.current.parentElement.contains(e.target)) alCerrar(); };
    const tecla = (e) => { if (e.key === 'Escape') alCerrar(); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto, alCerrar]);
  if (!abierto) return null;
  return <div ref={ref} className={`desplegable desplegable--${alineacion}`} role="dialog" aria-label={etiqueta}>{children}</div>;
}

const textoDia = (iso) => {
  const hoy = fechaISO();
  const largo = fechaLarga(iso);
  if (iso === hoy) return { principal: 'Hoy', secundario: largo };
  if (iso === sumarDias(hoy, 1)) return { principal: 'Mañana', secundario: largo };
  if (iso === sumarDias(hoy, -1)) return { principal: 'Ayer', secundario: largo };
  return { principal: largo.charAt(0).toUpperCase() + largo.slice(1), secundario: String(aFecha(iso).getFullYear()) };
};

/** Selector de un día: flechas para el día anterior y el siguiente, y calendario desplegable. */
export function SelectorDia({ valor, alCambiar, marcados, etiqueta = 'Elegir el día' }) {
  const [abierto, setAbierto] = useState(false);
  const hoy = fechaISO();
  const { principal, secundario } = textoDia(valor);
  return (
    <div className="selector-dia">
      <button type="button" className="selector-dia__flecha" onClick={() => alCambiar(sumarDias(valor, -1))} aria-label="Día anterior"><CaretLeft weight="bold" /></button>
      <div className="selector-dia__centro">
        <button type="button" className="selector-dia__boton" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-haspopup="dialog" aria-label={`${etiqueta}: ${principal}, ${secundario}`}>
          <CalendarBlank weight="duotone" aria-hidden="true" />
          <span className="selector-dia__texto">
            <strong key={valor}>{principal}</strong>
            <span>{secundario}</span>
          </span>
        </button>
        <Desplegable abierto={abierto} alCerrar={() => setAbierto(false)} etiqueta={etiqueta}>
          <div className="desplegable__atajos">
            <button type="button" onClick={() => { alCambiar(hoy); setAbierto(false); }}>Hoy</button>
            <button type="button" onClick={() => { alCambiar(sumarDias(hoy, 1)); setAbierto(false); }}>Mañana</button>
            <button type="button" onClick={() => { alCambiar(sumarDias(hoy, 7)); setAbierto(false); }}>En una semana</button>
          </div>
          <Calendario valor={valor} marcados={marcados} alElegir={(d) => { alCambiar(d); setAbierto(false); }} />
        </Desplegable>
      </div>
      <button type="button" className="selector-dia__flecha" onClick={() => alCambiar(sumarDias(valor, 1))} aria-label="Día siguiente"><CaretRight weight="bold" /></button>
      {valor !== hoy && <button type="button" className="selector-dia__hoy" onClick={() => alCambiar(hoy)}>Volver a hoy</button>}
    </div>
  );
}

/** Selector de un período "del 5 al 11 de noviembre" con atajos y calendario de rango. */
export function SelectorRango({ desde, hasta, alCambiar, max }) {
  const [abierto, setAbierto] = useState(false);
  const hoy = fechaISO();
  const inicioMes = primeroDelMes(hoy);
  const atajos = [
    { texto: 'Hoy', desde: hoy, hasta: hoy },
    { texto: 'Últimos 7 días', desde: sumarDias(hoy, -6), hasta: hoy },
    { texto: 'Últimos 30 días', desde: sumarDias(hoy, -29), hasta: hoy },
    { texto: 'Este mes', desde: inicioMes, hasta: hoy },
    { texto: 'Mes pasado', desde: sumarMeses(hoy, -1), hasta: sumarDias(inicioMes, -1) },
  ];
  const elegir = (r) => { alCambiar(r); setAbierto(false); };
  const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4);
  const texto = desde === hasta ? diaMesCorto(desde) : `${diaMesCorto(desde)} – ${diaMesCorto(hasta)}${mismoAnio ? '' : ` ${hasta.slice(0, 4)}`}`;
  const activo = atajos.find((a) => a.desde === desde && a.hasta === hasta);

  return (
    <div className="selector-rango">
      <button type="button" className="selector-rango__boton" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-haspopup="dialog">
        <CalendarBlank weight="duotone" aria-hidden="true" />
        <span className="selector-rango__texto">
          <span>{activo ? activo.texto : 'Período'}</span>
          <strong className="cifra">{texto}</strong>
        </span>
        <CaretRight weight="bold" className="selector-rango__caret" aria-hidden="true" />
      </button>
      <Desplegable abierto={abierto} alCerrar={() => setAbierto(false)} etiqueta="Elegir el período">
        <div className="desplegable__rango">
          <ul className="desplegable__lista">
            {atajos.map((a) => (
              <li key={a.texto}>
                <button type="button" aria-pressed={activo?.texto === a.texto} onClick={() => elegir({ desde: a.desde, hasta: a.hasta })}>{a.texto}</button>
              </li>
            ))}
          </ul>
          <Calendario modo="rango" rango={{ desde, hasta }} max={max} alElegir={elegir} />
        </div>
      </Desplegable>
    </div>
  );
}
