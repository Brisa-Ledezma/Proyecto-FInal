import './Privacidad.css';

/** Política de privacidad publicada (RNF-14, Ley 25.326). */
export default function Privacidad() {
  return (
    <div className="contenedor pagina privacidad">
      <div className="encabezado-pagina">
        <div>
          <span className="rotulo">Golden Screen Cinema</span>
          <h1 className="titulo-pantalla">Política de privacidad</h1>
        </div>
      </div>

      <article className="privacidad__texto">
        <p>
          En Golden Screen tratamos tus datos personales de acuerdo con la Ley 25.326 de Protección de los Datos Personales
          de la República Argentina. Esta política explica qué datos pedimos, para qué los usamos y cómo podés ejercer tus derechos.
        </p>

        <h2>Qué datos pedimos</h2>
        <ul>
          <li>Nombre, apellido y correo electrónico, para identificar tu cuenta y enviarte avisos sobre tus compras.</li>
          <li>Fecha de nacimiento, para verificar que tengas 16 años o más.</li>
          <li>Tus reservas, entradas y el registro de ingreso a la sala.</li>
        </ul>

        <h2>Qué datos no guardamos</h2>
        <p>
          No guardamos los datos de tu tarjeta. De cada pago solo registramos el medio utilizado, el monto, el estado y el número de
          operación. Tu contraseña se guarda cifrada y nadie del cine puede leerla.
        </p>

        <h2>Para qué los usamos</h2>
        <ul>
          <li>Emitir y validar tus entradas.</li>
          <li>Avisarte por correo si una función que compraste se cancela.</li>
          <li>Elaborar estadísticas internas de recaudación y asistencia, sin identificar a las personas.</li>
        </ul>

        <h2>Con quién los compartimos</h2>
        <p>No compartimos tus datos personales con terceros.</p>

        <h2>Tus derechos</h2>
        <p>
          Podés pedir el acceso, la rectificación o la supresión de tus datos en la boletería del cine. La Agencia de Acceso a la
          Información Pública, como órgano de control de la Ley 25.326, atiende las denuncias y reclamos relacionados con el
          incumplimiento de las normas sobre protección de datos personales.
        </p>
      </article>
    </div>
  );
}
