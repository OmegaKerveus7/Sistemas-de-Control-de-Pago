import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { vehiculosService } from '../../services/vehiculos.service';
import type { Marca, TipoVehiculoCatalogo, Vehiculo } from '../../models';
import './RegistrarVehiculo.css';

const REGEX_PLACA = /^([PM])\d{3}[A-Z]{3}$/;
const OTROS_MARCA = '__otros__';

/** P = autom\u00f3vil (carro), M = motocicleta. No se ofrece "camioneta": la placa solo distingue estos dos tipos. */
const NOMBRE_TIPO_POR_PREFIJO: Record<'P' | 'M', string> = { P: 'carro', M: 'moto' };

function etiquetaTipo(tipo?: { nombre: string } | null): string {
  if (!tipo) return '\u2014';
  const nombre = tipo.nombre.toLowerCase();
  if (nombre === 'carro') return 'Carro';
  if (nombre === 'moto') return 'Motocicleta';
  return tipo.nombre.charAt(0).toUpperCase() + tipo.nombre.slice(1);
}

interface FormularioVehiculo {
  placa: string;
  id_tipo: string;
  id_marca: string;
  marcaManual: string;
  color: string;
  modelo: string;
}

const FORMULARIO_VACIO: FormularioVehiculo = {
  placa: '',
  id_tipo: '',
  id_marca: '',
  marcaManual: '',
  color: '',
  modelo: '',
};

interface FormularioEdicion {
  placa: string;
  color: string;
  modelo: string;
}

