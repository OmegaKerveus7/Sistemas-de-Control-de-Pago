import { useState, type FormEvent } from 'react';
import type { VehiculoConDueno } from '../../models';
import { vehiculosService } from '../../services/vehiculos.service';
import './BuscarVehiculo.css';

const REGEX_PLACA = /^[PM]\d{3}[A-Z]{3}$/;

export function BuscarVehiculo() {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<VehiculoConDueno[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscoAlgunaVez, setBuscoAlgunaVez] = useState(false);

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    const placa = termino.trim().toUpperCase();
    setBuscoAlgunaVez(true);
    if (!placa) {
      setError('Ingresa la placa del vehículo.');
      setResultados([]);
      return;
    }
    if (!REGEX_PLACA.test(placa)) {
      setError('La placa debe tener el formato P123ABC o M123ABC.');
      setResultados([]);
      return;
    }

    setBuscando(true);
    setError(null);
    try {
      const data = await vehiculosService.buscar(placa);
      setResultados(data);
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
        <h1 className="buscar-vehiculo-title">Buscar vehículo</h1>
        <p className="buscar-vehiculo-subtitle">
          Busca un vehículo ingresando su placa completa.
        </p>
      </div>

      <form className="buscar-vehiculo-form" onSubmit={buscar}>
        <input
          className="form-input usuarios-input-plano"
          placeholder="Ej. P123ABC"
          value={termino}
          onChange={(e) => setTermino(e.target.value.toUpperCase())}
          maxLength={7}
          autoComplete="off"
          aria-label="Placa del vehículo"
        />
        <button type="submit" className="buscar-vehiculo-btn" disabled={buscando}>
          {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <div className="alerta alerta-error">{error}</div>}

      {buscoAlgunaVez && !error && (
        <div className="card buscar-vehiculo-card">
          {resultados.length === 0 ? (
            <div className="buscar-vehiculo-vacio">No se encontró ningún vehículo con esa placa.</div>
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
                    <tr key={v.placa}>
                      <td className="buscar-vehiculo-placa">{v.placa}</td>
                      <td>{v.marca ?? 'Sin marca registrada'} <span className="buscar-vehiculo-tipo">({v.tipo ?? 'Sin tipo registrado'})</span></td>
                      <td>{v.color ?? '—'}</td>
                      <td>{v.id_dueno == null ? 'Visitante sin dueño registrado' : `${v.dueno_nombres ?? ''} ${v.dueno_apellidos ?? ''}`.trim()}</td>
                      <td>{v.dueno_dpi ?? '—'}</td>
                      <td>{v.dueno_email ?? '—'}</td>
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
