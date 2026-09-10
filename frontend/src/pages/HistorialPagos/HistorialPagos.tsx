import { useEffect, useMemo, useState } from 'react';
import type { PagoHistorial } from '../../models';
import { pagosService } from '../../services/pagos.service';
import './HistorialPagos.css';

const ETIQUETAS_ESTADO: Record<PagoHistorial['estado_pago'], string> = {
  completado: 'Completado',
  pendiente: 'Pendiente',
  fallido: 'Fallido',
  reembolso: 'Reembolsado',
};

function formatearFecha(iso?: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatearMonto(valor: number): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor));
}

export function HistorialPagos() {
  const [pagos, setPagos] = useState<PagoHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      setError('');
      try {
        const data = await pagosService.misPagos();
        if (activo) setPagos(data);
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo cargar tu historial de pagos');
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const totalPagado = useMemo(
    () => pagos.filter((p) => p.estado_pago === 'completado').reduce((acc, p) => acc + Number(p.monto_total), 0),
    [pagos],
  );

  return (
    <section className="historial-page">
      <div className="historial-hello">
        <h1 className="historial-title">Mi Historial de Pagos</h1>
        <p className="historial-subtitle">Consulta tus pagos de parqueo realizados en el sistema.</p>
      </div>

      {pagos.length > 0 && (
        <div className="historial-resumen">
          <span>Total pagado</span>
          <strong>{formatearMonto(totalPagado)}</strong>
        </div>
      )}

      {error && <p className="historial-error">{error}</p>}

      {cargando ? (
        <p className="historial-vacio">Cargando tu historial...</p>
      ) : pagos.length === 0 ? (
        !error && <p className="historial-vacio">Todavía no tienes pagos registrados.</p>
      ) : (
        <ul className="historial-lista">
          {pagos.map((pago) => (
            <li key={pago.id} className="historial-item">
              <div className="historial-item-info">
                <div className="historial-item-fila">
                  <span className="historial-item-codigo">{pago.codigo_pago}</span>
                  <span className={`historial-badge historial-badge--${pago.estado_pago}`}>
                    {ETIQUETAS_ESTADO[pago.estado_pago] ?? pago.estado_pago}
                  </span>
                </div>
                <p className="historial-item-detalle">
                  Placa {pago.placa} · Ticket {pago.numero_ticket}
                  {pago.lugar && <> · {pago.lugar}{pago.zona ? `, ${pago.zona}` : ''}</>}
                </p>
                <p className="historial-item-fechas">
                  Entrada: {formatearFecha(pago.fecha_entrada)}
                  {pago.fecha_salida && <> · Salida: {formatearFecha(pago.fecha_salida)}</>}
                </p>
                <p className="historial-item-fechas">
                  Pagado el {formatearFecha(pago.fecha_pago)} · {pago.tipo_pago}
                </p>
              </div>
              <div className="historial-item-monto">{formatearMonto(pago.monto_total)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
