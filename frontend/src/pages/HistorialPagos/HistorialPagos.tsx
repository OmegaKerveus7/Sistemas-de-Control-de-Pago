import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PagoHistorial } from '../../models';
import { pagosService } from '../../services/pagos.service';
import './HistorialPagos.css';

const ETIQUETAS_ESTADO: Record<PagoHistorial['estado_pago'], string> = {
  completado: 'Pagado',
  pendiente: 'Pendiente',
  fallido: 'Fallido',
  reembolsado: 'Reembolsado',
};

const ETIQUETAS_METODO: Record<PagoHistorial['metodo_pago'], string> = {
  efectivo: 'Efectivo',
  linea: 'Tarjeta (en línea)',
};

function formatearFecha(iso?: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatearFechaCorta(iso?: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString('es-GT', { dateStyle: 'short' });
}

function formatearMonto(valor: number): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor));
}

export function HistorialPagos() {
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const haceUnMes = useMemo(() => {
    const f = new Date();
    f.setMonth(f.getMonth() - 1);
    return f.toISOString().slice(0, 10);
  }, []);

  const [fechaInicio, setFechaInicio] = useState(haceUnMes);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [filtrosActivos, setFiltrosActivos] = useState<{ fechaInicio?: string; fechaFin?: string }>({});

  const [pagos, setPagos] = useState<PagoHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = async (filtros: { fechaInicio?: string; fechaFin?: string }) => {
    setCargando(true);
    setError('');
    try {
      const data = await pagosService.misPagos(filtros);
      setPagos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu historial de pagos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar(filtrosActivos);
  }, [filtrosActivos]);

  const aplicarFiltros = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setFiltrosActivos({
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
    });
  };

  const limpiarFiltros = () => {
    setFechaInicio(haceUnMes);
    setFechaFin(hoy);
    setFiltrosActivos({});
  };

  const resumen = useMemo(() => {
    const completados = pagos.filter((p) => p.estado_pago === 'completado');
    const total = completados.reduce((acc, p) => acc + Number(p.monto), 0);
    const enLinea = completados.filter((p) => p.metodo_pago === 'linea').reduce((acc, p) => acc + Number(p.monto), 0);
    const efectivo = completados.filter((p) => p.metodo_pago === 'efectivo').reduce((acc, p) => acc + Number(p.monto), 0);
    const pendientes = pagos.filter((p) => p.estado_pago === 'pendiente').length;
    return { total, enLinea, efectivo, completados: completados.length, pendientes };
  }, [pagos]);

  return (
    <section className="historial-page">
      <div className="historial-hello">
        <h1 className="historial-title">Mi Historial de Pagos</h1>
        <p className="historial-subtitle">
          Consulta todos los pagos de parqueo que has realizado. Usa los filtros para acotar por fecha.
        </p>
      </div>

      <form className="historial-filtros" onSubmit={aplicarFiltros}>
        <div className="historial-filtro-grupo">
          <label className="form-label" htmlFor="historial-fecha-inicio">Desde</label>
          <input
            id="historial-fecha-inicio"
            type="date"
            className="form-input"
            value={fechaInicio}
            max={fechaFin || undefined}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="historial-filtro-grupo">
          <label className="form-label" htmlFor="historial-fecha-fin">Hasta</label>
          <input
            id="historial-fecha-fin"
            type="date"
            className="form-input"
            value={fechaFin}
            min={fechaInicio || undefined}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
        <div className="historial-filtro-acciones">
          <button type="submit" className="historial-btn-primary">Aplicar filtros</button>
          <button type="button" className="historial-btn-secondary" onClick={limpiarFiltros}>Limpiar</button>
        </div>
      </form>

      {pagos.length > 0 && (
        <div className="historial-resumenes">
          <article className="historial-stat">
            <span>Total pagado</span>
            <strong>{formatearMonto(resumen.total)}</strong>
          </article>
          <article className="historial-stat">
            <span>Pagos completados</span>
            <strong>{resumen.completados}</strong>
          </article>
          <article className="historial-stat">
            <span>Tarjeta</span>
            <strong>{formatearMonto(resumen.enLinea)}</strong>
          </article>
          <article className="historial-stat">
            <span>Efectivo</span>
            <strong>{formatearMonto(resumen.efectivo)}</strong>
          </article>
          {resumen.pendientes > 0 && (
            <article className="historial-stat historial-stat-warn">
              <span>Pendientes</span>
              <strong>{resumen.pendientes}</strong>
            </article>
          )}
        </div>
      )}

      {error && <p className="historial-error">{error}</p>}

      {cargando ? (
        <p className="historial-vacio">Cargando tu historial...</p>
      ) : pagos.length === 0 ? (
        !error && (
          <p className="historial-vacio">
            {filtrosActivos.fechaInicio || filtrosActivos.fechaFin
              ? 'No hay pagos en el rango de fechas seleccionado.'
              : 'Todavía no tienes pagos registrados.'}
          </p>
        )
      ) : (
        <ul className="historial-lista">
          {pagos.map((pago) => {
            const vehiculoDesc = pago.vehiculo
              ? [
                  pago.vehiculo.tipo,
                  pago.vehiculo.marca,
                  pago.vehiculo.color,
                ].filter(Boolean).join(' · ')
              : null;
            return (
              <li key={pago.id} className="historial-item">
                <div className="historial-item-info">
                  <div className="historial-item-fila">
                    <span className="historial-item-codigo">{pago.codigo_validacion}</span>
                    <span className={`historial-badge historial-badge--${pago.estado_pago}`}>
                      {ETIQUETAS_ESTADO[pago.estado_pago] ?? pago.estado_pago}
                    </span>
                  </div>
                  <p className="historial-item-detalle">
                    <strong>{pago.placa}</strong>
                    {vehiculoDesc && <> · {vehiculoDesc}</>}
                    {' · Ticket '}{pago.numero_ticket}
                    {(pago.lugar || pago.zona) && <> · {pago.lugar ?? ''}{pago.zona ? `, ${pago.zona}` : ''}</>}
                  </p>
                  <p className="historial-item-fechas">
                    <strong>Entrada:</strong> {formatearFecha(pago.fecha_entrada)}
                    {pago.fecha_salida && <> · <strong>Salida:</strong> {formatearFecha(pago.fecha_salida)}</>}
                  </p>
                  {pago.tiempo_estacionado_texto && (
                    <p className="historial-item-fechas">
                      <strong>Tiempo estacionado:</strong> {pago.tiempo_estacionado_texto}
                    </p>
                  )}
                  <p className="historial-item-fechas">
                    Pagado el {formatearFecha(pago.fecha_pago)}
                    {' · '}
                    <span className="historial-item-metodo">{ETIQUETAS_METODO[pago.metodo_pago] ?? pago.metodo_pago}</span>
                    {pago.fecha_confirmacion && <> · Confirmado {formatearFecha(pago.fecha_confirmacion)}</>}
                  </p>
                  {pago.metodo_pago === 'linea' && /^P-[a-f0-9]{18}$/.test(pago.codigo_validacion) && (
                    <Link className="historial-link-secundario" to={`/pagar-parqueo/resultado?referencia=${encodeURIComponent(pago.codigo_validacion)}`}>
                      Consultar o continuar pago
                    </Link>
                  )}
                </div>
                <div className="historial-item-monto">{formatearMonto(pago.monto)}</div>
              </li>
            );
          })}
        </ul>
      )}

      {pagos.length > 0 && (
        <p className="historial-rango">
          Mostrando {pagos.length} pago{pagos.length === 1 ? '' : 's'}
          {(filtrosActivos.fechaInicio || filtrosActivos.fechaFin) && (
            <> entre {formatearFechaCorta(filtrosActivos.fechaInicio ?? null) || '…'} y {formatearFechaCorta(filtrosActivos.fechaFin ?? null) || '…'}</>
          )}
        </p>
      )}
    </section>
  );
}
