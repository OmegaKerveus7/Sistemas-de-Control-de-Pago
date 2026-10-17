import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VehiculoConDueno } from '../../models';
import { vehiculosService } from '../../services/vehiculos.service';
import { useAuth } from '../../hooks/useAuth';
import { rutaInicialPorRol } from '../../components/Menu';
import './BuscarVehiculo.css';

const REGEX_PLACA = /^[PM]\d{3}[A-Z]{3}$/;

function IconoBusqueda({ volver = false }: { volver?: boolean }) {
  return <svg className="buscar-vehiculo-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={volver ? 'M19 12H5 M12 19l-7-7 7-7' : 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'} /></svg>;
}

export function BuscarVehiculo() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  function regresar() {
    if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1);
    else navigate(rutaInicialPorRol(usuario?.rol));
  }
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
      <div className="buscar-vehiculo-header">
        <button type="button" className="buscar-vehiculo-volver" onClick={regresar} aria-label="Regresar a la vista anterior" title="Regresar"><IconoBusqueda volver /></button>
        <div>
        <h1 className="buscar-vehiculo-title">Buscar vehículo</h1>
        <p className="buscar-vehiculo-subtitle">
          Busca un vehículo ingresando su placa completa.
        </p>
        </div>
      </div>

      <div className="card buscar-vehiculo-consulta">
      <h2>Consultar vehículo</h2>
      <label className="form-label" htmlFor="buscar-vehiculo-placa">Placa del vehículo</label>
      <form className="buscar-vehiculo-form" onSubmit={buscar}>
        <input
          id="buscar-vehiculo-placa"
          className="form-input"
          disabled={buscando}
          placeholder="Ej. P123ABC"
          value={termino}
          onChange={(e) => setTermino(e.target.value.toUpperCase())}
          maxLength={7}
          autoComplete="off"
          aria-label="Placa del vehículo"
        />
        <button type="submit" className="buscar-vehiculo-btn" disabled={buscando}>
          <IconoBusqueda /> {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </form>
      <p className="buscar-vehiculo-ayuda">Ingresa la placa completa: P123ABC para carro o M123ABC para moto.</p>
      </div>

      {error && <div className="alerta alerta-error" role="alert">{error}</div>}

      {buscoAlgunaVez && !error && (
        <div className="card buscar-vehiculo-card" aria-live="polite" aria-busy={buscando}>
          <div className="buscar-vehiculo-resultados-header"><h2>Resultado de la búsqueda</h2>{!buscando && <span>{resultados.length} {resultados.length === 1 ? 'vehículo encontrado' : 'vehículos encontrados'}</span>}</div>
          {buscando ? <div className="buscar-vehiculo-vacio"><span className="spinner" /> Buscando vehículo...</div> : resultados.length === 0 ? (
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
