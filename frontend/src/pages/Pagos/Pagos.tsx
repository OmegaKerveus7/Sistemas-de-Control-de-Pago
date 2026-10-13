import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { pagosService, type Pago } from '../../services/pagos.service';
import { CobroPlaca } from '../../components/CobroPlaca';
import { REGEX_PLACA } from '../../utils/placa';
import './Pagos.css';

export function Pagos() {
  const { usuario } = useAuth();
  const puedeVerListado = usuario?.rol === 'administrador';

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(puedeVerListado);
  const [error, setError] = useState<string | null>(null);

  const [placa, setPlaca] = useState('');

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
            : 'Registra el cobro en efectivo de un vehículo'}
        </p>
      </div>

      <div className="card pagos-form-card">
        <h2 className="pagos-form-title">Cobro en efectivo</h2>
        <p className="pagos-subtitle">Ingresa la placa: el cobro queda vigente para hoy, aunque el vehículo todavía no haya entrado.</p>
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
          {placa && !REGEX_PLACA.test(placa) && (
            <p className="pagos-tipo-detectado pagos-tipo-error">
              La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras.
            </p>
          )}
        </div>
        <CobroPlaca placa={placa} onCobrado={() => { setPlaca(''); void cargar(); }} />
      </div>

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
                  <th>NIT</th>
                  <th>Placa</th>
                  <th>Recibo a nombre de</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.ticket || 'Sin entrada'}</td>
                    <td>{p.nit ?? '—'}</td>
                    <td className="pagos-placa">{p.placa}</td>
                    <td>{p.nombre_facturacion || `${p.pagador_nombres ?? ''} ${p.pagador_apellidos ?? ''}`.trim() || '—'}</td>
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
