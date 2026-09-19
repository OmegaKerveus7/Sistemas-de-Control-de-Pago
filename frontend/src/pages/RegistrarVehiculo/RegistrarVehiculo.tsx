import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../hooks/useAuth';
import { vehiculosService } from '../../services/vehiculos.service';
import type { Marca, TipoVehiculoCatalogo, Vehiculo } from '../../models';
import './RegistrarVehiculo.css';

const REGEX_PLACA = /^([PM])\d{3}[A-Z]{3}$/;

const ALIAS_P = ['auto', 'carro', 'camioneta', 'camin', 'pickup', 'suv'];
const ALIAS_M = ['moto', 'motocicl'];

function tipoCoincideConPrefijo(nombreTipo: string, prefijo: 'P' | 'M'): boolean {
  const normalizado = nombreTipo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const alias = prefijo === 'P' ? ALIAS_P : ALIAS_M;
  return alias.some((a) => normalizado.includes(a));
}

function construirQrVehiculo(placa: string): string {
  return `BELEN-VEH|v1|${placa.toUpperCase()}`;
}

interface FormularioVehiculo {
  placa: string;
  id_tipo: string;
  id_marca: string;
  color: string;
}

const FORMULARIO_VACIO: FormularioVehiculo = {
  placa: '',
  id_tipo: '',
  id_marca: '',
  color: '',
};

