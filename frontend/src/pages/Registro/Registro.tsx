import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usuariosService } from '../../services/usuarios.service';
import './Registro.css';
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

const IconoFlechaIzq = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconoCamara = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const IconoSubir = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconoEliminar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const BASE = import.meta.env.BASE_URL;

interface Slide {
  imagen: string;
  frase: string;
  subfrase?: string;
}

const SLIDES: Slide[] = [
  {
    imagen: 'edificio-principal-1',
    frase: 'Virtud · Labor · Ciencia',
    subfrase: 'Líderes en tecnología, formación académica, cívica y moral',
  },
  {
    imagen: 'carousel8',
    frase: 'Con nosotros tu vehículo está seguro',
    subfrase: 'Sistema inteligente de control de acceso y monitoreo 24/7',
  },
  {
    imagen: 'edificio-principal-1',
    frase: 'Más de 65 años de excelencia educativa',
    subfrase: 'Colegio Mixto Belén · Fundado en 1958',
  },
  {
    imagen: 'carousel8',
    frase: 'Educación con amor, enseñanza, respeto y ética',
    subfrase: 'Formando generaciones con valores y conocimiento',
  },
];

interface FormData {
  dpi: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  confirmPassword: string;
  foto_perfil: string | null;
}

export default function Registro() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormData>({
    dpi: '',
    nombres: '',
    apellidos: '',
    email: '',
    password: '',
    confirmPassword: '',
    foto_perfil: null,
  });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [exito, setExito] = useState(false);
  const [slideActual, setSlideActual] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

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
      } else if (campo === 'email') {
        valor = valor.slice(0, 100);
      } else if (campo === 'password' || campo === 'confirmPassword') {
        valor = valor.slice(0, 200);
      }

      setForm((prev) => ({ ...prev, [campo]: valor }));
      if (error) setError('');
    };

  const convertirABase64 = (archivo: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result as string);
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });

  const manejarFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (archivo.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar 2 MB');
      triggerShake();
      return;
    }

    try {
      const base64 = await convertirABase64(archivo);
      setForm((prev) => ({ ...prev, foto_perfil: base64 }));
      if (error) setError('');
    } catch {
      setError('Error al procesar la imagen');
      triggerShake();
    }

    e.target.value = '';
  };

  const eliminarFoto = () => {
    setForm((prev) => ({ ...prev, foto_perfil: null }));
  };

  const validarFormulario = (): boolean => {
    if (!form.dpi.trim() || !form.nombres.trim() || !form.apellidos.trim() ||
        !form.email.trim() || !form.password || !form.confirmPassword) {
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Ingrese un correo electrónico válido');
      triggerShake();
      return false;
    }

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      triggerShake();
      return false;
    }

    if (form.password !== form.confirmPassword) {
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
        email: form.email.trim().toLowerCase(),
        password: form.password,
        foto_perfil: form.foto_perfil,
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
      <div className="login-page registro-page">
        <div className="login-background">
          {SLIDES.map((slide, i) => (
            <div key={i} className={`brand-slide ${i === slideActual ? 'activo' : ''}`} aria-hidden={i !== slideActual}>
              <picture>
                <source type="image/webp" srcSet={`${BASE}${slide.imagen}-640w.webp 640w, ${BASE}${slide.imagen}-960w.webp 960w, ${BASE}${slide.imagen}-1280w.webp 1280w, ${BASE}${slide.imagen}-1920w.webp 1920w`} sizes="100vw" />
                <img src={`${BASE}${slide.imagen}-1280w.webp`} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={i === 0 ? 'high' : 'auto'} />
              </picture>
            </div>
          ))}
          <div className="brand-overlay" />
          <div className="brand-vignette" />
          <div className="brand-stripe" />
        </div>
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
              <div className="exito-icono">
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
              <Link to="/" className="link-volver">
                <IconoFlechaIzq />
                Volver al inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="login-page registro-page">
      <div className="login-background">
        {SLIDES.map((slide, i) => (
          <div key={i} className={`brand-slide ${i === slideActual ? 'activo' : ''}`} aria-hidden={i !== slideActual}>
            <picture>
              <source type="image/webp" srcSet={`${BASE}${slide.imagen}-640w.webp 640w, ${BASE}${slide.imagen}-960w.webp 960w, ${BASE}${slide.imagen}-1280w.webp 1280w, ${BASE}${slide.imagen}-1920w.webp 1920w`} sizes="100vw" />
              <img src={`${BASE}${slide.imagen}-1280w.webp`} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={i === 0 ? 'high' : 'auto'} />
            </picture>
          </div>
        ))}
        <div className="brand-overlay" />
        <div className="brand-vignette" />
        <div className="brand-stripe" />
      </div>

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

            <div className="registro-foto-section">
              {form.foto_perfil ? (
                <div className="foto-preview">
                  <img src={form.foto_perfil} alt="Foto de perfil" />
                  <button
                    type="button"
                    className="foto-eliminar"
                    onClick={eliminarFoto}
                    aria-label="Eliminar foto"
                  >
                    <IconoEliminar />
                  </button>
                </div>
              ) : (
                <div className="foto-placeholder">
                  <IconoCamara />
                  <span>Foto de perfil</span>
                  <div className="foto-botones">
                    <button
                      type="button"
                      className="foto-btn"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <IconoCamara />
                      <span>Cámara</span>
                    </button>
                    <button
                      type="button"
                      className="foto-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconoSubir />
                      <span>Subir</span>
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={manejarFoto}
                hidden
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={manejarFoto}
                hidden
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dpi">DPI</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
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

            <div className="registro-campos-fila">
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
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 7L2 7" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={manejarInput('email')}
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
                  value={form.password}
                  onChange={manejarInput('password')}
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
              <Link to="/" className="link-volver">
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
