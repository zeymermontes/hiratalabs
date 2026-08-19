-- Recuerda que el chip ya se apagó solo al validarse un dominio propio.
-- Sin esta bandera, cada re-verificación posterior volvería a apagarlo y el
-- admin no podría dejarlo encendido a propósito.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS powered_by_auto_off boolean NOT NULL DEFAULT false;

-- Los sitios que YA tenían un dominio propio verificado antes de esta función
-- se marcan como "el apagado automático ya pasó", conservando el interruptor
-- tal como está hoy. Se toma la configuración actual como decisión deliberada
-- del admin: así el chip no se apaga de golpe la próxima vez que alguien
-- revise un dominio que llevaba meses verificado.
UPDATE sites s SET powered_by_auto_off = true
WHERE EXISTS (
  SELECT 1 FROM domains d WHERE d.site_id = s.id AND d.status = 'verified'
);
