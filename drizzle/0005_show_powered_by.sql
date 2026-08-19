-- Interruptor por sitio para el chip "Powered by".
alter table sites add column if not exists show_powered_by boolean not null default true;
