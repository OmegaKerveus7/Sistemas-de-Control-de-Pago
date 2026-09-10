import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { usuariosService, type Usuario } from '../../services/usuarios.service';
import './Usuarios.css';

const ROLES = [
  { id_rol: 1, nombre: 'administrador' },
  { id_rol: 2, nombre: 'guardia' },
  { id_rol: 3, nombre: 'usuario' },
];

interface FormularioUsuario {
  nombres: string;
  apellidos: string;
  dpi: string;
  email: string;
  id_rol: number;
  pass: string;
  activo: boolean;
}

const FORMULARIO_VACIO: FormularioUsuario = {
  nombres: '',
  apellidos: '',
  dpi: '',
  email: '',
  id_rol: 3,
  pass: '',
  activo: true,
};

export function Usuarios() {
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

    setGuardando(true);
    setErrorForm(null);
    try {
      if (usuarioEditando) {
        const cambios: Partial<Usuario> & { pass?: string } = {
          nombres: formulario.nombres.trim(),
          apellidos: formulario.apellidos.trim(),
          dpi: formulario.dpi.trim(),
          email: formulario.email.trim(),
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

  async function alternarEstado(usuario: Usuario) {
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
        <div>
          <h1 className="usuarios-title">Usuarios</h1>
          <p className="usuarios-subtitle">Administra las cuentas del sistema</p>
        </div>
        <button className="usuarios-btn-nuevo" onClick={abrirCrear}>
          Nuevo usuario
        </button>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <div className="usuarios-toolbar">
        <input
          className="form-input usuarios-input-plano usuarios-buscador"
          placeholder="Buscar por nombre, correo o DPI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="card usuarios-card">
        {cargando ? (
          <div className="usuarios-estado"><span className="spinner" /> Cargando usuarios...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="usuarios-estado">No se encontraron usuarios.</div>
        ) : (
          <div className="usuarios-tabla-wrapper">
            <table className="usuarios-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>DPI</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id_usuario}>
                    <td>{usuario.nombres} {usuario.apellidos}</td>
                    <td>{usuario.dpi}</td>
                    <td>{usuario.email}</td>
                    <td className="usuarios-rol">{usuario.nom_rol ?? '—'}</td>
                    <td>
                      <span className={`usuarios-estado-texto ${usuario.activo ? 'activo' : 'inactivo'}`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="usuarios-acciones">
                      <button className="usuarios-btn-accion" onClick={() => abrirEditar(usuario)}>Editar</button>
                      <button
                        className={`usuarios-btn-accion ${usuario.activo ? 'usuarios-btn-desactivar' : 'usuarios-btn-activar'}`}
                        onClick={() => alternarEstado(usuario)}
                      >
                        {usuario.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  Cancelar
                </button>
                <button type="submit" className="usuarios-btn-guardar" disabled={guardando}>
                  {guardando ? <span className="spinner" /> : usuarioEditando ? 'Guardar cambios' : 'Crear usuario'}
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
