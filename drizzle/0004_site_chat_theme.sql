-- Colores y forma del chat, declarados por la landing en su landing.json.
alter table site_chat add column if not exists theme jsonb;
