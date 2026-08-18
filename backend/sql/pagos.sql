-- Pagos: registros de pago realizados (efectivo, tarjeta o transferencia).
-- Solo se almacena lo necesario para verificar la transacción:
--   id_pago      -> id del pago
--   creado_en    -> fecha del pago
--   monto        -> total cobrado (incluye comisión de la pasarela)
--   estado       -> pendiente | completado | reembolsado
--   referencia   -> código de operación/referencia que devuelve la pasarela
--   ip_inicio    -> IP del dispositivo donde se inició el pago
--   ip_pago      -> IP del dispositivo que realmente realizó el pago
CREATE TABLE IF NOT EXISTS `pagos` (
  `id_pago` bigint(20) NOT NULL AUTO_INCREMENT,
  `parqueo_id` bigint(20) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `metodo` varchar(20) NOT NULL DEFAULT 'tarjeta',
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `referencia` varchar(100) DEFAULT NULL,
  `ip_inicio` varchar(45) DEFAULT NULL,
  `ip_pago` varchar(45) DEFAULT NULL,
  `procesado_por` int(11) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago`),
  UNIQUE KEY `uq_pagos_referencia` (`referencia`),
  KEY `idx_pagos_estado` (`estado`),
  KEY `idx_pagos_creado` (`creado_en`),
  KEY `idx_pagos_parqueo` (`parqueo_id`),
  CONSTRAINT `fk_pagos_parqueo` FOREIGN KEY (`parqueo_id`)
    REFERENCES `parqueo` (`id_parqueo`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- REPORTE MENSUAL: cantidad de pagos y total cobrado por mes
-- SELECT
--   DATE_FORMAT(creado_en, '%Y-%m') AS mes,
--   COUNT(*) AS cantidad_pagos,
--   SUM(monto) AS total_cobrado
-- FROM pagos
-- WHERE estado = 'completado'
-- GROUP BY mes
-- ORDER BY mes DESC;