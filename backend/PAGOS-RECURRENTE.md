# Pagos de parqueo con Recurrente

## Al actualizar Rama/Combinada en otra computadora

El diseño del formulario se comparte por Git; las credenciales no. Para abrir el formulario con número de tarjeta, vencimiento y CVC, configura en `backend/.env.local`:

```dotenv
PAYMENT_PROVIDER=recurrente
PAYMENT_MODE=sandbox
RECURRENTE_SECRET_KEY=sk_test_REEMPLAZAR
```

Obtén la llave TEST del sandbox del equipo por un canal privado. Reinicia el backend y comienza un pago nuevo desde la consulta de placa. Un enlace anterior `/simulador` sigue siendo una simulación local. Si tu `.env` anterior contiene `PAYMENT_PROVIDER=mock`, reemplázalo por `recurrente` también. No subas llaves al repositorio.

Las credenciales de esta instalación se configuran en `backend/.env.local`, ignorado por Git. El backend carga ese archivo antes de `.env`; las variables definidas por el proceso conservan prioridad. Reinicia el backend al cambiar las llaves. No pongas secretos nuevos en el `.env` versionado del repositorio.

El acceso **Pagos → Ir a pago con tarjeta** lleva a la consulta por placa. Después, **Abrir formulario de tarjeta** monta el checkout en un iframe dentro de la misma página, con `embed=true`, siguiendo el protocolo publicado en el repositorio oficial de Recurrente. El checkout usa `charge_type: one_time`, `payment_method_types: [card]` y ninguna opción de cuotas. Los datos de tarjeta se introducen en el formulario servido por Recurrente; este sistema no recibe número de tarjeta ni CVC.

El componente solo escucha mensajes de `https://app.recurrente.com` enviados por su propio iframe. Éxito, fallo y pago en proceso son avisos de interfaz: la confirmación final sigue dependiendo de la API del backend. Mientras está abierto consulta el estado cada cinco segundos. Incluye un enlace alternativo al mismo checkout por si el navegador no muestra el iframe.

La tarifa se lee de `Tipo_vehiculo.precio_linea`, usando el tipo del ticket en la BD. El frontend muestra ese monto y el servidor vuelve a comprobarlo antes de crear el cobro. No se calculan comisiones adicionales: configura la tarifa final desde Tarifas.

## 1. Probar sin API: simulador local

En `backend/.env`, conserva tus variables DB y JWT y configura:

```dotenv
NODE_ENV=development
PAYMENT_PROVIDER=mock
PAYMENT_MODE=sandbox
FRONTEND_BASE_URL=http://localhost:5173/Sistemas-de-Control-de-Pago
BACKEND_BASE_URL=http://localhost:4000
```

Usa una **BD de desarrollo/pruebas**. Aprobar una simulación escribe un pago completado en esa BD y permite probar la validación del guardia; no mueve dinero. No apuntes el simulador a la BD operativa. Cada registro lleva el ambiente en `gateway_response.modo` y una observación de prueba.

Desde la raíz del proyecto:

```sh
bun run dev
```

Abre `http://localhost:5173/Sistemas-de-Control-de-Pago/#/pagar-parqueo`. Inicia sesión, registra primero una entrada desde el módulo del guardia y consulta esa placa en Pago de Parqueo. Pulsa **Probar pago**. Puedes simular aprobación, rechazo, pendiente o volver sin pagar. No se solicitan datos de tarjeta. Desde **Mi historial** puedes consultar o continuar el mismo pago.

Si Vite usa otro puerto, ajusta `FRONTEND_BASE_URL`. La ruta `/Sistemas-de-Control-de-Pago` corresponde al `base` actual de `frontend/vite.config.ts`; consérvala también en las URLs de retorno o actualiza ambos al cambiar el despliegue.

## 2. Probar contra el sandbox real de Recurrente

Crea un ambiente en **Configuración → Sandboxes** de Recurrente y usa la llave de ese ambiente. Su disponibilidad depende de la habilitación en tu cuenta. No uses una llave LIVE para probar.

```dotenv
NODE_ENV=development
PAYMENT_PROVIDER=recurrente
PAYMENT_MODE=sandbox
RECURRENTE_SECRET_KEY=sk_test_REEMPLAZAR
RECURRENTE_WEBHOOK_SECRET=whsec_REEMPLAZAR
FRONTEND_BASE_URL=http://localhost:5173/Sistemas-de-Control-de-Pago
BACKEND_BASE_URL=https://tu-backend-de-pruebas.example
```

Reinicia el backend. El botón muestra el formulario de Recurrente dentro de la página. La misma API `https://app.recurrente.com/api` sirve TEST y LIVE; la llave determina el ambiente.

Tarjetas publicadas para el sandbox:

- Aprobación: `4242 4242 4242 4242`.
- Rechazo: `4000 0000 0000 0002`.
- Vencimiento: fecha futura. CVC: tres dígitos.

Registra en **el mismo sandbox** este endpoint público HTTPS:

```text
https://tu-backend-de-pruebas.example/api/pagos/webhook/recurrente
```

Selecciona los eventos unificados `intent.succeeded`, `intent.pending`, `intent.failed`, `intent.canceled`. Guarda su signing secret en `RECURRENTE_WEBHOOK_SECRET`. Para un backend local necesitas un túnel HTTPS o desplegar un entorno de pruebas: Recurrente no puede llamar a localhost. La verificación al regresar y la reconciliación periódica funcionan con salida a Internet incluso sin túnel.

