import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { pagosService, type EstadoDelDia } from '../../services/pagos.service';

const quetzales = (valor: number) => `Q${Number(valor).toFixed(2)}`;
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('es-GT', { timeZone: 'America/Guatemala', hour: '2-digit', minute: '2-digit' }) : '—');
const ETIQUETA_ESTADO: Record<string, string> = { completado: 'Pagado', pendiente: 'Pendiente', fallido: 'Fallido', reembolsado: 'Reembolsado' };

/** Quiénes han pagado hoy y qué vehículos están dentro sin pago vigente. */
export function PagosHoy({ revision = 0 }: { revision?: number }) {
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
  }, [cargar, revision]);

  if (error && !datos) return <section className="dashboard-stats"><p className="dashboard-stats-error">{error}</p></section>;
  if (!datos) return <section className="dashboard-stats" aria-busy="true"><p role="status">Consultando cobros y pagos por verificar…</p></section>;

  const { totales } = datos;
  const filas = verTodos ? datos.pagos : datos.pagos.slice(0, 8);
  return (
    <section className="dashboard-stats" aria-label="Pagos de hoy">
      <div className="dashboard-stats-heading">
        <div><h2>Cobros de hoy</h2><p>Solo los pagos completados cuentan como dinero cobrado. Actualización automática cada 30 segundos.</p></div><Link className="dashboard-control-link" to="/app/pagos">Consultar pagos →</Link>
      </div>

      {error && <p className="dashboard-stats-error" role="alert">{error} Se muestran los últimos datos recibidos.</p>}
      <div className="dashboard-stats-grid dashboard-payments-grid">
        <article className="dashboard-stat dashboard-stat-free"><span>Placas con pago confirmado</span><strong>{totales.pagados}</strong><small>{totales.efectivo} efectivo · {totales.en_linea} tarjeta</small></article>
        <article className="dashboard-stat"><span>Dinero cobrado hoy</span><strong>{quetzales(totales.monto)}</strong><small>pagos completados hoy</small></article>
        <article className="dashboard-stat dashboard-stat-warning"><span>Pagos con tarjeta pendientes</span><strong>{totales.pendientes}</strong><small>No incluidos en el total cobrado</small></article>
      </div>

      <section className="dashboard-attention" aria-labelledby="attention-title">
        <div className="dashboard-attention-heading"><div><span className="dashboard-section-label">ANTES DE AUTORIZAR UNA SALIDA</span><h3 id="attention-title">{totales.dentro_sin_pago} vehículos dentro sin pago vigente hoy</h3><p>Incluye entradas de días anteriores. Verifica o registra el pago al atender su salida.</p></div><Link className="dashboard-control-link" to="/app/guardian">Ir a control de acceso →</Link></div>
        {datos.dentro_sin_pago.length > 0 ? <details><summary>Ver placas y espacios ({datos.dentro_sin_pago.length})</summary><div className="pagoshoy-tabla-wrap"><table className="pagoshoy-tabla"><thead><tr><th>Placa</th><th>Ubicación</th><th>Fecha de entrada</th></tr></thead><tbody>{datos.dentro_sin_pago.map(v => <tr key={v.ticket}><td><strong>{v.placa}</strong></td><td>{v.zona} · {v.lugar}</td><td>{new Date(v.fecha_entrada).toLocaleString('es-GT', { timeZone: 'America/Guatemala', dateStyle: 'short', timeStyle: 'short' })}</td></tr>)}</tbody></table></div></details> : <p>No hay vehículos pendientes de pago dentro del parqueo.</p>}
      </section>

      <details className="dashboard-transactions"><summary>Movimientos de pago de hoy ({datos.pagos.length})</summary><p className="dashboard-actualizado">El importe de cada operación se muestra junto a su estado. Los pendientes no se suman a lo cobrado.</p>
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
      </details>
    </section>
  );
}

export default PagosHoy;
