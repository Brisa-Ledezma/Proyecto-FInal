import { useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { EnvelopeSimpleOpen, Eye, EyeSlash } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useSesion, inicioDeRol } from '../../contexto/SesionContexto.jsx';
import { useFormulario } from '../../hooks/useFormulario.js';
import { validarLogin, validarRegistro } from '../../utiles/validaciones.js';
import { fechaISO } from '../../utiles/formato.js';
import Campo, { Casilla } from '../../componentes/ui/Campo.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import Destellos from '../../componentes/ui/Destellos.jsx';
import { LogoCompleto } from '../../componentes/marca/Logo.jsx';
import './Acceso.css';

// Solo se vuelve a rutas internas permitidas para el rol.
function destinoPermitido(volver, rol) {
  if (!volver || !volver.startsWith('/') || volver.startsWith('//') || volver.startsWith('/acceso')) return inicioDeRol(rol);
  if (volver.startsWith('/admin') && rol !== 'ADMINISTRADOR') return inicioDeRol(rol);
  if (volver.startsWith('/control') && rol !== 'ENCARGADO_SALA') return inicioDeRol(rol);
  if (rol !== 'ESPECTADOR' && !volver.startsWith('/admin') && !volver.startsWith('/control')) return inicioDeRol(rol);
  return volver;
}

function CampoContrasena({ valor, alCambiar, error, ayuda, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="acceso__contrasena">
      <Campo etiqueta="Contraseña" type={visible ? 'text' : 'password'} value={valor} onChange={alCambiar} error={error} ayuda={ayuda} autoComplete={autoComplete} />
      <button type="button" className="acceso__ver" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        {visible ? <EyeSlash /> : <Eye />}
      </button>
    </div>
  );
}

function FormIngresar({ alIrARegistro }) {
  const { iniciarSesion } = useSesion();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const f = useFormulario({ email: '', contrasena: '' }, validarLogin);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [reenvio, setReenvio] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!f.intentar()) return;
    setEnviando(true);
    try {
      const usuario = await iniciarSesion(f.valores.email, f.valores.contrasena);
      navegar(destinoPermitido(parametros.get('volver'), usuario.rol), { replace: true });
    } catch (err) {
      setError(err);
      f.setErroresServidor(err.campos ?? {});
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    setReenvio('enviando');
    try { await api.post('/auth/reenviar-confirmacion', { email: f.valores.email }); setReenvio('ok'); } catch { setReenvio('error'); }
  };

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {parametros.get('motivo') === 'vencida' && !error && (
        <Aviso tipo="advertencia" titulo="Tu sesión se cerró por inactividad">
          Pasaron 30 minutos sin actividad. Si tenías una reserva pendiente de pago, se canceló y las butacas se liberaron.
        </Aviso>
      )}
      {error && (
        <Aviso
          tipo="error"
          acciones={error.codigo === 'CUENTA_SIN_VERIFICAR' && (
            <Boton variante="secundario" tamano="chico" onClick={reenviar} cargando={reenvio === 'enviando'}>Reenviar correo</Boton>
          )}
        >
          {reenvio === 'ok' ? 'Te enviamos un nuevo correo de confirmación.' : error.message}
        </Aviso>
      )}
      <Campo etiqueta="Correo electrónico" type="email" autoComplete="email" value={f.valores.email} onChange={f.cambiar('email')} error={f.errores.email} />
      <CampoContrasena valor={f.valores.contrasena} alCambiar={f.cambiar('contrasena')} error={f.errores.contrasena} autoComplete="current-password" />
      <Boton variante="ticket" type="submit" ancho cargando={enviando} disabled={f.bloqueado}>Ingresar</Boton>
      <p className="acceso__cambio">
        ¿Todavía no tenés cuenta? <Boton variante="texto" onClick={alIrARegistro}>Crear cuenta</Boton>
      </p>
    </form>
  );
}

