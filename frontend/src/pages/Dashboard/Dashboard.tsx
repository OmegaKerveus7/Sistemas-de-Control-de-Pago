import { Link } from 'react-router-dom';
import { OPCIONES_POR_ROL } from '../../components/Menu';
import { useAuth } from '../../hooks/useAuth';
import type { OpcionMenu } from '../../components/Menu';
import './Dashboard.css';

const DETALLE: Record<string, { descripcion: string }> = {
  '/app/dashboard': { descripcion: 'Vista general del sistema' },
  '/app/usuarios': { descripcion: 'Administra usuarios y roles' },
  '/app/parqueo': { descripcion: 'Gestiona entradas y salidas' },
  '/app/pagos': { descripcion: 'Registra y consulta pagos' },
  '/app/tarifas': { descripcion: 'Administra tarifas' },
  '/app/auditoria': { descripcion: 'Consulta el registro de auditoría' },
  '/app/validar': { descripcion: 'Verifica el estado de un vehículo' },
  '/app/reportes': { descripcion: 'Consulta reportes' },
  '/app/pagar': { descripcion: 'Realiza el pago de tu estancia' },
};

export function Dashboard() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const opciones: OpcionMenu[] = (rol && OPCIONES_POR_ROL[rol]) ?? [];

  return (
    <section className="dashboard-page">
      <div className="dashboard-hello">
        <h1 className="dashboard-title">
          ¡Bienvenido(a), {usuario?.nombres} {usuario?.apellidos}!
        </h1>
        <p className="dashboard-subtitle">
          Has iniciado sesión como <strong>{rol}</strong>. Selecciona una opción para comenzar.
        </p>
      </div>

      <div className="dashboard-cards">
        {opciones.map((opcion) => (
          <Link key={opcion.path} to={opcion.path} className="dashboard-card">
            <span className="dashboard-card-icon">{opcion.icono}</span>
            <span className="dashboard-card-title">{opcion.etiqueta}</span>
            <span className="dashboard-card-desc">{DETALLE[opcion.path]?.descripcion ?? ''}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}