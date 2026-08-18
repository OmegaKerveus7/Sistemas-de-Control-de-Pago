import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { parqueoService, type Parqueo } from '../../services/parqueo.service';
import { pagosService, type PrecioInfo } from '../../services/pagos.service';
import './PagarParqueo.css';

type TipoVehiculo = 'motocicleta' | 'automovil';

const ETIQUETAS: Record<TipoVehiculo, string> = {
  motocicleta: 'Motocicleta',
  automovil: 'Automóvil',
};

export function PagarParqueo() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [placa, setPlaca] = useState('');
  const [tipo, setTipo] = useState<TipoVehiculo>('motocicleta');
  const [parqueo, setParqueo] = useState<Parqueo | null>(null);
  const [precio, setPrecio] = useState<PrecioInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoPago, setCargandoPago] = useState(false);

  if (!usuario) {
    return <Navigate to="/login?redirect=/pagar-parqueo" replace />;
  }

  const buscar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setParqueo(null);
    setPrecio(null);

    const limpio = placa.trim().toUpperCase();
    if (!limpio) {
      setError('Ingresa la placa de tu vehículo');
      return;
    }

    setLoading(true);
    try {
      const activo = await parqueoService.obtenerActivoPorPlaca(limpio);
      const info = await pagosService.precio(tipo);
      setParqueo(activo);
      setPrecio(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el parqueo');
    } finally {
      setLoading(false);
    }
  };

  const pagar = async () => {
    if (!parqueo || !precio) return;
    setCargandoPago(true);
    setError('');
    try {
      const resultado = await pagosService.crear({
        parqueo_id: parqueo.id,
        tipo_vehiculo: tipo,
        metodo: 'tarjeta',
      });
      window.location.href = resultado.url_pago;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago');
      setCargandoPago(false);
    }
  };

  return (
    <div className="pagar-page">
      <header className="pagar-header">
        <Link to="/" className="pagar-logo">
          Sistema de Gestión de Parqueo
        </Link>
        <button className="pagar-volver" onClick={() => navigate('/app/dashboard')}>
          Volver
        </button>
      </header>

      <main className="pagar-main">
        <h1 className="pagar-title">Pago de Parqueo</h1>
        <p className="pagar-subtitle">
          Bienvenido(a), {usuario.nombres} {usuario.apellidos}. Paga tu estancia de forma rápida y segura con tarjeta.
        </p>

        {error && <div className="pagar-alerta pagar-alerta-error">{error}</div>}

        {!parqueo || !precio ? (
          <form className="pagar-card" onSubmit={buscar}>
            <label className="pagar-label" htmlFor="placa">Placa del vehículo</label>
            <input
              id="placa"
              className="pagar-input"
              placeholder="Ej. P123ABC"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              disabled={loading}
              maxLength={15}
            />

            <label className="pagar-label" htmlFor="tipo">Tipo de vehículo</label>
            <select
              id="tipo"
              className="pagar-input"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoVehiculo)}
              disabled={loading}
            >
              <option value="motocicleta">Motocicleta</option>
              <option value="automovil">Automóvil</option>
            </select>

            <button type="submit" className="pagar-button" disabled={loading}>
              {loading ? 'Consultando...' : 'Consultar mi parqueo'}
            </button>
          </form>
        ) : (
          <div className="pagar-card">
            <h2 className="pagar-resumen-titulo">Resumen de pago</h2>
            <p className="pagar-resumen-linea">
              <span>Vehículo</span>
              <strong>{parqueo.placa} · {ETIQUETAS[tipo]}</strong>
            </p>
            <p className="pagar-resumen-linea">
              <span>Entrada</span>
              <strong>{new Date(parqueo.hora_entrada).toLocaleString()}</strong>
            </p>
            <p className="pagar-resumen-linea">
              <span>Precio a pagar (precio fijo)</span>
              <strong>Q{Number(precio.online).toFixed(2)}</strong>
            </p>

            <button
              type="button"
              className="pagar-button"
              onClick={pagar}
              disabled={cargandoPago}
            >
              {cargandoPago ? 'Redirigiendo a la pasarela...' : 'Pagar con tarjeta'}
            </button>
            <button
              type="button"
              className="pagar-button pagar-button-secundario"
              onClick={() => {
                setParqueo(null);
                setPrecio(null);
                setPlaca('');
              }}
              disabled={cargandoPago}
            >
              Cambiar vehículo
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default PagarParqueo;