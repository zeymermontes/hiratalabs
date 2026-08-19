-- Site settings no longer fall back to a shared default: every site owns its
-- own contact data, and an empty field simply does not render on the page.
drop table if exists global_settings;
