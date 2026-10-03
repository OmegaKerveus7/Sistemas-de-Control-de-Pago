import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { pagosService, type ResultadoConfirmar } from '../../services/pagos.service';
import './PagarParqueo.css';

export function SimuladorPago() {
  const [params] = useSearchParams();
  const referencia = params.get('referencia') || '';
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [pago, setPago] = useState<ResultadoConfirmar | null>(null);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  useEffect(() => {
    if (!usuario) return;
    let activo = true;
    pagosService.confirmar(referencia).then(res => {
      if (!activo) return;
      if (res.modo !== 'mock') setError('Este pago no pertenece al simulador local.');
      else setPago(res);
    }).catch(err => { if (activo) setError(err.message); });
    return () => { activo = false; };
  }, [referencia, usuario]);
  if (!usuario) return <Navigate to={`/login?redirect=${encodeURIComponent(`/pagar-parqueo/simulador?referencia=${referencia}`)}`} replace />;
  const retorno = `/pagar-parqueo/resultado?referencia=${encodeURIComponent(referencia)}`;
  async function simular(estado: string) {
    setProcesando(true); setError('');
    try { await pagosService.simular(referencia, estado); navigate(retorno); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo simular el pago'); }
    finally { setProcesando(false); }
  }
  return <div className="pagar-page">
    <header className="pagar-header"><Link className="pagar-logo" to="/">Sistema de Gestión de Parqueo</Link></header>
    <main className="pagar-main"><div className="pagar-card">
      <p className="pagar-aviso-prueba">Simulador local · Sin dinero real</p>
      <h1 className="pagar-title">Probar un pago</h1>
      <p className="pagar-subtitle">Elige un resultado para probar el sistema. No necesitas ingresar datos de tarjeta.</p>
      {error && <p className="pagar-alerta pagar-alerta-error" role="alert">{error}</p>}
      {!pago && !error && <p role="status">Cargando pago…</p>}
      {pago && <>
        <p className="pagar-resumen-linea"><span>{pago.placa}</span><strong>Q{Number(pago.monto).toFixed(2)}</strong></p>
        <p className="pagar-referencia">{referencia}</p>
        {pago.aprobado ? <Link className="pagar-button" to={retorno}>Ver pago confirmado</Link> : <>
          <button className="pagar-button" disabled={procesando} onClick={() => simular('completado')}>Simular pago aprobado</button>
          <button className="pagar-button pagar-button-secundario" disabled={procesando} onClick={() => simular('fallido')}>Simular rechazo</button>
          <button className="pagar-button pagar-button-secundario" disabled={procesando} onClick={() => simular('pendiente')}>Mantener pendiente</button>
          <button className="pagar-link" disabled={procesando} onClick={() => navigate(`${retorno}&estado=cancelado`)}>Cancelar y volver</button>
        </>}
      </>}
      <Link className="pagar-link" to="/pagar-parqueo">Volver al parqueo</Link>
    </div></main>
  </div>;
}
