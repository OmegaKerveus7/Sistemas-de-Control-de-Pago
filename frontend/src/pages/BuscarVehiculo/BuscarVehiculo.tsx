import { useState, type FormEvent } from 'react';
import { vehiculosService, type VehiculoConDueno } from '../../services/vehiculos.service';
import './BuscarVehiculo.css';

export function BuscarVehiculo() {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<VehiculoConDueno[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscoAlgunaVez, setBuscoAlgunaVez] = useState(false);

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    const valor = termino.trim();
    if (!valor) return;

    setBuscando(true);
    setError(null);
    try {
      const data = await vehiculosService.buscar(valor);
      setResultados(data);
      setBuscoAlgunaVez(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo realizar la búsqueda');
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <section className="buscar-vehiculo-page">
      <div>
        <h1 className="buscar-vehiculo-title">Buscar dueño de vehículo</h1>
        <p className="buscar-vehiculo-subtitle">
          Busca por placa, marca, modelo, nombre o DPI del dueño.
        </p>
      </div>

      <form className="buscar-vehiculo-form" onSubmit={buscar}>
        <input
          className="form-input usuarios-input-plano"
          placeholder="Ej. P111AAA, Toyota, Juan Pérez..."
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
        />
        <button type="submit" className="buscar-vehiculo-btn" disabled={buscando}>
          {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <div className="alerta alerta-error">{error}</div>}

      {buscoAlgunaVez && !error && (
        <div className="card buscar-vehiculo-card">
          {resultados.length === 0 ? (
            <div className="buscar-vehiculo-vacio">No se encontraron vehículos con ese criterio.</div>
          ) : (
            <div className="buscar-vehiculo-tabla-wrapper">
              <table className="buscar-vehiculo-tabla">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Vehículo</th>
                    <th>Color</th>
                    <th>Dueño</th>
                    <th>DPI</th>
                    <th>Correo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((v) => (
                    <tr key={v.id}>
                      <td className="buscar-vehiculo-placa">{v.placa}</td>
                      <td>{v.marca} {v.modelo} <span className="buscar-vehiculo-tipo">({v.tipo})</span></td>
                      <td>{v.color ?? '—'}</td>
                      <td>{v.dueno_nombres} {v.dueno_apellidos}</td>
                      <td>{v.dueno_dpi}</td>
                      <td>{v.dueno_email}</td>
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

export default BuscarVehiculo;
