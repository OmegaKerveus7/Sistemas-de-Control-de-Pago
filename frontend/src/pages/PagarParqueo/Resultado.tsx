import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { pagosService, type ResultadoConfirmar } from '../../services/pagos.service';
import { useAuth } from '../../hooks/useAuth';
import './PagarParqueo.css';

export function ResultadoPago() {
  const [params] = useSearchParams();
  const referencia = params.get('referencia') || '';
  const cancelado = params.get('estado') === 'cancelado';
  const { usuario } = useAuth();
  const [resultado, setResultado] = useState<ResultadoConfirmar | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!usuario) return;
    let activo = true;
    let timer: ReturnType<typeof setTimeout>;
    let intentos = 0;
    setCargando(true);
    setError('');
    setResultado(null);
    async function consultar() {
      try {
        if (!referencia) throw new Error('No se recibió la referencia del pago');
        const res = await pagosService.confirmar(referencia);
        if (!activo) return;
        setResultado(res);
        if (res.estado === 'pendiente' && ++intentos < 6) timer = setTimeout(consultar, 5000);
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo verificar el pago');
      } finally { if (activo) setCargando(false); }
    }
    void consultar();
    return () => { activo = false; clearTimeout(timer); };
  }, [referencia, usuario, revision]);

  if (!usuario) return <Navigate to={`/login?redirect=${encodeURIComponent(`/pagar-parqueo/resultado?${params.toString()}`)}`} replace />;

  const estado = cargando ? 'verificando' : error ? 'error' : resultado?.aprobado ? 'aprobado'
    : resultado?.estado === 'reembolsado' ? 'reembolsado' : resultado?.estado === 'fallido' ? 'rechazado' : 'pendiente';
  const titulos: Record<string, string> = {
    verificando: 'Verificando el pago…', aprobado: '¡Pago confirmado!', pendiente: 'Pago pendiente de confirmación',
    rechazado: 'El intento de pago falló', reembolsado: 'Pago reembolsado', error: 'No se pudo verificar el pago',
  };
  const descripciones: Record<string, string> = {
    verificando: 'Estamos consultando el estado de tu pago.',
    aprobado: resultado?.modo === 'live' ? 'Tu estancia quedó pagada. Presenta la referencia al guardia para validar la salida.' : 'La prueba quedó registrada en la BD de pruebas. No se cobró dinero real.',
    pendiente: cancelado ? 'Saliste del checkout. Todavía no hay un pago confirmado; puedes consultar de nuevo o continuar con el mismo enlace.' : 'Aún no se ha confirmado el cobro. Consulta de nuevo antes de intentar otro pago.',
    rechazado: 'Puedes volver al mismo enlace para reintentar el pago.', reembolsado: 'Consulta con la administración del parqueo.', error,
  };
  return <div className="pagar-page">
    <header className="pagar-header"><Link to="/" className="pagar-logo">Sistema de Gestión de Parqueo</Link></header>
    <main className="pagar-main">
      <div className={`pagar-card pagar-resultado pagar-resultado-${estado}`} aria-live="polite" aria-busy={cargando}>
        {resultado && resultado.modo !== 'live' && <p className="pagar-aviso-prueba">{resultado.modo === 'mock' ? 'Simulador local' : 'Sandbox Recurrente'} · Sin dinero real</p>}
        <div className="pagar-resultado-icono" aria-hidden="true">{estado === 'aprobado' ? '✓' : estado === 'verificando' || estado === 'pendiente' ? '…' : '!'}</div>
        <h1 className="pagar-title">{titulos[estado]}</h1>
        <p className="pagar-subtitle">{descripciones[estado]}</p>
        {resultado && <p className="pagar-resumen-linea"><span>{resultado.placa}</span><strong>Q{Number(resultado.monto).toFixed(2)}</strong></p>}
        {referencia && <p className="pagar-referencia">Referencia: <strong>{referencia}</strong></p>}
        {!cargando && !resultado?.aprobado && resultado?.estado !== 'reembolsado' && <>
          <button className="pagar-button" onClick={() => setRevision(n => n + 1)}>Consultar estado nuevamente</button>
          {resultado?.url_pago && <a className="pagar-button pagar-button-secundario" href={resultado.url_pago}>Continuar con el mismo pago</a>}
        </>}
        <Link to="/app/historial" className="pagar-link">Ver mi historial de pagos</Link>
        <Link to="/app/dashboard" className="pagar-button pagar-button-enlace">Volver al panel</Link>
        <Link to="/pagar-parqueo" className="pagar-link">Consultar otro parqueo</Link>
      </div>
    </main>
  </div>;
}
export default ResultadoPago;
