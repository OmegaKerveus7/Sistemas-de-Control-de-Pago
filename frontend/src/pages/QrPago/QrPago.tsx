import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './QrPago.css';

/** URL pública de la pantalla de pago, según dónde esté publicada la aplicación. */
function urlPagoPorDefecto(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/pagar-parqueo`;
}

/** Cartel imprimible con el QR fijo de la entrada: lleva a pagar con la placa, sin iniciar sesión. */
export function QrPago() {
  const [url, setUrl] = useState(urlPagoPorDefecto);
  const urlValida = /^https?:\/\/\S+$/i.test(url.trim());
  const esLocal = /^https?:\/\/(localhost|127\.|192\.168\.|10\.)/i.test(url.trim());

  return (
    <section className="qrpago-page">
      <div className="qrpago-controles qrpago-no-imprimir">
        <h1>QR de pago</h1>
        <p>Imprime este cartel y colócalo en la entrada: el público escanea, ingresa su placa y paga sin crear cuenta.</p>
        <label htmlFor="qrpago-url">Dirección a la que lleva el QR</label>
        <input id="qrpago-url" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
        {esLocal && <p className="qrpago-aviso">Esta dirección solo funciona en esta red o computadora. Para el cartel definitivo usa la dirección pública del sistema.</p>}
        {!urlValida && <p className="qrpago-aviso">Escribe una dirección que empiece con https://</p>}
        <div className="qrpago-acciones">
          <button type="button" className="qrpago-boton" onClick={() => window.print()} disabled={!urlValida}>Imprimir cartel</button>
          <button type="button" className="qrpago-boton qrpago-boton-sec" onClick={() => setUrl(urlPagoPorDefecto())}>Restablecer</button>
        </div>
      </div>

      <article className="qrpago-cartel" aria-label="Vista previa del cartel">
        <h2>Paga tu parqueo aquí</h2>
        <p className="qrpago-sub">Parqueo Zona 19 · Colegio Mixto Belén</p>
        {urlValida
          ? <QRCodeSVG value={url.trim()} size={300} level="M" includeMargin />
          : <div className="qrpago-vacio">QR no disponible</div>}
        <ol>
          <li>Escanea el código con tu celular.</li>
          <li>Ingresa tu placa y tus datos para el recibo.</li>
          <li>Paga con tarjeta y muestra tu placa al guardia.</li>
        </ol>
        <p className="qrpago-pie">Tu pago vale por todo el día · También puedes pagar en efectivo con el guardia</p>
      </article>
    </section>
  );
}

export default QrPago;
