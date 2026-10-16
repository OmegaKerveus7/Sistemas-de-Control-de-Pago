import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { pagosService, type ResultadoPublico } from '../../services/pagos.service';
import { formatoDia, formatoQuetzales } from '../../utils/formato';
import '../PagarParqueo/PagarParqueo.css';
import './PagoPublico.css';

const ICONOS = {
  ok: <polyline points="20 6 9 17 4 12" />,
  espera: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></>,
  alerta: <><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.51" /><circle cx="12" cy="12" r="9" /></>,
};

/** Resultado del pago sin sesión: la referencia de la URL es el único acceso al recibo. */
export function ResultadoPagoPublico() {
  const [params] = useSearchParams();
  const referencia = params.get('referencia') || '';
  const cancelado = params.get('estado') === 'cancelado';
  const [resultado, setResultado] = useState<ResultadoPublico | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let activo = true;
    let timer: ReturnType<typeof setTimeout>;
    let intentos = 0;
    setCargando(true);
    setError('');
    async function consultar() {
      try {
        if (!referencia) throw new Error('No se recibió la referencia del pago');
        const res = await pagosService.confirmarPublico(referencia);
        if (!activo) return;
        setResultado(res);
        if (res.estado === 'pendiente' && ++intentos < 6) timer = setTimeout(consultar, 5000);
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo verificar el pago');
      } finally { if (activo) setCargando(false); }
    }
    void consultar();
    return () => { activo = false; clearTimeout(timer); };
  }, [referencia, revision]);

  const estado = cargando ? 'verificando' : error ? 'error' : resultado?.aprobado ? 'aprobado'
    : resultado?.estado === 'reembolsado' ? 'reembolsado' : resultado?.estado === 'fallido' ? 'rechazado' : 'pendiente';
  const titulos: Record<string, string> = {
    verificando: 'Verificando el pago…', aprobado: '¡Pago confirmado!', pendiente: 'Pago pendiente de confirmación',
    rechazado: 'El intento de pago falló', reembolsado: 'Pago reembolsado', error: 'No se pudo verificar el pago',
  };
  const descripciones: Record<string, string> = {
    verificando: 'Estamos consultando el estado de tu pago.',
    aprobado: resultado?.modo === 'live' ? 'Presenta tu placa al guardia al ingresar. Tu pago es válido solo por el día indicado.' : 'La prueba quedó registrada. No se cobró dinero real.',
    pendiente: cancelado ? 'Saliste del checkout. Todavía no hay un pago confirmado; puedes consultar de nuevo o continuar con el mismo enlace.' : 'Aún no se ha confirmado el cobro. Consulta de nuevo antes de intentar otro pago.',
    rechazado: 'Puedes volver al mismo enlace para reintentar el pago.', reembolsado: 'Consulta con la administración del parqueo.', error,
  };
  const icono = estado === 'aprobado' ? ICONOS.ok : estado === 'verificando' || estado === 'pendiente' ? ICONOS.espera : ICONOS.alerta;
  const recibo = resultado?.recibo;

  return (
    <div className="pagar-page">
      <header className="pagar-header pagar-no-imprimir">
        <Link to="/" className="pagar-logo">Parqueo Zona 19 · Colegio Mixto Belén</Link>
      </header>
      <main className="pagar-main">
        <div className={`pagar-card pagar-resultado pagar-resultado-${estado}`} aria-live="polite" aria-busy={cargando}>
          {resultado && resultado.modo !== 'live' && <p className="pagar-aviso-prueba">{resultado.modo === 'mock' ? 'Simulador local' : 'Sandbox Recurrente'} · Sin dinero real</p>}
          <div className="pagar-resultado-icono" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{icono}</svg>
          </div>
          <h1 className="pagar-title">{titulos[estado]}</h1>
          <p className="pagar-subtitle">{descripciones[estado]}</p>

          {recibo ? (
            <div className="pagar-recibo">
              <p className="pagar-resumen-linea"><span>Placa</span><strong>{recibo.placa}</strong></p>
              <p className="pagar-resumen-linea"><span>Monto</span><strong>{formatoQuetzales(recibo.monto)}</strong></p>
              <p className="pagar-resumen-linea"><span>NIT</span><strong>{recibo.nit ?? 'CF'}</strong></p>
              <p className="pagar-resumen-linea"><span>Nombre</span><strong>{recibo.nombre ?? 'Consumidor Final'}</strong></p>
              <p className="pagar-resumen-linea"><span>Válido hasta</span><strong>{formatoDia(recibo.fecha_vigencia)}, 11:59 p. m.</strong></p>
              <p className="pagar-resumen-linea"><span>Fecha de pago</span><strong>{recibo.fecha_pago ? new Date(recibo.fecha_pago).toLocaleString('es-GT') : '—'}</strong></p>
              <p className="pagar-referencia">Referencia: <strong>{recibo.referencia}</strong></p>
            </div>
          ) : (
            <>
              {resultado && <p className="pagar-resumen-linea"><span>{resultado.placa}</span><strong>{formatoQuetzales(resultado.monto ?? 0)}</strong></p>}
              {referencia && <p className="pagar-referencia">Referencia: <strong>{referencia}</strong></p>}
            </>
          )}

          <div className="pagar-no-imprimir pagar-acciones">
            {recibo && <button type="button" className="pagar-button" onClick={() => window.print()}>Imprimir o guardar recibo</button>}
            {!cargando && !resultado?.aprobado && resultado?.estado !== 'reembolsado' && <>
              <button className="pagar-button" onClick={() => setRevision(n => n + 1)}>Consultar estado nuevamente</button>
              {resultado?.url_pago && <a className="pagar-button pagar-button-secundario" href={resultado.url_pago}>Continuar con el mismo pago</a>}
            </>}
            <Link to="/pagar-parqueo" className="pagar-link">Pagar otra placa</Link>
            <Link to="/" className="pagar-link">Volver al inicio</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ResultadoPagoPublico;
