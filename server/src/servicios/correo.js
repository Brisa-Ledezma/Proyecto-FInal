import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { consultar } from '../db.js';

let transporte = null;
let esEthereal = false;

/**
 * Transporte SMTP: Mailtrap (u otro servidor) si está configurado en .env;
 * si no, una bandeja de prueba de Ethereal creada al vuelo.
 * En ningún caso los correos llegan a casillas reales.
 */
async function obtenerTransporte() {
  if (transporte) return transporte;
  if (config.correo.host) {
    // 465 usa TLS directo; el resto (2525, 587) negocia TLS con STARTTLS.
    // En el plan gratuito de Render solo funciona el 2525: 25, 465 y 587 están bloqueados.
    transporte = nodemailer.createTransport({
      host: config.correo.host,
      port: config.correo.port,
      secure: config.correo.port === 465,
      auth: { user: config.correo.user, pass: config.correo.pass },
    });
  } else {
    if (config.produccion) {
      console.warn('[correo] MAIL_HOST está vacío: los correos irán a Ethereal y no llegarán a nadie. Configurá MAIL_* en producción.');
    }
    const cuenta = await nodemailer.createTestAccount();
    transporte = nodemailer.createTransport({ host: cuenta.smtp.host, port: cuenta.smtp.port, secure: cuenta.smtp.secure, auth: { user: cuenta.user, pass: cuenta.pass } });
    esEthereal = true;
    console.log(`[correo] Usando bandeja de prueba Ethereal (${cuenta.user}).`);
  }
  return transporte;
}

function plantilla({ titulo, parrafos, boton }) {
  const cuerpo = parrafos.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#3b2a2f">${p}</p>`).join('');
  const accion = boton
    ? `<p style="margin:26px 0"><a href="${boton.url}" style="display:inline-block;background:#d6a84e;color:#1a1004;text-decoration:none;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:14px 26px;border-radius:4px">${boton.texto}</a></p>
       <p style="margin:0;font-size:13px;color:#6e5c56">Si el botón no funciona, copiá este enlace en tu navegador:<br>${boton.url}</p>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f3eadb;font-family:Segoe UI,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="100%" style="max-width:560px;background:#fffdf8;border-radius:10px;overflow:hidden;border:1px solid #e2d5c3">
        <tr><td style="background:#5c1224;border-bottom:3px solid #d6a84e;padding:20px 28px">
          <span style="font-family:Georgia,serif;font-size:24px;color:#f1d592;font-weight:bold">Golden Screen</span>
          <span style="display:block;font-size:11px;letter-spacing:.5em;color:#f1d592;margin-top:4px">CINEMA</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:22px;color:#5c1224">${titulo}</h1>
          ${cuerpo}${accion}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f3eadb;font-size:12px;color:#6e5c56">Golden Screen Cinema · Este es un mensaje automático, no lo respondas.</td></tr>
      </table>
    </td></tr></table></body></html>`;
}

async function enviar({ para, asunto, tipo, html }) {
  try {
    const t = await obtenerTransporte();
    const info = await t.sendMail({ from: config.correo.remitente, to: para, subject: asunto, html });
    const vistaPrevia = esEthereal ? nodemailer.getTestMessageUrl(info) : null;
    if (vistaPrevia) console.log(`[correo] "${asunto}" para ${para}: ${vistaPrevia}`);
    await consultar('INSERT INTO correo_enviado (destinatario, asunto, tipo, vista_previa) VALUES (?, ?, ?, ?)', [para, asunto, tipo, vistaPrevia || null]);
    return true;
  } catch (error) {
    // Un problema con el correo no debe frenar la operación principal.
    console.error(`[correo] No se pudo enviar "${asunto}" a ${para}:`, error.message);
    return false;
  }
}

/** RF-01: correo para confirmar la cuenta. */
export function enviarConfirmacionCuenta(usuario, token) {
  const url = `${config.appUrl}/verificar/${token}`;
  return enviar({
    para: usuario.email,
    asunto: 'Confirmá tu cuenta de Golden Screen',
    tipo: 'CONFIRMACION_CUENTA',
    html: plantilla({
      titulo: `¡Hola, ${usuario.nombre}!`,
      parrafos: ['Gracias por crear tu cuenta en Golden Screen. Para activarla y empezar a reservar tus butacas, confirmá tu correo.'],
      boton: { texto: 'Confirmar mi cuenta', url },
    }),
  });
}

/** RN-14 y RN-15: aviso de función cancelada a quienes tenían entradas. */
export function enviarAvisoFuncionCancelada({ email, nombre, titulo, fecha, sala, entradas }) {
  return enviar({
    para: email,
    asunto: `Se canceló la función de ${titulo}`,
    tipo: 'FUNCION_CANCELADA',
    html: plantilla({
      titulo: 'Tu función fue cancelada',
      parrafos: [
        `Hola, ${nombre}. Te avisamos que la función de <strong>${titulo}</strong> del ${fecha} en la ${sala} fue cancelada.`,
        `Tus ${entradas} ${entradas === 1 ? 'entrada quedó anulada' : 'entradas quedaron anuladas'}. El cambio o la devolución se realiza en forma presencial en la boletería del cine.`,
        'Disculpá las molestias.',
      ],
    }),
  });
}
