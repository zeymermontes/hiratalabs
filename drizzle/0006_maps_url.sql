-- Enlace explícito de Google Maps por sitio.
-- Sin esto, site.addressHref se armaba como una búsqueda del texto de la
-- dirección, que en direcciones con interior o colonia cae en el lugar
-- equivocado. Cuando esta columna trae valor, se usa tal cual.
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maps_url text;
