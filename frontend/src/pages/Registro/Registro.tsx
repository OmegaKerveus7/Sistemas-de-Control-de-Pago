import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usuariosService } from '../../services/usuarios.service';
import '../Login/Login.css';

const IconoUsuario = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconoCandado = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconoOjo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconoOjoTachado = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconoAlerta = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconoFlechaIzq = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const BASE = import.meta.env.BASE_URL;

interface FormData {
  dpi: string;
  nombres: string;
  apellidos: string;
  correo: string;
  contraseña: string;
  confirmPassword: string;
}

export default function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({
    dpi: '',
    nombres: '',
    apellidos: '',
    correo: '',
    contraseña: '',
    confirmPassword: '',
  });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [exito, setExito] = useState(false);

  const manejarInput = (campo: keyof FormData) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      let valor = e.target.value;

      if (campo === 'dpi') {
        const limpio = valor.replace(/\D/g, '').slice(0, 13);
        const partes: string[] = [];
        if (limpio.length > 0) partes.push(limpio.slice(0, 4));
        if (limpio.length > 4) partes.push(limpio.slice(4, 9));
        if (limpio.length > 9) partes.push(limpio.slice(9, 13));
        valor = partes.join(' ');
      } else if (campo === 'nombres' || campo === 'apellidos') {
        valor = valor.slice(0, 100);
      } else if (campo === 'correo') {
        valor = valor.slice(0, 100);
      } else if (campo === 'contraseña' || campo === 'confirmPassword') {
        valor = valor.slice(0, 200);
      }

      setForm((prev) => ({ ...prev, [campo]: valor }));
      if (error) setError('');
    };

  const validarFormulario = (): boolean => {
    if (!form.dpi.trim() || !form.nombres.trim() || !form.apellidos.trim() ||
        !form.correo.trim() || !form.contraseña || !form.confirmPassword) {
      setError('Por favor complete todos los campos');
      triggerShake();
      return false;
    }

    const dpiLimpio = form.dpi.replace(/\s/g, '');
    if (dpiLimpio.length < 13) {
      setError('El DPI debe contener 13 dígitos');
      triggerShake();
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      setError('Ingrese un correo electrónico válido');
      triggerShake();
      return false;
    }

    if (form.contraseña.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      triggerShake();
      return false;
    }

    if (form.contraseña !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      triggerShake();
      return false;
    }

    return true;
  };

  const manejarSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!validarFormulario()) return;

    setLoading(true);

    try {
      await usuariosService.registroPublico({
        dpi: form.dpi.replace(/\s/g, ''),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        correo: form.correo.trim().toLowerCase(),
        password: form.contraseña,
      });

      setExito(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta';
      setError(msg.includes('correo') || msg.includes('DPI')
        ? 'Ya existe una cuenta con ese correo o DPI'
        : 'Error al crear la cuenta. Intente nuevamente.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  if (exito) {
    return (
      <div className="login-page">
        <div className="login-background" />
        <header className="login-header">
          <div className="brand-logo">
            <picture>
              <source
                type="image/webp"
                srcSet={`${BASE}colegio_belen-192w.webp 192w, ${BASE}colegio_belen-384w.webp 384w, ${BASE}colegio_belen-768w.webp 768w`}
                sizes="(min-width: 1024px) 120px, 80px"
              />
              <img
                src={`${BASE}colegio_belen-384w.webp`}
                alt="Escudo del Colegio Mixto Belén"
                width="120"
                height="151"
                loading="eager"
                decoding="async"
              />
            </picture>
          </div>
        </header>

        <main className="login-form-panel">
          <div className="login-card">
            <div className="login-card-header" style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#e8f5e9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: '#2e7d32'
              }}>
                <IconoCheck />
              </div>
              <h2 className="login-title">Cuenta Creada</h2>
              <p className="login-subtitle">
                Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.
              </p>
            </div>

            <button
              type="button"
              className="login-button"
              onClick={() => navigate('/login')}
              style={{ marginTop: 24 }}
            >
              <span>Iniciar Sesión</span>
            </button>

            <div className="login-card-footer" style={{ marginTop: 20 }}>
              <Link to="/" className="link" style={{ fontSize: '0.88rem' }}>
                Volver al inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-background" />

      <header className="login-header">
        <div className="brand-logo">
          <picture>
            <source
              type="image/webp"
              srcSet={`${BASE}colegio_belen-192w.webp 192w, ${BASE}colegio_belen-384w.webp 384w, ${BASE}colegio_belen-768w.webp 768w`}
              sizes="(min-width: 1024px) 120px, 80px"
            />
            <img
              src={`${BASE}colegio_belen-384w.webp`}
              alt="Escudo del Colegio Mixto Belén"
              width="120"
              height="151"
              loading="eager"
              decoding="async"
            />
          </picture>
        </div>
        <div className="brand-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Colegio Mixto Belén</span>
        </div>
      </header>

      <main className="login-form-panel">
        <div className={`login-card ${shake ? 'shake' : ''}`}>
          <div className="login-card-header">
            <h2 className="login-title">Crear Cuenta</h2>
            <p className="login-subtitle">Regístrate para acceder al sistema de parqueo</p>
          </div>

          <form className="login-form" onSubmit={manejarSubmit} noValidate>
            {error && (
              <div className="alerta alerta-error" role="alert">
                <IconoAlerta />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="dpi">DPI</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon">
                  <IconoUsuario />
                </span>
                <input
                  id="dpi"
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="0000 00000 0000"
                  value={form.dpi}
                  onChange={manejarInput('dpi')}
                  disabled={loading}
                  autoComplete="off"
                  maxLength={15}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="nombres">Nombres</label>
                <div className="form-input-wrapper">
                  <input
                    id="nombres"
                    type="text"
                    className="form-input"
                    placeholder="Tus nombres"
                    value={form.nombres}
                    onChange={manejarInput('nombres')}
                    disabled={loading}
                    autoComplete="off"
                    maxLength={100}
                    style={{ paddingLeft: 16 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="apellidos">Apellidos</label>
                <div className="form-input-wrapper">
                  <input
                    id="apellidos"
                    type="text"
                    className="form-input"
                    placeholder="Tus apellidos"
                    value={form.apellidos}
                    onChange={manejarInput('apellidos')}
                    disabled={loading}
                    autoComplete="off"
                    maxLength={100}
                    style={{ paddingLeft: 16 }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="correo">Correo electrónico</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 7L2 7" />
                  </svg>
                </span>
                <input
                  id="correo"
                  type="email"
                  className="form-input"
                  placeholder="correo@ejemplo.com"
                  value={form.correo}
                  onChange={manejarInput('correo')}
                  disabled={loading}
                  autoComplete="off"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon"><IconoCandado /></span>
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  className="form-input has-suffix"
                  placeholder="Mínimo 6 caracteres"
                  value={form.contraseña}
                  onChange={manejarInput('contraseña')}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="form-input-suffix"
                  onClick={() => setMostrarPassword((v) => !v)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {mostrarPassword ? <IconoOjoTachado /> : <IconoOjo />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirmar contraseña</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon"><IconoCandado /></span>
                <input
                  id="confirmPassword"
                  type={mostrarConfirmPassword ? 'text' : 'password'}
                  className="form-input has-suffix"
                  placeholder="Repite tu contraseña"
                  value={form.confirmPassword}
                  onChange={manejarInput('confirmPassword')}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="form-input-suffix"
                  onClick={() => setMostrarConfirmPassword((v) => !v)}
                  aria-label={mostrarConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {mostrarConfirmPassword ? <IconoOjoTachado /> : <IconoOjo />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`login-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <span>Crear Cuenta</span>
              )}
            </button>
          </form>

          <div className="login-card-footer">
            <p>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="link" style={{ fontWeight: 700 }}>
                Iniciar Sesión
              </Link>
            </p>
            <div style={{ marginTop: 12 }}>
              <Link
                to="/"
                className="link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.85rem',
                  color: 'var(--color-texto-terciario)',
                  fontWeight: 500,
                }}
              >
                <IconoFlechaIzq />
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
