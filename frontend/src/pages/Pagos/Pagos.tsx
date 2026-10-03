import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { pagosService, type Pago } from '../../services/pagos.service';
import './Pagos.css';

const REGEX_PLACA = /^([PM])\d{3}[A-Z]{3}$/;

function detectarTipoVehiculo(placa: string): 'carro' | 'moto' | null {
  const coincidencia = REGEX_PLACA.exec(placa.trim().toUpperCase());
  if (!coincidencia) return null;
  return coincidencia[1] === 'P' ? 'carro' : 'moto';
}

const MAPA_TIPO_ID: Record<string, number> = {
  carro: 2,
  moto: 1,
};

const PRECIOS_EFECTIVO = [
  { tipo: 'Motocicleta', precio: 22 },
  { tipo: 'Carro', precio: 27 },
  { tipo: 'Camioneta', precio: 27 },
];

export function Pagos() {
  const { usuario } = useAuth();
  const puedeVerListado = usuario?.rol === 'administrador';
  const esCobrador = usuario?.rol === 'cobrador';

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(puedeVerListado);
  const [error, setError] = useState<string | null>(null);

  const [placa, setPlaca] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const tipoDetectado = useMemo(() => detectarTipoVehiculo(placa), [placa]);

  const precioEstimado = useMemo(() => {
    if (!tipoDetectado) return null;
    const tipo = tipoDetectado === 'carro' ? 'Carro' : 'Motocicleta';
    return PRECIOS_EFECTIVO.find((p) => p.tipo === tipo)?.precio ?? null;
  }, [tipoDetectado]);

  async function cargar() {
    if (!puedeVerListado) return;
    setCargando(true);
    setError(null);
    try {
      setPagos(await pagosService.listar());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar los pagos');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function registrarPago(evento: FormEvent) {
    evento.preventDefault();
    const placaLimpia = placa.trim().toUpperCase();
    if (!placaLimpia) {
      setErrorForm('Ingresa la placa del vehículo');
      return;
    }
    if (!tipoDetectado) {
      setErrorForm('La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras. Ej: P123ABC');
      return;
    }

    const idTipo = MAPA_TIPO_ID[tipoDetectado];
    setRegistrando(true);
    setErrorForm(null);
    setExito(null);
    try {
      const resultado = await pagosService.registrarEfectivo({ placa: placaLimpia, id_tipo_vehiculo: idTipo });
      setExito(`Pago registrado: Q${resultado.monto.toFixed(2)}`);
      setPlaca('');
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setRegistrando(false);
    }
  }

  const totalCobrado = pagos
    .filter((p) => p.estado === 'completado')
    .reduce((suma, p) => suma + Number(p.monto), 0);

  return (
    <section className="pagos-page">
      <div>
        <h1 className="pagos-title">Pagos</h1>
        <p className="pagos-subtitle">
          {puedeVerListado
            ? `${pagos.length} pago${pagos.length === 1 ? '' : 's'} registrados · Q${totalCobrado.toFixed(2)} cobrados`
            : 'Registra el cobro en efectivo de un ticket'}
        </p>
      </div>

      <div className="card pagos-form-card">
        <h2 className="pagos-form-title">Registrar pago en efectivo</h2>
        <form className="pagos-form" onSubmit={registrarPago}>
          <div className="form-group pagos-placa-group">
            <label className="form-label">Placa del vehículo</label>
            <input
              className="form-input usuarios-input-plano"
              placeholder="Ej. P123ABC"
              value={placa}
              maxLength={7}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              autoComplete="off"
            />
            {placa && (
              tipoDetectado ? (
                <p className="pagos-tipo-detectado">
                  Tipo: <strong>{tipoDetectado === 'carro' ? 'Carro' : 'Moto'}</strong>
                  {precioEstimado !== null && (
                    <span className="pagos-precio-estimado"> — Q{precioEstimado}.00</span>
                  )}
                </p>
              ) : (
                <p className="pagos-tipo-detectado pagos-tipo-error">
                  La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras.
                </p>
              )
            )}
          </div>
          <button type="submit" className="pagos-btn-registrar" disabled={registrando || !tipoDetectado}>
            {registrando ? 'Registrando...' : 'Registrar pago'}
          </button>
        </form>
        {errorForm && <div className="alerta alerta-error">{errorForm}</div>}
        {exito && <div className="pagos-exito">{exito}</div>}
      </div>

      {esCobrador && (
        <div className="pagos-precios">
          <h3 className="pagos-precios-titulo">Tarifas en efectivo</h3>
          <div className="pagos-precios-grid">
            {PRECIOS_EFECTIVO.map((p) => (
              <div className="pagos-precio-item" key={p.tipo}>
                <span className="pagos-precio-tipo">{p.tipo}</span>
                <span className="pagos-precio-monto">Q{p.precio}.00</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {puedeVerListado && (
        <div className="card pagos-form-card">
          <h2 className="pagos-form-title">Pago con tarjeta</h2>
          <p>Consulta la placa y revisa el monto antes de abrir el pago seguro de Recurrente.</p>
          <Link className="pagos-btn-link" to={`/app/pagos/tarjeta${placa.trim() ? `?placa=${encodeURIComponent(placa.trim().toUpperCase())}` : ''}`}>
            Ir a pago con tarjeta
          </Link>
        </div>
      )}

      {error && <div className="alerta alerta-error">{error}</div>}

      {puedeVerListado && (
      <div className="card pagos-card">
        {cargando ? (
          <div className="pagos-estado"><span className="spinner" /> Cargando pagos...</div>
        ) : pagos.length === 0 ? (
          <div className="pagos-estado">No hay pagos registrados todavía.</div>
        ) : (
          <div className="pagos-tabla-wrapper">
            <table className="pagos-tabla">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Placa</th>
                  <th>Pagador</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.ticket}</td>
                    <td className="pagos-placa">{p.placa}</td>
                    <td>{p.pagador_nombres} {p.pagador_apellidos}</td>
                    <td className="pagos-metodo">{p.metodo}</td>
                    <td>Q{Number(p.monto).toFixed(2)}</td>
                    <td>
                      <span className={`pagos-estado-texto ${p.estado}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td>{new Date(p.fecha_pago).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </section>
  );
}

export default Pagos;
