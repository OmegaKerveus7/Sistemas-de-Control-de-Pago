import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportesService, type ReporteDetallado, type ReporteMensual } from '../../services/reportes.service';
import { crearLibroPagos } from './libroPagos';
import './Reportes.css';

function IconoReporte({ tipo }: { tipo: 'volver' | 'calendario' | 'descargar' | 'pagos' | 'cobrado' | 'pendiente' }) {
  const trazos = {
    volver: 'M19 12H5 M12 19l-7-7 7-7',
    calendario: 'M3 5h18v16H3Z M7 3v4 M17 3v4 M3 10h18 M7 14h2 M13 14h2 M7 17h2',
    descargar: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
    pagos: 'M5 3h14v18l-3-2-4 2-4-2-3 2Z M8 7h8 M8 11h8 M8 15h4',
    cobrado: 'M2 5h20v14H2Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M5 9h1 M18 15h1',
    pendiente: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
  };
  return <svg className="reportes-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={trazos[tipo]} /></svg>;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function Reportes() {
  const navigate = useNavigate();
  function regresar() {
    if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1);
    else navigate('/app/dashboard');
  }
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
    let vigente = true;
    setError(null);
    setCargandoDetalle(true);
    setDetalle([]);
    reportesService.detallado(anioSeleccionado, mesSeleccionada)
      .then((datos) => { if (vigente) setDetalle(datos); })
      .catch((err) => { if (vigente) setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte'); })
      .finally(() => { if (vigente) setCargandoDetalle(false); });
    return () => { vigente = false; };
  }, [anioSeleccionado, mesSeleccionada]);

  const totalMonto = useMemo(() => detalle.reduce((s, d) => s + Number(d.monto), 0), [detalle]);
  const totalPagos = detalle.length;
  const totalCobrado = useMemo(() => detalle.filter(d => d.estado === 'completado').reduce((s, d) => s + Number(d.monto), 0), [detalle]);
  const pagosPendientes = detalle.filter(d => d.estado === 'pendiente').length;
  const aniosDisponibles = Array.from(new Set([
    ...Array.from({ length: 5 }, (_, i) => ahora.getFullYear() - i),
    ...resumen.map(r => Number(r.mes.split('-')[0])), anioSeleccionado,
  ])).sort((a, b) => b - a);

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
        <button type="button" className="reportes-btn-volver" onClick={regresar} aria-label="Regresar a la vista anterior" title="Regresar"><IconoReporte tipo="volver" /></button>
        <div>
          <h1 className="reportes-title">Reportes</h1>
          <p className="reportes-subtitle">Consulta los pagos de parqueo por mes y descarga el reporte.</p>
        </div>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <div className="card reportes-filtros-card">
        <div className="reportes-periodo"><IconoReporte tipo="calendario" /><div><h2>Periodo del reporte</h2><p>Selecciona el mes y el año. El Excel incluye los pagos completados.</p></div></div>
        <div className="reportes-filtros">
          <div className="form-group">
            <label className="form-label" htmlFor="reportes-mes">Mes</label>
            <select
              id="reportes-mes"
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
            <label className="form-label" htmlFor="reportes-anio">Año</label>
            <select
              id="reportes-anio"
              className="form-input reportes-select"
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button
            className="reportes-btn-descargar"
            onClick={() => void descargarExcel()}
            disabled={descargando || cargandoDetalle || pagosCompletados === 0}
          >
            <IconoReporte tipo="descargar" /> {descargando ? 'Generando...' : 'Descargar Excel'}
          </button>
        </div>
      </div>

      <div className="reportes-resumen-grid">
        <div className="reportes-resumen-item">
          <span className="reportes-resumen-label"><IconoReporte tipo="pagos" /> Pagos en el mes</span>
          <strong className="reportes-resumen-valor">{cargandoDetalle ? '—' : totalPagos}</strong>
          <span className="reportes-resumen-ayuda">{MESES[mesSeleccionada - 1]} {anioSeleccionado}</span>
        </div>
        <div className="reportes-resumen-item reportes-resumen-cobrado">
          <span className="reportes-resumen-label"><IconoReporte tipo="cobrado" /> Total cobrado</span>
          <strong className="reportes-resumen-valor">{cargandoDetalle ? '—' : `Q${totalCobrado.toFixed(2)}`}</strong>
          <span className="reportes-resumen-ayuda">{cargandoDetalle ? 'Consultando pagos…' : `${pagosCompletados} pagos completados`}</span>
        </div>
        <div className="reportes-resumen-item reportes-resumen-pendiente">
          <span className="reportes-resumen-label"><IconoReporte tipo="pendiente" /> Pagos pendientes</span>
          <strong className="reportes-resumen-valor">{cargandoDetalle ? '—' : pagosPendientes}</strong>
          <span className="reportes-resumen-ayuda">Pendientes de confirmación</span>
        </div>
      </div>

      <details className="card reportes-historial-panel">
      <summary><IconoReporte tipo="calendario" /> Historial de meses <span>Consultar otros periodos</span></summary>
      {cargandoResumen ? (
        <div className="reportes-estado"><span className="spinner" /> Cargando resumen...</div>
      ) : (
        <div className="reportes-historial">

          <div className="reportes-historial-lista">
            {resumen.map((r) => (
              <button
                key={r.mes}
                aria-pressed={r.mes === `${anioSeleccionado}-${String(mesSeleccionada).padStart(2, '0')}`}
                className={`reportes-historial-item ${r.mes === `${anioSeleccionado}-${String(mesSeleccionada).padStart(2, '0')}` ? 'activo' : ''}`}
                onClick={() => {
                  const [a, m] = r.mes.split('-').map(Number);
                  setAnioSeleccionado(a);
                  setMesSeleccionada(m);
                }}
              >
                <span className="reportes-historial-mes">{MESES[Number(r.mes.split('-')[1]) - 1]} {r.mes.split('-')[0]}</span>
                <span className="reportes-historial-cant">{r.cantidad_pagos} pagos</span>
                <span className="reportes-historial-total">Q{Number(r.total_cobrado).toFixed(2)}</span>
              </button>
            ))}
            {resumen.length === 0 && <p className="reportes-estado-texto">No hay datos de pagos aún.</p>}
          </div>
        </div>
      )}

      </details>

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
                    <td colSpan={6}>Total registrado (todos los estados)</td>
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
