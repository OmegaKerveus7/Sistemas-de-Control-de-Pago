import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuariosService, type Usuario } from '../../services/usuarios.service';
import './Usuarios.css';

type IconoUsuarioTipo = 'volver' | 'nuevo' | 'buscar' | 'editar' | 'eliminar' | 'estado' | 'guardar' | 'cancelar';
function IconoUsuario({ tipo }: { tipo: IconoUsuarioTipo }) {
  const trazos: Record<IconoUsuarioTipo, string> = {
    volver: 'M19 12H5 M12 19l-7-7 7-7',
    nuevo: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M20 8v6 M17 11h6 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    buscar: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    editar: 'M12 20H4v-8 M16 3l5 5-10 10-6 1 1-6Z M14 5l5 5',
    eliminar: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    estado: 'M12 2v10 M6 5a9 9 0 1 0 12 0',
    guardar: 'M20 21H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h13l4 4v13a1 1 0 0 1-1 1 M7 3v6h10V3 M7 21v-8h10v8',
    cancelar: 'M6 6l12 12 M6 18L18 6',
  };
  return <svg className="usuarios-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={trazos[tipo]} /></svg>;
}

const ROLES = [
  { id_rol: 1, nombre: 'administrador' },
  { id_rol: 2, nombre: 'cobrador' },
  { id_rol: 3, nombre: 'guardia' },
  { id_rol: 4, nombre: 'usuario' },
];

interface FormularioUsuario {
  nombres: string;
  apellidos: string;
  dpi: string;
  email: string;
  telefono: string;
  id_rol: number;
  pass: string;
  activo: boolean;
}

const FORMULARIO_VACIO: FormularioUsuario = {
  nombres: '',
  apellidos: '',
  dpi: '',
  email: '',
  telefono: '',
  id_rol: 4,
  pass: '',
  activo: true,
};

