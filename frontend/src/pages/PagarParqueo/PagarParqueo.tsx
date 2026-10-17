import { UserSectionHeader } from '../../components/UserSectionHeader/UserSectionHeader';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { parqueoService, type Parqueo } from '../../services/parqueo.service';
import { pagosService, type PrecioInfo } from '../../services/pagos.service';
import { vehiculosService } from '../../services/vehiculos.service';
import type { Vehiculo } from '../../models';
import './PagarParqueo.css';
import { FormularioRecurrente } from './FormularioRecurrente';

type TipoVehiculo = 'motocicleta' | 'automovil';

const ETIQUETAS: Record<TipoVehiculo, string> = {
  motocicleta: 'Motocicleta',
  automovil: 'Automóvil',
};

const REGEX_PLACA = /^([PM])\d{3}[A-Z]{3}$/;

function detectarTipoVehiculo(placa: string): TipoVehiculo | null {
  const coincidencia = REGEX_PLACA.exec(placa.trim().toUpperCase());
  if (!coincidencia) return null;
  return coincidencia[1] === 'P' ? 'automovil' : 'motocicleta';
}

export function PagarParqueo() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const integrado = location.pathname.startsWith('/app/');
  const [params] = useSearchParams();

  const [ticket, setTicket] = useState(() => (params.get('ticket') || '').toUpperCase());
  const [placa, setPlaca] = useState(() => (params.get('placa') || '').toUpperCase());
  const tipo = detectarTipoVehiculo(placa);
  const [parqueo, setParqueo] = useState<Pick<Parqueo, 'placa' | 'fecha_entrada'> & { id?: number } | null>(null);
  const [precio, setPrecio] = useState<PrecioInfo | null>(null);
  const [error, setError] = useState('');
  const [placaPagada, setPlacaPagada] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoPago, setCargandoPago] = useState(false);
  const [checkout, setCheckout] = useState<{ url_pago: string; referencia: string; acceso?: string } | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  useEffect(() => {
    if (!usuario) return;
    let activo = true;
    vehiculosService
      .vehiculosPorUsuario(usuario.id)
      .then((data) => { if (activo) setVehiculos(data.filter((v) => v.activo !== false)); })
      .catch(() => { if (activo) setVehiculos([]); });
    return () => { activo = false; };
  }, [usuario]);

  if (!usuario && integrado) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  const buscar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setPlacaPagada('');
    setParqueo(null);
    setPrecio(null);

    const limpio = placa.trim().toUpperCase();
    if (!limpio) {
      setError('Ingresa la placa de tu vehículo');
      return;
    }
    const tipoDetectado = detectarTipoVehiculo(limpio);
    if (!tipoDetectado) {
      setError('La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras. Ej: P123ABC o M123ABC');
      return;
    }

    setLoading(true);
    try {
      if (!usuario) {
        const info = await pagosService.precioPublico({ placa: limpio, ticket: ticket.trim().toUpperCase() });
        setParqueo({ placa: info.placa, fecha_entrada: info.fecha_entrada });
        setPrecio(info);
        return;
      }
      const activo = await parqueoService.obtenerActivoPorPlaca(limpio);
      if (activo.estado_pago === 'completado') { setPlacaPagada(limpio); return; }
      const info = await pagosService.precio(activo.id);
      setParqueo(activo);
      setPrecio(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el parqueo');
    } finally {
      setLoading(false);
    }
  };

  const pagar = async () => {
    if (!parqueo || !precio || !tipo) return;
    setCargandoPago(true);
    setError('');
    try {
      const resultado = usuario
        ? await pagosService.crear({ parqueo_id: parqueo.id!, monto_esperado: precio.online })
        : await pagosService.crearPublicoTicket({ placa: parqueo.placa!, ticket: ticket.trim().toUpperCase(), monto_esperado: precio.online });
      if (precio.modo === 'mock') window.location.href = resultado.url_pago;
      else setCheckout(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago');
    } finally {
      setCargandoPago(false);
    }
  };

  return (
    <div className={`pagar-page${checkout ? ' pagar-page-checkout' : ''}${integrado ? ' pagar-integrado' : ''}`}>
      {!integrado && <header className="pagar-header">
        <Link to="/" className="pagar-logo">
          Sistema de Gestión de Parqueo
        </Link>
        <button className="pagar-volver" onClick={() => navigate(usuario ? '/app/dashboard' : '/')}>
          Volver
        </button>
      </header>}

      <main className={`pagar-main${checkout ? ' pagar-main-checkout' : ''}`}>
        {integrado ? <UserSectionHeader title="Pagar mi parqueo" description="Consulta tu placa y paga con tarjeta." /> : <h1 className="pagar-title">Pago de Parqueo</h1>}
        <p className="pagar-subtitle" hidden={!!checkout || integrado}>
          {usuario ? `Bienvenido(a), ${usuario.nombres} ${usuario.apellidos}.` : 'No necesitas una cuenta. Ingresa la placa y el número de tu ticket.'} Paga tu estancia con tarjeta.
        </p>

        {error && <div className="pagar-alerta pagar-alerta-error" role="alert">{error}</div>}

        {placaPagada ? <div className="pagar-card user-payment-confirmed" role="status"><span className="user-paid-badge">Pago confirmado</span><h2>La placa {placaPagada} ya está pagada</h2><p>No necesitas realizar otro pago. Al salir, el guardia verificará tu placa.</p><Link to="/app/validar" className="pagar-button">Consultar mi parqueo</Link><button type="button" className="pagar-button pagar-button-secundario" onClick={() => { setPlacaPagada(''); setPlaca(''); }}>Consultar otra placa</button></div> : !parqueo || !precio ? (
          <>
            {vehiculos.length > 0 && (
              <div className="pagar-mis-vehiculos">
                <span className="pagar-mis-vehiculos-titulo">Mis vehículos registrados</span>
                <div className="pagar-mis-vehiculos-lista">
                  {vehiculos.map((v) => (
                    <button
                      key={v.placa}
                      type="button"
                      className={`pagar-chip${placa === v.placa ? ' pagar-chip-activo' : ''}`}
                      onClick={() => setPlaca(v.placa)}
                      disabled={loading}
                    >
                      {v.placa}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form className="pagar-card" onSubmit={buscar}>
              <label className="pagar-label" htmlFor="placa">Placa del vehículo</label>
              <input
                id="placa"
                className="pagar-input"
                placeholder="Ej. P123ABC"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                disabled={loading}
                maxLength={7}
              />

              {!usuario && <>
                <label className="pagar-label" htmlFor="ticket">Número de ticket</label>
                <input id="ticket" className="pagar-input" placeholder="TK-..." value={ticket}
                  onChange={e => setTicket(e.target.value.toUpperCase())} disabled={loading} maxLength={63} required />
              </>}
              {placa && (
                tipo ? (
                  <p className="pagar-tipo-detectado">Tipo detectado: <strong>{ETIQUETAS[tipo]}</strong></p>
                ) : (
                  <p className="pagar-tipo-detectado pagar-tipo-detectado-error">
                    La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras.
                  </p>
                )
              )}

              <button type="submit" className="pagar-button" disabled={loading || !tipo || (!usuario && !ticket.trim())}>
                {loading ? 'Consultando...' : 'Consultar parqueo'}
              </button>
            </form>
          </>
        ) : (
          <div className={checkout ? 'pagar-checkout-layout' : undefined}>
          <div className="pagar-card pagar-resumen">
            <h2 className="pagar-resumen-titulo">Resumen de pago</h2>
            {!checkout && precio.modo !== 'live' && <p className="pagar-aviso-prueba" role="status">
              {precio.modo === 'mock' ? 'Simulador local: no se hacen cobros ni se solicita tarjeta.' : 'Modo de prueba · Sin cobros reales.'}
            </p>}
            <p className="pagar-resumen-linea">
              <span>Vehículo</span>
              <strong>{parqueo.placa} · {tipo ? ETIQUETAS[tipo] : ''}</strong>
            </p>
            <p className="pagar-resumen-linea">
              <span>Entrada</span>
              <strong>{parqueo.fecha_entrada ? new Date(parqueo.fecha_entrada).toLocaleString('es-GT', { timeZone: 'America/Guatemala' }) : '—'}</strong>
            </p>
            <p className="pagar-resumen-linea">
              <span>Tarifa diaria con tarjeta</span>
              <strong>Q{Number(precio.online).toFixed(2)}</strong>
            </p>

            {!checkout && <button
              type="button"
              className="pagar-button"
              onClick={pagar}
              disabled={cargandoPago}
            >
              {cargandoPago ? 'Preparando pago...' : precio.modo === 'mock' ? 'Probar pago' : `Pagar Q${Number(precio.online).toFixed(2)} con tarjeta`}
            </button>}
            <button
              type="button"
              className="pagar-button pagar-button-secundario"
              onClick={() => {
                setCheckout(null);
                setParqueo(null);
                setPrecio(null);
                setPlaca('');
                setTicket('');
              }}
              disabled={cargandoPago}
            >
              Cambiar vehículo
            </button>
          </div>
          {checkout && <div className="pagar-card pagar-tarjeta"><FormularioRecurrente url={checkout.url_pago} referencia={checkout.referencia} acceso={checkout.acceso} sandbox={precio.modo === 'sandbox'} /></div>}
          </div>
        )}
        {integrado && <p className="user-payment-note">El guardia verificará tu pago al salir.</p>}
      </main>
    </div>
  );
}

export default PagarParqueo;
