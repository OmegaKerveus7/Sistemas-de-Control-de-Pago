import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import '../Login/Login.css';

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

const IconoCorreo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 7L2 7" />
  </svg>
);

const IconoFlechaIzq = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

type Paso = 'correo' | 'codigo' | 'nueva' | 'exito';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>('correo');
  const [correo, setCorreo] = useState('');
  const [idUsuario, setIdUsuario] = useState<number | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nuevaContraseña, setNuevaContraseña] = useState('');
  const [confirmContraseña, setConfirmContraseña] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleCorreo = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!correo.trim()) {
      setError('Ingresa tu correo electrónico');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ mensaje: string; id_usuario: number }>('/auth/forgot-password', { correo: correo.trim().toLowerCase() });
      setIdUsuario(res.id_usuario);
      setPaso('codigo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar código');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleCodigo = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!codigo.trim() || codigo.trim().length !== 6) {
      setError('Ingresa el código de 6 dígitos');
      triggerShake();
      return;
    }
    setPaso('nueva');
  };

  const handleNuevaContraseña = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nuevaContraseña) {
      setError('Ingresa la nueva contraseña');
      triggerShake();
      return;
    }
    if (nuevaContraseña.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      triggerShake();
      return;
    }
    if (nuevaContraseña !== confirmContraseña) {
      setError('Las contraseñas no coinciden');
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        id_usuario: idUsuario,
        codigo: codigo.trim(),
        nueva_contraseña: nuevaContraseña,
      });
      setPaso('exito');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar contraseña');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const BASE = import.meta.env.BASE_URL;

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

          {/* PASO 1: Correo */}
          {paso === 'correo' && (
            <>
              <div className="login-card-header">
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--belen-azul)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#fff' }}>
                  <IconoCandado />
                </div>
                <h2 className="login-title">¿Olvidaste tu contraseña?</h2>
                <p className="login-subtitle">Ingresa tu correo y te enviaremos un código de verificación</p>
              </div>

              <form className="login-form" onSubmit={handleCorreo}>
                {error && (
                  <div className="alerta alerta-error"><IconoAlerta /><span>{error}</span></div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="correo">Correo electrónico</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><IconoCorreo /></span>
                    <input
                      id="correo"
                      type="email"
                      className="form-input"
                      placeholder="correo@ejemplo.com"
                      value={correo}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => { setCorreo(e.target.value); if (error) setError(''); }}
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? <><span className="spinner" /><span>Enviando...</span></> : <span>Enviar código</span>}
                </button>
              </form>
            </>
          )}

          {/* PASO 2: Código */}
          {paso === 'codigo' && (
            <>
              <div className="login-card-header">
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--belen-azul)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#fff' }}>
                  <IconoCorreo />
                </div>
                <h2 className="login-title">Código de verificación</h2>
                <p className="login-subtitle">Revisa tu correo <strong>{correo}</strong></p>
              </div>

              <form className="login-form" onSubmit={handleCodigo}>
                {error && (
                  <div className="alerta alerta-error"><IconoAlerta /><span>{error}</span></div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="codigo">Código de 6 dígitos</label>
                  <div className="form-input-wrapper">
                    <input
                      id="codigo"
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      placeholder="000000"
                      value={codigo}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError(''); }}
                      disabled={loading}
                      maxLength={6}
                      style={{ paddingLeft: 16, textAlign: 'center', fontSize: '1.3rem', letterSpacing: 6 }}
                    />
                  </div>
                </div>
                <button type="submit" className="login-button" disabled={loading}>
                  <span>Verificar código</span>
                </button>
              </form>
            </>
          )}

          {/* PASO 3: Nueva contraseña */}
          {paso === 'nueva' && (
            <>
              <div className="login-card-header">
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--belen-azul)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#fff' }}>
                  <IconoCandado />
                </div>
                <h2 className="login-title">Nueva contraseña</h2>
                <p className="login-subtitle">Crea una nueva contraseña para tu cuenta</p>
              </div>

              <form className="login-form" onSubmit={handleNuevaContraseña}>
                {error && (
                  <div className="alerta alerta-error"><IconoAlerta /><span>{error}</span></div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="newPass">Nueva contraseña</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><IconoCandado /></span>
                    <input
                      id="newPass"
                      type={mostrarPass ? 'text' : 'password'}
                      className="form-input has-suffix"
                      placeholder="Mínimo 6 caracteres"
                      value={nuevaContraseña}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => { setNuevaContraseña(e.target.value); if (error) setError(''); }}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button type="button" className="form-input-suffix" onClick={() => setMostrarPass(v => !v)} tabIndex={-1}>
                      {mostrarPass ? <IconoOjoTachado /> : <IconoOjo />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPass">Confirmar contraseña</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><IconoCandado /></span>
                    <input
                      id="confirmPass"
                      type={mostrarPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Repite tu contraseña"
                      value={confirmContraseña}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => { setConfirmContraseña(e.target.value); if (error) setError(''); }}
                      disabled={loading}
                      autoComplete="new-password"
                      style={{ paddingLeft: 46 }}
                    />
                  </div>
                </div>
                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? <><span className="spinner" /><span>Guardando...</span></> : <span>Restablecer contraseña</span>}
                </button>
              </form>
            </>
          )}

          {/* PASO 4: Éxito */}
          {paso === 'exito' && (
            <>
              <div className="login-card-header" style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#2e7d32' }}>
                  <IconoCheck />
                </div>
                <h2 className="login-title">¡Contraseña actualizada!</h2>
                <p className="login-subtitle">Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión.</p>
              </div>
              <button type="button" className="login-button" onClick={() => navigate('/login')} style={{ marginTop: 20 }}>
                <span>Iniciar Sesión</span>
              </button>
            </>
          )}

          <div className="login-card-footer" style={{ marginTop: 20 }}>
            <Link to="/login" className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 500 }}>
              <IconoFlechaIzq />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
