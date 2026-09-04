import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { NombreRol } from '../../models';
import './Menu.css';

export interface OpcionMenu {
  path: string;
  etiqueta: string;
  icono: string;
}

const OPCIONES_POR_ROL: Record<NombreRol, OpcionMenu[]> = {
  administrador: [
    { path: '/app/dashboard', etiqueta: 'Dashboard', icono: '📊' },
    { path: '/app/usuarios', etiqueta: 'Usuarios', icono: '👤' },
    { path: '/app/parqueo', etiqueta: 'Parqueo', icono: '🅿️' },
    { path: '/app/pagos', etiqueta: 'Pagos', icono: '💳' },
    { path: '/app/tarifas', etiqueta: 'Tarifas', icono: '💰' },
    { path: '/app/auditoria', etiqueta: 'Auditoría', icono: '📋' },
  ],
  guardia: [
    { path: '/app/dashboard', etiqueta: 'Dashboard', icono: '📊' },
    { path: '/app/validar', etiqueta: 'Validar Parqueo', icono: '✅' },
  ],
  usuario: [
    { path: '/app/pagar', etiqueta: 'Pagar Parqueo', icono: '🅿️' },
    { path: '/app/validar', etiqueta: 'Validar Parqueo', icono: '✅' },
  ],
};

export { OPCIONES_POR_ROL };

const BASE = import.meta.env.BASE_URL;

export function Menu() {
  const { usuario, cerrarSesion } = useAuth();
  const location = useLocation();

  if (!usuario) return <Navigate to="/login" replace />;

  const opciones = OPCIONES_POR_ROL[usuario.rol] ?? [];
  const rutaInicial = opciones[0]?.path ?? '/login';
  const permitido = opciones.some((opcion) => location.pathname.startsWith(opcion.path));
  if (!permitido) return <Navigate to={rutaInicial} replace />;

  return (
    <div className="app-dashboard">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-brand-logo">
            <img src={`${BASE}colegio_belen-192w.webp`} alt="Colegio Mixto Belén" width="42" height="42" />
          </div>
          <div className="app-brand-text">
            <span className="app-brand-title">Sistema de Gestión de Parqueo</span>
            <span className="app-brand-subtitle">Zona 19 · Colegio Mixto Belén</span>
          </div>
        </div>

        <div className="app-header-user">
          <div className="app-user-info">
            <span className="app-user-greeting">Bienvenido(a),</span>
            <span className="app-user-name">
              {usuario.nombres} {usuario.apellidos}
            </span>
            <span className="app-user-rol">{usuario.rol}</span>
          </div>
          <button className="app-logout" onClick={cerrarSesion} title="Cerrar sesión">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      <div className="app-body">
        <main className="app-content">
          <Outlet />
        </main>

        <nav className="app-menu" aria-label="Menú de opciones">
          <div className="app-menu-header">Menú</div>
          {opciones.map((opcion) => (
            <NavLink
              key={opcion.path}
              to={opcion.path}
              className={({ isActive }) => `app-menu-item ${isActive ? 'activo' : ''}`}
            >
              <span className="app-menu-icon">{opcion.icono}</span>
              <span>{opcion.etiqueta}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}