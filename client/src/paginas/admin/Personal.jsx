import { useState } from 'react';
import { Plus, Power, UserCircle } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useNotificar } from '../../contexto/NotificacionesContexto.jsx';
import { esEmail } from '../../utiles/validaciones.js';
import { fechaCorta } from '../../utiles/formato.js';
import Tabla from '../../componentes/admin/Tabla.jsx';
import Campo from '../../componentes/ui/Campo.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Aviso from '../../componentes/ui/Aviso.jsx';
import Estado from '../../componentes/ui/Estado.jsx';
import Modal from '../../componentes/ui/Modal.jsx';
import { Cargando, ErrorCarga } from '../../componentes/ui/Estados.jsx';
import './Admin.css';

const ROLES = { ENCARGADO_SALA: 'Encargado de sala', ADMINISTRADOR: 'Administrador' };

function validar(v) {
  const e = {};
  if (!v.nombre.trim()) e.nombre = 'Completá el nombre.';
  if (!v.apellido.trim()) e.apellido = 'Completá el apellido.';
  if (!v.email.trim()) e.email = 'Completá el correo electrónico.';
  else if (!esEmail(v.email)) e.email = 'Ingresá un correo válido, por ejemplo nombre@gmail.com.';
  if (!v.rol) e.rol = 'Elegí el rol de la cuenta.';
  if (v.contrasena.length < 8) e.contrasena = 'La contraseña provisoria tiene que tener al menos 8 caracteres.';
  return e;
}

/** CU-15, pasos 3 y 4: alta de una cuenta del personal. */
function NuevaCuenta({ alGuardar, alCerrar }) {
  const [valores, setValores] = useState({ nombre: '', apellido: '', email: '', rol: '', contrasena: '' });
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState({});
  const [guardando, setGuardando] = useState(false);
  const locales = validar(valores);
  const errores = intentado ? { ...erroresServidor, ...locales } : erroresServidor;
  const cambiar = (c) => (e) => { setValores((v) => ({ ...v, [c]: e.target.value })); setErroresServidor(({ [c]: _, ...r }) => r); };

  const guardar = async (e) => {
    e.preventDefault();
    setIntentado(true);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try { alGuardar(await api.post('/admin/personal', valores)); } catch (err) { setErroresServidor(err.campos ?? { email: err.message }); } finally { setGuardando(false); }
  };

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Nueva cuenta del personal"
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="ticket" type="submit" form="form-personal" cargando={guardando} disabled={intentado && Object.keys(locales).length > 0}>Crear cuenta</Boton>
        </>
      )}
    >
      <form id="form-personal" className="formulario" onSubmit={guardar} noValidate>
        <div className="formulario__fila">
          <Campo etiqueta="Nombre" value={valores.nombre} onChange={cambiar('nombre')} error={errores.nombre} autoComplete="off" />
          <Campo etiqueta="Apellido" value={valores.apellido} onChange={cambiar('apellido')} error={errores.apellido} autoComplete="off" />
        </div>
        <Campo etiqueta="Correo electrónico" type="email" value={valores.email} onChange={cambiar('email')} error={errores.email} autoComplete="off" />
        <Campo etiqueta="Rol" como="select" value={valores.rol} onChange={cambiar('rol')} error={errores.rol} ayuda="El encargado de sala solo accede al control de ingreso.">
          <option value="">Elegí el rol</option>
          <option value="ENCARGADO_SALA">Encargado de sala</option>
          <option value="ADMINISTRADOR">Administrador</option>
        </Campo>
        <Campo etiqueta="Contraseña provisoria" type="text" value={valores.contrasena} onChange={cambiar('contrasena')} error={errores.contrasena} ayuda="Al menos 8 caracteres. Comunicala a la persona en forma privada." autoComplete="new-password" />
      </form>
    </Modal>
  );
}

