-- Botón flotante de WhatsApp por sitio.
-- Apagado por defecto: es un elemento que tapa contenido, así que se enciende
-- a propósito. El runtime además lo omite si no hay número capturado, para que
-- encenderlo sin datos no deje un botón que no lleva a ningún lado.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS show_whatsapp_fab boolean NOT NULL DEFAULT false;
