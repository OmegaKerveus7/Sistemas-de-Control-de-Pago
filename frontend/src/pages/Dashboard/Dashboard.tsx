import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { OPCIONES_POR_ROL } from '../../components/Menu';
import { useAuth } from '../../hooks/useAuth';
import type { OpcionMenu } from '../../components/Menu';
import { guardianService, type EstadisticasGuardian, type ResumenGuardian } from '../../services/guardian.service';
import './Dashboard.css';

const DETALLE: Record<string, { descripcion: string }> = {
  '/app/dashboard': { descripcion: 'Vista general del sistema' },
  '/app/usuarios': { descripcion: 'Administra usuarios y roles' },
  '/app/parqueo': { descripcion: 'Gestiona entradas y salidas' },
  '/app/pagos': { descripcion: 'Registra y consulta pagos' },
  '/app/tarifas': { descripcion: 'Administra tarifas' },
  '/app/auditoria': { descripcion: 'Consulta el registro de auditoría' },
  '/app/guardian': { descripcion: 'Registra entradas, salidas y valida pagos' },
  '/app/validar': { descripcion: 'Verifica el estado de un vehículo' },
  '/app/reportes': { descripcion: 'Consulta reportes' },
  '/app/pagar': { descripcion: 'Realiza el pago de tu estancia' },
};

export function Dashboard() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const opciones: OpcionMenu[] = (rol && OPCIONES_POR_ROL[rol]) ?? [];
  const [resumen, setResumen] = useState<ResumenGuardian | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGuardian | null>(null);
  const [errorEstadisticas, setErrorEstadisticas] = useState<string | null>(null);
  const esPersonalParqueo = rol === 'guardia' || rol === 'administrador';

  useEffect(() => {
    if (!esPersonalParqueo) return;
    void Promise.all([guardianService.resumen(), guardianService.estadisticas()])
      .then(([nuevoResumen, nuevasEstadisticas]) => {
        setResumen(nuevoResumen);
        setEstadisticas(nuevasEstadisticas);
      })
      .catch((error: unknown) => setErrorEstadisticas(error instanceof Error ? error.message : 'No se pudieron cargar las estadísticas.'));
  }, [esPersonalParqueo]);

  const numero = (valor: number | string | undefined) => Number(valor ?? 0);

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

      {esPersonalParqueo && (
        <section className="dashboard-stats" aria-label="Estadísticas de parqueo">
          <div className="dashboard-stats-heading">
            <div><h2>Resumen operativo</h2><p>Datos actuales del parqueo y movimientos registrados hoy.</p></div>
            <Link to="/app/guardian" className="dashboard-control-link">Ir a Control de acceso</Link>
          </div>
          {errorEstadisticas ? <p className="dashboard-stats-error">{errorEstadisticas}</p> : (
            <div className="dashboard-stats-grid">
              <article className="dashboard-stat dashboard-stat-free"><span>Lugares disponibles</span><strong>{numero(resumen?.disponibles)}</strong><small>de {numero(resumen?.total)} configurados</small></article>
              <article className="dashboard-stat dashboard-stat-busy"><span>Vehículos dentro</span><strong>{numero(estadisticas?.vehiculos_activos)}</strong><small>{numero(resumen?.ocupados)} lugares ocupados</small></article>
              <article className="dashboard-stat"><span>Entradas hoy</span><strong>{numero(estadisticas?.entradas_hoy)}</strong><small>registros de acceso</small></article>
              <article className="dashboard-stat"><span>Salidas hoy</span><strong>{numero(estadisticas?.salidas_hoy)}</strong><small>lugares liberados</small></article>
              <article className="dashboard-stat dashboard-stat-warning"><span>Pagos pendientes</span><strong>{numero(estadisticas?.pagos_pendientes)}</strong><small>{numero(estadisticas?.sin_pago)} sin pago registrado</small></article>
            </div>
          )}
        </section>
      )}

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