function FormRegistro({ alIrAIngresar }) {
  const f = useFormulario(
    { nombre: '', apellido: '', email: '', fechaNacimiento: '', contrasena: '', aceptaPrivacidad: false },
    validarRegistro,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [registrado, setRegistrado] = useState(null);
  const [reenviado, setReenviado] = useState(false);
  const hoy = new Date();
  const maximo = fechaISO(new Date(hoy.getFullYear() - 16, hoy.getMonth(), hoy.getDate()));

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!f.intentar()) return;
    setEnviando(true);
    try {
      const r = await api.post('/auth/registro', f.valores);
      setRegistrado(r.email);
    } catch (err) {
      setError(err);
      f.setErroresServidor(err.campos ?? {});
    } finally {
      setEnviando(false);
    }
  };

  if (registrado) {
    return (
      <div className="acceso__enviado" role="status">
        <EnvelopeSimpleOpen weight="duotone" className="acceso__enviado-icono" aria-hidden="true" />
        <h2 className="subtitulo">Revisá tu correo</h2>
        <p>Te enviamos un enlace a <strong>{registrado}</strong> para confirmar tu cuenta. Cuando lo abras, la cuenta queda activa y se inicia tu sesión.</p>
        <div className="acceso__enviado-acciones">
          <Boton variante="secundario" disabled={reenviado} onClick={async () => { await api.post('/auth/reenviar-confirmacion', { email: registrado }).catch(() => {}); setReenviado(true); }}>
            {reenviado ? 'Correo reenviado' : 'Reenviar correo'}
          </Boton>
          <Boton variante="texto" onClick={alIrAIngresar}>Ir a iniciar sesión</Boton>
        </div>
      </div>
    );
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {error && (
        <Aviso tipo="error" acciones={error.codigo === 'CORREO_EXISTENTE' && <Boton variante="secundario" tamano="chico" onClick={alIrAIngresar}>Iniciar sesión</Boton>}>
          {error.message}
        </Aviso>
      )}
      <div className="formulario__fila">
        <Campo etiqueta="Nombre" autoComplete="given-name" value={f.valores.nombre} onChange={f.cambiar('nombre')} error={f.errores.nombre} />
        <Campo etiqueta="Apellido" autoComplete="family-name" value={f.valores.apellido} onChange={f.cambiar('apellido')} error={f.errores.apellido} />
      </div>
      <Campo etiqueta="Correo electrónico" type="email" autoComplete="email" value={f.valores.email} onChange={f.cambiar('email')} error={f.errores.email} />
      <div className="formulario__fila">
        <Campo etiqueta="Fecha de nacimiento" type="date" max={maximo} value={f.valores.fechaNacimiento} onChange={f.cambiar('fechaNacimiento')} error={f.errores.fechaNacimiento} ayuda="16 años o más." />
        <CampoContrasena valor={f.valores.contrasena} alCambiar={f.cambiar('contrasena')} error={f.errores.contrasena} ayuda="Al menos 8 caracteres." autoComplete="new-password" />
      </div>
      <Casilla checked={f.valores.aceptaPrivacidad} onChange={f.cambiar('aceptaPrivacidad')} error={f.errores.aceptaPrivacidad}>
        Leí y acepto la <Link to="/privacidad" target="_blank" rel="noopener">política de privacidad</Link>. Mis datos se tratan según la Ley 25.326.
      </Casilla>
      <Boton variante="ticket" type="submit" ancho cargando={enviando} disabled={f.bloqueado}>Crear cuenta</Boton>
      <p className="acceso__cambio">
        ¿Ya tenés cuenta? <Boton variante="texto" onClick={alIrAIngresar}>Iniciar sesión</Boton>
      </p>
    </form>
  );
}

/** P-01 Acceso (iniciar sesión / registrarse) · CU-01, CU-02. */
export default function Acceso() {
  const { usuario } = useSesion();
  const [parametros, setParametros] = useSearchParams();
  const [yaLogueado] = useState(() => usuario);
  if (yaLogueado) return <Navigate to={inicioDeRol(yaLogueado.rol)} replace />;
  const modo = parametros.get('modo') === 'registro' ? 'registro' : 'ingresar';
  const cambiarModo = (nuevo) => {
    const p = new URLSearchParams(parametros);
    if (nuevo === 'registro') p.set('modo', 'registro'); else p.delete('modo');
    p.delete('motivo');
    setParametros(p, { replace: true });
  };

  return (
    <div className="acceso">
      <aside className="acceso__escena">
        <Destellos />
        <div className="acceso__foco" aria-hidden="true" />
        <div className="acceso__escena-contenido">
          <LogoCompleto ancho={280} />
          <p className="acceso__lema">Elegí tu butaca desde casa y llegá con la entrada en el celular.</p>
          <ul className="acceso__pasos" aria-label="Cómo funciona">
            <li><span className="cifra">1</span> Elegí la película y el horario</li>
            <li><span className="cifra">2</span> Marcá tus butacas en el mapa</li>
            <li><span className="cifra">3</span> Pagá y recibí la entrada con QR</li>
          </ul>
        </div>
      </aside>

      <section className="acceso__panel">
        <div className={`ventanilla ventanilla--${modo}`}>
          <div className="ventanilla__luces" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ '--i': i }} />)}</div>
          <h1 key={modo} className="ventanilla__titulo">{modo === 'registro' ? 'Crear cuenta' : 'Ingresá'}</h1>
          <p className="ventanilla__bajada">{modo === 'registro' ? 'Registrate gratis para reservar tus butacas.' : 'Qué bueno verte de nuevo en la sala.'}</p>
          <div className="ventanilla__pestanas" role="tablist" aria-label="Acceso" data-modo={modo}>
            <span className="ventanilla__indicador" aria-hidden="true" />
            <button type="button" role="tab" aria-selected={modo === 'ingresar'} onClick={() => cambiarModo('ingresar')}>Iniciar sesión</button>
            <button type="button" role="tab" aria-selected={modo === 'registro'} onClick={() => cambiarModo('registro')}>Registrarme</button>
          </div>
          <AltoAnimado>
            <div key={modo} className={`ventanilla__form ventanilla__form--${modo}`}>
              {modo === 'registro'
                ? <FormRegistro alIrAIngresar={() => cambiarModo('ingresar')} />
                : <FormIngresar alIrARegistro={() => cambiarModo('registro')} />}
            </div>
          </AltoAnimado>
        </div>
      </section>
    </div>
  );
}

/** Contenedor que acompaña con una transición los cambios de alto de su contenido. */
function AltoAnimado({ children }) {
  const interior = useRef(null);
  const [alto, setAlto] = useState('auto');
  useLayoutEffect(() => {
    const el = interior.current;
    if (!el) return undefined;
    const obs = new ResizeObserver(([e]) => setAlto(e.borderBoxSize?.[0]?.blockSize ?? e.contentRect.height));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div className="alto-animado" style={{ height: alto }}>
      <div ref={interior}>{children}</div>
    </div>
  );
}
