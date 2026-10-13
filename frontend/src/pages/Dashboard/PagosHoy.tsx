import { useCallback, useEffect, useState } from 'react';
import { pagosService, type EstadoDelDia } from '../../services/pagos.service';

const quetzales = (valor: number) => `Q${Number(valor).toFixed(2)}`;
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '—');
const ETIQUETA_ESTADO: Record<string, string> = { completado: 'Pagado', pendiente: 'Pendiente', fallido: 'Fallido', reembolsado: 'Reembolsado' };

/** Quiénes han pagado hoy y qué vehículos están dentro sin pago vigente. */
export function PagosHoy() {
  const [datos, setDatos] = useState<EstadoDelDia | null>(null);
  const [error, setError] = useState('');
  const [verTodos, setVerTodos] = useState(false);

  const cargar = useCallback(async () => {
    try { setDatos(await pagosService.estadoHoy()); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos de hoy.'); }
  }, []);

  useEffect(() => {
    void cargar();
    const intervalo = window.setInterval(() => void cargar(), 30_000);
    return () => window.clearInterval(intervalo);
  }, [cargar]);

  if (error && !datos) return <section className="dashboard-stats"><p className="dashboard-stats-error">{error}</p></section>;
  if (!datos) return null;

  const { totales } = datos;
  const filas = verTodos ? datos.pagos : datos.pagos.slice(0, 8);
  return (
    <section className="dashboard-stats" aria-label="Pagos de hoy">
      <div className="dashboard-stats-heading">
        <div><h2>Pagos de hoy</h2><p>Quién ya pagó y quién está dentro sin pago vigente. Se actualiza cada 30 segundos.</p></div>
      </div>

      <div className="dashboard-stats-grid">
        <article className="dashboard-stat dashboard-stat-free"><span>Placas pagadas</span><strong>{totales.pagados}</strong><small>{totales.efectivo} efectivo · {totales.en_linea} tarjeta</small></article>
        <article className="dashboard-stat"><span>Total cobrado</span><strong>{quetzales(totales.monto)}</strong><small>pagos completados hoy</small></article>
        <article className="dashboard-stat dashboard-stat-warning"><span>Pagos en curso</span><strong>{totales.pendientes}</strong><small>tarjeta sin completar</small></article>
        <article className={`dashboard-stat ${totales.dentro_sin_pago > 0 ? 'dashboard-stat-busy' : ''}`}><span>Dentro sin pago</span><strong>{totales.dentro_sin_pago}</strong><small>requieren cobro antes de salir</small></article>
      </div>

      {datos.dentro_sin_pago.length > 0 && (
        <div className="pagoshoy-alerta" role="alert">
          <strong>Vehículos dentro sin pago vigente</strong>
          <ul>
            {datos.dentro_sin_pago.map((v) => (
              <li key={v.ticket}><b>{v.placa}</b> · {v.zona}, lugar {v.lugar} · entró {new Date(v.fecha_entrada).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })}</li>
            ))}
          </ul>
        </div>
      )}

      {datos.pagos.length === 0 ? <p className="pagoshoy-vacio">Todavía no hay pagos registrados hoy.</p> : (
        <div className="pagoshoy-tabla-wrap">
          <table className="pagoshoy-tabla">
            <thead><tr><th>Placa</th><th>Tipo</th><th>Método</th><th>Monto</th><th>Recibo a nombre de</th><th>Hora</th><th>Estado</th></tr></thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.placa}</b></td>
                  <td>{p.tipo_vehiculo}</td>
                  <td>{p.metodo === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</td>
                  <td>{quetzales(p.monto)}</td>
                  <td>{p.nombre_facturacion ?? '—'}{p.nit && p.nit !== 'CF' ? ` · NIT ${p.nit}` : ''}</td>
                  <td>{hora(p.fecha_confirmacion ?? p.fecha_pago)}</td>
                  <td><span className={`pagoshoy-estado pagoshoy-${p.estado}`}>{ETIQUETA_ESTADO[p.estado] ?? p.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {datos.pagos.length > 8 && (
            <button type="button" className="pagoshoy-mas" onClick={() => setVerTodos((v) => !v)}>
              {verTodos ? 'Ver menos' : `Ver los ${datos.pagos.length} pagos`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default PagosHoy;
