import type { ReactElement } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { NombreRol } from '../../models';
import './Menu.css';

type Icono = () => ReactElement;

const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconoDashboard: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconoUsuarios: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconoParqueo: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 16V8h3.5a2.5 2.5 0 0 1 0 5H9" />
  </svg>
);

const IconoPagos: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
    <path d="M8 14h.01M16 14h.01" />
  </svg>
);

const IconoReportes: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconoGuardian: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconoBuscar: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconoVehiculo: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <path d="M3 13l1.5-5A2 2 0 0 1 6.4 6.5h11.2a2 2 0 0 1 1.9 1.5L21 13" />
    <rect x="2" y="13" width="20" height="6" rx="2" />
    <circle cx="7" cy="19" r="1.6" />
    <circle cx="17" cy="19" r="1.6" />
  </svg>
);

const IconoValidar: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconoHistorial: Icono = () => (
  <svg viewBox="0 0 24 24" {...trazo}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

export interface OpcionMenu {
  path: string;
  etiqueta: string;
  Icono: Icono;
}

const OPCIONES_POR_ROL: Record<NombreRol, OpcionMenu[]> = {
  administrador: [
    { path: '/app/dashboard', etiqueta: 'Dashboard', Icono: IconoDashboard },
    { path: '/app/usuarios', etiqueta: 'Usuarios', Icono: IconoUsuarios },
    { path: '/app/parqueo', etiqueta: 'Parqueo', Icono: IconoParqueo },
    { path: '/app/pagos', etiqueta: 'Pagos', Icono: IconoPagos },
    { path: '/app/reportes', etiqueta: 'Reportes', Icono: IconoReportes },
    { path: '/app/guardian', etiqueta: 'Control de acceso', Icono: IconoGuardian },
    { path: '/app/buscar-vehiculo', etiqueta: 'Buscar vehículo', Icono: IconoBuscar },
  ],
  guardia: [
    { path: '/app/dashboard', etiqueta: 'Dashboard', Icono: IconoDashboard },
    { path: '/app/guardian', etiqueta: 'Control de acceso', Icono: IconoGuardian },
    { path: '/app/buscar-vehiculo', etiqueta: 'Buscar vehículo', Icono: IconoBuscar },
  ],
  cobrador: [
    { path: '/app/pagos', etiqueta: 'Pagos', Icono: IconoPagos },
    { path: '/app/buscar-vehiculo', etiqueta: 'Buscar vehículo', Icono: IconoBuscar },
  ],
  usuario: [
    { path: '/app/pagar', etiqueta: 'Pagar Parqueo', Icono: IconoParqueo },
    { path: '/app/mis-vehiculos', etiqueta: 'Mis Vehículos', Icono: IconoVehiculo },
    { path: '/app/validar', etiqueta: 'Validar Parqueo', Icono: IconoValidar },
    { path: '/app/historial', etiqueta: 'Mis Pagos', Icono: IconoHistorial },
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
          <div className="app-content-inner" key={location.pathname}>
            <Outlet />
          </div>
        </main>

        <nav className="app-menu" aria-label="Menú de opciones">
          <div className="app-menu-header">Menú</div>
          {opciones.map((opcion) => (
            <NavLink
              key={opcion.path}
              to={opcion.path}
              className={({ isActive }) => `app-menu-item ${isActive ? 'activo' : ''}`}
            >
              <span className="app-menu-icon"><opcion.Icono /></span>
              <span>{opcion.etiqueta}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
