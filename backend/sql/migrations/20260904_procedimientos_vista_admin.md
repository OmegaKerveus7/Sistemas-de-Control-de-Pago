# Migración de SQL crudo a procedimientos almacenados (vista de administrador)

Rama: `Rama/Esteban`. Relacionado con: `20260904_procedimientos_vista_admin.sql`.

## Contexto

El commit `c1541ce` ("implementado vista administrador para gestion global de
sistema") agregó SQL crudo (embebido en TypeScript) dentro de los
repositorios de `auditoria`, `pagos`, `parqueo`, `tarifas` y `vehiculos`. Se
pidió mover **solo ese SQL** (lo agregado en ese commit, en esa rama) a
procedimientos almacenados en la base de datos, sin tocar:

- Flujos legacy marcados con `TODO` (pago en línea/pasarela, `parqueo`/
  `vehiculos` en minúscula).
- `usuarios.repository.ts` (cambios triviales de alias, no consultas nuevas).
- `loginN` / `usuariosM` / `sp_registrar_entrada` / `sp_registrar_salida` /
  `sp_retirar_vehiculo_por_placa` (procedimientos ya existentes de otras
  ramas).

## Qué se hizo

1. **`20260904_procedimientos_vista_admin.sql`**: 20 procedimientos nuevos
   (`sp_auditoria_*`, `sp_pagos_*`, `sp_parqueo_*`, `sp_tarifas_*`,
   `sp_vehiculos_*`), uno por cada función de repositorio tocada en el
   commit `c1541ce`.
2. Repositorios actualizados para llamar `CALL sp_...` en vez de construir
   SQL en JS: `auditoria.repository.ts`, `pagos.repository.ts`,
   `parqueo.repository.ts`, `tarifas.repository.ts`, `vehiculos.repository.ts`.
   Misma firma de función y mismo tipo de retorno en todos los casos.
3. `sp_pagos_crear_efectivo` encapsula en un solo procedimiento (con su
   propio `START TRANSACTION` / `COMMIT` / `ROLLBACK`) la transacción que
   antes eran varias queries sueltas en Node con `beginTransaction()`
   manual.
4. `tarifas.repository.ts` conserva en JS la regla de "si el campo no viene,
   se mantiene el valor actual" (semántica de `Partial<...>`); el
   procedimiento (`sp_tarifas_actualizar`) recibe los valores ya resueltos y
   solo calcula `ganancia` y aplica el `UPDATE`.

## Verificación en la BD real

BD: `srv572.hstgr.io` / `u878723730_parqueo` (credenciales en `backend/.env`,
que ya apuntaba a esta base — no es una BD de desarrollo separada).

- **Antes de migrar**: se listaron los procedimientos existentes
  (`information_schema.ROUTINES`). Solo había 5: `consultarHistorial`,
  `loginN`, `registrarEntrada`, `registrarSalida`, `usuariosM` — nombres
  distintos a los que aparecen en `SCRIP BD Analisis II.sql`
  (`sp_registrar_entrada`, etc.), señal de que alguien aplicó/renombró
  procedimientos directo en la BD sin actualizar ese script. Ninguno de los
  20 nombres nuevos colisionaba.
- **Migración aplicada**: las 40 sentencias del `.sql` (comentarios +
  `DROP PROCEDURE IF EXISTS` + `CREATE PROCEDURE`) se ejecutaron sin error
  contra la BD real.
- **Pruebas directas por SQL** (antes de tocar la UI):
  - Las 17 funciones de solo lectura devolvieron filas reales.
  - `sp_auditoria_registrar`: insertó y se limpió la fila de prueba.
  - `sp_tarifas_crear`: confirmó que rechaza combinaciones duplicadas igual
    que el `INSERT` original (constraint `unique_tarifa` de la BD real —
    tampoco documentada en el script versionado). No se forzó un insert de
    éxito para no borrar/recrear una tarifa real.
  - `sp_tarifas_actualizar`: update "no-op" (mismos valores) sobre la
    tarifa real `id=1` → `afectado=1`, sin alterar datos.
  - `sp_pagos_crear_efectivo`: caso de éxito (ticket de prueba `P444DDD`)
    insertado y eliminado después; caso de error (ticket que ya tenía pago)
    devolvió el mensaje esperado.
  - Se verificó que `Tarifas` (4 filas) y `Pagos` (8 filas) quedaran
    exactamente igual que antes de las pruebas.

## Verificación end-to-end (navegador)

Backend (`bun dev`, puerto 4000) y frontend (Vite, puerto 5173) ya estaban
corriendo. Se automatizó con Playwright (headless Chromium, sin
`chromium-cli` disponible en este entorno):

- Login como `Admin Prueba` (DPI `9999999999901`, cuenta de prueba
  provista por el usuario — no se tocaron credenciales de cuentas reales de
  compañeros).
- Se navegó a las 6 páginas de la vista de administrador (Auditoría, Pagos,
  Parqueo, Tarifas, Usuarios, Buscar vehículo): **0 errores de consola, 0
  requests HTTP fallidos**, datos reales visibles en cada tabla.
- Se ejecutaron dos flujos de escritura desde la UI real (clic real en
  botones):
  - Editar tarifa sin cambiar valores → `sp_tarifas_actualizar` responde
    bien, tabla igual.
  - Registrar pago en efectivo (ticket `P033KGQ`) → `sp_pagos_crear_efectivo`
    responde "Pago registrado: Q20.00", aparece en la tabla.
  - Ambos se limpiaron después (`DELETE` directo) para dejar la BD igual
    que antes de las pruebas.

## Pendiente / notas para el equipo

- El script `SCRIP BD Analisis II.sql` (versionado) no coincide con los
  procedimientos que realmente existen en la BD (`loginN`/`usuariosM` sí,
  pero `sp_registrar_entrada` etc. en el script vs. `registrarEntrada` sin
  prefijo en la BD real). Vale la pena que el equipo audite y sincronice
  ese script con la BD real en algún momento.
- La constraint `unique_tarifa` (id_tipo_vehiculo, id_tipo_pago) existe en
  la BD real pero no está declarada en el `CREATE TABLE Tarifas` del script
  versionado.
- No se hizo commit de los cambios de código (`.repository.ts` +
  migración `.sql`) — quedan en el working tree de `Rama/Esteban` a la
  espera de que el usuario decida si los commitea.
