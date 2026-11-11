import './Destellos.css';

// Posiciones fijas para que los destellos no salten entre renders.
const PUNTOS = [
  { x: 8, y: 22, t: 14, d: 0 }, { x: 22, y: 70, t: 9, d: 1.1 }, { x: 37, y: 12, t: 11, d: 2.3 },
  { x: 55, y: 80, t: 8, d: 0.6 }, { x: 68, y: 18, t: 13, d: 1.7 }, { x: 84, y: 60, t: 10, d: 2.9 },
  { x: 93, y: 16, t: 8, d: 0.3 }, { x: 46, y: 45, t: 7, d: 3.4 },
];

/** Destellos dorados decorativos. `tono` puede ser 'oro' o 'petroleo'. */
export default function Destellos({ tono = 'oro', cantidad = 8 }) {
  return (
    <span className={`destellos destellos--${tono}`} aria-hidden="true">
      {PUNTOS.slice(0, cantidad).map((p, i) => (
        <span
          key={i}
          className="destellos__punto"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.t, height: p.t, animationDelay: `${p.d}s` }}
        />
      ))}
    </span>
  );
}