interface FormularioEdicion {
  placa: string;
  color: string;
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
  const [formularioEdicion, setFormularioEdicion] = useState<FormularioEdicion>({ placa: '', color: '' });
  const [errorEdicion, setErrorEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [qrExpandido, setQrExpandido] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargandoCatalogos(true);
      try {
        const [tiposData, marcasData] = await Promise.all([
          vehiculosService.tiposVehiculo(),
          vehiculosService.marcasPorTipo(),
        ]);
        if (!activo) return;
        setTipos(tiposData);
        setMarcasAgrupadas(marcasData);
      } catch (err) {
        if (activo) setErrorForm(err instanceof Error ? err.message : 'No se pudieron cargar los catálogos');
      } finally {
        if (activo) setCargandoCatalogos(false);
      }
    })();
    return () => { activo = false; };
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
    return tipos.find((t) => tipoCoincideConPrefijo(t.nombre, tipoDetectadoPorPlaca)) ?? null;
  }, [tipos, tipoDetectadoPorPlaca]);

  if (!usuario) {
    return <Navigate to="/login?redirect=/app/mis-vehiculos" replace />;
  }

  const validar = (): string | null => {
    const placaLimpia = formulario.placa.trim().toUpperCase();
    if (!placaLimpia) return 'Ingresa la placa del vehículo';
    if (!REGEX_PLACA.test(placaLimpia)) return 'La placa debe iniciar con P (automóvil) o M (motocicleta), seguido de 3 números y 3 letras. Ej: P123ABC o M123ABC';
    if (!tipoCompatibleConPlaca) return 'La placa no coincide con ningún tipo de vehículo disponible';

    const tipoSeleccionado = tipos.find((t) => String(t.id_tipo) === formulario.id_tipo);
    if (formulario.id_tipo && (!tipoSeleccionado || !tipoCoincideConPrefijo(tipoSeleccionado.nombre, tipoDetectadoPorPlaca as 'P' | 'M'))) {
      const sugerencia = tipoCompatibleConPlaca?.nombre ?? '—';
      return `La placa inicia con "${tipoDetectadoPorPlaca}", debe ser un vehículo tipo "${sugerencia}"`;
    }

    if (!formulario.id_tipo) return 'Selecciona el tipo de vehículo';
    if (marcasDisponibles.length > 0 && !formulario.id_marca) return 'Selecciona la marca del vehículo';
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
    const idMarcaNum = formulario.id_marca ? Number(formulario.id_marca) : undefined;
    const colorLimpio = formulario.color.trim() || undefined;

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
        color: colorLimpio,
      });
      setMensajeExito(`Vehículo ${placaLimpia} registrado correctamente. Comparte el QR con el guardia para registrar tu entrada.`);
      setFormulario(FORMULARIO_VACIO);
      await recargarVehiculos();
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
    setFormularioEdicion({ placa: vehiculo.placa, color: vehiculo.color ?? '' });
    setErrorEdicion('');
  };

  const cerrarEdicion = () => {
    setVehiculoEditando(null);
    setFormularioEdicion({ placa: '', color: '' });
    setErrorEdicion('');
  };

  const guardarEdicion = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!vehiculoEditando || !usuario) return;
    setErrorEdicion('');

    const nuevaPlaca = formularioEdicion.placa.trim().toUpperCase();
    const nuevoColor = formularioEdicion.color.trim();

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
    if (!tipo || !tipoCoincideConPrefijo(tipo.nombre, prefijo)) {
      setErrorEdicion(`La placa (${prefijo}) no coincide con el tipo de vehículo registrado (${tipo?.nombre ?? 'desconocido'})`);
      return;
    }

    const placaCambio = nuevaPlaca !== vehiculoEditando.placa;
    const colorCambio = (nuevoColor || null) !== (vehiculoEditando.color ?? null);

    if (!placaCambio && !colorCambio) {
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
        });
        await vehiculosService.eliminar(vehiculoEditando.placa);
      } else {
        await vehiculosService.actualizar(vehiculoEditando.placa, {
          color: nuevoColor || undefined,
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

  const descargarQr = (vehiculo: Vehiculo) => {
    const svg = document.getElementById(`qr-${vehiculo.placa}`);
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vehiculo-${vehiculo.placa}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mis-vehiculos-page">
      <div className="mis-vehiculos-header">
        <h1 className="mis-vehiculos-title">Mis Vehículos</h1>
        <p className="mis-vehiculos-subtitle">
          Registra tus vehículos para identificarlos cuando entren al parqueo. Comparte el QR de cada vehículo con el guardia para que pueda llenar la placa automáticamente al registrar tu entrada.
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
                Formato: 1 letra (P/M) + 3 números + 3 letras.
                {tipoCompatibleConPlaca && (
                  <>
                    {' '}Detectado: <strong>{tipoCompatibleConPlaca.nombre}</strong>
                    {formulario.id_tipo && tipoCompatibleConPlaca.id_tipo !== Number(formulario.id_tipo) && (
                      <> · cambia el tipo si no coincide</>
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="id_tipo">Tipo de vehículo</label>
              <select
                id="id_tipo"
                className="form-input"
                value={formulario.id_tipo}
                onChange={(e) => setFormulario({ ...formulario, id_tipo: e.target.value, id_marca: '' })}
                disabled={cargandoCatalogos || guardando}
              >
                <option value="">Selecciona…</option>
                {tipos.map((t) => (
                  <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="id_marca">Marca</label>
              <select
                id="id_marca"
                className="form-input"
                value={formulario.id_marca}
                onChange={(e) => setFormulario({ ...formulario, id_marca: e.target.value })}
                disabled={cargandoCatalogos || guardando || !formulario.id_tipo || marcasDisponibles.length === 0}
              >
                <option value="">{formulario.id_tipo ? (marcasDisponibles.length ? 'Selecciona…' : 'Sin marcas disponibles') : 'Selecciona primero el tipo'}</option>
                {marcasDisponibles.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                ))}
              </select>
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
              const qrContenido = construirQrVehiculo(v.placa);
              const qrExpandidoEsta = qrExpandido === v.placa;
              return (
                <li key={v.placa} className="mis-vehiculos-item">
                  <div className="mis-vehiculos-item-info">
                    <span className="mis-vehiculos-item-placa">{v.placa}</span>
                    <span className="mis-vehiculos-item-detalle">
                      {tipo?.nombre ?? '—'}{marca ? ` · ${marca.nombre}` : ''}{v.color ? ` · ${v.color}` : ''}
                    </span>
                    <span className={`mis-vehiculos-estado ${v.activo === false ? 'inactivo' : ''}`}>
                      {v.activo === false ? 'Inactivo' : 'Activo'}
                    </span>
                  </div>

                  <div className="mis-vehiculos-qr-block">
                    <div className="mis-vehiculos-qr-svg" aria-hidden={!qrExpandidoEsta}>
                      <QRCodeSVG
                        id={`qr-${v.placa}`}
                        value={qrContenido}
                        size={qrExpandidoEsta ? 220 : 90}
                        level="M"
                        includeMargin={qrExpandidoEsta}
                      />
                    </div>
                    <div className="mis-vehiculos-qr-acciones">
                      <button
                        type="button"
                        className="mis-vehiculos-btn-secondary"
                        onClick={() => setQrExpandido(qrExpandidoEsta ? null : v.placa)}
                      >
                        {qrExpandidoEsta ? 'Ocultar QR' : 'Ver QR'}
                      </button>
                      <button
                        type="button"
                        className="mis-vehiculos-btn-secondary"
                        onClick={() => descargarQr(v)}
                      >
                        Descargar
                      </button>
                    </div>
                    <p className="mis-vehiculos-ayuda">
                      El guardia escanea este QR para llenar la placa automáticamente al registrar la entrada.
                    </p>
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
                <p className="mis-vehiculos-ayuda">Cambiar la placa regenera el QR de este vehículo.</p>
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
                <label className="form-label">Tipo y marca</label>
                <div className="mis-vehiculos-bloque-info">
                  <span><strong>Tipo:</strong> {tipoDeVehiculo(vehiculoEditando)?.nombre ?? '—'}</span>
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
