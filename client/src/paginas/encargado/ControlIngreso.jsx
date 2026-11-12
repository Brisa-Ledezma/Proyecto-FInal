import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, UsersThree } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { fechaLarga, hora } from '../../utiles/formato.js';
import EscanerQR from '../../componentes/control/EscanerQR.jsx';
import Campo from '../../componentes/ui/Campo.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './ControlIngreso.css';

function elegirInicial(funciones) {
  return (funciones.find((f) => f.ventanaAbierta) ?? funciones.find((f) => f.estado === 'PROGRAMADA') ?? funciones[funciones.length - 1])?.id ?? null;
}

function Resultado({ resultado }) {
  if (!resultado) {
    return (
      <div className="resultado resultado--espera" role="status">
        <Clock weight="duotone" aria-hidden="true" />
        <p>Esperando una entrada…</p>
      </div>
    );
  }
  const { aceptada, motivo, butaca, codigo } = resultado;
  const Icono = aceptada ? CheckCircle : XCircle;
  return (
    <div className={`resultado ${aceptada ? 'resultado--ok' : 'resultado--rechazo'}`} role="alert" key={resultado.momento}>
      <Icono weight="fill" aria-hidden="true" />
      <div>
        <p className="resultado__titulo">{aceptada ? 'Entrada válida' : 'Entrada rechazada'}</p>
        {butaca && <p className="resultado__butaca cifra">Fila {butaca.fila} · Butaca {butaca.numero}</p>}
        {butaca?.titular && <p>Titular: <strong>{butaca.titular}</strong>{butaca.pelicula && <> · {butaca.pelicula}</>}</p>}
        {!aceptada && <p>{motivo}</p>}
        {codigo && <p className="resultado__codigo cifra">{codigo}</p>}
      </div>
    </div>
  );
}