/** P-14 Personal · RF-17 · CU-15. */
export default function Personal() {
  const notificar = useNotificar();
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/admin/personal'), []);
  const [creando, setCreando] = useState(false);
  const [desactivando, setDesactivando] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (cargando && !datos) return <Cargando texto="Cargando el personal…" />;
  if (error) return <div className="contenedor pagina"><ErrorCarga error={error} alReintentar={recargar} /></div>;

  const cambiarEstado = async (cuenta, accion) => {
    setEnviando(true);
    try {
      await api.post(`/admin/personal/${cuenta.id}/${accion}`);
      notificar(accion === 'desactivar' ? `Desactivaste la cuenta de ${cuenta.nombre}. Ya no puede iniciar sesión.` : `Activaste la cuenta de ${cuenta.nombre}.`);
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setEnviando(false);
      setDesactivando(null);
      recargar({ silenciosa: true });
    }
  };

  return (
    <div className="contenedor pagina admin">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Administración</span>
          <h1 className="titulo-pantalla">Personal</h1>
          <p className="texto-2">Cuentas de encargados de sala y administradores. Las cuentas de espectadores se crean desde el registro.</p>
        </div>
        <Boton variante="ticket" icono={<Plus weight="bold" />} onClick={() => setCreando(true)}>Nueva cuenta</Boton>
      </div>

      <Tabla
        titulo="Cuentas del personal"
        filas={datos}
        claseFila={(c) => (c.activo ? '' : 'inactiva')}
        columnas={[
          { clave: 'nombre', titulo: 'Nombre', clase: 'ancho-completo', render: (c) => (
            <div className="celda-titulo">
              <strong><UserCircle weight="duotone" aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />{c.nombre} {c.apellido}{c.esPropia && <span className="texto-2"> (tu cuenta)</span>}</strong>
              <span className="texto-2">{c.email}</span>
            </div>
          ) },
          { clave: 'rol', titulo: 'Rol', render: (c) => ROLES[c.rol] },
          { clave: 'alta', titulo: 'Alta', render: (c) => <span className="cifra">{fechaCorta(c.alta)}</span> },
          { clave: 'estado', titulo: 'Estado', render: (c) => <Estado estado={c.activo ? 'ACTIVA' : 'INACTIVA'} /> },
          { clave: 'acciones', titulo: 'Acciones', alinear: 'right', clase: 'ancho-completo sin-etiqueta', render: (c) => (
            <div className="tabla-gestion__acciones">
              {c.esPropia ? <span className="texto-2">No podés desactivar tu propia cuenta</span>
                : c.activo
                  ? <Boton variante="peligro" tamano="chico" icono={<Power />} onClick={() => setDesactivando(c)}>Desactivar</Boton>
                  : <Boton variante="secundario" tamano="chico" icono={<Power />} onClick={() => cambiarEstado(c, 'activar')}>Activar</Boton>}
            </div>
          ) },
        ]}
      />

      {creando && (
        <NuevaCuenta
          alCerrar={() => setCreando(false)}
          alGuardar={(c) => { setCreando(false); recargar({ silenciosa: true }); notificar(`Cuenta creada para ${c.nombre}. Ya puede iniciar sesión con la contraseña provisoria.`); }}
        />
      )}

      <Modal
        abierto={Boolean(desactivando)}
        alCerrar={() => setDesactivando(null)}
        ancho="chico"
        titulo="¿Desactivar la cuenta?"
        pie={(
          <>
            <Boton variante="secundario" onClick={() => setDesactivando(null)}>Volver</Boton>
            <Boton variante="peligro" cargando={enviando} onClick={() => cambiarEstado(desactivando, 'desactivar')}>Sí, desactivar</Boton>
          </>
        )}
      >
        {desactivando && <Aviso tipo="advertencia">{desactivando.nombre} {desactivando.apellido} no va a poder iniciar sesión desde este momento. Podés volver a activar la cuenta cuando quieras.</Aviso>}
      </Modal>
    </div>
  );
}