Prueba: aprobación, rechazo con reintento en el mismo enlace, cierre de pestaña después del pago, entrega repetida de un webhook y consulta del historial. La llegada a `success_url` por sí sola nunca aprueba un pago; el backend comprueba estado `paid`, ID, referencia, monto, moneda GTQ y ambiente contra la API.

## 3. Pasar a producción después de validar TEST

Usa la BD operativa sin registros de simulación. Las columnas necesarias ya existen en el esquema actual; esta integración no agrega tablas ni aplica migraciones automáticamente.

```dotenv
NODE_ENV=production
PAYMENT_PROVIDER=recurrente
PAYMENT_MODE=live
RECURRENTE_SECRET_KEY=sk_live_REEMPLAZAR
RECURRENTE_WEBHOOK_SECRET=whsec_SECRET_DEL_ENDPOINT_LIVE
JWT_SECRET=REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_DE_AL_MENOS_32_CARACTERES
FRONTEND_BASE_URL=https://tu-frontend.example/Sistemas-de-Control-de-Pago
BACKEND_BASE_URL=https://tu-backend.example
```

En el entorno de compilación del frontend configura `VITE_API_URL=https://tu-backend.example/api`, compila y publica el resultado. Las llaves Recurrente solo van en el backend; no uses variables `VITE_` para secretos.

Registra nuevamente el webhook en la cuenta LIVE y usa su firma LIVE. Reinicia el backend y verifica que la configuración sea válida. El arranque bloquea mock/sandbox con `NODE_ENV=production`, llaves del ambiente incorrecto y configuración LIVE incompleta. Termina las pruebas de aceptación en sandbox antes de habilitar cobros reales; ningún cobro LIVE fue ejecutado durante esta implementación.

## Recuperación y límites operativos

- Cada ticket se bloquea durante la reserva, coordinándose con el procedimiento existente de efectivo. Una reserva pendiente impide crear otro cobro y también evita cobrar ese ticket en efectivo mientras tiene el pago registrado.
- Reintentar reutiliza el mismo checkout. Una respuesta de creación perdida deja la reserva pendiente, sin crear otro checkout automáticamente. El webhook puede recuperar el ID usando la referencia guardada en metadata. Si la creación falló antes de existir un checkout, administración debe revisar esa referencia en Recurrente antes de resolver la reserva; no borres pagos a ciegas.
- El frontend consulta hasta seis veces y ofrece actualización manual. El backend consulta pagos pendientes cada minuto mientras permanece ejecutándose; procesa hasta 100 por ciclo y recorre los siguientes en ciclos posteriores. Los webhooks no dependen de que el usuario vuelva al sitio.
- Una notificación duplicada no vuelve a confirmar ni degrada un pago ya completado. Un webhook inválido se rechaza; si falla la consulta a Recurrente, se devuelve error para permitir su reentrega.
- La cancelación de navegación no prueba que no hubo cargo. La pantalla siempre consulta el servidor.
- El flujo implementado es un cobro único por estancia, no una suscripción. Reembolsos y contracargos no se automatizan aquí; requieren conciliación administrativa. Checkouts expirados o reservas sin enlace requieren revisión antes de generar otro cobro.
- No cambies el ambiente sobre una BD de pruebas para convertirla en producción: los pagos simulados ya completados siguen siendo registros de prueba.

## Verificación

Desde `backend`:

```sh
bun run build
bun run test:pagos
bun run check:pagos-db
```

Desde `frontend`:

```sh
npm run build
npm run lint
```

Las pruebas automatizadas usan respuestas API y almacenamiento simulados; no hacen cobros ni escriben en tu BD. `check:pagos-db` solo inspecciona el esquema.

El 10 de septiembre de 2026 se comprobó la llave TEST contra `/api/test` (HTTP 200) y se creó y consultó un checkout independiente de Q5: respondió `unpaid`, `live_mode: false`, `currency: GTQ`, `total_in_cents: 500` y `payment_method_types: [card]`. Esta prueba no creó registros en la BD ni completó una transacción de tarjeta. Falta probar aprobación y rechazo desde el checkout del flujo de un ticket y verificar el regreso a la aplicación. Para esa prueba registra una nueva entrada: un ticket ya pagado o un pago del simulador local no se reutiliza como pago de sandbox.

El webhook queda implementado pero requiere un backend público HTTPS y su `RECURRENTE_WEBHOOK_SECRET`. No se registró un webhook para localhost; la consulta de retorno y la reconciliación periódica pueden verificar el pago mientras el backend local está ejecutándose.

Documentación oficial consultada:

- https://docs.recurrente.com/guias-espanol/guias/embedded-checkouts
- https://github.com/recurrente/recurrente-checkout
- https://docs.recurrente.com/guias-espanol/comenzar/introduccion
- https://docs.recurrente.com/guias-espanol/guias/sandboxes-y-test-clocks
- https://docs.recurrente.com/referencia-api/api-reference/checkouts/create-checkout
- https://docs.recurrente.com/referencia-api/api-reference/checkouts/get-checkout
- https://docs.recurrente.com/guias-espanol/comenzar/webhooks