/** P-08 Control de ingreso · RF-10, RN-09 · CU-08. */
export default function ControlIngreso() {
  const lista = useCarga(() => api.get('/control/funciones'), []);
  const [idFuncion, setIdFuncion] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [validando, setValidando] = useState(false);

  useEffect(() => {
    if (lista.datos && idFuncion === null) setIdFuncion(elegirInicial(lista.datos));
  }, [lista.datos, idFuncion]);

  const cargarDetalle = useCallback(async () => {
    if (!idFuncion) return;
    try { setDetalle(await api.get(`/control/funciones/${idFuncion}`)); } catch { /* se reintenta en el próximo ciclo */ }
  }, [idFuncion]);

  useEffect(() => {
    setDetalle(null);
    setResultado(null);
    cargarDetalle();
    const t = setInterval(cargarDetalle, 10000);
    return () => clearInterval(t);
  }, [cargarDetalle]);

  const validar = useCallback(async (texto) => {
    if (!idFuncion) return;
    setValidando(true);
    try {
      const r = await api.post(`/control/funciones/${idFuncion}/validar`, { codigo: texto });
      setResultado({ ...r, momento: Date.now() });
      if (r.aceptada) {
        setDetalle((d) => d && { ...d, ingresados: r.ingresados, vendidas: r.vendidas });
        cargarDetalle();
        navigator.vibrate?.(80);
      } else {
        navigator.vibrate?.([60, 60, 60]);
      }
    } catch (err) {
      setResultado({ aceptada: false, motivo: err.message, momento: Date.now() });
    } finally {
      setValidando(false);
    }
  }, [idFuncion, cargarDetalle]);

  const enviarCodigo = (e) => {
    e.preventDefault();
    if (!codigo.trim()) { setErrorCodigo('Ingresá el código impreso debajo del QR.'); return; }
    setErrorCodigo(null);
    validar(codigo);
    setCodigo('');
  };

  if (lista.cargando && !lista.datos) return <Cargando texto="Cargando las funciones de hoy…" />;
  if (lista.error) return <div className="contenedor pagina"><ErrorCarga error={lista.error} alReintentar={lista.recargar} /></div>;

  const funciones = lista.datos;
  const porcentaje = detalle?.vendidas ? Math.round((detalle.ingresados / detalle.vendidas) * 100) : 0;

  return (
    <div className="contenedor pagina control">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Encargado de sala · {fechaLarga(new Date())}</span>
          <h1 className="titulo-pantalla">Control de ingreso</h1>
        </div>
      </div>

      {funciones.length === 0 ? (
        <Vacio titulo="Hoy no hay funciones programadas">Cuando la administración programe funciones para hoy, van a aparecer acá.</Vacio>
      ) : (
        <div className="control__grilla">
          <nav className="control__funciones" aria-label="Funciones de hoy">
            <span className="rotulo">Funciones de hoy</span>
            <ul>
              {funciones.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={`control__funcion ${f.id === idFuncion ? 'control__funcion--activa' : ''} ${f.estado === 'FINALIZADA' ? 'control__funcion--terminada' : ''}`}
                    aria-pressed={f.id === idFuncion}
                    onClick={() => setIdFuncion(f.id)}
                  >
                    <span className="control__funcion-hora cifra">{hora(f.inicio)}</span>
                    <span className="control__funcion-datos">
                      <strong>{f.pelicula.titulo}</strong>
                      <span>{f.sala} · <span className="cifra">{f.ingresados}/{f.vendidas}</span> ingresos</span>
                    </span>
                    {f.ventanaAbierta && <span className="control__en-curso">Ingreso abierto</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <section className="control__panel" aria-live="polite">
            {!detalle ? <Cargando texto="Cargando la función…" /> : (
              <>
                <div className="control__cabecera tarjeta">
                  <div>
                    <span className="rotulo">{detalle.sala} · {hora(detalle.inicio)} a {hora(detalle.fin)}</span>
                    <h2 className="control__titulo">{detalle.pelicula.titulo}</h2>
                    <p className={detalle.ventanaAbierta ? 'control__ventana control__ventana--abierta' : 'control__ventana'}>
                      {detalle.ventanaAbierta
                        ? 'El ingreso está habilitado.'
                        : detalle.estado === 'FINALIZADA' ? 'La función ya terminó.' : `El ingreso se habilita a las ${detalle.abreALas} (30 minutos antes).`}
                    </p>
                  </div>
                  <div className="control__contador" aria-label={`${detalle.ingresados} ingresos de ${detalle.vendidas} entradas vendidas`}>
                    <UsersThree weight="duotone" aria-hidden="true" />
                    <div>
                      <strong className="cifra">{detalle.ingresados}<span>/{detalle.vendidas}</span></strong>
                      <span>ingresos validados</span>
                    </div>
                    <div className="control__barra" aria-hidden="true"><span style={{ width: `${porcentaje}%` }} /></div>
                  </div>
                </div>

                <div className="control__lectura">
                  <div className="control__lector tarjeta">
                    <EscanerQR alLeer={validar} />
                    <form className="control__manual" onSubmit={enviarCodigo} noValidate>
                      <Campo
                        etiqueta="Código impreso"
                        placeholder="GS-XXXX-XXXX"
                        autoComplete="off"
                        autoCapitalize="characters"
                        value={codigo}
                        onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setErrorCodigo(null); }}
                        error={errorCodigo}
                        ayuda="Usalo si la cámara no puede leer el QR."
                      />
                      <Boton type="submit" variante="secundario" cargando={validando}>Validar</Boton>
                    </form>
                  </div>
                  <div className="control__resultado">
                    <Resultado resultado={resultado} />
                    <div className="control__ultimos tarjeta">
                      <span className="rotulo">Últimos ingresos</span>
                      {detalle.ultimos.length === 0
                        ? <p className="texto-2">Todavía no ingresó nadie a esta función.</p>
                        : (
                          <ul>
                            {detalle.ultimos.map((u) => (
                              <li key={u.codigo}>
                                <span className="cifra">{hora(u.hora)}</span>
                                <span className="cifra">Fila {u.fila} · Butaca {u.numero}</span>
                                <span className="texto-2">{u.encargado}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
