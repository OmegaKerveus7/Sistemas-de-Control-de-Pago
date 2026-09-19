import { useEffect, useState, type FormEvent } from 'react';
import { tarifasService, type Tarifa } from '../../services/tarifas.service';
import './Tarifas.css';

interface FormularioTarifa {
  precio_efectivo: string;
  precio_linea: string;
}

export function Tarifas() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tarifaEditando, setTarifaEditando] = useState<Tarifa | null>(null);
  const [formulario, setFormulario] = useState<FormularioTarifa>({ precio_efectivo: '', precio_linea: '' });
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
      precio_efectivo: String(tarifa.precio_efectivo),
      precio_linea: String(tarifa.precio_linea),
    });
    setErrorForm(null);
  }

  function cerrarModal() {
    setTarifaEditando(null);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!tarifaEditando) return;

    const precioEfectivo = Number(formulario.precio_efectivo);
    const precioLinea = Number(formulario.precio_linea);
    if (!formulario.precio_efectivo.trim() || Number.isNaN(precioEfectivo) || precioEfectivo < 0) {
      setErrorForm('Ingresa un precio en efectivo válido');
      return;
    }
    if (!formulario.precio_linea.trim() || Number.isNaN(precioLinea) || precioLinea < 0) {
      setErrorForm('Ingresa un precio en línea válido');
      return;
    }

    setGuardando(true);
    setErrorForm(null);
    try {
      await tarifasService.actualizar(tarifaEditando.id_tarifa, {
        precio_efectivo: precioEfectivo,
        precio_linea: precioLinea,
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
        <p className="tarifas-subtitle">Precios por tipo de vehículo (efectivo y línea).</p>
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
                  <th>Tipo de vehículo</th>
                  <th>Precio efectivo</th>
                  <th>Precio línea</th>
                  <th>Diferencia</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tarifas.map((t) => (
                  <tr key={t.id_tarifa}>
                    <td className="tarifas-capitalize">{t.tipo_vehiculo}</td>
                    <td>Q{Number(t.precio_efectivo).toFixed(2)}</td>
                    <td>Q{Number(t.precio_linea).toFixed(2)}</td>
                    <td>Q{Number(t.diferencia).toFixed(2)}</td>
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
              Editar tarifa · {tarifaEditando.tipo_vehiculo}
            </h2>

            <form className="tarifas-form" onSubmit={guardar}>
              {errorForm && <div className="alerta alerta-error">{errorForm}</div>}

              <div className="form-group">
                <label className="form-label">Precio efectivo (Q)</label>
                <input
                  className="form-input usuarios-input-plano"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formulario.precio_efectivo}
                  onChange={(e) => setFormulario({ ...formulario, precio_efectivo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Precio línea (Q)</label>
                <input
                  className="form-input usuarios-input-plano"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formulario.precio_linea}
                  onChange={(e) => setFormulario({ ...formulario, precio_linea: e.target.value })}
                />
              </div>

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
