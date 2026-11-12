import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { fechaCorta, hora } from '../../utiles/formato.js';
import Estado from '../ui/Estado.jsx';
import './EntradaDigital.css';

/**
 * Entrada digital (RF-09): película, sala, fecha, hora, fila, butaca y código QR único,
 * con el código impreso debajo para validarlo a mano si la cámara no lo lee (RF-10).
 */
export default function EntradaDigital({ entrada, funcion }) {
  const [qr, setQr] = useState(null);

  useEffect(() => {
    let vigente = true;
    // El QR lleva el enlace público de la entrada: si lo escanea cualquier celular, abre una
    // página que confirma que es una entrada de Golden Screen, única e intransferible.
    // El lector del encargado toma el código de ese enlace.
    QRCode.toDataURL(`${window.location.origin}/entrada/${entrada.codigo}`, { margin: 1, width: 240, errorCorrectionLevel: 'M', color: { dark: '#140b0d', light: '#fbf4e6' } })
      .then((url) => { if (vigente) setQr(url); });
    return () => { vigente = false; };
  }, [entrada.codigo]);

  const inactiva = entrada.estado !== 'VALIDA';

  return (
    <article className={`entrada-digital ${inactiva ? 'entrada-digital--inactiva' : ''}`} aria-label={`Entrada para ${funcion.pelicula.titulo}, fila ${entrada.fila}, butaca ${entrada.numero}`}>
      <div className="entrada-digital__cuerpo">
        <div className="entrada-digital__cabecera">
          <span className="entrada-digital__cine">Golden Screen Cinema</span>
          <Estado estado={entrada.estado} />
        </div>
        <h3 className="entrada-digital__titulo">{funcion.pelicula.titulo}</h3>
        <dl className="entrada-digital__datos">
          <div><dt>Sala</dt><dd>{funcion.sala.nombre}</dd></div>
          <div><dt>Fecha</dt><dd className="cifra">{fechaCorta(funcion.inicio)}</dd></div>
          <div><dt>Hora</dt><dd className="cifra">{hora(funcion.inicio)}</dd></div>
          <div><dt>Fila</dt><dd className="entrada-digital__grande">{entrada.fila}</dd></div>
          <div><dt>Butaca</dt><dd className="entrada-digital__grande cifra">{entrada.numero}</dd></div>
          <div><dt>Clasif.</dt><dd>{funcion.pelicula.clasificacion}</dd></div>
        </dl>
      </div>
      <div className="entrada-digital__talon">
        {qr ? <img src={qr} alt={`Código QR de la entrada ${entrada.codigo}`} className="entrada-digital__qr" width="132" height="132" /> : <span className="entrada-digital__qr" />}
        <span className="entrada-digital__codigo cifra">{entrada.codigo}</span>
        <span className="entrada-digital__aviso">Única e intransferible</span>
      </div>
    </article>
  );
}
