/** Cliente público de pagos. Puede usarse en navegador o Node/Bun con fetch. */
function baseApi(apiUrl) {
  const url = new URL(apiUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Indica la URL pública de la API, terminada en /api');
  }
  return url.toString().replace(/\/$/, '');
}
async function llamar(apiUrl, ruta, body) {
  const response = await fetch(`${baseApi(apiUrl)}${ruta}`, {
    method: body ? 'POST' : 'GET', credentials: 'omit',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Error de pagos: HTTP ${response.status}`);
  return data;
}

/** Consulta la tarifa y prepara o reutiliza el checkout; no realiza el cargo por sí sola. */
export async function iniciarPago({ apiUrl, placa, ticket }) {
  const datos = { placa: placa.trim().toUpperCase(), ticket: ticket.trim().toUpperCase() };
  const precio = await llamar(apiUrl, '/pagos/publico/precio', datos);
  return llamar(apiUrl, '/pagos/publico', { ...datos, monto_esperado: precio.online });
}

/** Verifica con el servidor; regresar del checkout no equivale a un pago confirmado. */
export async function consultarPago({ apiUrl, referencia, acceso }) {
  return llamar(apiUrl, `/pagos/compartido/${encodeURIComponent(referencia)}?${new URLSearchParams({ acceso })}`);
}
