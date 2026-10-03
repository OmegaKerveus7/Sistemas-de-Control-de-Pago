import { useEffect, useMemo, useState } from 'react';
import { parqueoService, type Parqueo as RegistroParqueo } from '../../services/parqueo.service';
import './Parqueo.css';

export function Parqueo() {
  const [registros, setRegistros] = useState<RegistroParqueo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'completado'>('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    parqueoService
      .listar()
      .then(setRegistros)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el parqueo'))
      .finally(() => setCargando(false));
  }, []);

  const registrosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return registros.filter((r) => {
      if (filtro !== 'todos' && r.estado !== filtro) return false;
      if (!termino) return true;
      return `${r.placa ?? ''} ${r.lugar} ${r.zona} ${r.ticket ?? ''}`.toLowerCase().includes(termino);
    });
  }, [registros, filtro, busqueda]);

  const activos = registros.filter((r) => r.estado === 'activo').length;

  function formatearFecha(fecha: string | null) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString();
  }

  return (
    <section className="parqueo-page">
      <div>
        <h1 className="parqueo-title">Parqueo</h1>
        <p className="parqueo-subtitle">
          {activos} vehículo{activos === 1 ? '' : 's'} actualmente dentro, {registros.length} registros en total.
        </p>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <div className="parqueo-toolbar">
        <input
          className="form-input usuarios-input-plano parqueo-buscador"
          placeholder="Buscar por placa, lugar, zona o ticket..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="parqueo-filtros">
          {(['todos', 'activo', 'completado'] as const).map((opcion) => (
            <button
              key={opcion}
              className={`parqueo-filtro-btn ${filtro === opcion ? 'activo' : ''}`}
              onClick={() => setFiltro(opcion)}
              type="button"
            >
              {opcion === 'todos' ? 'Todos' : opcion === 'activo' ? 'Activos' : 'Completados'}
            </button>
          ))}
        </div>
      </div>

      <div className="card parqueo-card">
        {cargando ? (
          <div className="parqueo-estado"><span className="spinner" /> Cargando parqueo...</div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="parqueo-estado">No hay registros que coincidan.</div>
        ) : (
          <div className="parqueo-tabla-wrapper">
            <table className="parqueo-tabla">
              <thead>
                <tr>
                  <th>Lugar</th>
                  <th>Zona</th>
                  <th>Placa</th>
                  <th>Ticket</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Costo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r) => (
                  <tr key={r.id}>
                    <td>{r.lugar}</td>
                    <td>{r.zona}</td>
                    <td className="parqueo-placa">{r.placa ?? '—'}</td>
                    <td>{r.ticket ?? '—'}</td>
                    <td>{formatearFecha(r.fecha_entrada)}</td>
                    <td>{formatearFecha(r.fecha_salida)}</td>
                    <td>{r.costo != null ? `Q${Number(r.costo).toFixed(2)}` : '—'}</td>
                    <td>
                      <span className={`parqueo-estado-texto ${r.estado}`}>
                        {r.estado === 'activo' ? 'Activo' : 'Completado'}
                      </span>
                    </td>
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

export default Parqueo;
