import './Afiche.css';

// Tono del afiche provisorio según el género, para distinguir las películas sin imagen.
const TONOS = {
  'Animación': 38, 'Ciencia ficción': 190, 'Acción': 8, 'Thriller': 330, 'Drama': 280,
  'Fantasía': 160, 'Terror': 350, 'Comedia': 45, 'Documental': 100, 'Romance': 340, 'Aventura': 25,
};

/**
 * Afiche de la película. Si todavía no se cargó la imagen, muestra un afiche
 * provisorio con el título, para que la cartelera no quede con huecos.
 */
export default function Afiche({ pelicula, tamano = 'medio', className = '' }) {
  if (pelicula.afiche) {
    return (
      <div className={`afiche afiche--${tamano} ${className}`}>
        <img src={pelicula.afiche} alt={`Afiche de ${pelicula.titulo}`} loading="lazy" />
      </div>
    );
  }
  const tono = TONOS[pelicula.genero] ?? 20;
  return (
    <div className={`afiche afiche--${tamano} afiche--provisorio ${className}`} style={{ '--tono': tono }} role="img" aria-label={`Afiche provisorio de ${pelicula.titulo}`}>
      <span className="afiche__genero">{pelicula.genero}</span>
      <span className="afiche__titulo">{pelicula.titulo}</span>
      <span className="afiche__marca">Golden Screen</span>
    </div>
  );
}
