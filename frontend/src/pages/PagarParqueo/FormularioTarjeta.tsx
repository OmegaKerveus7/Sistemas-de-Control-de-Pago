import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { pagosService, type ResultadoConfirmar } from '../../services/pagos.service';
import { FormularioRecurrente } from './FormularioRecurrente';
import './PagarParqueo.css';
import './FormularioTarjeta.css';

export function FormularioTarjeta() {
  const [params] = useSearchParams();
  const referencia = params.get('referencia') || '';
  const [pago, setPago] = useState<ResultadoConfirmar | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [simulando, setSimulando] = useState(false);
  useEffect(() => {
    let vigente = true;
    setCargando(true); setError(''); setPago(null);
    if (!/^P-[a-f0-9]{18}$/.test(referencia)) {
      setError('La referencia del pago no es válida. Regresa a Pagos para consultar el ticket.');
      setCargando(false);
      return;
    }
    pagosService.confirmar(referencia)
      .then(data => { if (vigente) setPago(data); })
      .catch(err => { if (vigente) setError(err instanceof Error ? err.message : 'No se pudo abrir el formulario.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [referencia]);

  async function simular() {
    setSimulando(true);
    try { setPago(await pagosService.simular(referencia, 'completado')); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo registrar la simulación.'); }
    finally { setSimulando(false); }
  }
  return <main className="formulario-tarjeta-page">
    <header className="formulario-tarjeta-header">
      <Link to="/app/pagos" className="formulario-tarjeta-volver" aria-label="Regresar a Pagos" title="Regresar a Pagos">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5 M12 19l-7-7 7-7" /></svg>
      </Link>
      <div><h1>Pago con tarjeta</h1>{pago && <p>{pago.placa} · Q{Number(pago.monto).toFixed(2)}</p>}</div>
    </header>
    <section className="formulario-tarjeta-card" aria-busy={cargando}>
      {cargando && <p role="status">Cargando formulario…</p>}
      {error && <p className="pagar-alerta pagar-alerta-error" role="alert">{error}</p>}
      {pago?.aprobado ? <div className="formulario-tarjeta-exito" role="status"><strong>Ticket cancelado</strong><p>Pago confirmado para {pago.placa}.{pago.modo !== 'live' && ' Prueba registrada, sin dinero real.'}</p><Link to="/app/pagos">Regresar a Pagos</Link></div>
        : pago?.estado === 'reembolsado' ? <p role="alert">Este pago está reembolsado. Consulta con la administración.</p>
        : pago?.modo === 'mock' ? <div><p>Simulador local · Sin tarjeta ni cobros reales.</p><button className="pagar-button" disabled={simulando} onClick={() => void simular()}>{simulando ? 'Registrando…' : 'Simular pago aprobado'}</button></div>
        : pago?.url_pago ? <FormularioRecurrente url={pago.url_pago} referencia={referencia} sandbox={pago.modo === 'sandbox'} onResultado={setPago} />
        : !cargando && !error && <p role="alert">Este pago todavía no tiene formulario disponible. Regresa a Pagos para revisarlo.</p>}
    </section>
  </main>;
}
