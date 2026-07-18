import { useNavigate } from 'react-router-dom';
import './Main.css';

const IconoUsuario = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconoPago = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
    <path d="M8 14h.01M16 14h.01" />
  </svg>
);

const IconoValidar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export function Main() {
  const navigate = useNavigate();

  const handlePagarParqueo = () => navigate('/pagar-parqueo');
  const handleValidarParqueo = () => navigate('/validar-parqueo');
  const handleLogin = () => navigate('/login');

  return (
    <div className="main-page">
      {/* Background carousel - estilo Login */}
      <div className="main-background">
        <div className="brand-stripe" />
        <div className="brand-overlay" />
        <div className="brand-vignette" />
      </div>

      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <div className="brand-logo">
            <picture>
              <source
                type="image/webp"
                srcSet="/colegio_belen-192w.webp 192w, /colegio_belen-384w.webp 384w, /colegio_belen-768w.webp 768w"
                sizes="(min-width: 1024px) 90px, 70px"
              />
              <img
                src="/colegio_belen-384w.webp"
                alt="Escudo del Colegio Mixto Belén"
                width="90"
                height="112"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </picture>
          </div>
          <div className="brand-info">
            <h1 className="brand-title">Sistema de Gestión de Parqueo</h1>
            <p className="brand-subtitle">Zona 19 · Colegio Mixto Belén</p>
          </div>
        </div>
        <button className="btn-login-header" onClick={handleLogin} aria-label="Iniciar sesión">
          <IconoUsuario />
          <span>Iniciar Sesión</span>
        </button>
      </header>

      {/* Options Section - Solo las 2 opciones principales */}
      <section className="options-section" aria-labelledby="options-title">
        <div className="options-container">
          <h2 id="options-title" className="section-title">¿Qué deseas hacer?</h2>
          <div className="options-grid">
            <article
              className="option-card"
              onClick={handlePagarParqueo}
              onKeyDown={(e) => e.key === 'Enter' && handlePagarParqueo()}
              tabIndex={0}
              role="button"
              aria-label="Pagar parqueo - Acceder al sistema de pagos"
            >
              <div className="option-icon pago">
                <IconoPago />
              </div>
              <div className="option-content">
                <h3 className="option-title">Pagar Parqueo</h3>
                <p className="option-description">
                  Realiza el pago de tu estancia de forma rápida y segura.
                </p>
                <span className="option-action">
                  Acceder
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </article>

            <article
              className="option-card"
              onClick={handleValidarParqueo}
              onKeyDown={(e) => e.key === 'Enter' && handleValidarParqueo()}
              tabIndex={0}
              role="button"
              aria-label="Validar parqueo - Verificar estado de tu vehículo"
            >
              <div className="option-icon validar">
                <IconoValidar />
              </div>
              <div className="option-content">
                <h3 className="option-title">Validar Parqueo</h3>
                <p className="option-description">
                  Verifica el estado de tu vehículo y valida tu salida.
                </p>
                <span className="option-action">
                  Acceder
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Footer con logo UMG */}
      <footer className="main-footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-brand">
            <picture>
              <source
                type="image/webp"
                srcSet="/universidad_mariano_galvez-64w.webp 64w, /universidad_mariano_galvez-128w.webp 128w, /universidad_mariano_galvez-256w.webp 256w"
                sizes="28px"
              />
              <img
                src="/universidad_mariano_galvez-128w.webp"
                alt="Universidad Mariano Gálvez de Guatemala"
                width="28"
                height="28"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <span>Desarrollado por UMG</span>
          </div>
          <p className="footer-copyright">
            © 2026 Colegio Mixto Belén - Zona 19. Sistema de Gestión de Parqueo.
          </p>
        </div>
      </footer>
    </div>
  );
}