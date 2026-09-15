import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { pagosService, type Pago } from '../../services/pagos.service';
import './Pagos.css';

const TIPOS_VEHICULO = [
  { id_tipo_vehiculo: 1, nombre: 'Moto' },
  { id_tipo_vehiculo: 2, nombre: 'Carro' },
];

export function Pagos() {
  const { usuario } = useAuth();
  const puedeVerListado = usuario?.rol === 'administrador';

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(puedeVerListado);
  const [error, setError] = useState<string | null>(null);

  const [placa, setPlaca] = useState('');
  const [idTipoVehiculo, setIdTipoVehiculo] = useState(2);
  const [registrando, setRegistrando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

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

    setRegistrando(true);
    setErrorForm(null);
    setExito(null);
    try {
      const resultado = await pagosService.registrarEfectivo({ placa: placaLimpia, id_tipo_vehiculo: idTipoVehiculo });
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
        <h2 className="pagos-form-title">Pago con tarjeta</h2>
        <p>Consulta la placa y revisa el monto antes de abrir el pago seguro de Recurrente.</p>
        <Link className="pagos-btn-registrar" to={`/pagar-parqueo${placa.trim() ? `?placa=${encodeURIComponent(placa.trim().toUpperCase())}` : ''}`}>
          Ir a pago con tarjeta
        </Link>
      </div>

      <div className="card pagos-form-card">
        <h2 className="pagos-form-title">Registrar pago en efectivo</h2>
        <form className="pagos-form" onSubmit={registrarPago}>
          <div className="form-group">
            <label className="form-label">Placa del vehículo</label>
            <input
              className="form-input usuarios-input-plano"
              placeholder="Ej. P123ABC"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de vehículo</label>
            <select
              className="form-input usuarios-input-plano"
              value={idTipoVehiculo}
              onChange={(e) => setIdTipoVehiculo(Number(e.target.value))}
            >
              {TIPOS_VEHICULO.map((t) => (
                <option key={t.id_tipo_vehiculo} value={t.id_tipo_vehiculo}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="pagos-btn-registrar" disabled={registrando}>
            {registrando ? 'Registrando...' : 'Registrar pago'}
          </button>
        </form>
        {errorForm && <div className="alerta alerta-error">{errorForm}</div>}
        {exito && <div className="pagos-exito">{exito}</div>}
      </div>

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
                  <th>Registrado por</th>
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
                    <td>—</td>
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
