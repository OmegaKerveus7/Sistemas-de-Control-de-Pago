import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { pagosService, type ResultadoConfirmar } from '../../services/pagos.service';
import './PagarParqueo.css';

export function ResultadoPago() {
  const [searchParams] = useSearchParams();
  const referencia = searchParams.get('referencia');
  const estadoParam = searchParams.get('estado');

  const [cargando, setCargando] = useState(true);
  const [resultado, setResultado] = useState<ResultadoConfirmar | null>(null);
  const [error, setError] = useState('');

  const cancelado = estadoParam === 'cancelado';

  useEffect(() => {
    if (!referencia) {
      setError('No se recibió la referencia del pago');
      setCargando(false);
      return;
    }

    if (cancelado) {
      setCargando(false);
      return;
    }

    let activo = true;
    (async () => {
      try {
        const res = await pagosService.confirmar(referencia);
        if (activo) setResultado(res);
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo confirmar el pago');
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, [referencia, cancelado]);

  const estado = cancelado
    ? 'cancelado'
    : error
      ? 'error'
      : resultado?.aprobado
        ? 'aprobado'
        : 'rechazado';

  const titulos: Record<string, string> = {
    aprobado: '¡Pago realizado con éxito!',
    rechazado: 'El pago fue rechazado',
    cancelado: 'El pago fue cancelado',
    error: 'No se pudo verificar el pago',
  };

  const descripciones: Record<string, string> = {
    aprobado: 'Tu estancia quedó pagada. Puedes retirar tu vehículo.',
    rechazado: 'La transacción no fue aprobada. Intenta nuevamente.',
    cancelado: 'No se realizó ningún cargo a tu tarjeta.',
    error,
  };

  return (
    <div className="pagar-page">
      <header className="pagar-header">
        <Link to="/" className="pagar-logo">
          Sistema de Gestión de Parqueo
        </Link>
      </header>

      <main className="pagar-main">
        <div className={`pagar-card pagar-resultado pagar-resultado-${estado}`}>
          <div className="pagar-resultado-icono">
            {estado === 'aprobado' ? '✓' : estado === 'rechazado' ? '✗' : estado === 'cancelado' ? '—' : '!'}
          </div>
          <h1 className="pagar-title">{titulos[estado]}</h1>
          <p className="pagar-subtitle">{descripciones[estado]}</p>

          {cargando && <p className="pagar-subtitle">Verificando el pago...</p>}

          {resultado?.monto !== undefined && estado === 'aprobado' && (
            <p className="pagar-resumen-linea">
              <span>Monto pagado</span>
              <strong>Q{Number(resultado.monto).toFixed(2)}</strong>
            </p>
          )}

          {referencia && (
            <p className="pagar-referencia">
              Referencia: <strong>{referencia}</strong>
            </p>
          )}

          <Link to="/app/dashboard" className="pagar-button pagar-button-enlace">
            Volver al panel
          </Link>
          <Link to="/pagar-parqueo" className="pagar-link">
            Pagar otro parqueo
          </Link>
        </div>
      </main>
    </div>
  );
}

export default ResultadoPago;