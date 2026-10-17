import { Link } from 'react-router-dom';
import './UserSectionHeader.css';

export function UserSectionHeader({ title, description }: { title: string; description: string }) {
  return <header className="user-section-header">
    <Link className="user-back" to="/">← Volver al inicio</Link>
    <span className="user-section-eyebrow">MI PARQUEO</span>
    <h1>{title}</h1><p>{description}</p>
  </header>;
}