export function RegistrarVehiculo() {
  const { usuario } = useAuth();
  const [tipos, setTipos] = useState<TipoVehiculoCatalogo[]>([]);
  const [marcasAgrupadas, setMarcasAgrupadas] = useState<Array<{ tipo_vehiculo: string; marcas: Marca[] }>>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [cargandoVehiculos, setCargandoVehiculos] = useState(true);
  const [formulario, setFormulario] = useState<FormularioVehiculo>(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState('');
  const [errorForm, setErrorForm] = useState('');
  const [errorLista, setErrorLista] = useState('');

  const [vehiculoEditando, setVehiculoEditando] = useState<Vehiculo | null>(null);
  const [formularioEdicion, setFormularioEdicion] = useState<FormularioEdicion>({ placa: '', color: '', modelo: '' });
  const [errorEdicion, setErrorEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const cargarCatalogos = async () => {
    setCargandoCatalogos(true);
    try {
      const [tiposData, marcasData] = await Promise.all([
        vehiculosService.tiposVehiculo(),
        vehiculosService.marcasPorTipo(),
      ]);
      setTipos(tiposData);
      setMarcasAgrupadas(marcasData);
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudieron cargar los catálogos');
    } finally {
      setCargandoCatalogos(false);
    }
  };

  useEffect(() => {
    void cargarCatalogos();
  }, []);

  const recargarVehiculos = async () => {
    if (!usuario) return;
    setCargandoVehiculos(true);
    setErrorLista('');
    try {
      const data = await vehiculosService.vehiculosPorUsuario(usuario.id);
      setVehiculos(data);
    } catch (err) {
      setErrorLista(err instanceof Error ? err.message : 'No se pudieron cargar tus vehículos');
    } finally {
      setCargandoVehiculos(false);
    }
  };

  useEffect(() => {
    if (!usuario) return;
    let activo = true;
    (async () => {
      setCargandoVehiculos(true);
      setErrorLista('');
      try {
        const data = await vehiculosService.vehiculosPorUsuario(usuario.id);
        if (!activo) return;
        setVehiculos(data);
      } catch (err) {
        if (activo) setErrorLista(err instanceof Error ? err.message : 'No se pudieron cargar tus vehículos');
      } finally {
        if (activo) setCargandoVehiculos(false);
      }
    })();
    return () => { activo = false; };
  }, [usuario]);

  const marcasDisponibles = useMemo<Marca[]>(() => {
    const tipo = tipos.find((t) => String(t.id_tipo) === formulario.id_tipo);
    if (!tipo) return [];
    const grupo = marcasAgrupadas.find((m) => m.tipo_vehiculo.toLowerCase() === tipo.nombre.toLowerCase());
    return grupo?.marcas ?? [];
  }, [tipos, marcasAgrupadas, formulario.id_tipo]);

  const tipoDetectadoPorPlaca = useMemo<'P' | 'M' | null>(() => {
    const limpio = formulario.placa.trim().toUpperCase();
    if (!REGEX_PLACA.test(limpio)) return null;
    return limpio.charAt(0) as 'P' | 'M';
  }, [formulario.placa]);

  const tipoCompatibleConPlaca = useMemo(() => {
    if (!tipoDetectadoPorPlaca) return null;
    const nombreEsperado = NOMBRE_TIPO_POR_PREFIJO[tipoDetectadoPorPlaca];
    return tipos.find((t) => t.nombre.toLowerCase() === nombreEsperado) ?? null;
  }, [tipos, tipoDetectadoPorPlaca]);

  useEffect(() => {
    setFormulario((prev) => {
      const nuevoIdTipo = tipoCompatibleConPlaca ? String(tipoCompatibleConPlaca.id_tipo) : '';
      if (prev.id_tipo === nuevoIdTipo) return prev;
      return { ...prev, id_tipo: nuevoIdTipo, id_marca: '', marcaManual: '' };
    });
  }, [tipoCompatibleConPlaca]);

  if (!usuario) {
    return <Navigate to="/login?redirect=/app/mis-vehiculos" replace />;
  }

  const validar = (): string | null => {
    const placaLimpia = formulario.placa.trim().toUpperCase();
    if (!placaLimpia) return 'Ingresa la placa del vehículo';
    if (!REGEX_PLACA.test(placaLimpia)) return 'La placa debe iniciar con P (automóvil) o M (motocicleta), seguido de 3 números y 3 letras. Ej: P123ABC o M123ABC';
    if (!tipoCompatibleConPlaca || !formulario.id_tipo) return 'No se pudo determinar el tipo de vehículo a partir de la placa';
    if (!formulario.id_marca) return 'Selecciona la marca del vehículo';
    if (formulario.id_marca === OTROS_MARCA && !formulario.marcaManual.trim()) return 'Escribe la marca del vehículo';
    if (!formulario.modelo.trim()) return 'Ingresa el modelo del vehículo';
    return null;
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErrorForm('');
    setMensajeExito('');
    const errorValidacion = validar();
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }

    const placaLimpia = formulario.placa.trim().toUpperCase();
    const idTipoNum = Number(formulario.id_tipo);
    const esOtrosMarca = formulario.id_marca === OTROS_MARCA;
    const idMarcaNum = formulario.id_marca && !esOtrosMarca ? Number(formulario.id_marca) : undefined;
    const marcaPersonalizada = esOtrosMarca ? formulario.marcaManual.trim() : undefined;
    const colorLimpio = formulario.color.trim() || undefined;
    const modeloLimpio = formulario.modelo.trim();

    if (vehiculos.some((v) => v.placa.toUpperCase() === placaLimpia && v.activo !== false)) {
      setErrorForm('Ya tienes un vehículo registrado con esa placa');
      return;
    }

    setGuardando(true);
    try {
      await vehiculosService.crear({
        placa: placaLimpia,
        id_usuario: usuario.id,
        id_tipo: idTipoNum,
        id_marca: idMarcaNum,
        marca_personalizada: marcaPersonalizada,
        color: colorLimpio,
        modelo: modeloLimpio,
      });
      setMensajeExito(`Vehículo ${placaLimpia} registrado correctamente.`);
      setFormulario(FORMULARIO_VACIO);
      await Promise.all([recargarVehiculos(), esOtrosMarca ? cargarCatalogos() : Promise.resolve()]);
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo registrar el vehículo');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (placa: string) => {
    if (!confirm(`¿Desactivar el vehículo con placa ${placa}?`)) return;
    setEliminando(placa);
    setErrorLista('');
    try {
      await vehiculosService.eliminar(placa);
      await recargarVehiculos();
    } catch (err) {
      setErrorLista(err instanceof Error ? err.message : 'No se pudo desactivar el vehículo');
    } finally {
      setEliminando(null);
    }
  };

  const abrirEdicion = (vehiculo: Vehiculo) => {
    setVehiculoEditando(vehiculo);
    setFormularioEdicion({ placa: vehiculo.placa, color: vehiculo.color ?? '', modelo: vehiculo.modelo ?? '' });
    setErrorEdicion('');
  };

  const cerrarEdicion = () => {
    setVehiculoEditando(null);
    setFormularioEdicion({ placa: '', color: '', modelo: '' });
    setErrorEdicion('');
  };

  const guardarEdicion = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!vehiculoEditando || !usuario) return;
    setErrorEdicion('');

    const nuevaPlaca = formularioEdicion.placa.trim().toUpperCase();
    const nuevoColor = formularioEdicion.color.trim();
    const nuevoModelo = formularioEdicion.modelo.trim();

    if (!nuevaPlaca) {
      setErrorEdicion('Ingresa la placa');
      return;
    }
    if (!REGEX_PLACA.test(nuevaPlaca)) {
      setErrorEdicion('La placa debe iniciar con P (automóvil) o M (motocicleta), seguido de 3 números y 3 letras.');
      return;
    }
    const prefijo = nuevaPlaca.charAt(0) as 'P' | 'M';
    const tipo = tipos.find((t) => t.id_tipo === vehiculoEditando.id_tipo);
    if (!tipo || tipo.nombre.toLowerCase() !== NOMBRE_TIPO_POR_PREFIJO[prefijo]) {
      setErrorEdicion(`La placa (${prefijo}) no coincide con el tipo de vehículo registrado (${etiquetaTipo(tipo)})`);
      return;
    }

    const placaCambio = nuevaPlaca !== vehiculoEditando.placa;
    const colorCambio = (nuevoColor || null) !== (vehiculoEditando.color ?? null);
    const modeloCambio = (nuevoModelo || null) !== (vehiculoEditando.modelo ?? null);

    if (!placaCambio && !colorCambio && !modeloCambio) {
      cerrarEdicion();
      return;
    }

    setGuardandoEdicion(true);
    try {
      if (placaCambio) {
        if (vehiculos.some((v) => v.placa.toUpperCase() === nuevaPlaca && v.activo !== false && v.placa !== vehiculoEditando.placa)) {
          setErrorEdicion('Ya tienes otro vehículo registrado con esa placa');
          setGuardandoEdicion(false);
          return;
        }
        await vehiculosService.crear({
          placa: nuevaPlaca,
          id_usuario: usuario.id,
          id_tipo: vehiculoEditando.id_tipo,
          id_marca: vehiculoEditando.id_marca,
          color: nuevoColor || undefined,
          modelo: nuevoModelo || undefined,
        });
        await vehiculosService.eliminar(vehiculoEditando.placa);
      } else {
        await vehiculosService.actualizar(vehiculoEditando.placa, {
          color: nuevoColor || undefined,
          modelo: nuevoModelo || undefined,
        });
      }
      cerrarEdicion();
      await recargarVehiculos();
    } catch (err) {
      setErrorEdicion(err instanceof Error ? err.message : 'No se pudo actualizar el vehículo');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const tipoDeVehiculo = (vehiculo: Vehiculo): TipoVehiculoCatalogo | undefined =>
    tipos.find((t) => t.id_tipo === vehiculo.id_tipo);

  const marcaDeVehiculo = (vehiculo: Vehiculo): Marca | undefined => {
    const tipo = tipoDeVehiculo(vehiculo);
    if (!tipo) return undefined;
    const grupo = marcasAgrupadas.find((m) => m.tipo_vehiculo.toLowerCase() === tipo.nombre.toLowerCase());
    return grupo?.marcas.find((m) => m.id_marca === vehiculo.id_marca);
  };

  return (
    <section className="mis-vehiculos-page">
      <div className="mis-vehiculos-header">
        <h1 className="mis-vehiculos-title">Mis Vehículos</h1>
        <p className="mis-vehiculos-subtitle">
          Registra tus vehículos para identificarlos cuando entren al parqueo.
        </p>
      </div>

      <div className="mis-vehiculos-card">
        <h2>Registrar un vehículo</h2>

        {mensajeExito && <div className="mis-vehiculos-mensaje exito" role="status">{mensajeExito}</div>}
        {errorForm && <div className="mis-vehiculos-mensaje error" role="alert">{errorForm}</div>}

        <form onSubmit={guardar} noValidate>
          <div className="mis-vehiculos-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="placa">Placa</label>
              <input
                id="placa"
                className="form-input"
                type="text"
                value={formulario.placa}
                onChange={(e) => setFormulario({ ...formulario, placa: e.target.value.toUpperCase() })}
                placeholder="Ej. P123ABC"
                maxLength={7}
                disabled={cargandoCatalogos || guardando}
              />
              <p className="mis-vehiculos-ayuda">
                Formato: 1 letra (P = Carro, M = Motocicleta) + 3 números + 3 letras.
                {tipoCompatibleConPlaca && (
                  <> Tipo detectado: <strong>{etiquetaTipo(tipoCompatibleConPlaca)}</strong></>
                )}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="id_marca">Marca</label>
              <select
                id="id_marca"
                className="form-input"
                value={formulario.id_marca}
                onChange={(e) => setFormulario({ ...formulario, id_marca: e.target.value, marcaManual: '' })}
                disabled={cargandoCatalogos || guardando || !formulario.id_tipo}
              >
                <option value="">{formulario.id_tipo ? 'Selecciona…' : 'Ingresa una placa válida primero'}</option>
                {marcasDisponibles.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                ))}
                {formulario.id_tipo && <option value={OTROS_MARCA}>Otros</option>}
              </select>
            </div>

            {formulario.id_marca === OTROS_MARCA && (
              <div className="form-group">
                <label className="form-label" htmlFor="marcaManual">Especifica la marca</label>
                <input
                  id="marcaManual"
                  className="form-input"
                  type="text"
                  value={formulario.marcaManual}
                  onChange={(e) => setFormulario({ ...formulario, marcaManual: e.target.value })}
                  placeholder="Ej. Zongshen"
                  maxLength={60}
                  disabled={guardando}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="modelo">Modelo</label>
              <input
                id="modelo"
                className="form-input"
                type="text"
                value={formulario.modelo}
                onChange={(e) => setFormulario({ ...formulario, modelo: e.target.value })}
                placeholder="Ej. Corolla 2020"
                maxLength={60}
                disabled={guardando}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="color">Color (opcional)</label>
              <input
                id="color"
                className="form-input"
                type="text"
                value={formulario.color}
                onChange={(e) => setFormulario({ ...formulario, color: e.target.value })}
                placeholder="Ej. Rojo"
                maxLength={30}
                disabled={guardando}
              />
            </div>
          </div>

          <div className="mis-vehiculos-form-actions">
            <button type="submit" className="mis-vehiculos-btn-primary" disabled={guardando || cargandoCatalogos}>
              {guardando ? 'Registrando…' : 'Registrar vehículo'}
            </button>
            <button
              type="button"
              className="mis-vehiculos-btn-secondary"
              onClick={() => { setFormulario(FORMULARIO_VACIO); setErrorForm(''); setMensajeExito(''); }}
              disabled={guardando}
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      <div className="mis-vehiculos-card">
        <h2>Vehículos registrados</h2>
        {errorLista && <div className="mis-vehiculos-mensaje error" role="alert">{errorLista}</div>}

        {cargandoVehiculos ? (
          <p className="mis-vehiculos-lista-vacia">Cargando tus vehículos…</p>
        ) : vehiculos.length === 0 ? (
          <p className="mis-vehiculos-lista-vacia">Aún no has registrado ningún vehículo.</p>
        ) : (
          <ul className="mis-vehiculos-lista">
            {vehiculos.map((v) => {
              const tipo = tipoDeVehiculo(v);
              const marca = marcaDeVehiculo(v);
              return (
                <li key={v.placa} className="mis-vehiculos-item">
                  <div className="mis-vehiculos-item-info">
                    <span className="mis-vehiculos-item-placa">{v.placa}</span>
                    <span className="mis-vehiculos-item-detalle">
                      {etiquetaTipo(tipo)}{marca ? ` · ${marca.nombre}` : ''}{v.modelo ? ` · ${v.modelo}` : ''}{v.color ? ` · ${v.color}` : ''}
                    </span>
                    <span className={`mis-vehiculos-estado ${v.activo === false ? 'inactivo' : ''}`}>
                      {v.activo === false ? 'Inactivo' : 'Activo'}
                    </span>
                  </div>

                  <div className="mis-vehiculos-item-acciones">
                    <button
                      type="button"
                      className="mis-vehiculos-btn-secondary"
                      onClick={() => abrirEdicion(v)}
                      disabled={v.activo === false || guardandoEdicion}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="mis-vehiculos-btn-eliminar"
                      onClick={() => eliminar(v.placa)}
                      disabled={eliminando === v.placa || v.activo === false}
                    >
                      {eliminando === v.placa ? 'Desactivando…' : 'Desactivar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {vehiculoEditando && (
        <div className="tarifas-modal-overlay" onClick={cerrarEdicion}>
          <div className="tarifas-modal card" onClick={(e) => e.stopPropagation()}>
            <h2 className="tarifas-modal-title">Editar vehículo</h2>

            <form className="tarifas-form" onSubmit={guardarEdicion}>
              {errorEdicion && <div className="alerta alerta-error">{errorEdicion}</div>}

              <div className="form-group">
                <label className="form-label">Placa</label>
                <input
                  className="form-input"
                  type="text"
                  value={formularioEdicion.placa}
                  onChange={(e) => setFormularioEdicion({ ...formularioEdicion, placa: e.target.value.toUpperCase() })}
                  maxLength={7}
                  disabled={guardandoEdicion}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <input
                  className="form-input"
                  type="text"
                  value={formularioEdicion.color}
                  onChange={(e) => setFormularioEdicion({ ...formularioEdicion, color: e.target.value })}
                  placeholder="Ej. Rojo"
                  maxLength={30}
                  disabled={guardandoEdicion}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Modelo</label>
                <input
                  className="form-input"
                  type="text"
                  value={formularioEdicion.modelo}
                  onChange={(e) => setFormularioEdicion({ ...formularioEdicion, modelo: e.target.value })}
                  placeholder="Ej. Corolla 2020"
                  maxLength={60}
                  disabled={guardandoEdicion}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo y marca</label>
                <div className="mis-vehiculos-bloque-info">
                  <span><strong>Tipo:</strong> {etiquetaTipo(tipoDeVehiculo(vehiculoEditando))}</span>
                  <span><strong>Marca:</strong> {marcaDeVehiculo(vehiculoEditando)?.nombre ?? '—'}</span>
                  <p className="mis-vehiculos-ayuda">El tipo y la marca no se pueden modificar. Si necesitas cambiarlos, desactiva este vehículo y registra uno nuevo.</p>
                </div>
              </div>

              <div className="tarifas-modal-acciones">
                <button type="button" className="tarifas-btn-cancelar" onClick={cerrarEdicion} disabled={guardandoEdicion}>
                  Cancelar
                </button>
                <button type="submit" className="tarifas-btn-guardar" disabled={guardandoEdicion}>
                  {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default RegistrarVehiculo;
