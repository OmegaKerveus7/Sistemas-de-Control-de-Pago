import { useEffect, useState, type FormEvent } from 'react';
import { tarifasService, type Tarifa } from '../../services/tarifas.service';
import './Tarifas.css';

interface FormularioTarifa {
  precio: string;
  costo_transaccion: string;
  activo: boolean;
}

export function Tarifas() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tarifaEditando, setTarifaEditando] = useState<Tarifa | null>(null);
  const [formulario, setFormulario] = useState<FormularioTarifa>({ precio: '', costo_transaccion: '', activo: true });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setTarifas(await tarifasService.listar());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar las tarifas');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirEditar(tarifa: Tarifa) {
    setTarifaEditando(tarifa);
    setFormulario({
      precio: String(tarifa.precio),
      costo_transaccion: tarifa.costo_transaccion != null ? String(tarifa.costo_transaccion) : '',
      activo: tarifa.activo,
    });
    setErrorForm(null);
  }

  function cerrarModal() {
    setTarifaEditando(null);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!tarifaEditando) return;

    const precio = Number(formulario.precio);
    if (!formulario.precio.trim() || Number.isNaN(precio) || precio < 0) {
      setErrorForm('Ingresa un precio válido');
      return;
    }
    const costoTransaccion = formulario.costo_transaccion.trim() === '' ? null : Number(formulario.costo_transaccion);
    if (costoTransaccion !== null && Number.isNaN(costoTransaccion)) {
      setErrorForm('Ingresa un costo de transacción válido');
      return;
    }

    setGuardando(true);
    setErrorForm(null);
    try {
      await tarifasService.actualizar(tarifaEditando.id_tarifa, {
        precio,
        costo_transaccion: costoTransaccion,
        activo: formulario.activo,
      });
      setTarifaEditando(null);
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar la tarifa');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="tarifas-page">
      <div>
        <h1 className="tarifas-title">Tarifas</h1>
        <p className="tarifas-subtitle">Precios por tipo de vehículo y método de pago.</p>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <div className="card tarifas-card">
        {cargando ? (
          <div className="tarifas-estado"><span className="spinner" /> Cargando tarifas...</div>
        ) : tarifas.length === 0 ? (
          <div className="tarifas-estado">No hay tarifas configuradas.</div>
        ) : (
          <div className="tarifas-tabla-wrapper">
            <table className="tarifas-tabla">
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Método de pago</th>
                  <th>Precio</th>
                  <th>Costo transacción</th>
                  <th>Ganancia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tarifas.map((t) => (
                  <tr key={t.id_tarifa}>
                    <td className="tarifas-capitalize">{t.nom_tipo_vehiculo}</td>
                    <td className="tarifas-capitalize">{t.nom_tipo_pago}</td>
                    <td>Q{Number(t.precio).toFixed(2)}</td>
                    <td>{t.costo_transaccion != null ? `Q${Number(t.costo_transaccion).toFixed(2)}` : '—'}</td>
                    <td>{t.ganancia != null ? `Q${Number(t.ganancia).toFixed(2)}` : '—'}</td>
                    <td>
                      <span className={`tarifas-estado-texto ${t.activo ? 'activo' : 'inactivo'}`}>
                        {t.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <button className="tarifas-btn-accion" onClick={() => abrirEditar(t)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tarifaEditando && (
        <div className="tarifas-modal-overlay" onClick={cerrarModal}>
          <div className="tarifas-modal card" onClick={(e) => e.stopPropagation()}>
            <h2 className="tarifas-modal-title">
              Editar tarifa · {tarifaEditando.nom_tipo_vehiculo} / {tarifaEditando.nom_tipo_pago}
            </h2>

            <form className="tarifas-form" onSubmit={guardar}>
              {errorForm && <div className="alerta alerta-error">{errorForm}</div>}

              <div className="form-group">
                <label className="form-label">Precio (Q)</label>
                <input
                  className="form-input usuarios-input-plano"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formulario.precio}
                  onChange={(e) => setFormulario({ ...formulario, precio: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Costo de transacción (Q) — opcional</label>
                <input
                  className="form-input usuarios-input-plano"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Solo aplica a pagos en línea"
                  value={formulario.costo_transaccion}
                  onChange={(e) => setFormulario({ ...formulario, costo_transaccion: e.target.value })}
                />
              </div>

              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={formulario.activo}
                  onChange={(e) => setFormulario({ ...formulario, activo: e.target.checked })}
                />
                <span className="checkbox-custom" />
                <span className="checkbox-label">Tarifa activa</span>
              </label>

              <div className="tarifas-modal-acciones">
                <button type="button" className="tarifas-btn-cancelar" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="tarifas-btn-guardar" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Tarifas;
