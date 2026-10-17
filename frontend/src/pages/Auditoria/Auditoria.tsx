import { useEffect, useMemo, useState } from 'react';
import { auditoriaService, type EntidadAuditoria, type EventoAuditoria } from '../../services/auditoria.service';
import './Auditoria.css';

const ETIQUETAS_ENTIDAD: Record<EntidadAuditoria, string> = {
  usuario: 'Usuario',
  vehiculo: 'Vehículo',
  ticket: 'Ticket',
  parqueo: 'Parqueo',
  pago: 'Pago',
};

export function Auditoria() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entidad, setEntidad] = useState<EntidadAuditoria | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    auditoriaService
      .listar()
      .then(setEventos)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoría'))
      .finally(() => setCargando(false));
  }, []);

  const eventosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return eventos.filter((e) => {
      if (entidad !== 'todos' && e.entidad !== entidad) return false;
      if (!termino) return true;
      return `${e.accion} ${e.actor_nombres ?? ''} ${e.actor_apellidos ?? ''} ${e.descripcion ?? ''}`
        .toLowerCase()
        .includes(termino);
    });
  }, [eventos, entidad, busqueda]);

  return (
    <section className="auditoria-page">
      <div>
        <h1 className="auditoria-title">Auditoría</h1>
        <p className="auditoria-subtitle">{eventos.length} eventos registrados en el sistema.</p>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <div className="auditoria-toolbar">
        <input
          className="form-input usuarios-input-plano auditoria-buscador"
          placeholder="Buscar por acción, responsable o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="auditoria-filtros">
          <button
            className={`auditoria-filtro-btn ${entidad === 'todos' ? 'activo' : ''}`}
            onClick={() => setEntidad('todos')}
            type="button"
          >
            Todos
          </button>
          {(Object.keys(ETIQUETAS_ENTIDAD) as EntidadAuditoria[]).map((opcion) => (
            <button
              key={opcion}
              className={`auditoria-filtro-btn ${entidad === opcion ? 'activo' : ''}`}
              onClick={() => setEntidad(opcion)}
              type="button"
            >
              {ETIQUETAS_ENTIDAD[opcion]}
            </button>
          ))}
        </div>
      </div>

      <div className="card auditoria-card">
        {cargando ? (
          <div className="auditoria-estado"><span className="spinner" /> Cargando auditoría...</div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="auditoria-estado">No hay eventos que coincidan.</div>
        ) : (
          <div className="auditoria-tabla-wrapper">
            <table className="auditoria-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Entidad</th>
                  <th>Acción</th>
                  <th>Responsable</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {eventosFiltrados.map((e, i) => (
                  <tr key={`${e.entidad}-${e.entidad_id}-${i}`}>
                    <td>{new Date(e.fecha).toLocaleString()}</td>
                    <td>
                      <span className={`auditoria-badge-entidad ${e.entidad}`}>
                        {ETIQUETAS_ENTIDAD[e.entidad]} #{e.entidad_id}
                      </span>
                    </td>
                    <td className="auditoria-accion">{e.accion.replace(/_/g, ' ')}</td>
                    <td>{e.actor_nombres ? `${e.actor_nombres} ${e.actor_apellidos ?? ''}` : '—'}</td>
                    <td className="auditoria-detalle">{e.descripcion ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default Auditoria;