export function Usuarios() {
  const navigate = useNavigate();
  function regresar() {
    if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1);
    else navigate('/app/dashboard');
  }
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formulario, setFormulario] = useState<FormularioUsuario>(FORMULARIO_VACIO);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargarUsuarios() {
    setCargando(true);
    setError(null);
    try {
      const data = await usuariosService.listar();
      setUsuarios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la lista de usuarios');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return usuarios;
    return usuarios.filter((u) =>
      `${u.nombres} ${u.apellidos} ${u.email} ${u.dpi}`.toLowerCase().includes(termino),
    );
  }, [usuarios, busqueda]);

  function abrirCrear() {
    setUsuarioEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setErrorForm(null);
    setModalAbierto(true);
  }

  function abrirEditar(usuario: Usuario) {
    setUsuarioEditando(usuario);
    setFormulario({
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      dpi: usuario.dpi,
      email: usuario.email,
      telefono: usuario.telefono ?? '',
      id_rol: usuario.id_rol,
      pass: '',
      activo: usuario.activo,
    });
    setErrorForm(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
  }

  function validarFormulario(): string | null {
    if (!formulario.nombres.trim() || !formulario.apellidos.trim() || !formulario.dpi.trim() || !formulario.email.trim()) {
      return 'Completa todos los campos requeridos';
    }
    if (formulario.dpi.trim().length !== 13) {
      return 'El DPI debe tener 13 dígitos';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.email.trim())) {
      return 'Ingresa un correo válido';
    }
    if (!usuarioEditando && formulario.pass.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
  }

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }

    if (usuarioEditando?.activo && !formulario.activo && !confirmarDesactivacion(usuarioEditando)) return;

    setGuardando(true);
    setErrorForm(null);
    try {
      const telefonoLimpio = formulario.telefono.trim();
      if (usuarioEditando) {
        const cambios: Partial<Usuario> & { pass?: string } = {
          nombres: formulario.nombres.trim(),
          apellidos: formulario.apellidos.trim(),
          dpi: formulario.dpi.trim(),
          email: formulario.email.trim(),
          telefono: telefonoLimpio || null,
          id_rol: formulario.id_rol,
          activo: formulario.activo,
        };
        if (formulario.pass.trim()) cambios.pass = formulario.pass.trim();
        await usuariosService.actualizar(usuarioEditando.id_usuario, cambios);
      } else {
        await usuariosService.crear({
          nombres: formulario.nombres.trim(),
          apellidos: formulario.apellidos.trim(),
          dpi: formulario.dpi.trim(),
          email: formulario.email.trim(),
          telefono: telefonoLimpio || null,
          id_rol: formulario.id_rol,
          pass: formulario.pass.trim(),
          activo: true,
        });
      }
      setModalAbierto(false);
      await cargarUsuarios();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar el usuario');
    } finally {
      setGuardando(false);
    }
  }

  function confirmarDesactivacion(usuario: Usuario): boolean {
    return window.confirm(`¿Estás seguro de que deseas desactivar a ${usuario.nombres} ${usuario.apellidos}?`);
  }

  async function alternarEstado(usuario: Usuario) {
    if (usuario.activo && !confirmarDesactivacion(usuario)) return;
    try {
      if (usuario.activo) {
        await usuariosService.eliminar(usuario.id_usuario);
      } else {
        await usuariosService.actualizar(usuario.id_usuario, { activo: true });
      }
      await cargarUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del usuario');
    }
  }

  return (
    <section className="usuarios-page">
      <div className="usuarios-header">
        <div className="usuarios-encabezado">
          <button type="button" className="usuarios-btn-volver" onClick={regresar} aria-label="Regresar a la vista anterior" title="Regresar">
            <IconoUsuario tipo="volver" />
          </button>
          <div>
          <h1 className="usuarios-title">Usuarios</h1>
          <p className="usuarios-subtitle">Administra las cuentas del sistema</p>
          </div>
        </div>
        <button className="usuarios-btn-nuevo" onClick={abrirCrear}>
          <IconoUsuario tipo="nuevo" /> Nuevo usuario
        </button>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <div className="usuarios-toolbar">
        <label className="usuarios-busqueda">
        <IconoUsuario tipo="buscar" />
        <input
          aria-label="Buscar usuarios por nombre, correo o DPI"
          className="form-input usuarios-input-plano usuarios-buscador"
          placeholder="Buscar por nombre, correo o DPI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        </label>
      </div>

      <div className="card usuarios-card">
        <div className="usuarios-lista-header">
          <h2>Cuentas registradas</h2>
          {!cargando && <span>{usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'usuario' : 'usuarios'}{busqueda.trim() ? ' encontrados' : ''}</span>}
        </div>
        {cargando ? (
          <div className="usuarios-estado"><span className="spinner" /> Cargando usuarios...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="usuarios-estado">No se encontraron usuarios.</div>
        ) : (
          <>
            <div className="usuarios-tabla-wrapper">
              <table className="usuarios-tabla">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>DPI</th>
                    <th>Contacto</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id_usuario}>
                      <td className="usuarios-nombre-celda">{usuario.nombres} {usuario.apellidos}</td>
                      <td>{usuario.dpi}</td>
                      <td><div className="usuarios-contacto"><span>{usuario.email}</span><span className="usuarios-contacto-telefono">{usuario.telefono ? `Tel. ${usuario.telefono}` : 'Sin teléfono'}</span></div></td>
                      <td><span className="usuarios-rol usuarios-rol-etiqueta">{usuario.nom_rol ?? '—'}</span></td>
                      <td>
                        <span className={`usuarios-estado-texto ${usuario.activo ? 'activo' : 'inactivo'}`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td><div className="usuarios-acciones">
                        <button className="usuarios-btn-accion" onClick={() => abrirEditar(usuario)} title={`Editar a ${usuario.nombres}`} aria-label={`Editar a ${usuario.nombres}`}><IconoUsuario tipo="editar" /><span className="usuarios-accion-texto">Editar</span></button>
                        <button
                          className={`usuarios-btn-accion ${usuario.activo ? 'usuarios-btn-desactivar' : 'usuarios-btn-activar'}`}
                          onClick={() => alternarEstado(usuario)}
                          title={`${usuario.activo ? 'Desactivar' : 'Activar'} a ${usuario.nombres}`}
                          aria-label={`${usuario.activo ? 'Desactivar' : 'Activar'} a ${usuario.nombres}`}
                        >
                          <IconoUsuario tipo={usuario.activo ? "eliminar" : "estado"} /><span className="usuarios-accion-texto">{usuario.activo ? 'Desactivar' : 'Activar'}</span>
                        </button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="usuarios-cards-mobile">
              {usuariosFiltrados.map((usuario) => (
                <div className="usuarios-card-item" key={usuario.id_usuario}>
                  <div className="usuarios-card-info">
                    <strong className="usuarios-card-nombre">{usuario.nombres} {usuario.apellidos}</strong>
                    <span className="usuarios-card-email">{usuario.email}</span>
                    {usuario.telefono && (
                      <span className="usuarios-card-telefono">{usuario.telefono}</span>
                    )}
                    <div className="usuarios-card-meta">
                      <span className={`usuarios-estado-texto ${usuario.activo ? 'activo' : 'inactivo'}`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="usuarios-rol">{usuario.nom_rol ?? '—'}</span>
                    </div>
                  </div>
                  <div className="usuarios-card-acciones">
                    <button className="usuarios-btn-accion" onClick={() => abrirEditar(usuario)}><IconoUsuario tipo="editar" /> Editar</button>
                    <button
                      className={`usuarios-btn-accion ${usuario.activo ? 'usuarios-btn-desactivar' : 'usuarios-btn-activar'}`}
                      onClick={() => alternarEstado(usuario)}
                    >
                      <IconoUsuario tipo={usuario.activo ? "eliminar" : "estado"} /> {usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalAbierto && (
        <div className="usuarios-modal-overlay" onClick={cerrarModal}>
          <div className="usuarios-modal card" onClick={(e) => e.stopPropagation()}>
            <h2 className="usuarios-modal-title">
              {usuarioEditando ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>

            <form className="usuarios-form" onSubmit={manejarSubmit}>
              {errorForm && <div className="alerta alerta-error">{errorForm}</div>}

              <div className="usuarios-form-row">
                <div className="form-group">
                  <label className="form-label">Nombres</label>
                  <input
                    className="form-input usuarios-input-plano"
                    value={formulario.nombres}
                    onChange={(e) => setFormulario({ ...formulario, nombres: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellidos</label>
                  <input
                    className="form-input usuarios-input-plano"
                    value={formulario.apellidos}
                    onChange={(e) => setFormulario({ ...formulario, apellidos: e.target.value })}
                  />
                </div>
              </div>

              <div className="usuarios-form-row">
                <div className="form-group">
                  <label className="form-label">DPI</label>
                  <input
                    className="form-input usuarios-input-plano"
                    maxLength={13}
                    value={formulario.dpi}
                    onChange={(e) => setFormulario({ ...formulario, dpi: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo</label>
                  <input
                    className="form-input usuarios-input-plano"
                    type="email"
                    value={formulario.email}
                    onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="usuarios-form-row">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    className="form-input usuarios-input-plano"
                    type="tel"
                    inputMode="tel"
                    maxLength={15}
                    value={formulario.telefono}
                    onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value.replace(/[^\d+\s-]/g, '') })}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="usuarios-form-row">
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select
                    className="form-input usuarios-input-plano"
                    value={formulario.id_rol}
                    onChange={(e) => setFormulario({ ...formulario, id_rol: Number(e.target.value) })}
                  >
                    {ROLES.map((rol) => (
                      <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {usuarioEditando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  </label>
                  <input
                    className="form-input usuarios-input-plano"
                    type="password"
                    value={formulario.pass}
                    onChange={(e) => setFormulario({ ...formulario, pass: e.target.value })}
                  />
                </div>
              </div>

              {usuarioEditando && (
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={formulario.activo}
                    onChange={(e) => setFormulario({ ...formulario, activo: e.target.checked })}
                  />
                  <span className="checkbox-custom" />
                  <span className="checkbox-label">Usuario activo</span>
                </label>
              )}

              <div className="usuarios-modal-acciones">
                <button type="button" className="usuarios-btn-cancelar" onClick={cerrarModal}>
                  <IconoUsuario tipo="cancelar" /> Cancelar
                </button>
                <button type="submit" className="usuarios-btn-guardar" disabled={guardando}>
                  {guardando ? <><span className="spinner" /> Guardando...</> : <><IconoUsuario tipo="guardar" /> {usuarioEditando ? 'Guardar cambios' : 'Crear usuario'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Usuarios;
