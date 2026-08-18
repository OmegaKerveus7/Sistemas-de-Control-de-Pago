import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Credenciales } from '../../models';
import { login, guardarToken } from '../../services/auth.service';
import './Login.css';

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

const IconoFlecha = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconoEscudo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

type TipoIdentificador = 'vacio' | 'dpi' | 'correo';

const detectarTipo = (valor: string): TipoIdentificador => {
  if (!valor) return 'vacio';
  if (valor.includes('@')) return 'correo';
  return 'dpi';
};

const validarCorreo = (correo: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
};

const BASE = import.meta.env.BASE_URL;

export default function Login() {
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [slideActual, setSlideActual] = useState(0);
  const [slidePausado, setSlidePausado] = useState(false);

  const tipoActual = detectarTipo(identificador);

  useEffect(() => {
    if (slidePausado) return;
    const id = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, [slidePausado]);

  const manejarSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const limpio = identificador.trim();

    if (!limpio || !password) {
      setError('Por favor complete todos los campos');
      triggerShake();
      return;
    }

    const tipo = detectarTipo(limpio);
    if (tipo === 'correo' && !validarCorreo(limpio)) {
      setError('Ingrese un correo electrónico válido');
      triggerShake();
      return;
    }

    if (tipo === 'dpi') {
      const soloDigitos = limpio.replace(/\s/g, '');
      if (soloDigitos.length < 13) {
        setError('El DPI debe contener al menos 13 dígitos');
        triggerShake();
        return;
      }
    }

    setLoading(true);

    const credenciales: Credenciales = {
      identificador: tipo === 'dpi' ? limpio.replace(/\s/g, '') : limpio,
      password,
    };

    try {
      const resultado = await login(credenciales);

      if (resultado.exitoso && resultado.token) {
        guardarToken(resultado.token);
        if (resultado.usuario) {
          localStorage.setItem('usuario', JSON.stringify(resultado.usuario));
        }
        navigate('/app/dashboard');
      } else {
        setError(resultado.mensaje || 'Error al iniciar sesión');
        triggerShake();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Intente nuevamente.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const manejarCambioInput = (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (error) setError('');
    };

  const handleIdentificadorChange = (e: ChangeEvent<HTMLInputElement>) => {
    const tipo = detectarTipo(e.target.value);
    let valor = e.target.value;
    if (tipo === 'dpi') {
      const limpio = valor.replace(/\D/g, '').slice(0, 13);
      const partes: string[] = [];
      if (limpio.length > 0) partes.push(limpio.slice(0, 4));
      if (limpio.length > 4) partes.push(limpio.slice(4, 9));
      if (limpio.length > 9) partes.push(limpio.slice(9, 13));
      valor = partes.join(' ');
    } else {
      valor = valor.slice(0, 80);
    }
    setIdentificador(valor);
    if (error) setError('');
  };

  const inputType = tipoActual === 'correo' ? 'email' : 'text';
  const inputMode = tipoActual === 'correo' ? 'email' : 'numeric';
  const autoComplete = tipoActual === 'correo' ? 'email' : 'username';
  const maxLength = tipoActual === 'correo' ? 80 : 15;

  return (
    <div
      className="login-page"
      onMouseEnter={() => setSlidePausado(true)}
      onMouseLeave={() => setSlidePausado(false)}
    >
      {/* Background Carousel */}
      <div className="login-background">
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`brand-slide ${i === slideActual ? 'activo' : ''}`}
            aria-hidden={i !== slideActual}
          >
            <picture>
              <source
                type="image/webp"
                srcSet={`${BASE}${slide.imagen}-640w.webp 640w, ${BASE}${slide.imagen}-960w.webp 960w, ${BASE}${slide.imagen}-1280w.webp 1280w, ${BASE}${slide.imagen}-1920w.webp 1920w`}
                sizes="100vw"
              />
              <img
                src={`${BASE}${slide.imagen}-1280w.webp`}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={i === 0 ? 'high' : 'auto'}
              />
            </picture>
          </div>
        ))}
        <div className="brand-overlay" />
        <div className="brand-vignette" />
        <div className="brand-stripe" />
      </div>

      {/* Header with logo */}
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
              fetchPriority="high"
            />
          </picture>
        </div>
        <div className="brand-badge">
          <IconoEscudo />
          <span>Colegio Mixto Belén</span>
        </div>
      </header>

      {/* Brand messages */}
      <section className="login-brand-content">
        <div className="brand-messages">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`brand-message ${i === slideActual ? 'activo' : ''}`}
              aria-hidden={i !== slideActual}
            >
              <h1 className="brand-title">{slide.frase}</h1>
              {slide.subfrase && <p className="brand-subtitle">{slide.subfrase}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Login Form */}
      <main className="login-form-panel">
        <div className={`login-card ${shake ? 'shake' : ''}`}>
          <div className="login-card-header">
            <h2 className="login-title">Iniciar Sesión</h2>
            <p className="login-subtitle">Accede al panel de administración del sistema</p>
          </div>

          <form className="login-form" onSubmit={manejarSubmit} noValidate>
            {error && (
              <div className="alerta alerta-error" role="alert">
                <IconoAlerta />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="identificador">
                {tipoActual === 'correo' ? 'Correo electrónico' : 'DPI o Correo electrónico'}
              </label>
              <div className="form-input-wrapper">
                <span className="form-input-icon">
                  <IconoUsuario />
                </span>
                <input
                  id="identificador"
                  type={inputType}
                  inputMode={inputMode}
                  className="form-input"
                  placeholder="DPI o correo electrónico"
                  value={identificador}
                  onChange={handleIdentificadorChange}
                  disabled={loading}
                  autoComplete={autoComplete}
                  maxLength={maxLength}
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
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={manejarCambioInput(setPassword)}
                  disabled={loading}
                  autoComplete="current-password"
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

            <div className="form-row">
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                  disabled={loading}
                />
                <span className="checkbox-custom" />
                <span className="checkbox-label">Recordarme</span>
              </label>
              <a href="#" className="link" onClick={(e) => e.preventDefault()}>
                ¿Olvidó su contraseña?
              </a>
            </div>

            <button
              type="submit"
              className={`login-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <IconoFlecha />
                </>
              )}
            </button>
          </form>

          <div className="login-card-footer">
            <p>
              ¿Necesita ayuda? <a href="#" className="link" onClick={(e) => e.preventDefault()}>Contacte al administrador</a>
            </p>
            <p style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--color-texto-terciario)' }}>
              Volver al <Link to="/" className="link">inicio</Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer with indicators */}
      <footer className="login-footer">
        <div className="brand-indicators" role="tablist" aria-label="Slides del parqueo">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`brand-indicator ${i === slideActual ? 'activo' : ''}`}
              onClick={() => setSlideActual(i)}
              role="tab"
              aria-selected={i === slideActual}
              aria-label={`Ir al slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="brand-developer">
          <span className="brand-developer-label">Desarrollado por</span>
          <picture>
            <source
              type="image/webp"
              srcSet={`${BASE}universidad_mariano_galvez-64w.webp 64w, ${BASE}universidad_mariano_galvez-128w.webp 128w, ${BASE}universidad_mariano_galvez-256w.webp 256w`}
              sizes="28px"
            />
            <img
              src={`${BASE}universidad_mariano_galvez-128w.webp`}
              alt="Universidad Mariano Gálvez de Guatemala"
              width="28"
              height="28"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <span className="brand-developer-name">UMG</span>
        </div>
      </footer>
    </div>
  );
}