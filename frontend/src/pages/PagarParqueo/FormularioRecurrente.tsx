import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { pagosService } from '../../services/pagos.service';

const ORIGEN = 'https://app.recurrente.com';

function urlEmbebida(url: string): string | null {
  try {
    const checkout = new URL(url);
    if (checkout.origin !== ORIGEN || !/^\/checkout-session\/ch_[\w-]+$/.test(checkout.pathname)) return null;
    checkout.searchParams.set('embed', 'true');
    return checkout.toString();
  } catch { return null; }
}

export function FormularioRecurrente({ url, referencia, sandbox }: {
  url: string; referencia: string; sandbox: boolean;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(sandbox ? 'Completa el formulario para probar el pago.' : 'Completa el formulario para realizar el pago.');
  const [error, setError] = useState('');
  const ruta = useLocation().pathname;
  const base = ruta.startsWith('/app/') ? ruta : '/pagar-parqueo';
  const resultado = `${base}/resultado?referencia=${encodeURIComponent(referencia)}`;
  const checkout = urlEmbebida(url);
  const urlValida = checkout !== null;

  useEffect(() => {
    if (!urlValida) return;
    let activo = true;
    let consultando = false;
    async function consultar() {
      if (consultando) return;
      consultando = true;
      try {
        const pago = await pagosService.confirmar(referencia);
        if (!activo) return;
        setError('');
        if (pago.aprobado || pago.estado === 'reembolsado') navigate(resultado, { replace: true });
      } catch {
        if (activo) setError('No pudimos consultar el estado. Puedes seguir verificándolo sin crear otro pago.');
      } finally { consultando = false; }
    }
    function recibir(evento: MessageEvent) {
      if (evento.origin !== ORIGEN || evento.source !== iframe.current?.contentWindow) return;
      const tipo = evento.data?.type;
      if (tipo === 'recurrente-plugin:payment-success') {
        setAviso('Recurrente recibió el pago. Verificando la confirmación con el servidor…');
        void consultar();
      } else if (tipo === 'recurrente-plugin:payment-failed') {
        setAviso('Recurrente informó que el intento falló. Puedes reintentar en el mismo formulario.');
        void consultar();
      } else if (tipo === 'recurrente-plugin:payment-in-progress') {
        setAviso('El pago está en proceso. Esperando confirmación de Recurrente…');
        void consultar();
      }
    }
    window.addEventListener('message', recibir);
    // También confirma si el proveedor no emite el callback o el usuario vuelve de 3DS.
    const intervalo = window.setInterval(() => { void consultar(); }, 5000);
    return () => { activo = false; window.clearInterval(intervalo); window.removeEventListener('message', recibir); };
  }, [referencia, resultado, navigate, urlValida]);

  if (!checkout) return <p role="alert">El enlace no corresponde a un formulario de Recurrente. <Link to={resultado}>Consultar el pago</Link></p>;

  return <section className="pagar-formulario" aria-label="Formulario de tarjeta">
    <h2 className="pagar-resumen-titulo">{sandbox ? 'Prueba tu pago con tarjeta' : 'Datos de la tarjeta'}</h2>
    {sandbox && <details className="pagar-aviso-prueba pagar-ayuda-tarjeta">
      <summary>Modo de prueba · Ver tarjetas y CVC</summary>
      <p>Aprobar: <code>4242 4242 4242 4242</code><br />Rechazar: <code>4000 0000 0000 0002</code></p>
      <p>Fecha futura y CVC de 3 dígitos. Completa los demás campos que solicite Recurrente.</p>
    </details>}
    {cargando && <p role="status">Cargando el formulario seguro de Recurrente…</p>}
    <iframe ref={iframe} src={checkout} title="Formulario seguro de pago con tarjeta de Recurrente"
      allow="payment" className="pagar-checkout-iframe" onLoad={() => setCargando(false)}
      onError={() => { setCargando(false); setError('No se pudo cargar el formulario. Abre el mismo pago con el enlace de abajo.'); }} />
    <p className="pagar-estado-tarjeta" role="status">{aviso}</p>
    {error && <p className="pagar-alerta pagar-alerta-error" role="alert">{error}</p>}
    <div className="pagar-checkout-acciones">
    <Link to={resultado} className="pagar-link">Consultar resultado</Link>
    <details><summary>¿No aparece el formulario?</summary>
      <p>Puedes abrir el mismo checkout en otra pestaña y volver aquí para verificarlo.</p>
      <a href={url} target="_blank" rel="noopener noreferrer">Abrir este pago en Recurrente</a>
    </details>
    </div>
  </section>;
}
