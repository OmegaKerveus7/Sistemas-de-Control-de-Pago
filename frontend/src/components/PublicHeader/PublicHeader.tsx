import { Link } from 'react-router-dom';
import './PublicHeader.css';

export function PublicHeader() {
  return (
    <header className="public-header">
      <Link to="/" className="public-brand">
        <img src={`${import.meta.env.BASE_URL}colegio_belen-192w.webp`} alt="Escudo del Colegio Mixto Belén" width="64" height="64" />
        <span><strong>Parqueo Zona 19</strong><small>Colegio Mixto Belén</small></span>
      </Link>
      <Link to="/" className="public-back"><span aria-hidden="true">←</span> Inicio</Link>
    </header>
  );
}
