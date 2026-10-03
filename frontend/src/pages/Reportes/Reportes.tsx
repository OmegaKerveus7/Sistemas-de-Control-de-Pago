import { useEffect, useMemo, useState } from 'react';
import { reportesService, type ReporteDetallado, type ReporteMensual } from '../../services/reportes.service';
import { crearLibroPagos } from './libroPagos';
import './Reportes.css';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function Reportes() {
  const [resumen, setResumen] = useState<ReporteMensual[]>([]);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ahora = new Date();
  const [anioSeleccionado, setAnioSeleccionado] = useState(ahora.getFullYear());
  const [mesSeleccionada, setMesSeleccionada] = useState(ahora.getMonth() + 1);

  const [detalle, setDetalle] = useState<ReporteDetallado[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    reportesService.resumenMensual()
      .then(setResumen)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen'))
      .finally(() => setCargandoResumen(false));
  }, []);

  useEffect(() => {
    setCargandoDetalle(true);
    setDetalle([]);
    reportesService.detallado(anioSeleccionado, mesSeleccionada)
      .then(setDetalle)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte'))
      .finally(() => setCargandoDetalle(false));
  }, [anioSeleccionado, mesSeleccionada]);

  const totalMonto = useMemo(() => detalle.reduce((s, d) => s + Number(d.monto), 0), [detalle]);
  const totalPagos = detalle.length;

  const pagosCompletados = useMemo(() => detalle.filter((d) => d.estado === 'completado').length, [detalle]);

  async function descargarExcel() {
    if (pagosCompletados === 0) return;
    setDescargando(true);
    try {
      const nombreMes = MESES[mesSeleccionada - 1];
      const workbook = crearLibroPagos(detalle, `Pagos ${nombreMes} ${anioSeleccionado}`);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registro-pagos-parqueo-${nombreMes}-${anioSeleccionado}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo generar el archivo Excel');
    } finally {
      setDescargando(false);
    }
  }

  return (
    <section className="reportes-page">
      <div className="reportes-header">
        <div>
          <h1 className="reportes-title">Reportes</h1>
          <p className="reportes-subtitle">Consulta los pagos de parqueo por mes y descarga el reporte.</p>
        </div>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <div className="card reportes-filtros-card">
        <div className="reportes-filtros">
          <div className="form-group">
            <label className="form-label">Mes</label>
            <select
              className="form-input reportes-select"
              value={mesSeleccionada}
              onChange={(e) => setMesSeleccionada(Number(e.target.value))}
            >
              {MESES.map((nombre, i) => (
                <option key={i + 1} value={i + 1}>{nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Año</label>
            <select
              className="form-input reportes-select"
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => ahora.getFullYear() - i).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button
            className="reportes-btn-descargar"
            onClick={() => void descargarExcel()}
            disabled={descargando || pagosCompletados === 0}
          >
            {descargando ? 'Generando...' : 'Descargar Excel'}
          </button>
        </div>
      </div>

      <div className="reportes-resumen-grid">
        <div className="reportes-resumen-item">
          <span className="reportes-resumen-label">Pagos en el mes</span>
          <strong className="reportes-resumen-valor">{totalPagos}</strong>
        </div>
        <div className="reportes-resumen-item">
          <span className="reportes-resumen-label">Total cobrado</span>
          <strong className="reportes-resumen-valor">Q{totalMonto.toFixed(2)}</strong>
        </div>
      </div>

      {cargandoResumen ? (
        <div className="reportes-estado"><span className="spinner" /> Cargando resumen...</div>
      ) : (
        <div className="reportes-historial">
          <h3 className="reportes-historial-title">Historial de meses</h3>
          <div className="reportes-historial-lista">
            {resumen.map((r) => (
              <button
                key={r.mes}
                className={`reportes-historial-item ${r.mes === `${anioSeleccionado}-${String(mesSeleccionada).padStart(2, '0')}` ? 'activo' : ''}`}
                onClick={() => {
                  const [a, m] = r.mes.split('-').map(Number);
                  setAnioSeleccionado(a);
                  setMesSeleccionada(m);
                }}
              >
                <span className="reportes-historial-mes">{r.mes}</span>
                <span className="reportes-historial-cant">{r.cantidad_pagos} pagos</span>
                <span className="reportes-historial-total">Q{Number(r.total_cobrado).toFixed(2)}</span>
              </button>
            ))}
            {resumen.length === 0 && <p className="reportes-estado-texto">No hay datos de pagos aún.</p>}
          </div>
        </div>
      )}

      <div className="card reportes-card">
        <h3 className="reportes-card-title">
          Detalle — {MESES[mesSeleccionada - 1]} {anioSeleccionado}
        </h3>
        {cargandoDetalle ? (
          <div className="reportes-estado"><span className="spinner" /> Cargando detalle...</div>
        ) : detalle.length === 0 ? (
          <div className="reportes-estado">No hay pagos registrados en este mes.</div>
        ) : (
          <>
            <div className="reportes-tabla-wrapper">
              <table className="reportes-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ticket</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Pagador</th>
                    <th>Método</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
              {detalle.map((d, idx) => (
                    <tr key={d.id}>
                      <td>{idx + 1}</td>
                      <td className="reportes-bold">{d.ticket}</td>
                      <td className="reportes-bold">{d.placa}</td>
                      <td className="reportes-capitalize">{d.tipo_vehiculo}</td>
                      <td>{d.pagador?.trim() || 'Visitante'}</td>
                      <td className="reportes-capitalize">{d.metodo}</td>
                      <td className="reportes-bold">Q{Number(d.monto).toFixed(2)}</td>
                      <td>
                        <span className={`reportes-estado-badge ${d.estado}`}>
                          {d.estado}
                        </span>
                      </td>
                      <td>{new Date(d.fecha_pago).toLocaleDateString('es-GT')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="reportes-total-row">
                    <td colSpan={6}>Total</td>
                    <td className="reportes-bold">Q{totalMonto.toFixed(2)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="reportes-cards-mobile">
              {detalle.map((d) => (
                <div className="reportes-card-item" key={d.id}>
                  <div className="reportes-card-item-top">
                    <span className="reportes-bold">{d.placa}</span>
                    <span className={`reportes-estado-badge ${d.estado}`}>{d.estado}</span>
                  </div>
                  <span className="reportes-card-pagador">{d.pagador?.trim() || 'Visitante'}</span>
                  <div className="reportes-card-item-bottom">
                    <span className="reportes-bold">Q{Number(d.monto).toFixed(2)}</span>
                    <span>{new Date(d.fecha_pago).toLocaleDateString('es-GT')}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default Reportes;
