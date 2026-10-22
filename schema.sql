-- Chạy toàn bộ trong SQL Editor của đúng dự án Supabase. Có thể chạy lại.
-- Không xóa hay sửa các bảng lớp khác. Không dùng file schema cũ của app.
begin;
create table if not exists public.ngoc_yen_app_state (
 scope text primary key check (length(scope) between 8 and 120),
 payload jsonb not null,
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.ngoc_yen_app_state enable row level security;
revoke all on public.ngoc_yen_app_state from anon, authenticated;
grant select, insert, update on public.ngoc_yen_app_state to service_role;
create or replace function public.ngoc_yen_save_state(p_scope text, p_revision bigint, p_payload jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
 update public.ngoc_yen_app_state set payload=p_payload, revision=revision+1, updated_at=now()
 where scope=p_scope and revision=p_revision;
 return found;
end;
$$;
revoke all on function public.ngoc_yen_save_state(text,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.ngoc_yen_save_state(text,bigint,jsonb) to service_role;
commit;
