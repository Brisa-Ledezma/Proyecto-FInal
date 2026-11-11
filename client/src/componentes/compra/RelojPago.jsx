import { useEffect, useRef, useState } from 'react';
import './RelojPago.css';

const RADIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Temporizador de pago de 5 minutos (RN-02). Llama a `alTerminar` al llegar a cero. */
export default function RelojPago({ segundos, total = 300, pausado = false, alTerminar }) {
  const [restante, setRestante] = useState(segundos);
  const fin = useRef(Date.now() + segundos * 1000);
  const avisado = useRef(false);

  useEffect(() => {
    fin.current = Date.now() + segundos * 1000;
    avisado.current = false;
    setRestante(segundos);
  }, [segundos]);

  useEffect(() => {
    if (pausado) return undefined;
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((fin.current - Date.now()) / 1000));
      setRestante(r);
      if (r === 0 && !avisado.current) { avisado.current = true; alTerminar?.(); }
    }, 250);
    return () => clearInterval(t);
  }, [pausado, alTerminar]);

  const minutos = Math.floor(restante / 60);
  const seg = String(restante % 60).padStart(2, '0');
  const urgente = restante <= 60;

  return (
    <div className={`reloj-pago ${urgente ? 'reloj-pago--urgente' : ''}`} role="timer" aria-label={`Tiempo para pagar: ${minutos} minutos ${seg} segundos`}>
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <circle className="reloj-pago__fondo" cx="48" cy="48" r={RADIO} />
        <circle className="reloj-pago__arco" cx="48" cy="48" r={RADIO} strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={CIRCUNFERENCIA * (1 - restante / total)} />
      </svg>
      <div className="reloj-pago__texto">
        <strong className="cifra">{minutos}:{seg}</strong>
        <span>para pagar</span>
      </div>
    </div>
  );
}
